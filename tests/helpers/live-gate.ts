import { isSupabaseConfigured } from "@/lib/supabase/client";

export function isSupabaseLiveTestEnabled(): boolean {
  return (
    process.env.SUPABASE_INTEGRATION_TEST === "1" &&
    isSupabaseConfigured() &&
    process.env.SESSION_STORE?.toLowerCase() === "supabase"
  );
}

export function isOpenAiLiveTestEnabled(): boolean {
  return (
    process.env.OPENAI_LIVE_TEST === "1" &&
    Boolean(process.env.OPENAI_API_KEY) &&
    process.env.VOICE_PROVIDER?.toLowerCase() === "openai"
  );
}

let openAiCallCount = 0;

export function trackOpenAiCall(): void {
  openAiCallCount += 1;
  const max = Number(process.env.OPENAI_LIVE_MAX_CALLS ?? "16");
  if (openAiCallCount > max) {
    throw new Error(`OpenAI live call budget exceeded (${max})`);
  }
}

export function resetOpenAiCallBudgetForTests(): void {
  openAiCallCount = 0;
}
