import type { Speaker } from "@/lib/realtime/types";

export type SubtitleCue = {
  startMs: number;
  endMs: number;
  speaker: Speaker;
  text: string;
  utteranceId: string;
};

const JA_CHUNK = 20;

function splitJa(text: string): string[] {
  const t = text.trim();
  if (t.length <= JA_CHUNK) return [t];
  const parts: string[] = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + JA_CHUNK, t.length);
    if (end < t.length) {
      const slice = t.slice(i, end);
      const punct = slice.search(/[、。！？]/);
      if (punct >= 0 && punct < slice.length - 1) end = i + punct + 1;
    }
    parts.push(t.slice(i, end).trim());
    i = end;
  }
  return parts.filter(Boolean);
}

function splitEn(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length <= 12) return [text.trim()];
  const parts: string[] = [];
  for (let i = 0; i < words.length; i += 12) {
    parts.push(words.slice(i, i + 12).join(" "));
  }
  return parts;
}

export function splitUtteranceText(text: string, language: "ja" | "en"): string[] {
  return language === "ja" ? splitJa(text) : splitEn(text);
}

export function utteranceToSubtitleCues(params: {
  id: string;
  speaker: Speaker;
  text: string;
  startedAt: number;
  endedAt: number;
  language: "ja" | "en";
}): SubtitleCue[] {
  const duration = Math.max(params.endedAt - params.startedAt, 800);
  const chunks = splitUtteranceText(params.text, params.language);
  if (chunks.length === 1) {
    return [
      {
        utteranceId: params.id,
        speaker: params.speaker,
        text: chunks[0]!,
        startMs: params.startedAt,
        endMs: params.endedAt,
      },
    ];
  }
  const totalChars = chunks.reduce((n, c) => n + c.length, 0);
  let cursor = params.startedAt;
  return chunks.map((text) => {
    const share = text.length / totalChars;
    const segDur = Math.max(Math.round(duration * share), 400);
    const startMs = cursor;
    const endMs = cursor + segDur;
    cursor = endMs;
    return {
      utteranceId: params.id,
      speaker: params.speaker,
      text,
      startMs,
      endMs,
    };
  });
}
