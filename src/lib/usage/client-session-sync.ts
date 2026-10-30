"use client";

import type { RawRealtimeUsage } from "./normalize-usage";

export async function patchUsageSession(
  sessionId: string,
  patchToken: string,
  body: { usage?: RawRealtimeUsage; responseId?: string; ended?: boolean },
): Promise<number | null> {
  const res = await fetch(`/api/usage/session/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Usage-Patch-Token": patchToken,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { session?: { estimatedUsd?: number } };
  return typeof data.session?.estimatedUsd === "number" ? data.session.estimatedUsd : null;
}
