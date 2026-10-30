import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { createUsageLedger } from "@/lib/usage/response-ledger";
import { createDialogueGuard } from "@/lib/realtime/dialogue-guard";
import type { Utterance } from "@/lib/realtime/types";
import type { PipelineCost, PipelineSettings } from "./types";
import { encodeInterviewWav, InterviewPcmPlayer, InterviewVoiceDetector } from "./audio";
import { pipelineError } from "./copy";
import { INTERVIEW_ANSWER_LIMIT } from "@/lib/realtime/interview-progress";

const store = () => useRealtimeInterviewStore.getState();

export function applyPipelineCost(cost: PipelineCost) {
  if (store().usageSessionId !== cost.sessionId) return;
  const ledger = store().usageLedger;
  if (ledger?.pipeline && ledger.pipeline.sessionId !== cost.sessionId) return;
  if (ledger?.pipeline && ledger.pipeline.updatedAt > cost.updatedAt) return;
  store().setSessionEstimatedUsd(cost.sessionUsd);
  store().setUsageLedger({ ...(ledger ?? createUsageLedger("openrouter/pipeline")), pipeline: cost });
}

export async function pipelineJson(body: unknown, signal?: AbortSignal) {
  const response = await fetch("/api/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const data = await response.json();
  if (data.cost) applyPipelineCost(data.cost);
  if (!response.ok) throw new Error(data.error ?? "PIPELINE_UPSTREAM");
  return data;
}

export class PipelineInterviewClient {
  private session: { sessionId: string; month: string } | null = null;
  private player: InterviewPcmPlayer | null = null;
  private capture: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private detector: InterviewVoiceDetector | null = null;
  private ended = false;
  private paused = false;
  private generation = 0;
  private guestId: string | null = null;
  private guestStart = 0;
  private queue: Promise<void> = Promise.resolve();
  private poll: ReturnType<typeof setInterval> | null = null;
  private limit: ReturnType<typeof setTimeout> | null = null;
  private speechAbort: AbortController | null = null;
  private retrySpeech: string | null = null;
  private replyAbort: AbortController | null = null;
  private activeSpeech: { id: string; remaining: string } | null = null;
  private interruptedSpeech: string | null = null;
  private interruptedReply = false;
  private noiseRecoveries = 0;
  private failedAudio: { frames: Float32Array[]; final: boolean; id: string; start: number; end: number } | null = null;
  private deferredAudio: NonNullable<PipelineInterviewClient["failedAudio"]>[] = [];
  private guard = createDialogueGuard();
  private stopPromise: Promise<void> | null = null;
  private opening = true;
  private closing = false;
  private lastAnsweredId: string | null = null;
  private queuedAudio = 0;

  constructor(private options: {
    settings: PipelineSettings;
    stream: MediaStream;
    context: AudioContext;
    attachAiAudio: (stream: MediaStream) => void;
    elapsed: () => number;
    onTimeLimit: () => void;
  }) {}

  private fail(error: unknown) {
    if (this.ended) return;
    this.paused = true;
    this.detector?.flush();
    this.guestId = null;
    this.interrupt();
    store().setError(pipelineError(error instanceof Error ? error.message : "PIPELINE_UPSTREAM", this.options.settings.interviewLanguage === "en"));
    store().setInputState("failed");
    store().setListeningPhase("hidden");
  }

  private update(id: string, patch: Partial<Utterance>) {
    store().setUtterances(store().utterances.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  private interrupt() {
    this.generation += 1;
    if (this.replyAbort) this.interruptedReply = true;
    if (this.activeSpeech) {
      this.interruptedSpeech = this.activeSpeech.remaining;
      const row = store().utterances.find((utterance) => utterance.id === this.activeSpeech?.id);
      if (row) this.update(row.id, { endedAt: this.options.elapsed(), interrupted: true });
    }
    this.activeSpeech = null;
    this.speechAbort?.abort(); this.replyAbort?.abort();
    this.speechAbort = null; this.replyAbort = null;
    this.player?.stop();
  }

  async refreshCost() {
    if (!this.session) return;
    const response = await fetch(`/api/pipeline?sessionId=${this.session.sessionId}&month=${this.session.month}`, { cache: "no-store" });
    if (!response.ok) throw new Error("PIPELINE_STORAGE");
    applyPipelineCost((await response.json()).cost);
  }

  async start() {
    store().setAnswerCount(0);
    store().setError(null); store().setUtterances([]); store().setUsageLedger(null);
    store().setSessionEstimatedUsd(null); store().setUsageSessionId(null); store().setIsMockSession(false);
    store().setConnectionStatus("connecting"); store().setListeningPhase("connecting");
    try {
      const data = await pipelineJson({ action: "start", settings: this.options.settings });
      this.session = { sessionId: data.sessionId, month: data.month };
      if (this.ended) { await pipelineJson({ action: "close", ...this.session }); return; }
      store().setUsageSessionId(data.sessionId);
      store().setUsageLedger(createUsageLedger("openrouter/pipeline", data.promptMetadata));
      applyPipelineCost(data.cost);
      await this.options.context.audioWorklet.addModule("/audio/interview-capture.js");
      if (this.ended) { await pipelineJson({ action: "close", ...this.session }); return; }
      await this.options.context.resume();
      this.player = new InterviewPcmPlayer(this.options.context, this.options.attachAiAudio);
      this.detector = new InterviewVoiceDetector({
        start: (preRollMs) => {
          this.interrupt();
          this.guestId = crypto.randomUUID();
          this.guestStart = Math.max(0, this.options.elapsed() - preRollMs);
          store().setInputState("speaking"); store().setListeningPhase("guest_may_speak");
        },
        segment: (frames, final, silenceMs) => {
          const id = this.guestId;
          if (!id) return;
          const segment = { frames, final, id, start: this.guestStart, end: this.options.elapsed() - silenceMs };
          if (final) { store().setInputState("transcribing"); this.guestId = null; }
          this.queuedAudio += 1;
          this.queue = this.queue.then(async () => {
            if (this.paused) { this.deferredAudio.push(segment); return; }
            await this.transcribe(segment);
          }).catch((error) => { this.failedAudio = segment; this.recordGap(segment, "transcription_failed"); this.fail(error); }).finally(() => { this.queuedAudio -= 1; });
        },
      });
      this.source = this.options.context.createMediaStreamSource(this.options.stream);
      this.capture = new AudioWorkletNode(this.options.context, "interview-capture");
      this.capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (!this.ended && !this.paused && !this.opening && !this.closing) this.detector?.push(event.data, this.activeSpeech !== null);
      };
      this.source.connect(this.capture); this.capture.connect(this.options.context.destination);
      store().setConnectionStatus("connected"); store().setListeningPhase("waiting_ai");
      store().setSessionEndsAt(Date.now() + 10 * 60 * 1000);
      this.limit = setTimeout(this.options.onTimeLimit, 10 * 60 * 1000);
      this.poll = setInterval(() => { void this.refreshCost().catch(() => undefined); }, 3000);
      await this.speak(data.opening);
      this.opening = false;
    } catch (error) { this.fail(error); }
  }

  private async transcribe(segment: NonNullable<PipelineInterviewClient["failedAudio"]>) {
    const data = await pipelineJson({ action: "transcribe", ...this.session, requestId: crypto.randomUUID(), audio: encodeInterviewWav(segment.frames) });
    if (this.session?.sessionId !== store().usageSessionId) return;
    const ledger = store().usageLedger;
    if (ledger?.transcriptionGaps) store().setUsageLedger({ ...ledger, transcriptionGaps: ledger.transcriptionGaps.filter((gap) => gap.id !== `${segment.id}:${segment.end}`) });
    if (data.text?.trim()) {
      this.interruptedSpeech = null; this.interruptedReply = false; this.noiseRecoveries = 0; this.retrySpeech = null;
      const existing = store().utterances.find((row) => row.id === segment.id);
      if (existing) this.update(segment.id, { text: `${existing.text}${this.options.settings.interviewLanguage === "ja" ? "" : " "}${data.text.trim()}`, endedAt: segment.end });
      else store().setUtterances([...store().utterances, { id: segment.id, speaker: "guest", text: data.text.trim(), startedAt: segment.start, endedAt: segment.end }]);
    }
    if (this.ended || this.paused || !segment.final || this.queuedAudio > 1) return;
    if (!this.guestId) store().setInputState("idle");
    if (!this.guestId && !this.deferredAudio.length && !data.text?.trim() && !store().utterances.some((row) => row.id === segment.id)) {
      const speech = this.interruptedSpeech;
      const reply = this.interruptedReply;
      this.interruptedSpeech = null; this.interruptedReply = false;
      if (speech || reply) {
        if (this.noiseRecoveries >= 1) { this.retrySpeech = speech; this.fail(new Error("PIPELINE_NOISE")); return; }
        this.noiseRecoveries += 1;
        void (speech ? this.speak(speech) : this.reply()).catch((error) => this.fail(error));
      } else store().setListeningPhase("guest_may_speak");
      return;
    }
    if (this.guestId || this.deferredAudio.length || store().utterances.at(-1)?.id !== segment.id) return;
    void this.reply().catch((error) => this.fail(error));
  }

  private recordGap(segment: NonNullable<PipelineInterviewClient["failedAudio"]>, reason: "transcription_failed" | "not_transcribed") {
    const ledger = store().usageLedger;
    if (!ledger || store().usageSessionId !== this.session?.sessionId) return;
    const id = `${segment.id}:${segment.end}`;
    store().setUsageLedger({ ...ledger, transcriptionGaps: [...(ledger.transcriptionGaps ?? []).filter((gap) => gap.id !== id), { id, startedAt: segment.start, endedAt: segment.end, reason }] });
  }

  private async reply() {
    if (this.ended || this.paused) return;
    const generation = this.generation;
    store().setListeningPhase("waiting_ai");
    this.replyAbort = new AbortController();
    const controller = this.replyAbort;
    try {
      const rows = store().utterances;
      const lastGuest = rows.filter((row) => row.speaker === "guest").at(-1);
      if (lastGuest && lastGuest.id !== this.lastAnsweredId) {
        this.lastAnsweredId = lastGuest.id;
        store().setAnswerCount(store().answerCount + 1);
      }
      this.closing = store().answerCount >= INTERVIEW_ANSWER_LIMIT;
      const completed = new Set(rows.filter((row) => row.speaker === "ai" && !row.interrupted).map((row) => row.id));
      const notice = this.guard.observe(rows.slice(0, -1), completed);
      const messages = rows.filter((row) => row.speaker !== "host").map((row) => ({ role: row.speaker === "guest" ? "user" : "assistant", content: `${row.text}${row.interrupted ? "\n[Audio was interrupted; the guest may not have heard the full sentence.]" : ""}` }));
      if (notice) {
        const ledger = store().usageLedger;
        if (ledger) store().setUsageLedger({ ...ledger, dialogueGuidance: [...(ledger.dialogueGuidance ?? []), { afterItemId: notice.afterItemId, reason: notice.reason, atMs: this.options.elapsed() }] });
      }
      const data = await pipelineJson({ action: "reply", ...this.session, requestId: crypto.randomUUID(), messages, answerCount: store().answerCount, guidance: notice?.reason }, controller.signal);
      if (generation !== this.generation || this.ended) return;
      this.replyAbort = null;
      if (data.complete) this.closing = true;
      await this.speak(data.text);
      if (this.closing && !this.ended && generation === this.generation) this.options.onTimeLimit();
    } catch (error) { if (generation === this.generation && !this.ended) throw error; }
    finally { if (this.replyAbort === controller) this.replyAbort = null; }
  }

  private async speak(text: string) {
    if (this.ended) return;
    const generation = this.generation;
    this.speechAbort = new AbortController();
    const id = crypto.randomUUID();
    this.activeSpeech = { id, remaining: text };
    const sentences = text.match(/[\s\S]+?(?:[。！？!?]|\.(?=\s)|$)/gu) ?? [text];
    const requestSpeech = async (sentence: string) => {
      const response = await fetch("/api/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "speak", ...this.session, requestId: crypto.randomUUID(), text: sentence }), signal: this.speechAbort?.signal });
      if (!response.ok) throw new Error((await response.json()).error);
      return response;
    };
    let pending: Promise<Response> | null = null;
    let displayed = "";
    try {
      pending = requestSpeech(sentences[0]);
      for (let index = 0; index < sentences.length; index += 1) {
        if (!pending) break;
        const response = await pending;
        if (generation !== this.generation || this.ended) { await response.body?.cancel(); return; }
        pending = index + 1 < sentences.length ? requestSpeech(sentences[index + 1]) : null;
        void pending?.catch(() => undefined);
        this.activeSpeech = { id, remaining: sentences.slice(index).join("") };
        await this.player?.play(response, () => {
          const at = this.options.elapsed();
          displayed += sentences[index];
          if (store().utterances.some((row) => row.id === id)) this.update(id, { text: displayed });
          else store().setUtterances([...store().utterances, { id, speaker: "ai", text: displayed, startedAt: at, endedAt: at }]);
          store().setListeningPhase("ai_speaking");
        }, () => { if (generation === this.generation) this.update(id, { endedAt: this.options.elapsed() }); });
        if (generation !== this.generation || this.ended) return;
        this.activeSpeech = { id, remaining: sentences.slice(index + 1).join("") };
      }
      if (generation === this.generation && !this.ended) {
        this.update(id, { endedAt: this.options.elapsed() });
        store().setListeningPhase("guest_may_speak");
      }
    } catch (error) { if (generation === this.generation && !this.ended) { this.retrySpeech = text.slice(displayed.length) || text; throw error; } }
    finally { if (this.activeSpeech?.id === id) this.activeSpeech = null; void this.refreshCost().catch(() => undefined); }
  }

  async resume() {
    if (this.ended) return;
    await this.queue;
    store().setError(null); this.paused = false;
    if (!this.capture || !this.session) { this.fail(new Error("PIPELINE_SESSION")); return; }
    const audio = this.failedAudio;
    this.failedAudio = null;
    try {
      await this.options.context.resume();
      if (audio) {
        store().setInputState("transcribing");
        await this.transcribe(audio);
        while (this.deferredAudio.length) {
          const deferred = this.deferredAudio.shift()!;
          try { await this.transcribe(deferred); }
          catch (error) { this.failedAudio = deferred; throw error; }
        }
      }
      else if (this.retrySpeech) {
        const text = this.retrySpeech; this.retrySpeech = null; await this.speak(text);
        this.opening = false;
        if (this.closing && !this.ended) this.options.onTimeLimit();
      }
      else if (store().utterances.at(-1)?.speaker === "guest") await this.reply();
      else { store().setInputState("idle"); store().setListeningPhase("guest_may_speak"); }
    } catch (error) { this.failedAudio ??= audio; this.fail(error); }
  }

  stop() {
    if (!this.stopPromise) this.stopPromise = this.finish();
    return this.stopPromise;
  }

  private async finish() {
    this.ended = true;
    this.interrupt();
    this.detector?.flush();
    this.capture?.disconnect(); this.source?.disconnect();
    if (this.capture) this.capture.port.onmessage = null;
    if (this.poll) clearInterval(this.poll);
    if (this.limit) clearTimeout(this.limit);
    await this.queue;
    if (this.failedAudio) this.recordGap(this.failedAudio, "transcription_failed");
    for (const segment of this.deferredAudio) this.recordGap(segment, "not_transcribed");
    if (this.session) {
      try { const result = await pipelineJson({ action: "close", ...this.session }); applyPipelineCost(result.cost); }
      catch { await this.refreshCost().catch(() => undefined); }
    }
    if (!this.session || this.session.sessionId === store().usageSessionId) {
      store().setSessionEndsAt(null); store().setConnectionStatus("idle"); store().setListeningPhase("hidden");
    }
  }
}
