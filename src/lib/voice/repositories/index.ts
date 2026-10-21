import { isSupabaseConfigured } from "@/lib/supabase/client";
import { MemoryUtteranceRepository, clearUtterancesForTests } from "./memory-utterance-repository";
import { SupabaseUtteranceRepository } from "./supabase-utterance-repository";
import type { UtteranceRepository } from "./types";

let cached: UtteranceRepository | null = null;

export function getUtteranceRepositoryMode(): "memory" | "supabase" {
  const explicit = process.env.UTTERANCE_STORE?.toLowerCase();
  if (explicit === "memory") return "memory";
  if (explicit === "supabase") return "supabase";
  if (process.env.SESSION_STORE?.toLowerCase() === "supabase" && isSupabaseConfigured()) {
    return "supabase";
  }
  return "memory";
}

export function getUtteranceRepository(): UtteranceRepository {
  const mode = getUtteranceRepositoryMode();
  if (cached) {
    const n = cached.constructor.name;
    if ((mode === "supabase" && n.includes("Supabase")) || (mode === "memory" && n.includes("Memory"))) {
      return cached;
    }
  }
  cached = mode === "supabase" ? new SupabaseUtteranceRepository() : new MemoryUtteranceRepository();
  return cached;
}

export { clearUtterancesForTests };
export type { UtteranceRepository };
