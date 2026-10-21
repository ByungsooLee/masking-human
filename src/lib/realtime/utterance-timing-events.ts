import type { UtteranceTimingState } from "./history-to-utterances";

type TransportPayload = Record<string, unknown>;

function eventType(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const t = (event as TransportPayload).type;
  return typeof t === "string" ? t : null;
}

function itemIdFromEvent(event: TransportPayload): string | null {
  const id = event.item_id ?? event.itemId;
  return typeof id === "string" ? id : null;
}

/** Apply Realtime transport + audio lifecycle to utterance timing (ms since session clock). */
export function applyTimingFromTransportEvent(
  event: unknown,
  timing: UtteranceTimingState,
  elapsedMs: number,
): void {
  const type = eventType(event);
  if (!type) return;
  const payload = event as TransportPayload;
  const itemId = itemIdFromEvent(payload);

  if (type === "input_audio_buffer.speech_started" && itemId) {
    timing.set(itemId, { startedAt: elapsedMs, endedAt: elapsedMs });
    return;
  }
  if (type === "input_audio_buffer.speech_stopped" && itemId) {
    const row = timing.get(itemId);
    if (row) row.endedAt = elapsedMs;
    else timing.set(itemId, { startedAt: elapsedMs, endedAt: elapsedMs });
    return;
  }
  if (type === "response.output_item.added") {
    const id = itemId ?? (typeof payload.item === "object" && payload.item && "id" in payload.item
      ? String((payload.item as { id?: string }).id)
      : null);
    if (id) timing.set(id, { startedAt: elapsedMs, endedAt: elapsedMs });
  }
}

let aiSpeechItemId: string | null = null;

export function markAiAudioStart(timing: UtteranceTimingState, elapsedMs: number, itemId?: string): void {
  const id = itemId ?? aiSpeechItemId ?? "__ai_active__";
  aiSpeechItemId = id;
  const row = timing.get(id);
  if (!row) timing.set(id, { startedAt: elapsedMs, endedAt: elapsedMs });
  else row.startedAt = Math.min(row.startedAt, elapsedMs);
}

export function markAiAudioStop(timing: UtteranceTimingState, elapsedMs: number): void {
  const id = aiSpeechItemId ?? "__ai_active__";
  const row = timing.get(id);
  if (row) row.endedAt = elapsedMs;
  aiSpeechItemId = null;
}

export function resetAiTimingCursor(): void {
  aiSpeechItemId = null;
}
