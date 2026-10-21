import { describe, expect, it } from "vitest";
import { startInterview } from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";
import { toPublicSession } from "@/lib/interview/public-dto";

describe("public session DTO", () => {
  it("strips accumulator and system turns", async () => {
    const r = await startInterview("A", new MockInterviewProvider());
    r.session.turns.push({
      id: "sys",
      role: "system",
      text: "internal",
      stage: "observation",
      timestamp: new Date().toISOString(),
    });
    r.session.accumulator.facts.push({
      id: "f1",
      text: "secret fact",
      sourceUtteranceId: null,
    });
    const pub = toPublicSession(r.session);
    expect(pub).not.toHaveProperty("accumulator");
    expect(pub).not.toHaveProperty("stageDecisions");
    expect(pub.turns.every((t) => t.role === "assistant" || t.role === "user")).toBe(true);
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain("secret fact");
  });
});
