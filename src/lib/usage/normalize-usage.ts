import type { UsageTokenSnapshot } from "./types";

type CachedTokensDetails = {
  audio_tokens?: number;
  text_tokens?: number;
  image_tokens?: number;
};

export type RawRealtimeUsage = {
  input_tokens?: number;
  output_tokens?: number;
  input_token_details?: Record<string, unknown> | null;
  output_token_details?: Record<string, unknown> | null;
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function detailNum(details: Record<string, unknown> | null | undefined, key: string): number {
  if (!details || typeof details !== "object") return 0;
  return num(details[key]);
}

function cachedTokensDetails(
  details: Record<string, unknown> | null | undefined,
): CachedTokensDetails | undefined {
  if (!details || typeof details !== "object") return undefined;
  const nested = details.cached_tokens_details;
  if (!nested || typeof nested !== "object") return undefined;
  return nested as CachedTokensDetails;
}

export function emptyUsageSnapshot(): UsageTokenSnapshot {
  return {
    inputTokens: 0,
    outputTokens: 0,
    inputAudioTokens: 0,
    inputTextTokens: 0,
    cachedInputTextTokens: 0,
    cachedInputAudioTokens: 0,
    outputAudioTokens: 0,
    outputTextTokens: 0,
    reasoningOutputTokens: 0,
  };
}

/**
 * Maps Realtime `response.done` usage to billable buckets.
 * Cached input: `input_token_details.cached_tokens_details.{text_tokens,audio_tokens}`
 * (see OpenAI RealtimeResponseUsageInputTokenDetails).
 */
export function normalizeRealtimeUsage(raw: RawRealtimeUsage): UsageTokenSnapshot {
  const inputDetails = raw.input_token_details ?? undefined;
  const outputDetails = raw.output_token_details ?? undefined;
  const cachedDetails = cachedTokensDetails(inputDetails);

  let cachedInputText = num(cachedDetails?.text_tokens);
  const cachedInputAudio = num(cachedDetails?.audio_tokens);

  const cachedTotal = detailNum(inputDetails, "cached_tokens");
  if (cachedInputText + cachedInputAudio === 0 && cachedTotal > 0) {
    cachedInputText = cachedTotal;
  }

  const inputAudioTotal = detailNum(inputDetails, "audio_tokens");
  const inputImageTotal = detailNum(inputDetails, "image_tokens");
  const inputTextTotal =
    detailNum(inputDetails, "text_tokens") ||
    Math.max(0, (raw.input_tokens ?? 0) - inputAudioTotal - inputImageTotal);

  const inputAudioTokens = Math.max(0, inputAudioTotal - cachedInputAudio);
  const inputTextTokens = Math.max(0, inputTextTotal - cachedInputText);

  const outputAudioTokens =
    detailNum(outputDetails, "audio_tokens") + detailNum(outputDetails, "output_audio_tokens");
  const reasoningOutputTokens = detailNum(outputDetails, "reasoning_tokens");
  const outputTextFromDetails = detailNum(outputDetails, "text_tokens");
  const outputTokens = raw.output_tokens ?? 0;
  const outputTextTokens =
    outputTextFromDetails > 0
      ? outputTextFromDetails
      : Math.max(0, outputTokens - outputAudioTokens - reasoningOutputTokens);

  return {
    inputTokens: raw.input_tokens ?? inputTextTokens + inputAudioTokens + cachedInputText + cachedInputAudio,
    outputTokens: outputTokens || outputTextTokens + outputAudioTokens + reasoningOutputTokens,
    inputAudioTokens,
    inputTextTokens,
    cachedInputTextTokens: cachedInputText,
    cachedInputAudioTokens: cachedInputAudio,
    outputAudioTokens,
    outputTextTokens,
    reasoningOutputTokens,
  };
}

export function addUsageSnapshots(a: UsageTokenSnapshot, b: UsageTokenSnapshot): UsageTokenSnapshot {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    inputAudioTokens: a.inputAudioTokens + b.inputAudioTokens,
    inputTextTokens: a.inputTextTokens + b.inputTextTokens,
    cachedInputTextTokens: a.cachedInputTextTokens + b.cachedInputTextTokens,
    cachedInputAudioTokens: a.cachedInputAudioTokens + b.cachedInputAudioTokens,
    outputAudioTokens: a.outputAudioTokens + b.outputAudioTokens,
    outputTextTokens: a.outputTextTokens + b.outputTextTokens,
    reasoningOutputTokens: a.reasoningOutputTokens + b.reasoningOutputTokens,
  };
}
