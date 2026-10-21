import { describe, expect, it, beforeEach } from "vitest";
import {
  enqueueDeletionMemory,
  processNextDeletionJobMemory,
  clearDeletionQueueForTests,
} from "@/lib/interview/deletion/memory-deletion-queue";

describe("deletion queue retry", () => {
  beforeEach(() => clearDeletionQueueForTests());

  it("retries failed jobs up to max attempts", async () => {
    enqueueDeletionMemory({
      sessionId: "s1",
      participantId: "p1",
    });
    let attempts = 0;
    await processNextDeletionJobMemory(async () => {
      attempts++;
      throw new Error("fail");
    });
    expect(attempts).toBe(1);
    const job = await processNextDeletionJobMemory(async () => {});
    expect(job?.status).toBe("completed");
    expect(job?.attempts).toBe(2);
  });
});
