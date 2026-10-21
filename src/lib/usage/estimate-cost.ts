import { isPricingConfigured, resolveModelPricing, type TokenRateKey } from "../../../config/pricing";
import type { UsageTokenSnapshot } from "./types";

function costForTokens(tokens: number, usdPerMillion: number): number {
  if (tokens <= 0 || usdPerMillion <= 0) return 0;
  return (tokens / 1_000_000) * usdPerMillion;
}

/** Estimate USD from accumulated token buckets for a model. Returns null when pricing is unset. */
export function estimateUsdFromSnapshot(model: string, usage: UsageTokenSnapshot): number | null {
  const pricing = resolveModelPricing(model);
  if (!isPricingConfigured(model) || !pricing) return null;

  const rate = (key: TokenRateKey) => pricing.perMillionTokens[key];

  return (
    costForTokens(usage.inputTextTokens, rate("inputText")) +
    costForTokens(usage.inputAudioTokens, rate("inputAudio")) +
    costForTokens(usage.cachedInputTextTokens, rate("cachedInputText")) +
    costForTokens(usage.cachedInputAudioTokens, rate("cachedInputAudio")) +
    costForTokens(usage.outputTextTokens, rate("outputText")) +
    costForTokens(usage.reasoningOutputTokens, rate("outputText")) +
    costForTokens(usage.outputAudioTokens, rate("outputAudio"))
  );
}
