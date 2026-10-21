import type { Utterance } from "@/lib/realtime/types";

/** Longest guest line (min 12 chars) for magazine highlight. */
export function pickFeaturedGuestQuote(utterances: Utterance[]): string | null {
  const guest = utterances.filter((u) => u.speaker === "guest" && u.text.trim().length >= 12);
  if (!guest.length) return null;
  return guest.reduce((best, u) => (u.text.length > best.text.length ? u : best)).text;
}

export function isClimaxGuestUtterance(utterance: Utterance, utterances: Utterance[]): boolean {
  const featured = pickFeaturedGuestQuote(utterances);
  return utterance.speaker === "guest" && featured !== null && utterance.text === featured;
}

export function isMostlyJapanese(text: string): boolean {
  const ja = (text.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) ?? []).length;
  const lat = (text.match(/[A-Za-z]/g) ?? []).length;
  return ja >= lat;
}
