import { describe, expect, it } from "vitest";
import { createEmptySession } from "@/lib/interview/engine";
import { resolveStageTransition } from "@/lib/interview/stage-decision";

describe("resolveStageTransition", () => {
  it("honors close by jumping toward reflection early", () => {
    const session = createEmptySession("A");
    session.stageQuestionCount = 1;
    const r = resolveStageTransition(session, "close", "Participant ready to wrap");
    expect(r.nextStage).toBe("reflection");
  });

  it("rejects advance when no question was asked in stage", () => {
    const session = createEmptySession("A");
    session.stageQuestionCount = 0;
    const r = resolveStageTransition(session, "advance", "Model wants to skip");
    expect(r.overridden).toBe(true);
    expect(r.nextStage).toBe("observation");
  });

  it("reserves final question for closing when one slot remains", () => {
    const session = createEmptySession("D");
    session.totalQuestionsAsked = 7;
    const r = resolveStageTransition(session, "stay", "n/a");
    expect(r.nextStage).toBe("closing");
  });
});
