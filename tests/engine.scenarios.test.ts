import { describe, expect, it } from "vitest";
import {
  startInterview,
  submitParticipantMessage,
  createSessionWithId,
} from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";
import { getSession, saveSession, clearAllSessions } from "@/lib/interview/session-store";

const provider = new MockInterviewProvider();

async function runTurns(
  themeId: "A" | "B" | "C" | "D" | "E",
  replies: { text: string; command?: "none" | "skip" | "change_topic" | "end" }[],
) {
  const started = await startInterview(themeId, provider);
  let session = started.session;
  for (const reply of replies) {
    const r = await submitParticipantMessage(
      session,
      reply.text,
      reply.command ?? "none",
      provider,
    );
    session = r.session;
  }
  return session;
}

describe("AI interview engine scenarios (mock provider)", () => {
  it("1. starts with a single opening question", async () => {
    const r = await startInterview("A", provider);
    expect(r.session.totalQuestionsAsked).toBe(1);
    expect(r.assistantText).toMatch(/typical day|beauty|skincare/i);
  });

  it("2. handles participant who does not use cosmetics", async () => {
    const s = await runTurns("A", [{ text: "I don't use makeup at all." }]);
    const last = s.turns.filter((t) => t.role === "assistant").at(-1);
    expect(last?.text).toMatch(/still do|skip|skin|you/i);
  });

  it("3. handles very short answers", async () => {
    const s = await runTurns("B", [{ text: "yes" }]);
    const last = s.turns.filter((t) => t.role === "assistant").at(-1);
    expect(last?.text).toMatch(/example|recent day/i);
  });

  it("4. handles contradictory answers", async () => {
    const s = await runTurns("C", [
      {
        text: "I love makeup but also I don't — it's not for me sometimes.",
      },
    ]);
    const last = s.turns.filter((t) => t.role === "assistant").at(-1);
    expect(last?.text).toMatch(/both|each side/i);
  });

  it("5. honors change topic command", async () => {
    const s = await runTurns("D", [{ text: "", command: "change_topic" }]);
    const last = s.turns.filter((t) => t.role === "assistant").at(-1);
    expect(last?.text).toMatch(/shift angle|relationship with beauty/i);
  });

  it("6. honors skip command", async () => {
    const s = await runTurns("E", [{ text: "", command: "skip" }]);
    expect(s.turns.some((t) => t.role === "assistant")).toBe(true);
  });

  it("7. handles no-insight responses without forcing depth", async () => {
    const s = await runTurns("A", [{ text: "Nothing special, no insight really." }]);
    const last = s.turns.filter((t) => t.role === "assistant").at(-1);
    expect(last?.text).toMatch(/small habit|without needing/i);
  });

  it("8. responds gently to appearance anxiety", async () => {
    const s = await runTurns("A", [{ text: "I feel anxious about how I look on camera." }]);
    const last = s.turns.filter((t) => t.role === "assistant").at(-1);
    expect(last?.text).not.toMatch(/you have anxiety disorder/i);
    expect(last?.text).toMatch(/your own words|what do you usually/i);
  });

  it("9. replaces leading AI questions with safe fallback", async () => {
    const started = await startInterview("A", provider, "force-leading-question");
    const r = await submitParticipantMessage(
      started.session,
      "I own many lipsticks.",
      "none",
      provider,
    );
    expect(r.usedFallback).toBe(true);
    expect(r.assistantText).not.toMatch(/insecure because/i);
  });

  it("10. recovers from simulated API failure on submit", async () => {
    const started = await startInterview("B", provider);
    started.session.id = "force-api-failure";
    const r = await submitParticipantMessage(
      started.session,
      "I use sunscreen daily.",
      "none",
      provider,
    );
    expect(r.error).toBeTruthy();
    expect(r.assistantText).toMatch(/try sending again/i);
  });

  it("11. supports early end command", async () => {
    const s = await runTurns("C", [{ text: "", command: "end" }]);
    expect(s.status).toBe("ended_early");
  });

  it("12. accumulates stated facts across turns", async () => {
    const s = await runTurns("D", [
      { text: "I always carry a parasol in summer because my mother did." },
    ]);
    expect(s.accumulator.facts.length).toBeGreaterThan(0);
  });

  it("13. never exceeds maxQuestions assistant questions in a long run", async () => {
    let session = (await startInterview("E", provider)).session;
    for (let i = 0; i < 12; i++) {
      if (session.status !== "active") break;
      const r = await submitParticipantMessage(
        session,
        `Turn ${i}: I moisturize at night because it calms me.`,
        "none",
        provider,
      );
      session = r.session;
    }
    expect(session.totalQuestionsAsked).toBeLessThanOrEqual(session.maxQuestions);
  });

  it("14. persists session in memory store", async () => {
    clearAllSessions();
    const started = await startInterview("A", provider);
    saveSession(started.session);
    expect(getSession(started.session.id)).toBeDefined();
  });

  it("15. rejects empty message without command", async () => {
    const started = await startInterview("A", provider);
    const r = await submitParticipantMessage(started.session, "", "none", provider);
    expect(r.assistantText).toMatch(/skip|share a response/i);
  });

  it("16. all five themes can start", async () => {
    for (const id of ["A", "B", "C", "D", "E"] as const) {
      const r = await startInterview(id, provider);
      expect(r.session.themeId).toBe(id);
    }
  });

  it("17. createSessionWithId supports deterministic ids", () => {
    const s = createSessionWithId("B", "test-id-123");
    expect(s.id).toBe("test-id-123");
  });

  it("18. completed session does not accept further dialogue as active", async () => {
    const started = await startInterview("A", provider);
    started.session.status = "completed";
    const r = await submitParticipantMessage(started.session, "Hello?", "none", provider);
    expect(r.assistantText).toMatch(/already ended/i);
  });

  it("19. perspective stage may include hypothesis invitation from mock", async () => {
    let session = (await startInterview("A", provider)).session;
    for (let i = 0; i < 5; i++) {
      session = (
        await submitParticipantMessage(
          session,
          "I keep products on my shelf for mood.",
          "none",
          provider,
        )
      ).session;
      if (session.currentStage === "perspective_shift") break;
    }
    expect(["perspective_shift", "reflection", "closing", "motivation"]).toContain(
      session.currentStage,
    );
  });

  it("20. documents placeholder for unpublished manuscript (Phase 4)", () => {
    const publishAllowed = false;
    expect(publishAllowed).toBe(false);
  });

  it("21. documents placeholder for recording failure handling (Phase 2)", () => {
    const recordingOk = false;
    const fallback = recordingOk ? "continue" : "retry_upload";
    expect(fallback).toBe("retry_upload");
  });
});
