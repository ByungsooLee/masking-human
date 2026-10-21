import { describe, expect, it } from "vitest";
import { utteranceToSubtitleCues } from "@/lib/recording/subtitle-segments";

describe("subtitle-segments", () => {
  it("splits long ja utterances", () => {
    const text = "あ".repeat(45);
    const cues = utteranceToSubtitleCues({
      id: "1",
      speaker: "guest",
      text,
      startedAt: 0,
      endedAt: 9000,
      language: "ja",
    });
    expect(cues.length).toBeGreaterThan(1);
    expect(cues[0]!.endMs).toBeLessThanOrEqual(cues[1]!.startMs + 1);
  });
});
