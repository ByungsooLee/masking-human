import { describe, expect, it } from "vitest";
import { buildSrt } from "@/lib/magazine-flow/export-transcript";

describe("export-transcript", () => {
  it("formats SRT timecodes", () => {
    const srt = buildSrt(
      [
        { id: "1", speaker: "guest", text: "こんにちは", startedAt: 1000, endedAt: 2500 },
        { id: "2", speaker: "ai", text: "Hello", startedAt: 3000, endedAt: 5000 },
      ],
      "ja",
      { relativeToMs: 1000 },
    );
    expect(srt).toContain("00:00:00,000 --> 00:00:01,500");
    expect(srt).toContain("Guest: こんにちは");
    expect(srt).toContain("00:00:02,000 --> 00:00:04,000");
  });
});
