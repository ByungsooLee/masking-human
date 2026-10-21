import { randomUUID } from "crypto";
import type {
  InterviewSession,
  InterviewThemeId,
  ParticipantCommand,
  TurnRecord,
} from "./types";
import { DEFAULT_INTERVIEW_CONFIG } from "./types";
import type { InterviewTurnOutput } from "./schemas";
import {
  applyTurnAnalysis,
  reconcileHypothesesWithUserReply,
} from "./accumulator";
import { detectDeclinedTopicInUserMessage, mergeSafetyChecks } from "./safety";
import { getFallbackQuestion } from "./fallback-questions";
import { getEngineMessages } from "./engine-messages";
import {
  defaultLanguageSettings,
  parseInterviewLanguage,
  type InterviewLanguage,
  type LanguageSettings,
} from "./languages";
import {
  applyStageTransition,
  mustCompleteWithoutNewQuestion,
  resolveStageTransition,
} from "./stage-decision";
import type { InterviewModelProvider } from "./providers/types";
import { ProviderError } from "./providers/types";
import { hashParticipantToken } from "./access-control";

function nowIso(): string {
  return new Date().toISOString();
}

function msg(session: InterviewSession) {
  return getEngineMessages(session.language.interviewLanguage);
}

export function createEmptySession(
  themeId: InterviewThemeId,
  languageSettings: LanguageSettings = defaultLanguageSettings(),
  participantId?: string,
  participantTokenPlain?: string,
): InterviewSession {
  const token = participantTokenPlain ?? randomUUID();
  return {
    id: randomUUID(),
    participantId: participantId ?? randomUUID(),
    participantTokenHash: hashParticipantToken(token),
    themeId,
    language: languageSettings,
    consents: {},
    publishStatus: "private",
    languageHistory: [],
    status: "active",
    currentStage: "observation",
    stageQuestionCount: 0,
    totalQuestionsAsked: 0,
    maxQuestions: DEFAULT_INTERVIEW_CONFIG.maxQuestions,
    targetDurationMinutes: DEFAULT_INTERVIEW_CONFIG.targetDurationMinutes,
    maxDurationMinutes: DEFAULT_INTERVIEW_CONFIG.maxDurationMinutes,
    startedAt: nowIso(),
    turns: [],
    accumulator: {
      facts: [],
      participant_stated_values: [],
      hypotheses: [],
      confirmed_insights: [],
    },
    declinedTopics: [],
    awaitingClosingAnswer: false,
    stageDecisions: [],
    idempotencyCache: {},
  };
}

function appendTurn(
  session: InterviewSession,
  turn: Omit<TurnRecord, "id" | "timestamp">,
): TurnRecord {
  const record: TurnRecord = {
    ...turn,
    language: turn.language ?? session.language.interviewLanguage,
    id: randomUUID(),
    timestamp: nowIso(),
  };
  session.turns.push(record);
  return record;
}

function finalizeQuestionText(
  session: InterviewSession,
  output: InterviewTurnOutput,
): { text: string; usedFallback: boolean } {
  let text = output.assistant_message.question_text.trim();
  if (output.assistant_message.is_hypothesis && output.assistant_message.hypothesis_invitation) {
    text = `${text} ${output.assistant_message.hypothesis_invitation}`.trim();
  }

  const lang = session.language.interviewLanguage;
  if (!output.internal_analysis.deepen_ok && session.declinedTopics.length > 0) {
    return {
      text: getFallbackQuestion(session.currentStage, lang),
      usedFallback: true,
    };
  }

  const safety = mergeSafetyChecks(session, output.safety, text);
  if (!safety.ok) {
    return { text: getFallbackQuestion(session.currentStage, lang), usedFallback: true };
  }
  return { text, usedFallback: false };
}

function questionsRemainingBeforeNext(session: InterviewSession): number {
  return session.maxQuestions - session.totalQuestionsAsked;
}

function reserveClosingIfNeeded(session: InterviewSession): void {
  if (questionsRemainingBeforeNext(session) === 1 && session.currentStage !== "closing") {
    session.currentStage = "closing";
    session.stageQuestionCount = 0;
  }
}

async function askNext(
  session: InterviewSession,
  provider: InterviewModelProvider,
  userMessage: string,
  command: ParticipantCommand,
  isOpening: boolean,
): Promise<InterviewTurnOutput> {
  return provider.generateTurn({
    session,
    userMessage,
    command,
    isOpening,
  });
}

export interface LanguageUpdateInput {
  interviewLanguage?: InterviewLanguage;
  publishingLanguage?: InterviewLanguage;
}

export interface EngineTurnResult {
  session: InterviewSession;
  assistantText: string;
  usedFallback: boolean;
  provider: string;
  error?: string;
  duplicate?: boolean;
  /** Plain token — returned once when session is created (store client-side / httpOnly cookie). */
  participantToken?: string;
}

export function applyLanguageChange(
  session: InterviewSession,
  update: LanguageUpdateInput,
): { ok: true } | { ok: false; error: string } {
  const nextInterview = update.interviewLanguage
    ? parseInterviewLanguage(update.interviewLanguage)
    : session.language.interviewLanguage;
  if (!nextInterview) {
    return { ok: false, error: "unsupported_interview_language" };
  }
  const nextPublishing = update.publishingLanguage
    ? parseInterviewLanguage(update.publishingLanguage)
    : session.language.publishingLanguage;
  if (!nextPublishing) {
    return { ok: false, error: "unsupported_publishing_language" };
  }

  const from = session.language.interviewLanguage;
  if (from !== nextInterview) {
    session.languageHistory.push({ from, to: nextInterview, timestamp: nowIso() });
  }
  session.language = {
    interviewLanguage: nextInterview,
    publishingLanguage: nextPublishing,
  };
  return { ok: true };
}

export async function startInterview(
  themeId: InterviewThemeId,
  provider: InterviewModelProvider,
  sessionId?: string,
  languageSettings?: LanguageSettings,
): Promise<EngineTurnResult> {
  const participantToken = randomUUID();
  const session = createEmptySession(
    themeId,
    languageSettings,
    undefined,
    participantToken,
  );
  if (sessionId) session.id = sessionId;

  let output: InterviewTurnOutput;
  try {
    output = await askNext(session, provider, "", "none", true);
  } catch (err) {
    const message =
      err instanceof ProviderError ? err.message : "Interview provider failed";
    throw new ProviderError(message, "api_failure");
  }

  applyTurnAnalysis(session, output);
  reserveClosingIfNeeded(session);
  const { text, usedFallback } = finalizeQuestionText(session, output);

  session.totalQuestionsAsked += 1;
  session.stageQuestionCount += 1;
  if (session.currentStage === "closing") {
    session.awaitingClosingAnswer = true;
  }

  appendTurn(session, {
    role: "assistant",
    text,
    stage: session.currentStage,
    questionNumber: session.totalQuestionsAsked,
    technique: output.internal_analysis.technique,
  });

  const resolved = resolveStageTransition(
    session,
    output.stage_navigation.recommendation,
    output.stage_navigation.reason,
  );
  applyStageTransition(session, resolved);

  return {
    session,
    assistantText: text,
    usedFallback,
    provider: provider.name,
    participantToken,
  };
}

export async function submitParticipantMessage(
  session: InterviewSession,
  text: string,
  command: ParticipantCommand,
  provider: InterviewModelProvider,
  clientMessageId?: string,
  languageUpdate?: LanguageUpdateInput,
): Promise<EngineTurnResult> {
  if (clientMessageId && session.idempotencyCache[clientMessageId]) {
    const cached = session.idempotencyCache[clientMessageId];
    return {
      session,
      assistantText: cached.assistantText,
      usedFallback: cached.usedFallback,
      provider: cached.provider,
      error: cached.error,
      duplicate: true,
    };
  }

  const messages = msg(session);

  if (session.status !== "active") {
    return {
      session,
      assistantText: messages.alreadyEnded,
      usedFallback: false,
      provider: provider.name,
    };
  }

  if (command === "change_language") {
    const changed = applyLanguageChange(session, languageUpdate ?? {});
    if (!changed.ok) {
      return {
        session,
        assistantText: "",
        usedFallback: false,
        provider: provider.name,
        error: changed.error,
      };
    }
    const after = msg(session);
    const result: EngineTurnResult = {
      session,
      assistantText: after.languageChanged,
      usedFallback: false,
      provider: provider.name,
    };
    storeIdempotency(session, clientMessageId, result);
    return result;
  }

  if (command === "end") {
    if (text.trim()) {
      appendTurn(session, {
        role: "user",
        text: text.trim(),
        stage: session.currentStage,
      });
      session.closingParticipantWords = text.trim();
    }
    return finishAndCache(session, provider, clientMessageId, {
      assistantText: messages.endedEarly,
      usedFallback: false,
      provider: provider.name,
      status: "ended_early",
    });
  }

  if (text.trim()) {
    appendTurn(session, {
      role: "user",
      text: text.trim(),
      stage: session.currentStage,
    });
    reconcileHypothesesWithUserReply(session, text.trim());
    const declined = detectDeclinedTopicInUserMessage(
      text.trim(),
      session.language.interviewLanguage,
    );
    if (declined && !session.declinedTopics.includes(declined)) {
      session.declinedTopics.push(declined);
    }
  } else if (command !== "skip" && command !== "change_topic") {
    return {
      session,
      assistantText: messages.emptyInput,
      usedFallback: false,
      provider: provider.name,
    };
  }

  if (session.awaitingClosingAnswer && text.trim()) {
    session.closingParticipantWords = text.trim();
    return finishAndCache(session, provider, clientMessageId, {
      assistantText: messages.farewell,
      usedFallback: false,
      provider: provider.name,
      status: "completed",
    });
  }

  if (mustCompleteWithoutNewQuestion(session) && !session.awaitingClosingAnswer) {
    return finishAndCache(session, provider, clientMessageId, {
      assistantText: messages.complete,
      usedFallback: false,
      provider: provider.name,
      status: "completed",
    });
  }

  if (session.totalQuestionsAsked >= session.maxQuestions) {
    return {
      session,
      assistantText: messages.alreadyEnded,
      usedFallback: false,
      provider: provider.name,
    };
  }

  reserveClosingIfNeeded(session);

  let output: InterviewTurnOutput;
  try {
    output = await askNext(session, provider, text, command, false);
  } catch (err) {
    const message =
      err instanceof ProviderError ? err.message : "Interview provider failed";
    appendTurn(session, {
      role: "system",
      text: `Provider error: ${message}`,
      stage: session.currentStage,
    });
    const result: EngineTurnResult = {
      session,
      assistantText: messages.providerRetry,
      usedFallback: true,
      provider: provider.name,
      error: message,
    };
    storeIdempotency(session, clientMessageId, result);
    return result;
  }

  applyTurnAnalysis(session, output);

  const { text: assistantText, usedFallback } = finalizeQuestionText(session, output);

  session.totalQuestionsAsked += 1;
  session.stageQuestionCount += 1;

  appendTurn(session, {
    role: "assistant",
    text: assistantText,
    stage: session.currentStage,
    questionNumber: session.totalQuestionsAsked,
    technique: output.internal_analysis.technique,
  });

  if (session.currentStage === "closing") {
    session.awaitingClosingAnswer = true;
  }

  const resolved = resolveStageTransition(
    session,
    output.stage_navigation.recommendation,
    output.stage_navigation.reason,
  );
  applyStageTransition(session, resolved);

  if (session.totalQuestionsAsked >= session.maxQuestions && session.awaitingClosingAnswer) {
    // wait for closing answer
  } else if (session.totalQuestionsAsked >= session.maxQuestions) {
    return finishAndCache(session, provider, clientMessageId, {
      assistantText: messages.complete,
      usedFallback,
      provider: provider.name,
      status: "completed",
    });
  }

  const result: EngineTurnResult = {
    session,
    assistantText,
    usedFallback,
    provider: provider.name,
  };
  storeIdempotency(session, clientMessageId, result);
  return result;
}

function finishAndCache(
  session: InterviewSession,
  provider: InterviewModelProvider,
  clientMessageId: string | undefined,
  params: {
    assistantText: string;
    usedFallback: boolean;
    provider: string;
    status: "completed" | "ended_early";
  },
): EngineTurnResult {
  session.status = params.status;
  session.endedAt = nowIso();
  session.awaitingClosingAnswer = false;
  appendTurn(session, {
    role: "assistant",
    text: params.assistantText,
    stage: session.currentStage,
  });
  const result: EngineTurnResult = {
    session,
    assistantText: params.assistantText,
    usedFallback: params.usedFallback,
    provider: params.provider || provider.name,
  };
  storeIdempotency(session, clientMessageId, result);
  return result;
}

function storeIdempotency(
  session: InterviewSession,
  clientMessageId: string | undefined,
  result: EngineTurnResult,
): void {
  if (!clientMessageId) return;
  session.idempotencyCache[clientMessageId] = {
    assistantText: result.assistantText,
    usedFallback: result.usedFallback,
    provider: result.provider,
    error: result.error,
  };
}

export function createSessionWithId(
  themeId: InterviewThemeId,
  id: string,
): InterviewSession {
  const s = createEmptySession(themeId);
  s.id = id;
  return s;
}
