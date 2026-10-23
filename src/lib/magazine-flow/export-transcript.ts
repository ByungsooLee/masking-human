import { utteranceToSubtitleCues } from "@/lib/recording/subtitle-segments";
import type { InterviewLanguage, MagazineDraft, PrepareState, TranscriptEntry } from "./types";
import { activeTranscript } from "./validate-guest-text";

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function srtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msPart = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msPart, 3)}`;
}

export function buildSessionJson(params: {
  prepare: PrepareState;
  transcript: TranscriptEntry[];
  draft: MagazineDraft | null;
  photoUrl: string | null;
  sessionStartedAt: number | null;
  slateAtMs: number | null;
}): string {
  return JSON.stringify(
    {
      version: 3,
      timing: { unit: "milliseconds", origin: "recording-start", slateMeaning: "sync-beep-onset", precision: "utterance-estimate; review against audio before publishing" },
      exportedAt: new Date().toISOString(),
      prepare: params.prepare,
      sessionStartedAt: params.sessionStartedAt,
      slateAtMs: params.slateAtMs,
      transcript: activeTranscript(params.transcript),
      draft: params.draft,
      hasPhoto: Boolean(params.photoUrl),
    },
    null,
    2,
  );
}

export function buildEditCsv(transcript: TranscriptEntry[], relativeToMs = 0): string {
  const cell = (value: string | number) => {
    const text = String(value);
    const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + [
    ["id", "speaker", "start_ms", "end_ms", "text"],
    ...activeTranscript(transcript).map((row) => [row.id, row.speaker, Math.max(0, Math.round(row.startedAt - relativeToMs)), Math.max(0, Math.round(row.endedAt - relativeToMs)), row.text]),
  ].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function buildSrt(
  transcript: TranscriptEntry[],
  language: InterviewLanguage = "ja",
  options?: { relativeToMs?: number },
): string {
  const offset = options?.relativeToMs ?? 0;
  const lines: string[] = [];
  let i = 1;
  for (const u of activeTranscript(transcript)) {
    const cues = utteranceToSubtitleCues({
      id: u.id,
      speaker: u.speaker,
      text: u.text,
      startedAt: Math.max(0, u.startedAt - offset),
      endedAt: Math.max(0, u.endedAt - offset),
      language,
    });
    for (const cue of cues) {
      lines.push(String(i));
      lines.push(`${srtTime(cue.startMs)} --> ${srtTime(cue.endMs)}`);
      const label = cue.speaker === "guest" ? "Guest" : "AI";
      lines.push(`${label}: ${cue.text}`);
      lines.push("");
      i++;
    }
  }
  return lines.join("\n");
}

export function buildYoutubeDescription(params: {
  draft: MagazineDraft;
  transcript: TranscriptEntry[];
  slateAtMs: number | null;
}): string {
  const offset = params.slateAtMs ?? 0;
  const head = [params.draft.title, "", params.draft.lead, ""].join("\n");
  const toc = activeTranscript(params.transcript)
    .map((u) => {
      const t = srtTime(Math.max(0, u.startedAt - offset));
      const who = u.speaker === "guest" ? "ゲスト" : "聞き手";
      return `${t} ${who}: ${u.text.slice(0, 48)}`;
    })
    .join("\n");
  return `${head}\n${toc}`;
}
