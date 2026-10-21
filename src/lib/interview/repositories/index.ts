import type { SessionRepository } from "./types";
import { MemorySessionRepository } from "./memory-session-repository";
import { SupabaseSessionRepository } from "./supabase-session-repository";

let cached: SessionRepository | null = null;

export function getSessionRepository(): SessionRepository {
  const mode = process.env.SESSION_STORE?.toLowerCase() ?? "memory";
  if (cached && cached.constructor.name.includes(mode === "supabase" ? "Supabase" : "Memory")) {
    return cached;
  }
  cached =
    mode === "supabase" ? new SupabaseSessionRepository() : new MemorySessionRepository();
  return cached;
}

export { MemorySessionRepository, SupabaseSessionRepository };
export type { SessionRepository };
