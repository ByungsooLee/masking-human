import { describe, expect, it } from "vitest";
import {
  isAllowedGuestEdit,
  normalizeForMatch,
  validateMagazineDraft,
} from "@/lib/magazine-flow/validate-guest-text";

describe("validate-guest-text", () => {
  it("allows substring after filler removal", () => {
    const source = "えー、風呂上がりに lotion を塗るのが好きです";
    expect(isAllowedGuestEdit(source, "風呂上がりに lotion を塗るのが好きです")).toBe(true);
  });

  it("validates qa draft", () => {
    const transcript = [
      { id: "a1", speaker: "ai" as const, text: "質問", startedAt: 0, endedAt: 1000 },
      { id: "g1", speaker: "guest" as const, text: "one two three", startedAt: 1000, endedAt: 2000 },
      { id: "a2", speaker: "ai" as const, text: "q2", startedAt: 2000, endedAt: 3000 },
      { id: "g2", speaker: "guest" as const, text: "four five", startedAt: 3000, endedAt: 4000 },
    ];
    expect(
      validateMagazineDraft(
        {
          title: "t",
          lead: "lead",
          heroQuote: { utteranceId: "g1", text: "two three" },
          qa: [
            { questionUtteranceId: "a1", questionText: "質問", answer: { utteranceId: "g1", text: "one two" } },
            { questionUtteranceId: "a2", questionText: "q2", answer: { utteranceId: "g2", text: "four five" } },
          ],
        },
        transcript,
      ),
    ).toBe(true);
    expect(normalizeForMatch("  a  b  ")).toBe("a b");
  });
});
