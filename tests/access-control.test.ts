import { describe, expect, it } from "vitest";
import { createEmptySession, startInterview } from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";
import {
  canParticipantAccessSession,
  canPublicReadSession,
  hashParticipantToken,
  verifyParticipantToken,
} from "@/lib/interview/access-control";

describe("participant access control", () => {
  it("allows owner with valid token only", () => {
    const token = "test-token-plain";
    const session = createEmptySession("A", undefined, "pid-1", token);
    expect(verifyParticipantToken(session, token)).toBe(true);
    expect(canParticipantAccessSession(session, "pid-1", token)).toBe(true);
    expect(canParticipantAccessSession(session, "other", token)).toBe(false);
    expect(canParticipantAccessSession(session, "pid-1", "wrong")).toBe(false);
  });

  it("blocks public read of private unapproved sessions", async () => {
    const session = (await startInterview("B", new MockInterviewProvider())).session;
    expect(session.publishStatus).toBe("private");
    expect(canPublicReadSession(session)).toBe(false);
  });

  it("allows public read only when published and not deleted", () => {
    const session = createEmptySession("C", undefined, "p", "t");
    session.publishStatus = "published";
    expect(canPublicReadSession(session)).toBe(true);
    session.deletedAt = new Date().toISOString();
    expect(canPublicReadSession(session)).toBe(false);
  });

  it("hashes tokens consistently", () => {
    expect(hashParticipantToken("abc")).toHaveLength(64);
  });
});
