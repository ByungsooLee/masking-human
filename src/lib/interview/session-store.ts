import type { InterviewSession } from "./types";
import {
  MemorySessionRepository,
  memorySessionsMap,
} from "./repositories/memory-session-repository";

const memory = new MemorySessionRepository();

export function saveSession(session: InterviewSession): void {
  void memory.save(session);
}

export function getSession(id: string): InterviewSession | undefined {
  return memorySessionsMap().get(id);
}

export function deleteSession(id: string): boolean {
  void memory.delete(id);
  return !memorySessionsMap().has(id);
}

export function clearAllSessions(): void {
  memory.clearAll?.();
}
