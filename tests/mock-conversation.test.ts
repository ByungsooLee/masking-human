import { describe, expect, it, vi } from "vitest";
import { MOCK_CLIMAX_UTTERANCE_ID, scheduleMockConversation } from "@/lib/realtime/mock-conversation";
import { pickFeaturedGuestQuote } from "@/themes/shared/quote-feature";

describe("scheduleMockConversation", () => {
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
