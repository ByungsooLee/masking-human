import { describe, expect, it } from "vitest";
import { visibleStageUtterances } from "@/lib/live/stage-utterances";
import { ensureContrastAa } from "@/lib/color/contrast-adjust";

describe("visibleStageUtterances", () => {
  it("keeps at most three latest lines", () => {
    const utterances = [1, 2, 3, 4, 5].map((n) => ({
      id: String(n),
      speaker: "ai" as const,
      text: `line ${n}`,
      startedAt: n,
      endedAt: n,
    }));
    expect(visibleStageUtterances(utterances).map((u) => u.id)).toEqual(["3", "4", "5"]);
  });
});

describe("ensureContrastAa", () => {
  it("darkens accent on light ground toward AA", () => {
    const out = ensureContrastAa("#d4d0c8", "#e8ebe9");
    expect(out).not.toBe("#d4d0c8");
  });
});
