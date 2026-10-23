import type { RealtimeItem, RealtimeMessageItem } from "@openai/agents/realtime";
import type { Speaker, Utterance } from "./types";

export type UtteranceTimingState = Map<
  string,
  { startedAt: number; endedAt: number }
>;

function isMessageItem(item: RealtimeItem): item is RealtimeMessageItem {
  return item.type === "message";
}

function speakerForRole(role: RealtimeMessageItem["role"]): Speaker | null {
  if (role === "user") return "guest";
  if (role === "assistant") return "ai";
  return null;
}

function extractMessageText(item: RealtimeMessageItem): string {
  const parts: string[] = [];
  for (const block of item.content) {
    if (block.type === "input_text" || block.type === "output_text") {
      parts.push(block.text);
    } else if (block.type === "input_audio" && block.transcript) {
      parts.push(block.transcript);
    } else if (block.type === "output_audio" && block.transcript) {
      parts.push(block.transcript);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function createUtteranceTimingState(): UtteranceTimingState {
  return new Map();
}

export function historyToUtterances(
  history: RealtimeItem[],
  timing: UtteranceTimingState,
  now: number = Date.now(),
  elapsedMs?: () => number,
): Utterance[] {
  const tick = elapsedMs ?? (() => now);
  const utterances: Utterance[] = [];

  for (const item of history) {
    if (!isMessageItem(item)) continue;
    const speaker = speakerForRole(item.role);
    if (!speaker) continue;

    const text = extractMessageText(item);
    if (!text) continue;

    const id = item.itemId;
    let times = timing.get(id);
    const t = tick();
    if (!times) {
      times = { startedAt: t, endedAt: t };
      timing.set(id, times);
    }

    utterances.push({
      id,
      speaker,
      text,
      startedAt: times.startedAt,
      endedAt: times.endedAt,
    });
  }

  return utterances;
}
