import { MOCK_CLIMAX_UTTERANCE_ID } from "@/lib/realtime/mock-conversation";
import type { MagazineDraft, PrepareState, QaPair, TranscriptEntry } from "./types";
import { activeTranscript, validateMagazineDraft } from "./validate-guest-text";

function guestLines(transcript: TranscriptEntry[]) {
  return activeTranscript(transcript).filter((u) => u.speaker === "guest");
}

function pickHero(guests: TranscriptEntry[]): TranscriptEntry {
  const climax = guests.find((g) => g.id === MOCK_CLIMAX_UTTERANCE_ID);
  if (climax) return climax;
  return guests.reduce((best, g) => (g.text.length > best.text.length ? g : best), guests[0]!);
}

function buildTitle(prepare: Pick<PrepareState, "guestName" | "place" | "language">, heroText: string): string {
  if (prepare.guestName.trim()) return prepare.guestName.trim();
  const parts = heroText
    .split(/[。．.!！?？\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const headline = parts.find((s) => s.length >= 8) ?? parts[0] ?? heroText.trim();
  if (headline.length >= 4) return headline.length > 28 ? `${headline.slice(0, 28)}…` : headline;
  if (prepare.place.trim()) return prepare.language === "en" ? `Care in ${prepare.place.trim()}` : `${prepare.place.trim()}の手入れ`;
  return heroText.trim().slice(0, 24);
}

function buildLead(prepare: Pick<PrepareState, "guestName" | "place" | "language">): string {
  if (prepare.language === "en") {
    return prepare.place
      ? `On the street in ${prepare.place}, someone spoke about daily care.`
      : "A short conversation about everyday care.";
  }
  const who = prepare.guestName.trim() ? `${prepare.guestName}さん` : "通りすがりの人";
  const where = prepare.place.trim() ? `${prepare.place}で` : "街で";
  return `${where}、${who}に手入れの習慣を聞いた。`;
}

export function buildQaFromTranscript(transcript: TranscriptEntry[]): QaPair[] {
  const rows = activeTranscript(transcript);
  const pairs: QaPair[] = [];
  let lastAi: TranscriptEntry | null = null;
  for (const u of rows) {
    if (u.speaker === "ai") lastAi = u;
    else if (u.speaker === "guest" && lastAi) {
      pairs.push({
        questionUtteranceId: lastAi.id,
        questionText: lastAi.text,
        answer: { utteranceId: u.id, text: u.text },
      });
      lastAi = null;
    }
  }
  return pairs.slice(0, 4);
}

/** Offline fallback when suggest-copy API is unavailable. */
export function buildDraftFromTranscript(
  transcript: TranscriptEntry[],
  prepare: Pick<PrepareState, "guestName" | "place" | "language">,
): MagazineDraft | null {
  const guests = guestLines(transcript);
  if (guests.length === 0) return null;

  const hero = pickHero(guests);
  const qa = buildQaFromTranscript(transcript);
  if (qa.length < 2) return null;

  const draft: MagazineDraft = {
    title: buildTitle(prepare, hero.text),
    lead: buildLead(prepare),
    heroQuote: { utteranceId: hero.id, text: hero.text },
    qa,
    pullQuote: qa[0]?.answer ?? null,
  };

  if (!validateMagazineDraft(draft, transcript)) return null;
  return draft;
}

export async function resolveMagazineDraft(params: {
  transcript: TranscriptEntry[];
  prepare: Pick<PrepareState, "guestName" | "place" | "language">;
}): Promise<MagazineDraft | null> {
  const rows = activeTranscript(params.transcript);
  const guests = rows.filter((u) => u.speaker === "guest");
  const aiLines = rows.filter((u) => u.speaker === "ai");
  if (guests.length === 0) return null;

  try {
    const res = await fetch("/api/magazine/suggest-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: params.prepare.language,
        guestUtterances: guests.map((g) => ({ id: g.id, text: g.text })),
        aiUtterances: aiLines.map((a) => ({ id: a.id, text: a.text })),
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as MagazineDraft;
      if (validateMagazineDraft(data, params.transcript)) return data;
    }
  } catch {
    /* local */
  }

  return buildDraftFromTranscript(params.transcript, params.prepare);
}
