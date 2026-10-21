import { describe, expect, it } from "vitest";
import {
  nextStage,
  shouldAdvanceStage,
  STAGE_QUESTION_LIMITS,
} from "@/lib/interview/stages";

describe("stage progression", () => {
  it("follows the five-stage order", () => {
    expect(nextStage("observation")).toBe("motivation");
    expect(nextStage("motivation")).toBe("perspective_shift");
    expect(nextStage("perspective_shift")).toBe("reflection");
    expect(nextStage("reflection")).toBe("closing");
    expect(nextStage("closing")).toBeNull();
  });

  it("advances after stage question limits", () => {
    expect(shouldAdvanceStage("observation", STAGE_QUESTION_LIMITS.observation)).toBe(true);
    expect(shouldAdvanceStage("observation", STAGE_QUESTION_LIMITS.observation - 1)).toBe(false);
  });
});
