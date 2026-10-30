export function encodeInterviewWav(frames: Float32Array[]) {
  const length = frames.reduce((total, frame) => total + frame.length, 0);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
  write(0, "RIFF"); view.setUint32(4, 36 + length * 2, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const frame of frames) for (const sample of frame) {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clipped < 0 ? clipped * 32768 : clipped * 32767, true); offset += 2;
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
}

export class InterviewVoiceDetector {
  private preRoll: Float32Array[] = [];
  private frames: Float32Array[] = [];
  private active = false;
  private silenceMs = 0;
  private candidateMs = 0;
  private durationMs = 0;
  private noise = 0.003;

  constructor(private callbacks: { start: (preRollMs: number) => void; segment: (frames: Float32Array[], final: boolean, silenceMs: number) => void }) {}

  push(frame: Float32Array, aiSpeaking: boolean) {
    const duration = frame.length / 16;
    const rms = Math.sqrt(frame.reduce((total, sample) => total + sample * sample, 0) / frame.length);
    const voiced = rms > Math.max(aiSpeaking ? 0.025 : 0.012, this.noise * (aiSpeaking ? 4 : 3));
    if (!this.active) {
      this.preRoll.push(frame);
      while (this.preRoll.reduce((total, item) => total + item.length, 0) > 16000) this.preRoll.shift();
      if (!voiced && !aiSpeaking) this.noise = this.noise * 0.98 + rms * 0.02;
      this.candidateMs = voiced ? this.candidateMs + duration : 0;
      if (this.candidateMs < (aiSpeaking ? 600 : 400)) return;
      this.active = true;
      this.frames = [...this.preRoll];
      this.durationMs = this.frames.reduce((total, item) => total + item.length / 16, 0);
      this.preRoll = [];
      this.silenceMs = 0;
      this.callbacks.start(this.durationMs);
    } else {
      this.frames.push(frame);
      this.durationMs += duration;
      if (voiced) this.silenceMs = 0;
      else this.silenceMs += duration;
    }
    if (this.silenceMs >= 1100) {
      const frames = this.frames;
      const silenceMs = this.silenceMs;
      this.reset();
      this.callbacks.segment(frames, true, silenceMs);
    } else if (this.durationMs >= 35000) {
      this.callbacks.segment(this.frames, false, 0);
      this.frames = [];
      this.durationMs = 0;
    }
  }

  flush() {
    if (this.frames.length) this.callbacks.segment(this.frames, true, this.silenceMs);
    this.reset();
  }

  reset() {
    this.frames = []; this.preRoll = []; this.active = false;
    this.silenceMs = 0; this.candidateMs = 0; this.durationMs = 0;
  }
}

export class InterviewPcmPlayer {
  private destination: MediaStreamAudioDestinationNode;
  private sources = new Set<AudioBufferSourceNode>();
  private cursor = 0;
  private generation = 0;
  speaking = false;

  constructor(private context: AudioContext, attach: (stream: MediaStream) => void) {
    this.destination = context.createMediaStreamDestination();
    attach(this.destination.stream);
  }

  stop() {
    this.generation += 1;
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear(); this.cursor = 0; this.speaking = false;
  }

  async play(response: Response, onStart: () => void, onProgress: (seconds: number) => void) {
    const generation = this.generation;
    const rate = Number(response.headers.get("x-audio-sample-rate"));
    if (rate !== 44100 || !response.body) throw new Error("PIPELINE_PLAYBACK");
    const reader = response.body.getReader();
    let pending = new Uint8Array(0);
    let played = 0;
    let first = true;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (generation !== this.generation) { await reader.cancel(); return; }
        if (chunk.done) break;
        const bytes = new Uint8Array(pending.length + chunk.value.length);
        bytes.set(pending); bytes.set(chunk.value, pending.length);
        const count = Math.floor(bytes.length / 2);
        pending = bytes.slice(count * 2);
        if (!count) continue;
        const buffer = this.context.createBuffer(1, count, rate);
        const samples = buffer.getChannelData(0);
        const view = new DataView(bytes.buffer);
        for (let index = 0; index < count; index += 1) samples[index] = view.getInt16(index * 2, true) / 32768;
        const source = this.context.createBufferSource();
        source.buffer = buffer; source.connect(this.context.destination); source.connect(this.destination);
        this.sources.add(source);
        source.onended = () => { source.disconnect(); this.sources.delete(source); played += buffer.duration; onProgress(played); };
        this.cursor = Math.max(this.cursor, this.context.currentTime + (first ? 0.08 : 0.01));
        if (first) { this.speaking = true; onStart(); first = false; }
        source.start(this.cursor); this.cursor += buffer.duration;
      }
      if (pending.length || first) throw new Error("PIPELINE_PLAYBACK");
      while (this.sources.size && generation === this.generation) await new Promise((resolve) => setTimeout(resolve, 30));
      if (generation === this.generation) this.speaking = false;
    } finally { reader.releaseLock(); }
  }
}
