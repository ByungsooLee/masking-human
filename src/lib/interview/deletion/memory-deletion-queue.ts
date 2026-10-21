import { randomUUID } from "crypto";
import type { DeletionJob } from "./types";

const MAX_ATTEMPTS = 5;
const queue = globalThis as unknown as { deletionJobs?: DeletionJob[] };

function jobs(): DeletionJob[] {
  if (!queue.deletionJobs) queue.deletionJobs = [];
  return queue.deletionJobs;
}

export function enqueueDeletionMemory(params: {
  sessionId: string;
  participantId: string;
  reason?: string;
}): DeletionJob {
  const record: DeletionJob = {
    id: randomUUID(),
    sessionId: params.sessionId,
    participantId: params.participantId,
    reason: params.reason,
    status: "pending",
    requestedAt: new Date().toISOString(),
    attempts: 0,
  };
  jobs().push(record);
  return record;
}

export async function processNextDeletionJobMemory(
  handler: (job: DeletionJob) => Promise<void>,
): Promise<DeletionJob | null> {
  const job = jobs().find(
    (j) => (j.status === "pending" || j.status === "failed") && j.attempts < MAX_ATTEMPTS,
  );
  if (!job) return null;
  job.status = "processing";
  job.attempts += 1;
  try {
    await handler(job);
    job.status = "completed";
    job.processedAt = new Date().toISOString();
  } catch (err) {
    job.status = "failed";
    job.lastError = err instanceof Error ? err.message : "unknown";
  }
  return job;
}

export function clearDeletionQueueForTests(): void {
  jobs().length = 0;
}
