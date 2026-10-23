import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { FinalAnalysisView } from "@/components/graph/final-analysis-view";
import { buildAnalysisFindings } from "@/lib/graph/analysis-findings";
import { getArchivedSession, saveArchivedSession, type ArchivedSession } from "@/lib/archive/session-archive";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

const session: ArchivedSession = {
  id: "session-one", savedAt: "2026-10-22T00:00:00Z", recordedAt: 100,
  prepare: useMagazineFlowStore.getInitialState().prepare,
  transcript: [{ id: "guest", speaker: "guest", text: "家族との時間が一番大切です。", startedAt: 0, endedAt: 100 }],
  draft: null, slateAtMs: 0,
};

afterEach(() => { vi.unstubAllGlobals(); useMagazineFlowStore.getState().resetFlow(); });

describe("final analysis and separate history exports", () => {
  it("keeps media and social export controls outside the final report", () => {
    const key = buildAnalysisFindings(session.transcript)[0].reviewKey;
    const html = renderToStaticMarkup(createElement(FinalAnalysisView, { session: { ...session, analysisFeedback: { [key]: "1" } } }));
    expect(html).toContain("少し違う — 未確定");
    expect(html).toContain("思考の構成・アナリティクス");
    expect(html).toContain("5軸ストーリー・因果マインドマップ");
    expect(html).not.toContain("総合レポートをJSONで保存");
    expect(html).not.toContain("図を保存");
    expect(html).not.toContain("カルーセル PNG を保存");
    const flow = readFileSync("src/components/magazine-flow/magazine-flow.tsx", "utf8");
    expect(flow).toContain('<PhaseResults mockOnly={mockOnly} />');
    expect(flow).not.toContain('<PhasePublish />');
  });
  it("retains feedback across the selection and final stages and clears it for a new interview", () => {
    const store = useMagazineFlowStore;
    store.getState().setAnalysisFeedback("finding", "2");
    store.getState().setPhase("publish");
    expect(store.getState().analysisFeedback).toEqual({ finding: "2" });
    store.getState().resetFlow();
    expect(store.getState().analysisFeedback).toEqual({});
  });
  it("stores and retrieves the recording and feedback with backward-compatible optional fields", async () => {
    const rows = new Map<string, ArchivedSession>();
    const database = {
      close: vi.fn(),
      transaction: () => {
        const transaction = { oncomplete: null as null | (() => void), objectStore: () => ({
          put: (entry: ArchivedSession) => { rows.set(entry.id, entry); queueMicrotask(() => transaction.oncomplete?.()); },
          get: (id: string) => {
            const request = { result: undefined as ArchivedSession | undefined, onsuccess: null as null | (() => void) };
            queueMicrotask(() => { request.result = rows.get(id); request.onsuccess?.(); });
            return request;
          },
        }) };
        return transaction;
      },
    };
    vi.stubGlobal("indexedDB", { open: () => {
      const request = { result: database, onsuccess: null as null | (() => void) };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    } });
    const recordingBlob = new Blob(["recording"], { type: "audio/webm" });
    const audioStems = { guest: { blob: new Blob(["guest"], { type: "audio/mp4" }), startMs: 1, stopMs: 1000 }, sampleRate: 48000, issues: [] };
    const editingTimeline = [{ atMs: 500, type: "chat_update" as const, data: { utterances: session.transcript } }];
    await saveArchivedSession({ ...session, recordingBlob, audioStems, editingTimeline, analysisFeedback: { finding: "0" } });
    const restored = await getArchivedSession(session.id);
    expect(restored?.analysisFeedback).toEqual({ finding: "0" });
    expect(await restored?.recordingBlob?.text()).toBe("recording");
    expect(await restored?.audioStems?.guest?.blob.text()).toBe("guest");
    expect(restored?.editingTimeline).toEqual(editingTimeline);
    await saveArchivedSession({ ...session, id: "legacy" });
    expect((await getArchivedSession("legacy"))?.recordingBlob).toBeUndefined();
    expect(await getArchivedSession("missing")).toBeNull();
  });
});
