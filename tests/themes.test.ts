import { describe, expect, it } from "vitest";
import { INTERVIEW_THEMES, listThemes } from "@/lib/interview/themes";
import { THEME_IDS } from "@/lib/interview/types";

describe("interview themes", () => {
  it("defines five initial themes A–E", () => {
    expect(THEME_IDS).toHaveLength(5);
    expect(listThemes()).toHaveLength(5);
  });

  it("does not state hypotheses as facts in exploration prompts", () => {
    for (const id of THEME_IDS) {
      const t = INTERVIEW_THEMES[id];
      expect(t.explorationPrompt.length).toBeGreaterThan(20);
      expect(t.explorationPrompt.toLowerCase()).not.toMatch(/is always true/);
    }
  });
});
