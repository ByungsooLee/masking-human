import type { RawRealtimeUsage } from "./normalize-usage";

export function extractResponseDoneUsage(event: unknown): RawRealtimeUsage | null {
  if (!event || typeof event !== "object") return null;
  const e = event as { type?: string; response?: { usage?: RawRealtimeUsage } };
  if (e.type !== "response.done") return null;
  const usage = e.response?.usage;
  if (!usage) return null;
  return usage;
}
