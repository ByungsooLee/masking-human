export const INTERVIEW_STAGES = [
  "observation",
  "motivation",
  "perspective_shift",
  "reflection",
  "closing",
] as const;

export type InterviewStage = (typeof INTERVIEW_STAGES)[number];

export const THEME_IDS = ["A", "B", "C", "D", "E"] as const;

export type InterviewThemeId = (typeof THEME_IDS)[number];

export const QUESTION_TECHNIQUES = [
  "concretize",
  "explore_reasons",
  "compare_values",
  "counterfactual",
  "past_future_compare",
  "reflect_back",
] as const;

export type QuestionTechnique = (typeof QUESTION_TECHNIQUES)[number];

export const STAGE_RECOMMENDATIONS = ["stay", "advance", "close"] as const;

export type StageRecommendation = (typeof STAGE_RECOMMENDATIONS)[number];

export const PARTICIPANT_COMMANDS = [
  "none",
  "skip",
  "change_topic",
  "end",
  "change_language",
] as const;

export type ParticipantCommand = (typeof PARTICIPANT_COMMANDS)[number];

export type SessionStatus = "active" | "completed" | "ended_early";

export type PublishStatus = "private" | "pending_review" | "published";

export type { ConsentType, SessionConsents } from "./consent";

export interface TurnRecord {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  stage: InterviewStage;
  questionNumber?: number;
  technique?: QuestionTechnique;
  timestamp: string;
  /** Language used for this turn (Phase 3+ publishing / subtitles). */
  language?: import("./languages").InterviewLanguage;
}

export interface AccumulatorEntry {
  id: string;
  text: string;
  sourceUtteranceId: string | null;
}

export interface HypothesisEntry extends AccumulatorEntry {
  confirmed: boolean;
  rejected: boolean;
}

export interface SessionAccumulator {
  facts: AccumulatorEntry[];
  participant_stated_values: AccumulatorEntry[];
  hypotheses: HypothesisEntry[];
  confirmed_insights: AccumulatorEntry[];
}

export interface StageDecisionRecord {
  recommendation: StageRecommendation;
  reason: string;
  appliedStage: InterviewStage;
  timestamp: string;
}

export interface IdempotencyRecord {
  assistantText: string;
  usedFallback: boolean;
  provider: string;
  error?: string;
}

export type { InterviewLanguage, LanguageSettings } from "./languages";
export type { LanguageChangeRecord } from "./languages";

export interface InterviewSession {
  id: string;
  participantId: string;
  /** SHA-256 hex — never sent to client after initial issue */
  participantTokenHash: string;
  themeId: InterviewThemeId;
  language: import("./languages").LanguageSettings;
  languageHistory: import("./languages").LanguageChangeRecord[];
  consents: import("./consent").SessionConsents;
  publishStatus: PublishStatus;
  status: SessionStatus;
  currentStage: InterviewStage;
  stageQuestionCount: number;
  totalQuestionsAsked: number;
  maxQuestions: number;
  targetDurationMinutes: number;
  maxDurationMinutes: number;
  startedAt: string;
  endedAt?: string;
  deletedAt?: string;
  deletionRequestedAt?: string;
  turns: TurnRecord[];
  accumulator: SessionAccumulator;
  closingParticipantWords?: string;
  /** Topics the participant asked not to explore further */
  declinedTopics: string[];
  awaitingClosingAnswer: boolean;
  stageDecisions: StageDecisionRecord[];
  idempotencyCache: Record<string, IdempotencyRecord>;
  /** In-process lock token — not exposed to clients */
  _lockHeld?: boolean;
}

export interface InterviewConfig {
  maxQuestions: number;
  targetDurationMinutes: number;
  maxDurationMinutes: number;
  defaultLanguage: import("./languages").InterviewLanguage;
}

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  maxQuestions: 8,
  targetDurationMinutes: 5,
  maxDurationMinutes: 8,
  defaultLanguage: "en",
};
