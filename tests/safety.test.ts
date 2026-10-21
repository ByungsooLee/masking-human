import { describe, expect, it } from "vitest";
import { validateQuestionText, mergeSafetyChecks } from "@/lib/interview/safety";
import { createEmptySession } from "@/lib/interview/engine";

describe("validateQuestionText", () => {
  it("accepts neutral open questions", () => {
    const r = validateQuestionText(
      "What does your morning routine look like when you have time?",
      "en",
    );
    expect(r.ok).toBe(true);
  });

  it("flags leading insecurity framing", () => {
    const r = validateQuestionText(
      "So you're insecure because you own so many products, right?",
      "en",
    );
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.startsWith("leading"))).toBe(true);
  });

  it("flags diagnostic language", () => {
    const r = validateQuestionText("You have anxiety about how you look.", "en");
    expect(r.ok).toBe(false);
  });

  it("rejects empty questions", () => {
    expect(validateQuestionText("   ", "en").ok).toBe(false);
  });
});

describe("mergeSafetyChecks", () => {
  it("combines model flags with heuristics", () => {
    const r = mergeSafetyChecks(
      createEmptySession("A"),
      { avoids_diagnosis: true, avoids_fabrication: true, non_leading: false },
      "What do you enjoy about your routine?",
    );
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("model_flagged_leading");
  });
});
