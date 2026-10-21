/** Split display text into sentence-like chunks for staggered fade-in. */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed.match(/[^.!?。！？\n]+[.!?。！？]?/g);
  if (!parts?.length) return [trimmed];

  return parts.map((p) => p.trim()).filter(Boolean);
}
