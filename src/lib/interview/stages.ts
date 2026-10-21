import type { InterviewStage } from "./types";
import { INTERVIEW_STAGES } from "./types";

/** Max assistant questions per stage before the app advances (closing is always 1). */
export const STAGE_QUESTION_LIMITS: Record<InterviewStage, number> = {
  observation: 2,
  motivation: 2,
  perspective_shift: 2,
  reflection: 2,
  closing: 1,
};

export function stageIndex(stage: InterviewStage): number {
  return INTERVIEW_STAGES.indexOf(stage);
}

export function nextStage(stage: InterviewStage): InterviewStage | null {
  const idx = stageIndex(stage);
  if (idx < 0 || idx >= INTERVIEW_STAGES.length - 1) return null;
  return INTERVIEW_STAGES[idx + 1];
}

export function shouldAdvanceStage(
  stage: InterviewStage,
  stageQuestionCount: number,
): boolean {
  return stageQuestionCount >= STAGE_QUESTION_LIMITS[stage];
}

export function stageLabel(stage: InterviewStage): string {
  const labels: Record<InterviewStage, string> = {
    observation: "Observation",
    motivation: "Motivation",
    perspective_shift: "Perspective shift",
    reflection: "Reflection",
    closing: "Closing",
  };
  return labels[stage];
}
