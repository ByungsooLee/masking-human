import type { InterviewLanguage } from "./languages";

/**
 * Phase 3+ content generation — data shapes only (no generation logic yet).
 * Keeps participant originals and human-reviewable translations separate.
 */

export interface UtteranceOriginal {
  utteranceId: string;
  sessionId: string;
  speaker: "participant" | "interviewer";
  textOriginal: string;
  language: InterviewLanguage | "mixed";
  startMs?: number;
  endMs?: number;
  audioAssetId?: string;
}

export interface TranslationPair {
  utteranceId: string;
  sourceLanguage: InterviewLanguage | "mixed";
  targetLanguage: InterviewLanguage;
  textTranslated: string;
  /** draft | participant_confirmed | participant_edited */
  reviewStatus: "draft" | "participant_confirmed" | "participant_edited";
  reviewedAt?: string;
}

export interface SessionContentBundle {
  sessionId: string;
  utterances: UtteranceOriginal[];
  summaryOriginal: { language: InterviewLanguage; text: string };
  summaryEnglish: { text: string; derivedFrom: "translation" | "bilingual_session" };
  instagramCaptionEnglish: { text: string; containsNonQuotedCopy: boolean };
  subtitlesOriginal: { format: "srt"; language: InterviewLanguage; body: string };
  subtitlesEnglish: { format: "srt"; body: string };
  translationPairs: TranslationPair[];
}
