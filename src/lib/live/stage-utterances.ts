import type { Utterance } from "@/lib/realtime/types";

const MAX_VISIBLE = 3;

/** Latest utterances for stage (max 3). */
export function visibleStageUtterances(utterances: Utterance[]): Utterance[] {
  if (utterances.length <= MAX_VISIBLE) return utterances;
  return utterances.slice(-MAX_VISIBLE);
}

export function latestGuestUtterance(utterances: Utterance[]): Utterance | null {
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (utterances[i].speaker === "guest") return utterances[i];
  }
  return null;
}
