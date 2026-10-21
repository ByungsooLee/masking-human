/** 0.3s sync beep at 880Hz for external camera alignment. */
export async function playSlateBeep(ctx: AudioContext, destination: AudioNode): Promise<number> {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(destination);
  gain.connect(ctx.destination);
  const at = ctx.currentTime;
  osc.start(at);
  osc.stop(at + 0.3);
  await new Promise((r) => setTimeout(r, 320));
  return 300;
}

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "audio/webm;codecs=opus",
    "audio/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}
