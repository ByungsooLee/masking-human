import { describe, expect, it } from "vitest";
import { startInterview, submitParticipantMessage } from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";

const provider = new MockInterviewProvider();

describe("closing and boundary conditions", () => {
  it("end command terminates immediately without another interview question", async () => {
    const started = await startInterview("A", provider);
    const before = started.session.totalQuestionsAsked;
    const r = await submitParticipantMessage(started.session, "", "end", provider);
    expect(r.session.status).toBe("ended_early");
    expect(r.assistantText).toMatch(/stop here/i);
    expect(r.session.totalQuestionsAsked).toBe(before);
    expect(r.session.turns.filter((t) => t.role === "assistant")).toHaveLength(2);
  });

  it("completed session never receives a new assistant interview question", async () => {
    const started = await startInterview("A", provider);
    started.session.status = "completed";
    started.session.awaitingClosingAnswer = false;
    const assistantsBefore = started.session.turns.filter((t) => t.role === "assistant").length;
    const r = await submitParticipantMessage(started.session, "Hello?", "none", provider);
    expect(r.assistantText).toMatch(/already ended/i);
    expect(r.session.turns.filter((t) => t.role === "assistant")).toHaveLength(assistantsBefore);
  });

  it("closing answer marks session completed", async () => {
    let session = (await startInterview("E", provider)).session;
    session.currentStage = "closing";
    session.awaitingClosingAnswer = true;
    session.turns.push({
      id: "closing-q",
      role: "assistant",
      text: "One sentence to keep?",
      stage: "closing",
      questionNumber: session.totalQuestionsAsked,
      timestamp: new Date().toISOString(),
    });
    const r = await submitParticipantMessage(
      session,
      "I like my skin calm and simple.",
      "none",
      provider,
    );
    expect(r.session.status).toBe("completed");
    expect(r.session.closingParticipantWords).toContain("calm and simple");
  });

  it("does not exceed eight assistant questions in a long dialogue", async () => {
    let session = (await startInterview("B", provider)).session;
    for (let i = 0; i < 15; i++) {
      if (session.status !== "active") break;
      session = (
        await submitParticipantMessage(
          session,
          `Day ${i}: I use sunscreen because it feels like daily care.`,
          "none",
          provider,
        )
      ).session;
    }
    expect(session.totalQuestionsAsked).toBeLessThanOrEqual(8);
  });

  it("API failure does not increment question count", async () => {
    const started = await startInterview("C", provider);
    const count = started.session.totalQuestionsAsked;
    started.session.id = "force-api-failure";
    await submitParticipantMessage(
      started.session,
      "I use lip balm.",
      "none",
      provider,
    );
    expect(started.session.totalQuestionsAsked).toBe(count);
  });
});
