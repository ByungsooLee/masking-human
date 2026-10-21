export type DeletionJobStatus = "pending" | "processing" | "completed" | "failed";

export interface DeletionJob {
  id: string;
  sessionId: string;
  participantId: string;
  reason?: string;
  status: DeletionJobStatus;
  requestedAt: string;
  processedAt?: string;
  attempts: number;
  lastError?: string;
}
