import type { Utterance } from "@/lib/realtime/types";

export type MagazineFlowPhase =
  | "prepare"
  | "slate"
  | "conversation"
  | "review"
  | "magazine"
  | "publish";

export type ExportAspect = "4:5" | "9:16" | "16:9";

export type InterviewLanguage = "ja" | "en";

export type InterviewerAgentId = "default" | "reflective";

export type InterviewerProfile = {
  age: "young" | "adult" | "senior";
  gender: "woman" | "man" | "neutral";
};

export type FlowConsents = {
  aiConversation: boolean;
  photoVideo: boolean;
  recording: boolean;
  snsPublish: boolean;
};

export type PrepareState = {
  guestName: string;
  place: string;
  language: InterviewLanguage;
  agentId: InterviewerAgentId;
  interviewerProfile?: InterviewerProfile;
  realtimeModel?: import("@/lib/realtime/model-options").SelectableRealtimeModel;
  consents: FlowConsents;
  includeCamera: boolean;
};

export type GuestQuoteRef = {
  utteranceId: string;
  text: string;
};

export type QaPair = {
  questionUtteranceId: string;
  questionText: string;
  answer: GuestQuoteRef;
};

export type MagazineLayoutKind = "quote-led" | "dialogue" | "spread";

export type MagazineDraft = {
  layout?: MagazineLayoutKind;
  edition?: "porcelain" | "ink" | "sage";
  title: string;
  lead: string;
  heroQuote: GuestQuoteRef;
  qa: QaPair[];
  pullQuote?: GuestQuoteRef | null;
  /** @deprecated use qa */
  excerpts?: GuestQuoteRef[];
};

export type FlowTranscriptEntry = Utterance & {
  originalText?: string;
  excluded?: boolean;
};

export type TranscriptEntry = FlowTranscriptEntry;

export const EXPORT_PIXELS: Record<ExportAspect, { width: number; height: number }> = {
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

export function layoutForAspect(aspect: ExportAspect): "page" | "spread" {
  return aspect === "16:9" ? "spread" : "page";
}

export function pickMagazineLayout(draft: MagazineDraft, aspect: ExportAspect): MagazineLayoutKind {
  if (aspect === "16:9") return "spread";
  if (draft.qa.length >= 3) return "dialogue";
  if (draft.heroQuote.text.length <= 28) return "quote-led";
  return "dialogue";
}
