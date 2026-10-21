import type { InterviewSession, IdempotencyRecord } from "../types";
import type { SessionRepository } from "./types";

const globalStore = globalThis as unknown as {
  interviewSessions?: Map<string, InterviewSession>;
  idempotency?: Map<string, IdempotencyRecord>;
};

export function memorySessionsMap(): Map<string, InterviewSession> {
  if (!globalStore.interviewSessions) globalStore.interviewSessions = new Map();
  return globalStore.interviewSessions;
}

function idempotency(): Map<string, IdempotencyRecord> {
  if (!globalStore.idempotency) globalStore.idempotency = new Map();
  return globalStore.idempotency;
}

function idemKey(sessionId: string, clientMessageId: string): string {
  return `${sessionId}:${clientMessageId}`;
}

export class MemorySessionRepository implements SessionRepository {
  async save(session: InterviewSession): Promise<void> {
    memorySessionsMap().set(session.id, structuredClone(session));
  }

  async getById(sessionId: string): Promise<InterviewSession | null> {
    const s = memorySessionsMap().get(sessionId);
    return s ? structuredClone(s) : null;
  }

  async delete(sessionId: string): Promise<void> {
    memorySessionsMap().delete(sessionId);
  }

  clearAll(): void {
    memorySessionsMap().clear();
    idempotency().clear();
  }

  async getIdempotency(
    sessionId: string,
    clientMessageId: string,
  ): Promise<IdempotencyRecord | null> {
    return idempotency().get(idemKey(sessionId, clientMessageId)) ?? null;
  }

  async setIdempotency(
    sessionId: string,
    clientMessageId: string,
    record: IdempotencyRecord,
  ): Promise<void> {
    idempotency().set(idemKey(sessionId, clientMessageId), record);
  }
}
