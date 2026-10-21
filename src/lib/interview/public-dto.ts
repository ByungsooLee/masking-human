import type {
  InterviewSession,
  InterviewStage,
  InterviewThemeId,
  SessionStatus,
  TurnRecord,
} from "./types";
import type { LanguageSettings } from "./languages";

export interface PublicTurn {
  id: string;
  role: "assistant" | "user";
  text: string;
  stage: InterviewStage;
  questionNumber?: number;
  timestamp: string;
  language?: string;
}

export interface PublicInterviewSession {
  id: string;
  themeId: InterviewThemeId;
  language: LanguageSettings;
  status: SessionStatus;
  currentStage: InterviewStage;
  totalQuestionsAsked: number;
  maxQuestions: number;
  startedAt: string;
  endedAt?: string;
  turns: PublicTurn[];
  closingParticipantWords?: string;
  awaitingClosingAnswer: boolean;
}

export interface PublicTurnMeta {
  provider: string;
  usedFallback: boolean;
  error?: string;
}

export interface PublicInterviewResponse {
  session: PublicInterviewSession;
  message: string;
  meta: PublicTurnMeta;
}

export function toPublicSession(session: InterviewSession): PublicInterviewSession {
  return {
    id: session.id,
    themeId: session.themeId,
    language: session.language,
    status: session.status,
    currentStage: session.currentStage,
    totalQuestionsAsked: session.totalQuestionsAsked,
    maxQuestions: session.maxQuestions,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    closingParticipantWords: session.closingParticipantWords,
    awaitingClosingAnswer: session.awaitingClosingAnswer,
    turns: session.turns
      .filter((t): t is TurnRecord & { role: "assistant" | "user" } =>
        t.role === "assistant" || t.role === "user",
      )
      .map((t) => ({
        id: t.id,
        role: t.role,
        text: t.text,
        stage: t.stage,
        questionNumber: t.questionNumber,
        timestamp: t.timestamp,
        language: t.language,
      })),
  };
}
