import { describe, expect, it } from "vitest";
import { analyzeInterview } from "@/lib/graph/interview-analytics";
import { buildEditCsv } from "@/lib/magazine-flow/export-transcript";
import { createUtteranceTimingState, historyToUtterances } from "@/lib/realtime/history-to-utterances";
import { applyTimingFromTransportEvent, markAiAudioStart, markAiAudioStop, resetAiTimingCursor } from "@/lib/realtime/utterance-timing-events";
import type { RealtimeItem } from "@openai/agents/realtime";
import type { Utterance } from "@/lib/realtime/types";

describe("production analytics", () => {
  const rows: Utterance[] = [
    { id: "ai", speaker: "ai", text: "クリーム クリーム", startedAt: 0, endedAt: 1000 },
    { id: "guest", speaker: "guest", text: "昔はクリーム。今もクリーム。未来もクリーム。安心します。", startedAt: 1100, endedAt: 3100 },
  ];
  it("counts occurrences within a turn without including AI repetitions", () => {
    const data = analyzeInterview(rows);
    expect(data.words.find((word) => word.word === "クリーム")).toEqual({ word: "クリーム", count: 3, utteranceIds: ["guest"] });
    expect(data.timeLenses.map((lens) => lens.utteranceIds)).toEqual([["guest"], ["guest"], ["guest"]]);
    expect(data.guestMs).toBe(2000);
  });
  it("exports edits with a shared clock and excludes removed speech", () => {
    const csv = buildEditCsv([...rows, { ...rows[1], id: "removed", excluded: true }], 100);
    expect(csv).toContain('"guest","guest","1000","3000"');
    expect(csv).not.toContain("removed");
  });
  it("keeps motivation lenses traceable to guest expressions without inventing scores", () => {
    const data = analyzeInterview([{ ...rows[1], text: "自分で選んだ。母と一緒に練習してできた。" }]);
    expect(data.motivationLenses.map((lens) => lens.utteranceIds)).toEqual([["guest"], ["guest"], ["guest"]]);
  });
});

describe("recording time integrity", () => {
  it("does not extend old utterances when later history arrives", () => {
    const timing = createUtteranceTimingState();
    timing.set("guest", { startedAt: 100, endedAt: 200 });
    const history = [{ type: "message", itemId: "guest", role: "user", status: "completed", content: [{ type: "input_audio", transcript: "hello" }] }] as RealtimeItem[];
    expect(historyToUtterances(history, timing, 9000, () => 9000)[0]).toMatchObject({ startedAt: 100, endedAt: 200 });
  });
  it("binds AI playback to its item instead of the response generation time", () => {
    resetAiTimingCursor();
    const timing = createUtteranceTimingState();
    applyTimingFromTransportEvent({ type: "response.output_item.added", item: { id: "answer" } }, timing, 100);
    markAiAudioStart(timing, 450);
    markAiAudioStop(timing, 1600);
    expect(timing.get("answer")).toEqual({ startedAt: 450, endedAt: 1600 });
  });
});
