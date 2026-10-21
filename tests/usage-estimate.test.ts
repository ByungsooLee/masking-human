import { describe, expect, it } from "vitest";
import { estimateUsdFromSnapshot } from "@/lib/usage/estimate-cost";
import { normalizeRealtimeUsage } from "@/lib/usage/normalize-usage";

describe("normalizeRealtimeUsage", () => {
  it("splits cached input text and audio from cached_tokens_details", () => {
    const usage = normalizeRealtimeUsage({
      input_tokens: 1000,
      output_tokens: 100,
      input_token_details: {
        text_tokens: 600,
        audio_tokens: 400,
        cached_tokens: 300,
        cached_tokens_details: {
          text_tokens: 200,
          audio_tokens: 100,
        },
      },
      output_token_details: {
        text_tokens: 50,
        audio_tokens: 30,
        reasoning_tokens: 20,
      },
    });

    expect(usage.inputTextTokens).toBe(400);
    expect(usage.inputAudioTokens).toBe(300);
    expect(usage.cachedInputTextTokens).toBe(200);
    expect(usage.cachedInputAudioTokens).toBe(100);
    expect(usage.outputTextTokens).toBe(50);
    expect(usage.outputAudioTokens).toBe(30);
    expect(usage.reasoningOutputTokens).toBe(20);
  });
});

describe("estimateUsdFromSnapshot", () => {
  it("applies per-bucket rates including reasoning at output text rate", () => {
    const usage = normalizeRealtimeUsage({
      input_tokens: 1_000_000,
      output_tokens: 0,
      input_token_details: { text_tokens: 1_000_000 },
    });
    expect(estimateUsdFromSnapshot("gpt-realtime-2.1", usage)).toBe(4);

    const withReasoning = normalizeRealtimeUsage({
      input_tokens: 0,
      output_tokens: 1_000_000,
      output_token_details: { reasoning_tokens: 1_000_000 },
    });
    expect(estimateUsdFromSnapshot("gpt-realtime-2.1", withReasoning)).toBe(24);
  });

  it("returns null when model pricing is missing", () => {
    const usage = normalizeRealtimeUsage({ input_tokens: 100, output_tokens: 50 });
    expect(estimateUsdFromSnapshot("unknown-model", usage)).toBeNull();
  });
});
