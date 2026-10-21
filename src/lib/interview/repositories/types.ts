import type { InterviewSession } from "../types";
import type { IdempotencyRecord } from "../types";

export interface SessionRepository {
  save(session: InterviewSession): Promise<void>;
  getById(sessionId: string): Promise<InterviewSession | null>;
  delete(sessionId: string): Promise<void>;
  clearAll?(): void;
  getIdempotency(
    sessionId: string,
    clientMessageId: string,
  ): Promise<IdempotencyRecord | null>;
  setIdempotency(
    sessionId: string,
    clientMessageId: string,
    record: IdempotencyRecord,
  ): Promise<void>;
}
