import { resolveModelPricing } from "../../../config/pricing";
import { normalizeRealtimeUsage, type RawRealtimeUsage } from "./normalize-usage";
import { estimateCostBreakdown, estimateUsdFromSnapshot } from "./estimate-cost";
import type { UsageTokenSnapshot } from "./types";

export type PromptMetadata = { revision: string; sha256: string; characters: number };
export type ResponseUsageEntry = {
  id: string;
  kind: "response" | "transcription";
  atMs: number;
  status: string | null;
  outputItemIds: string[];
  tokens: UsageTokenSnapshot | null;
  durationSeconds: number | null;
  estimatedUsd: number | null;
  costBreakdown: ReturnType<typeof estimateCostBreakdown>;
};
export type ResponseUsageLedger = {
  schemaVersion: 1;
  model: string;
  prompt: PromptMetadata | null;
  pricing: ReturnType<typeof resolveModelPricing> | null;
  entries: ResponseUsageEntry[];
  dialogueGuidance?: { afterItemId: string; reason: "repeated_question" | "repeated_angle"; atMs: number }[];
};

export function createUsageLedger(model: string, prompt: PromptMetadata | null = null): ResponseUsageLedger {
  return { schemaVersion: 1, model, prompt, pricing: resolveModelPricing(model) ?? null, entries: [] };
}

export function usageEntryFromEvent(event: unknown, model: string, atMs: number): ResponseUsageEntry | null {
  if (!event || typeof event !== "object") return null;
  const data = event as { type?: string; item_id?: string; response?: { id?: string; status?: string; output?: { id?: string }[]; usage?: RawRealtimeUsage }; usage?: RawRealtimeUsage & { type?: string; seconds?: number } };
  const response = data.response;
  const isResponse = data.type === "response.done";
  if (!isResponse && data.type !== "conversation.item.input_audio_transcription.completed") return null;
  const id = isResponse ? response?.id : data.item_id;
  if (typeof id !== "string" || !id) return null;
  const usage = isResponse ? response?.usage : data.usage;
  const seconds = !isResponse ? data.usage?.seconds : undefined;
  const durationSeconds = typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  const tokens = usage && (isResponse || data.usage?.type === "tokens") ? normalizeRealtimeUsage(usage) : null;
  return {
    id, kind: isResponse ? "response" : "transcription",
    atMs: Number.isFinite(atMs) && atMs >= 0 ? atMs : 0,
    status: isResponse && typeof response?.status === "string" ? response.status : null,
    outputItemIds: isResponse && Array.isArray(response?.output) ? response.output.flatMap((item) => typeof item.id === "string" ? [item.id] : []) : [],
    tokens, durationSeconds,
    estimatedUsd: isResponse && tokens ? estimateUsdFromSnapshot(model, tokens) : null,
    costBreakdown: isResponse && tokens ? estimateCostBreakdown(model, tokens) : null,
  };
}

export function appendUsageEntry(ledger: ResponseUsageLedger, entry: ResponseUsageEntry): ResponseUsageLedger {
  if (ledger.entries.some((previous) => previous.id === entry.id && previous.kind === entry.kind)) return ledger;
  return { ...ledger, entries: [...ledger.entries, entry] };
}

export function buildUsageExport(sessionId: string, ledger?: ResponseUsageLedger | null) {
  return {
    kind: "interview-usage", sessionId, ledger: ledger ?? null,
    note: "Observed response usage only, not an invoice. Transcription costs are not included. Missing events and old sessions cannot be reconstructed. Timing is approximate; prompt metadata describes initial instructions, not the closing-time notice appended later. Characters are not token counts. No conversation text or credentials included.",
  };
}
