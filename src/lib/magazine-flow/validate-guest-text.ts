import type { MagazineDraft, TranscriptEntry } from "./types";

const FILLER =
  /(えー+|あの+|その+|まあ+|うーん+|…+|\.{3,}|\s+)(?=\s|$|[、。])/gu;

export function normalizeForMatch(text: string): string {
  return text.replace(FILLER, "").replace(/\s+/g, " ").trim();
}

function guestById(transcript: TranscriptEntry[], id: string): TranscriptEntry | undefined {
  return transcript.find((u) => u.id === id && u.speaker === "guest" && !u.excluded);
}

export function effectiveGuestText(row: TranscriptEntry): string {
  return row.text;
}

/** Edited text must still be a substring of the guest source (after filler-tolerant normalize). */
export function isAllowedGuestEdit(source: string, edited: string): boolean {
  const s = normalizeForMatch(source);
  const e = normalizeForMatch(edited);
  if (!e) return false;
  return s.includes(e) || e === s;
}

export function validateQuoteRef(
  ref: { utteranceId: string; text: string },
  transcript: TranscriptEntry[],
): boolean {
  const row = guestById(transcript, ref.utteranceId);
  if (!row) return false;
  return isAllowedGuestEdit(row.originalText ?? row.text, ref.text);
}

export function validateMagazineDraft(draft: MagazineDraft, transcript: TranscriptEntry[]): boolean {
  if (!draft.title.trim() || !draft.lead.trim()) return false;
  if (!validateQuoteRef(draft.heroQuote, transcript)) return false;
  if (draft.qa.length < 2 || draft.qa.length > 4) return false;
  if (!draft.qa.every((q) => q.questionText.trim() && validateQuoteRef(q.answer, transcript))) return false;
  if (draft.pullQuote && !validateQuoteRef(draft.pullQuote, transcript)) return false;
  return true;
}

export function activeTranscript(transcript: TranscriptEntry[]): TranscriptEntry[] {
  return transcript.filter((u) => !u.excluded);
}
