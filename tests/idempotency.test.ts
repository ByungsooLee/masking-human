import { describe, expect, it } from "vitest";
import { startInterview, submitParticipantMessage } from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";

const provider = new MockInterviewProvider();

describe("idempotent client messages", () => {
  it("returns cached response for duplicate clientMessageId", async () => {
    const session = (await startInterview("A", provider)).session;
    const id = "550e8400-e29b-41d4-a716-446655440099";
    const first = await submitParticipantMessage(
      session,
      "I use SPF every morning.",
      "none",
      provider,
      id,
    );
    const second = await submitParticipantMessage(
      first.session,
      "IGNORED DIFFERENT TEXT",
      "none",
      provider,
      id,
    );
    expect(second.duplicate).toBe(true);
    expect(second.assistantText).toBe(first.assistantText);
  });
});
