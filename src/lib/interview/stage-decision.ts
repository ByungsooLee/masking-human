import type { InterviewSession, InterviewStage, StageRecommendation } from "./types";
import { INTERVIEW_STAGES } from "./types";
import { nextStage, shouldAdvanceStage, stageIndex } from "./stages";

export interface ResolvedStageTransition {
  nextStage: InterviewStage;
  recommendation: StageRecommendation;
  reason: string;
  overridden: boolean;
}

function questionsRemainingBeforeNext(session: InterviewSession): number {
  return session.maxQuestions - session.totalQuestionsAsked;
}

function elapsedMinutes(session: InterviewSession): number {
  return (Date.now() - new Date(session.startedAt).getTime()) / 60000;
}

function timeForcesClose(session: InterviewSession): boolean {
  return elapsedMinutes(session) >= session.maxDurationMinutes;
}

/** Engine-authoritative stage transition after LLM suggestion. */
export function resolveStageTransition(
  session: InterviewSession,
  recommendation: StageRecommendation,
  reason: string,
): ResolvedStageTransition {
  const current = session.currentStage;
  let overridden = false;
  let rec = recommendation;

  if (timeForcesClose(session)) {
    if (rec !== "close") overridden = true;
    rec = "close";
  }

  const remaining = questionsRemainingBeforeNext(session);
  if (remaining <= 1) {
    return {
      nextStage: "closing",
      recommendation: rec,
      reason: reason || "Question budget reserves final turn for closing.",
      overridden: overridden || current !== "closing",
    };
  }

  if (rec === "stay") {
    if (shouldAdvanceStage(current, session.stageQuestionCount)) {
      const n = nextStage(current);
      if (n) {
        return {
          nextStage: n,
          recommendation: rec,
          reason: "Stage question soft cap reached; advancing despite stay.",
          overridden: true,
        };
      }
    }
    return { nextStage: current, recommendation: rec, reason, overridden };
  }

  if (rec === "advance") {
    const canAdvance = session.stageQuestionCount >= 1 || remaining <= 3;

    if (!canAdvance) {
      return {
        nextStage: current,
        recommendation: rec,
        reason: "Advance rejected: need at least one question in this stage.",
        overridden: true,
      };
    }

    const n = nextStage(current);
    if (!n) {
      return { nextStage: current, recommendation: rec, reason, overridden: true };
    }
    return { nextStage: n, recommendation: rec, reason, overridden };
  }

  // close — move toward reflection/closing without forcing every prior stage
  const idx = stageIndex(current);
  const reflectionIdx = stageIndex("reflection");
  const closingIdx = stageIndex("closing");

  if (remaining <= 2) {
    return {
      nextStage: "closing",
      recommendation: rec,
      reason: reason || "Limited questions left; moving to closing.",
      overridden: current !== "closing",
    };
  }

  if (idx < reflectionIdx) {
    return {
      nextStage: "reflection",
      recommendation: rec,
      reason,
      overridden: current !== "reflection",
    };
  }

  if (idx < closingIdx) {
    return {
      nextStage: "closing",
      recommendation: rec,
      reason,
      overridden: current !== "closing",
    };
  }

  return { nextStage: "closing", recommendation: rec, reason, overridden };
}

export function applyStageTransition(
  session: InterviewSession,
  resolved: ResolvedStageTransition,
): void {
  if (resolved.nextStage !== session.currentStage) {
    session.currentStage = resolved.nextStage;
    session.stageQuestionCount = 0;
  }
  session.stageDecisions.push({
    recommendation: resolved.recommendation,
    reason: resolved.reason,
    appliedStage: session.currentStage,
    timestamp: new Date().toISOString(),
  });
}

export function mustCompleteWithoutNewQuestion(session: InterviewSession): boolean {
  return (
    session.totalQuestionsAsked >= session.maxQuestions ||
    timeForcesClose(session)
  );
}

export function isValidStageOrder(from: InterviewStage, to: InterviewStage): boolean {
  return stageIndex(to) >= stageIndex(from) && INTERVIEW_STAGES.includes(to);
}
