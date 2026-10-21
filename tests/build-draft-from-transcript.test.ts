import { describe, expect, it } from "vitest";
import { buildDraftFromTranscript } from "@/lib/magazine-flow/build-draft-from-transcript";
import { MOCK_CLIMAX_UTTERANCE_ID } from "@/lib/realtime/mock-conversation";

describe("build-draft-from-transcript", () => {
  it("builds a valid draft from mock-like guest lines", () => {
    const transcript = [
      {
        id: "mock-ai-1",
        speaker: "ai" as const,
        text: "お風呂上がりに、いつも何か塗りますか？",
        startedAt: 0,
        endedAt: 2000,
      },
      {
        id: "mock-guest-1",
        speaker: "guest" as const,
        text: "肌が乾燥しやすいので、化粧水と乳液をいつも使っています。",
        startedAt: 2000,
        endedAt: 5000,
      },
      {
        id: "mock-ai-2",
        speaker: "ai" as const,
        text: "その習慣は、誰から教わったんですか？",
        startedAt: 5000,
        endedAt: 7000,
      },
      {
        id: MOCK_CLIMAX_UTTERANCE_ID,
        speaker: "guest" as const,
        text: "母ですね。中学生のころ、鏡の前で一緒に塗るところを見せてくれました。",
        startedAt: 7000,
        endedAt: 11000,
      },
    ];
    const draft = buildDraftFromTranscript(transcript, {
      guestName: "ゲスト",
      place: "自宅",
      language: "ja",
    });
    expect(draft).not.toBeNull();
    expect(draft!.heroQuote.utteranceId).toBe(MOCK_CLIMAX_UTTERANCE_ID);
    expect(draft!.qa.length).toBeGreaterThanOrEqual(2);
  });
});
