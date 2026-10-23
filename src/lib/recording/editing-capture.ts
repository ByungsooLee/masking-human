export type EditingEvent = { atMs: number; type: "chat_update" | "map_update" | "view_change" | "audio_state"; data: unknown };
export type AudioStem = { blob: Blob; startMs: number; stopMs: number };
export type AudioStems = { guest?: AudioStem; ai?: AudioStem; sampleRate: number; aiAttachedAtMs?: number; issues: string[] };

export class EditingCapture {
  private events: EditingEvent[] = [];
  private previous = new Map<string, string>();
  reset() { this.events = []; this.previous.clear(); }
  observe(type: EditingEvent["type"], data: unknown, atMs: number) {
    const serialized = JSON.stringify(data);
    if (this.previous.get(type) === serialized) return;
    this.previous.set(type, serialized);
    this.events.push({ atMs: Math.max(this.events.at(-1)?.atMs ?? 0, Math.max(0, Math.round(atMs))), type, data: JSON.parse(serialized) });
  }
  snapshot(): EditingEvent[] { return JSON.parse(JSON.stringify(this.events)); }
}

type RunningStem = { recorder: MediaRecorder; chunks: Blob[]; startMs: number; finished: Promise<AudioStem | undefined>; finish: () => void };
export class AudioStemCapture {
  private guest: RunningStem | undefined;
  private ai: RunningStem | undefined;
  private aiDestination: MediaStreamAudioDestinationNode;
  private issues: string[] = [];
  private aiAt: number | undefined;
  private stopping: Promise<AudioStems> | null = null;
  constructor(private context: AudioContext, mic: MediaStream, private elapsed: () => number) {
    const guestDestination = context.createMediaStreamDestination();
    this.aiDestination = context.createMediaStreamDestination();
    context.createMediaStreamSource(new MediaStream(mic.getAudioTracks())).connect(guestDestination);
    this.guest = this.start("guest", guestDestination.stream);
    this.ai = this.start("ai", this.aiDestination.stream);
  }
  private start(kind: string, stream: MediaStream): RunningStem | undefined {
    try {
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const startMs = this.elapsed();
      let finish!: () => void;
      const finished = new Promise<AudioStem | undefined>((resolve) => { finish = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        resolve(blob.size ? { blob, startMs, stopMs: this.elapsed() } : undefined);
      }; });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = finish;
      recorder.onerror = () => { this.issues.push(`${kind}_recorder_error`); };
      recorder.start(1000);
      return { recorder, chunks, startMs, finished, finish };
    } catch { this.issues.push(`${kind}_stem_unavailable`); return undefined; }
  }
  attach(source: MediaStreamAudioSourceNode) { source.connect(this.aiDestination); this.aiAt = this.elapsed(); }
  stop(): Promise<AudioStems> {
    if (!this.stopping) this.stopping = this.finishAll();
    return this.stopping;
  }
  private async finishAll(): Promise<AudioStems> {
    for (const track of [this.guest, this.ai]) {
      if (!track) continue;
      if (track.recorder.state !== "inactive") track.recorder.stop();
    }
    const [guest, ai] = await Promise.all([this.guest?.finished, this.ai?.finished]);
    return { guest, ai: this.aiAt === undefined ? undefined : ai, aiAttachedAtMs: this.aiAt, sampleRate: this.context.sampleRate, issues: [...this.issues, ...(this.aiAt === undefined ? ["ai_audio_not_attached"] : [])] };
  }
}
