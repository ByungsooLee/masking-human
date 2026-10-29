import { isPricingConfigured, resolveModelPricing, type TokenRateKey } from "../../../config/pricing";
import type { UsageTokenSnapshot } from "./types";

function costForTokens(tokens: number, usdPerMillion: number): number {
  if (tokens <= 0 || usdPerMillion <= 0) return 0;
  return (tokens / 1_000_000) * usdPerMillion;
}

/** Estimate USD from accumulated token buckets for a model. Returns null when pricing is unset. */
export function estimateUsdFromSnapshot(model: string, usage: UsageTokenSnapshot): number | null {
  const breakdown = estimateCostBreakdown(model, usage);
  return breakdown ? Object.values(breakdown).reduce((total, cost) => total + cost, 0) : null;
}

export function estimateCostBreakdown(model: string, usage: UsageTokenSnapshot) {
  const pricing = resolveModelPricing(model);
  if (!isPricingConfigured(model) || !pricing) return null;

  const rate = (key: TokenRateKey) => pricing.perMillionTokens[key];

  return {
    textInput: costForTokens(usage.inputTextTokens, rate("inputText")),
    audioInput: costForTokens(usage.inputAudioTokens, rate("inputAudio")),
    cachedTextInput: costForTokens(usage.cachedInputTextTokens, rate("cachedInputText")),
    cachedAudioInput: costForTokens(usage.cachedInputAudioTokens, rate("cachedInputAudio")),
    textOutput: costForTokens(usage.outputTextTokens, rate("outputText")),
    reasoningOutput: costForTokens(usage.reasoningOutputTokens, rate("outputText")),
    audioOutput: costForTokens(usage.outputAudioTokens, rate("outputAudio")),
  };
}
