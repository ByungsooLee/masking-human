import { describe, expect, it, vi } from "vitest";
import { getMockConversationDurationMs, MOCK_CLIMAX_UTTERANCE_ID, scheduleMockConversation } from "@/lib/realtime/mock-conversation";
import { pickFeaturedGuestQuote } from "@/themes/shared/quote-feature";

describe("scheduleMockConversation", () => {
  it("plays a longer interview through the final keyword without duplicate IDs", () => {
    vi.useFakeTimers();
    let transcript: import("@/lib/realtime/types").Utterance[] = [];
    const onComplete = vi.fn();
    const cancel = scheduleMockConversation({ onPhase: () => undefined, onUtterances: (rows) => { transcript = rows; }, onComplete });
    expect(getMockConversationDurationMs()).toBeGreaterThan(180_000);
    expect(getMockConversationDurationMs()).toBeLessThan(240_000);
    vi.advanceTimersByTime(getMockConversationDurationMs() - 1);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(transcript.filter((row) => row.speaker === "guest")).toHaveLength(18);
    expect(new Set(transcript.map((row) => row.id)).size).toBe(transcript.length);
    expect(transcript.some((row) => row.text.includes("ひとことで言うと"))).toBe(true);
    cancel();
    vi.useRealTimers();
  });
  it("ends on the climax guest line and holds the scene", () => {
    vi.useFakeTimers();
    const phases: string[] = [];
    let lastUtterances: { id: string; speaker: string; text: string }[] = [];

    const cancel = scheduleMockConversation({
      onPhase: (p) => phases.push(p),
      onUtterances: (u) => {
        lastUtterances = u;
      },
    });

    vi.runAllTimers();

    const climax = lastUtterances.find((u) => u.id === MOCK_CLIMAX_UTTERANCE_ID);
    expect(climax?.speaker).toBe("guest");
    expect(pickFeaturedGuestQuote(lastUtterances as import("@/lib/realtime/types").Utterance[])).toBe(
      climax?.text,
    );
    expect(phases.at(-1)).toBe("guest_may_speak");
    expect(lastUtterances.some((u) => u.id === "mock-ai-3")).toBe(true);

    cancel();
    vi.useRealTimers();
  });

  it("calls onComplete after the full timeline", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const cancel = scheduleMockConversation({
      onPhase: () => undefined,
      onUtterances: () => undefined,
      onComplete,
    });
    vi.runAllTimers();
    expect(onComplete).toHaveBeenCalledTimes(1);
    cancel();
    vi.useRealTimers();
  });
});
