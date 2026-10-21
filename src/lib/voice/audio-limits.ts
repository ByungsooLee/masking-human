export const AUDIO_BUCKET = "interview-audio-private";

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
]);

export function validateAudioMime(mime: string): boolean {
  return ALLOWED_AUDIO_MIME.has(mime.toLowerCase());
}

export function validateAudioSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_AUDIO_BYTES;
}

export function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4")) return "m4a";
  return "bin";
}
