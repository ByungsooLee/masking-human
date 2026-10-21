/**
 * Realtime API unit prices (USD per 1M tokens).
 * Source: OpenAI pricing (checked 2026-10). Re-check before production.
 */
export type TokenRateKey =
  | "inputText"
  | "cachedInputText"
  | "outputText"
  | "inputAudio"
  | "cachedInputAudio"
  | "outputAudio";

export type ModelPricing = {
  perMillionTokens: Record<TokenRateKey, number>;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-realtime-2.1": {
    perMillionTokens: {
      inputText: 4.0,
      cachedInputText: 0.4,
      outputText: 24.0,
      inputAudio: 32.0,
      cachedInputAudio: 0.4,
      outputAudio: 64.0,
    },
  },
  "gpt-realtime-2.1-mini": {
    perMillionTokens: {
      inputText: 0.6,
      cachedInputText: 0.06,
      outputText: 2.4,
      inputAudio: 10.0,
      cachedInputAudio: 0.3,
      outputAudio: 20.0,
    },
  },
};

export function resolveModelPricing(model: string): ModelPricing | undefined {
  return MODEL_PRICING[model];
}

export function isPricingConfigured(model: string): boolean {
  return model in MODEL_PRICING;
}
