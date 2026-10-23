/** Deterministic demo fixture: 0.3s sync tone followed by silence, never real input. */
export function createDemoAudio(durationMs: number, withBeep: boolean): Blob {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 660_000) {
    throw new Error("Invalid demo audio duration");
  }
  const sampleRate = 8_000;
  const frames = Math.ceil(durationMs * sampleRate / 1_000);
  const buffer = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(buffer);
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i));
  };
  text(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); text(8, "WAVE");
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, frames * 2, true);
  if (withBeep) {
    for (let frame = 0; frame < Math.min(frames, sampleRate * 0.3); frame++) {
      view.setInt16(44 + frame * 2, Math.round(Math.sin(2 * Math.PI * 880 * frame / sampleRate) * 0.15 * 32767), true);
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}
