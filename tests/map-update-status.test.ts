import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { summarizeMapUpdate, inputStateFromTransportEvent } from "@/lib/graph/map-update-status";
import { ConversationWorkspace } from "@/components/live/conversation-workspace";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import type { Utterance } from "@/lib/realtime/types";

const guest = (id: string, text: string): Utterance => ({ id, speaker: "guest", text, startedAt: 0, endedAt: 100 });

afterEach(() => { vi.useRealTimers(); useRealtimeInterviewStore.getState().reset(); });

describe("live map feedback", () => {
  it("distinguishes new keywords, updated evidence and no matching keywords", () => {
    expect(summarizeMapUpdate([])).toEqual({ added: 0, updated: 0, turnId: null });
    expect(summarizeMapUpdate([guest("one", "乳液を使う。")])).toMatchObject({ added: 1, updated: 0 });
    expect(summarizeMapUpdate([guest("one", "乳液を使う。"), guest("two", "乳液を使う。")])).toMatchObject({ added: 0, updated: 1 });
    expect(summarizeMapUpdate([guest("one", "はい。")])).toMatchObject({ added: 0, updated: 0, turnId: "one" });
  });
  it("does not treat AI speech or unrelated events as a guest map update", () => {
    expect(summarizeMapUpdate([{ ...guest("ai", "乳液"), speaker: "ai" }]).turnId).toBeNull();
    expect(inputStateFromTransportEvent({ type: "response.done" })).toBeNull();
    expect(inputStateFromTransportEvent({ type: "input_audio_buffer.speech_started" })).toBe("speaking");
    expect(inputStateFromTransportEvent({ type: "input_audio_buffer.speech_stopped" })).toBe("transcribing");
    expect(inputStateFromTransportEvent({ type: "conversation.item.input_audio_transcription.completed" })).toBe("idle");
    expect(inputStateFromTransportEvent({ type: "conversation.item.input_audio_transcription.failed" })).toBe("failed");
  });
  it("tracks actual pending start time and clears it on completion/reset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T00:00:00Z"));
    const store = useRealtimeInterviewStore;
    store.getState().setInputState("transcribing");
    expect(store.getState().inputPendingSince).toBe(Date.now());
    store.getState().setInputState("idle");
    expect(store.getState().inputPendingSince).toBeNull();
    store.getState().reset();
    expect(store.getState().inputState).toBe("idle");
  });
  it("renders just chat/map views and a real transcription waiting state", () => {
    const html = renderToStaticMarkup(createElement(ConversationWorkspace, { utterances: [guest("one", "乳液を使う。")], language: "ja", inputState: "transcribing", pendingSince: 100, phase: "waiting_ai" }));
    expect(html).toContain("両方を見る");
    expect(html).toContain("文字起こしを確認中");
    expect(html).toContain("反映を待たずに話を続けられます");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Words &amp; time");
    expect(html).not.toContain("図を保存");
  });
  it("renders English feedback and explains updates without new nodes", () => {
    const html = renderToStaticMarkup(createElement(ConversationWorkspace, { utterances: [guest("one", "yes")], language: "en", inputState: "idle", pendingSince: null, phase: "guest_may_speak" }));
    expect(html).toContain("No new keywords this time");
    expect(html).toContain("Both");
    expect(html).not.toMatch(/[ぁ-んァ-ヶ一-龯]/u);
  });
});
