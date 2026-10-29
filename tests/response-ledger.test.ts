import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { appendUsageEntry, buildUsageExport, createUsageLedger, usageEntryFromEvent } from "@/lib/usage/response-ledger";
import { createSessionRecord, clearSessionUsageStoreForTests, mergeSessionUsageDelta } from "@/lib/usage/session-usage-store";
import { normalizeRealtimeUsage } from "@/lib/usage/normalize-usage";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { buildConversationExport } from "@/lib/archive/conversation-export";
import { buildEditingFiles } from "@/lib/recording/editing-files";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryUsage } from "@/components/live/history-usage";

const model = "gpt-realtime-2.1";
const event = { type: "response.done", response: { id: "response-1", status: "cancelled", output: [{ id: "item-1", text: "PRIVATE-TEXT" }], usage: {
  input_tokens: 1000, output_tokens: 100,
  input_token_details: { text_tokens: 600, audio_tokens: 400, cached_tokens: 300, cached_tokens_details: { text_tokens: 200, audio_tokens: 100 } },
  output_token_details: { text_tokens: 50, audio_tokens: 30, reasoning_tokens: 20 },
} }, privateCredential: "PRIVATE-TOKEN" };
const session: ArchivedSession = { id: "session", savedAt: "2026-10-27", prepare: useMagazineFlowStore.getInitialState().prepare, transcript: [], draft: null, slateAtMs: null };

afterEach(() => { useRealtimeInterviewStore.getState().reset(); clearSessionUsageStoreForTests(); vi.unstubAllGlobals(); });

describe("response usage ledger", () => {
  it("splits billed buckets and captures interrupted responses without text or credentials", () => {
    const entry = usageEntryFromEvent(event, model, 1500)!;
    expect(entry).toMatchObject({ id: "response-1", kind: "response", status: "cancelled", atMs: 1500, outputItemIds: ["item-1"], tokens: { inputTextTokens: 400, inputAudioTokens: 300, cachedInputTextTokens: 200, cachedInputAudioTokens: 100, outputTextTokens: 50, outputAudioTokens: 30, reasoningOutputTokens: 20 } });
    expect(entry.estimatedUsd).toBeCloseTo(0.01492);
    expect(entry.costBreakdown?.audioInput).toBeCloseTo(0.0096);
    expect(entry.costBreakdown?.cachedTextInput).toBeCloseTo(0.00008);
    expect(JSON.stringify(entry)).not.toContain("PRIVATE-");
  });
  it("deduplicates by response ID in the client store and resets between participants", () => {
    const store = useRealtimeInterviewStore.getState();
    store.setUsageLedger(createUsageLedger(model));
    const entry = usageEntryFromEvent(event, model, 1)!;
    store.recordUsage(entry); store.recordUsage(entry);
    expect(useRealtimeInterviewStore.getState().usageLedger?.entries).toHaveLength(1);
    store.reset(); expect(useRealtimeInterviewStore.getState().usageLedger).toBeNull();
  });
  it("deduplicates repeated billing reports server-side without mixing sessions", () => {
    const first = createSessionRecord({ model }); const second = createSessionRecord({ model });
    const delta = normalizeRealtimeUsage(event.response.usage);
    mergeSessionUsageDelta(first.sessionId, delta, "response-1");
    const repeated = mergeSessionUsageDelta(first.sessionId, delta, "response-1");
    expect(repeated?.usage.inputTokens).toBe(1000);
    expect(mergeSessionUsageDelta(second.sessionId, delta, "response-1")?.usage.inputTokens).toBe(1000);
  });
  it("distinguishes absent usage and unknown prices from zero cost", () => {
    expect(usageEntryFromEvent({ type: "response.done", response: { id: "empty" } }, model, 0)?.estimatedUsd).toBeNull();
    expect(usageEntryFromEvent(event, "unknown-model", 0)?.estimatedUsd).toBeNull();
    expect(usageEntryFromEvent({ ...event, response: { ...event.response, usage: { input_tokens: 0, output_tokens: 0 } } }, model, 0)?.estimatedUsd).toBe(0);
    expect(usageEntryFromEvent({ type: "response.done" }, model, 0)).toBeNull();
    expect(usageEntryFromEvent({ type: "unrelated" }, model, 0)).toBeNull();
  });
  it("records transcription duration separately without charging it at Realtime rates", () => {
    const transcription = usageEntryFromEvent({ type: "conversation.item.input_audio_transcription.completed", item_id: "item-1", transcript: "PRIVATE-TEXT", usage: { type: "duration", seconds: 3 } }, model, 2)!;
    expect(transcription).toMatchObject({ kind: "transcription", durationSeconds: 3, estimatedUsd: null, costBreakdown: null, tokens: null });
    const ledger = appendUsageEntry(appendUsageEntry(createUsageLedger(model), usageEntryFromEvent(event, model, 0)!), transcription);
    expect(ledger.entries).toHaveLength(2);
    expect(JSON.stringify(ledger)).not.toContain("PRIVATE-");
  });
  it("exports the ledger with model/prompt provenance in conversation JSON and the editing ZIP", async () => {
    const ledger = appendUsageEntry(createUsageLedger(model, { revision: "test", sha256: "hash", characters: 100 }), usageEntryFromEvent(event, model, 0)!);
    const saved = { ...session, usageLedger: ledger };
    expect(buildConversationExport(saved).data.usage.ledger).toEqual(ledger);
    expect(buildUsageExport(session.id).ledger).toBeNull();
    const file = buildEditingFiles(saved).find((row) => row.name === "usage.json")!;
    expect(JSON.parse(await file.blob.text()).ledger.entries).toHaveLength(1);
    expect(JSON.stringify(buildUsageExport(session.id, ledger))).not.toContain("PRIVATE-");
  });
  it("keeps usage UI in history with bilingual labels and explicit billing limits", () => {
    expect(readFileSync("src/components/live/archive-session-detail.tsx", "utf8")).toContain("<HistoryUsage");
    const component = readFileSync("src/components/live/history-usage.tsx", "utf8");
    expect(component).toContain("返答ごとのAPI利用量");
    expect(component).toContain("API usage per response");
    expect(component).toContain("Excludes input-transcription costs");
    for (const phase of ["prepare", "conversation", "results"]) expect(readFileSync(`src/components/magazine-flow/phase-${phase}.tsx`, "utf8")).not.toContain("<HistoryUsage");
    expect(readFileSync("src/components/magazine-flow/phase-results.tsx", "utf8")).toContain("usageLedger");
  });
  it("renders bilingual history breakdowns and honest missing-data states without a browser or API", () => {
    const saved = { ...session, usageLedger: appendUsageEntry(createUsageLedger(model), usageEntryFromEvent(event, model, 1500)!) };
    for (const en of [false, true]) {
      const html = renderToStaticMarkup(createElement(HistoryUsage, { session: saved, en }));
      expect(html).toContain("$0.01492");
      expect(html).toContain(en ? "Audio output" : "音声出力");
      expect(html).toContain(en ? "Download usage JSON" : "利用量JSONを保存");
      expect(html).not.toContain("PRIVATE-");
      const legacy = renderToStaticMarkup(createElement(HistoryUsage, { session, en }));
      expect(legacy).toContain(en ? "No usage was recorded" : "利用量の記録がありません");
    }
  });
});
