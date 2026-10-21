/** Realtime model — verify against OpenAI Realtime docs when upgrading. */
export const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1";

export const DEFAULT_REALTIME_VOICE = "marin";

/** Wall-clock limit for one live or mock session. */
export const REALTIME_SESSION_DURATION_MS = 3 * 60 * 1000;

export function getRealtimeModel(): string {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || DEFAULT_REALTIME_MODEL;
}

export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

/** Client-side mock UI (no API). Set NEXT_PUBLIC_LIVE_MOCK=1 or open /live?mock=1 */
export function isLiveMockEnabledByEnv(): boolean {
  return process.env.NEXT_PUBLIC_LIVE_MOCK === "1";
}
