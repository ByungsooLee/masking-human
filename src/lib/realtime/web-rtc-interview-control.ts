import { INTERVIEW_ANSWER_LIMIT } from "./interview-progress";

type RequestKind = "opening" | "reply" | "closing";
type ResponseState = { kind: RequestKind; id: string | null; done: boolean; drained: boolean; started: boolean; cancelled: boolean };
type ServerEvent = { type: string; item_id?: string; transcript?: string; response_id?: string; response?: { id?: string; status?: string }; audio_start_ms?: number; audio_end_ms?: number };

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
  private openingComplete = false;
  private closeForTime = false;

  constructor(private callbacks: {
    request: (kind: RequestKind, answers: number) => void;
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

  private issue(kind: RequestKind) {
    this.active = { kind, id: null, done: false, drained: false, started: false, cancelled: false };
    this.callbacks.mute(kind !== "reply");
    this.callbacks.phase("waiting_ai");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fail("playback"), 90_000);
    try { this.callbacks.request(kind, this.answered); }
    catch { this.fail("response"); }
  }

  private next() {
    if (this.active || this.paused || this.stopped || !this.pending || !this.openingComplete) return;
    this.pending = false;
    this.answered += 1;
    this.callbacks.count(this.answered);
    this.issue(this.answered >= INTERVIEW_ANSWER_LIMIT || this.closeForTime ? "closing" : "reply");
  }

  private fail(code: "response" | "playback") {
    if (this.stopped || this.paused) return;
    this.failedKind = this.active?.kind ?? "reply";
    this.active = null;
    this.paused = true;
    if (this.timer) clearTimeout(this.timer);
    this.callbacks.mute(true);
    this.callbacks.phase("hidden");
    this.callbacks.error(code);
  }

  resume() {
    if (!this.paused || this.stopped || !this.failedKind) return;
    this.paused = false;
    this.pending = false;
    const kind = this.failedKind;
    this.failedKind = null;
    this.callbacks.error(null);
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
    this.callbacks.mute(false);
    this.callbacks.phase("guest_may_speak");
    this.next();
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
      if (!text || this.seen.has(event.item_id) || this.active?.kind === "closing") return;
      this.seen.add(event.item_id);
      const speech = this.speech.get(event.item_id);
      this.speech.delete(event.item_id);
      if (speech?.duringAi && speech.duration !== undefined && speech.duration <= 1200 && /^(?:はい|うん|ええ|そうですね|うんうん|yes|yeah|mhm|uh huh)[。.!！\s]*$/iu.test(text)) return;
      if (!this.paused) this.callbacks.error(null);
      this.pending = true;
      this.next();
    }
    if (event.type === "error") { if (this.active) this.fail("response"); return; }
    const response = this.active;
    if (!response) return;
    if (event.type === "response.created" && !response.id && event.response?.id) response.id = event.response.id;
    if (event.type === "response.done" && event.response?.id === response.id) {
      if (!["completed", "cancelled"].includes(event.response.status ?? "")) { this.fail("response"); return; }
      response.done = true;
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
      this.callbacks.audioStop();
      if (event.type === "output_audio_buffer.cleared" && response.kind !== "reply") { this.fail("playback"); return; }
      this.settle();
    }
  }
}
