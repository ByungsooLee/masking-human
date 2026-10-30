import { INTERVIEW_ANSWER_LIMIT } from "./interview-progress";

type RequestKind = "opening" | "reply" | "closing";
type ResponseState = { kind: RequestKind; request: string; id: string | null; done: boolean; drained: boolean; started: boolean; cancelled: boolean; cleared: boolean };
type ServerEvent = { type: string; item_id?: string; transcript?: string; response_id?: string; response?: { id?: string; status?: string; metadata?: Record<string, string> | null }; audio_start_ms?: number; audio_end_ms?: number; error?: { event_id?: string } };
export type InterviewResponseRequest = { kind: RequestKind; answers: number; eventId: string; restate: boolean };

const ACKNOWLEDGMENT = /^(?:はい|うん|ええ|そうですね|うんうん|yes|yeah|mhm|uh huh)[。.!！\s]*$/iu;

export class WebRtcInterviewControl {
  private active: ResponseState | null = null;
  private seen = new Set<string>();
  private ignored = new Set<string>();
  private speech = new Map<string, { duringAi: boolean; start?: number; duration?: number }>();
  private pending = false;
  private paused = false;
  private failedKind: RequestKind | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private disposed = false;
  private answered = 0;
  private requests = 0;
  private openingComplete = false;
  private closeForTime = false;
  private cut = false;
  private heardNonAnswer = false;
  private restated = false;

  constructor(private callbacks: {
    request: (request: InterviewResponseRequest) => void;
    cancel: (target: { responseId: string | null; clearAudio: boolean }) => void;
    mute: (muted: boolean) => void;
    phase: (phase: "waiting_ai" | "ai_speaking" | "guest_may_speak" | "hidden") => void;
    count: (answers: number) => void;
    error: (code: "response" | "playback" | null) => void;
    finish: () => void;
    deleteItem: (id: string) => void;
    audioStart: () => void;
    audioStop: () => void;
  }) {}

  isIgnored(id: string) { return this.ignored.has(id); }
  closeSoon() { this.closeForTime = true; }

  start() { this.issue("opening"); }

  transportError() { if (this.active) this.fail("response"); }

  private issue(kind: RequestKind, restate = false) {
    this.requests += 1;
    const request = `interview_request_${this.requests}`;
    this.cut = false;
    this.heardNonAnswer = false;
    this.active = { kind, request, id: null, done: false, drained: false, started: false, cancelled: false, cleared: false };
    this.callbacks.mute(kind !== "reply");
    this.callbacks.phase("waiting_ai");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fail("playback"), 90_000);
    try { this.callbacks.request({ kind, answers: this.answered, eventId: request, restate }); }
    catch { this.fail("response"); }
  }

  private next() {
    if (this.active || this.paused || this.stopped || !this.pending || !this.openingComplete) return;
    this.pending = false;
    this.restated = false;
    this.answered += 1;
    this.callbacks.count(this.answered);
    this.issue(this.answered >= INTERVIEW_ANSWER_LIMIT || this.closeForTime ? "closing" : "reply");
  }

  private restate() {
    if (this.active || this.paused || this.stopped || this.pending || !this.cut || !this.heardNonAnswer || this.restated) return;
    this.restated = true;
    this.issue("reply", true);
  }

  private fail(code: "response" | "playback") {
    if (this.stopped || this.paused) return;
    const response = this.active;
    this.failedKind = response?.kind ?? "reply";
    this.active = null;
    this.paused = true;
    if (this.timer) clearTimeout(this.timer);
    if (response) this.callbacks.cancel({ responseId: response.id && !response.done ? response.id : null, clearAudio: response.started && !response.drained });
    this.callbacks.mute(true);
    this.callbacks.phase("hidden");
    this.callbacks.error(code);
  }

  resume() {
    if (!this.paused || this.stopped || !this.failedKind) return;
    const kind = this.failedKind;
    this.failedKind = null;
    this.paused = false;
    this.callbacks.error(null);
    if (kind === "reply" && this.pending) { this.next(); return; }
    this.pending = false;
    this.issue(kind);
  }

  stop() {
    this.disposed = true;
    this.stopped = true;
    this.active = null;
    if (this.timer) clearTimeout(this.timer);
  }

  private settle() {
    const response = this.active;
    if (!response?.done || (!response.drained && !(response.cancelled && !response.started))) return;
    if (this.timer) clearTimeout(this.timer);
    this.active = null;
    if (response.kind === "opening") this.openingComplete = true;
    if (response.kind === "closing") {
      this.stopped = true;
      this.callbacks.phase("hidden");
      queueMicrotask(() => { if (!this.disposed) this.callbacks.finish(); });
      return;
    }
    if (response.cleared) this.cut = true;
    this.callbacks.mute(false);
    this.callbacks.phase("guest_may_speak");
    this.next();
    this.restate();
  }

  handle(event: ServerEvent) {
    if (this.stopped) return;
    if (event.type === "input_audio_buffer.speech_started" && event.item_id) {
      if (!this.openingComplete) this.ignored.add(event.item_id);
      this.speech.set(event.item_id, { duringAi: Boolean(this.active?.started && !this.active.drained), start: event.audio_start_ms });
    }
    if (event.type === "input_audio_buffer.speech_stopped" && event.item_id) {
      const speech = this.speech.get(event.item_id);
      if (speech?.start !== undefined && event.audio_end_ms !== undefined) speech.duration = event.audio_end_ms - speech.start;
    }
    if (event.type === "conversation.item.input_audio_transcription.completed" && event.item_id) {
      if (!this.openingComplete || this.ignored.has(event.item_id)) {
        this.ignored.add(event.item_id);
        this.callbacks.deleteItem(event.item_id);
        return;
      }
      const text = event.transcript?.trim();
      const speech = this.speech.get(event.item_id);
      this.speech.delete(event.item_id);
      if (this.seen.has(event.item_id) || this.active?.kind === "closing") return;
      if (!text || (speech?.duringAi && speech.duration !== undefined && speech.duration <= 1200 && ACKNOWLEDGMENT.test(text))) {
        if (speech?.duringAi) { this.heardNonAnswer = true; this.restate(); }
        return;
      }
      this.seen.add(event.item_id);
      if (!this.paused) this.callbacks.error(null);
      this.pending = true;
      this.cut = false;
      this.heardNonAnswer = false;
      this.next();
    }
    const response = this.active;
    if (event.type === "error") {
      if (response && !response.id && event.error?.event_id === response.request) this.fail("response");
      return;
    }
    if (event.type === "response.created" && event.response?.id) {
      const tag = event.response.metadata?.interview_request;
      if (response && !response.id && (tag === undefined || tag === response.request)) response.id = event.response.id;
      else if (tag !== undefined) this.callbacks.cancel({ responseId: event.response.id, clearAudio: true });
      return;
    }
    if (!response) return;
    if (event.type === "response.done" && event.response?.id === response.id) {
      response.done = true;
      if (!["completed", "cancelled"].includes(event.response.status ?? "")) { this.fail("response"); return; }
      response.cancelled = event.response.status === "cancelled";
      if (response.cancelled && response.kind !== "reply") { this.fail("response"); return; }
      this.settle();
    }
    if (!event.response_id || event.response_id !== response.id) return;
    if (event.type === "output_audio_buffer.started") {
      response.started = true;
      this.callbacks.phase("ai_speaking");
      this.callbacks.audioStart();
    }
    if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") {
      response.drained = true;
      response.cleared = event.type === "output_audio_buffer.cleared";
      this.callbacks.audioStop();
      if (response.cleared && response.kind !== "reply") { this.fail("playback"); return; }
      this.settle();
    }
  }
}
