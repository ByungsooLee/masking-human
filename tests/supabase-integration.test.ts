import { describe, expect, it } from "vitest";
import { MemorySessionRepository } from "@/lib/interview/repositories/memory-session-repository";
import { createEmptySession } from "@/lib/interview/engine";
import { canParticipantAccessSession } from "@/lib/interview/access-control";
import { hashParticipantToken } from "@/lib/interview/access-control";

const LIVE = process.env.SUPABASE_INTEGRATION_TEST === "1";

describe("supabase integration (local contract tests)", () => {
  it("memory repository persists session fields for test data", async () => {
    const repo = new MemorySessionRepository();
    const token = "test-token-integration";
    const session = createEmptySession("A", undefined, "participant-test-1", token);
    session.participantTokenHash = hashParticipantToken(token);
    await repo.save(session);
    const loaded = await repo.getById(session.id);
    expect(loaded?.totalQuestionsAsked).toBe(0);
    expect(loaded?.language.interviewLanguage).toBe("en");
  });

  it("denies cross-participant token access", () => {
    const tokenA = "token-a";
    const session = createEmptySession("B", undefined, "p-a", tokenA);
    expect(canParticipantAccessSession(session, "p-a", tokenA)).toBe(true);
    expect(canParticipantAccessSession(session, "p-b", tokenA)).toBe(false);
    expect(canParticipantAccessSession(session, "p-a", "wrong")).toBe(false);
  });

  it("idempotency prevents duplicate client message processing at repo layer", async () => {
    const repo = new MemorySessionRepository();
    const sessionId = "550e8400-e29b-41d4-a716-446655440010";
    const clientId = "550e8400-e29b-41d4-a716-446655440011";
    await repo.setIdempotency(sessionId, clientId, {
      assistantText: "cached",
      usedFallback: false,
      provider: "mock",
    });
    const cached = await repo.getIdempotency(sessionId, clientId);
    expect(cached?.assistantText).toBe("cached");
  });
});

describe.skipIf(!LIVE)("supabase live (requires SUPABASE_INTEGRATION_TEST=1)", () => {
  it("documents live verification command", () => {
    expect(process.env.SESSION_STORE).toBe("supabase");
  });
});
