import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
import { requireInterviewRelease, signedReleases, withArchivedRelease, withParticipantReport } from "@/lib/archive/participant-handover";
import { combineParticipantPdf } from "@/lib/archive/participant-report-pdf";
import { getArchivedSession, saveArchivedSession, updateArchivedHandover, type ArchivedSession } from "@/lib/archive/session-archive";
import { buildConversationExport } from "@/lib/archive/conversation-export";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import type { SignedRelease } from "@/lib/consent/release";
import { createUsageLedger } from "@/lib/usage/response-ledger";

const release = { record: { id: "consent-1", videoId: "session", name: "PRIVATE-NAME", email: "PRIVATE-EMAIL", signature: "PRIVATE-SIGNATURE", signedAt: "2026-10-26T00:00:00Z", purpose: "interview" }, pdf: "PRIVATE-PDF", mail: "pending" } as SignedRelease;
const session: ArchivedSession = { id: "session", savedAt: "2026-10-26T00:00:00Z", prepare: useMagazineFlowStore.getInitialState().prepare, transcript: [], draft: null, slateAtMs: null };
afterEach(() => vi.unstubAllGlobals());

describe("participant report and signature history", () => {
  it("requires a matching saved interview signature and keeps legacy entries readable", () => {
    expect(signedReleases(session)).toEqual([]);
    expect(() => requireInterviewRelease(session)).toThrow();
    expect(requireInterviewRelease(withArchivedRelease(session, release))).toBe(release);
    expect(() => withArchivedRelease(session, { ...release, record: { ...release.record, videoId: "different" } })).toThrow();
    expect(() => withArchivedRelease(session, { ...release, record: { ...release.record, purpose: "photography" } })).toThrow();
  });
  it("preserves old signatures and deduplicates updates to the same receipt", () => {
    const first = withArchivedRelease(session, release);
    const second = withArchivedRelease(first, { ...release, record: { ...release.record, id: "consent-2" } });
    expect(signedReleases(second).map((entry) => entry.record.id)).toEqual(["consent-1", "consent-2"]);
    const mailed = withArchivedRelease(second, { ...second.releaseConsent!, mail: "accepted" });
    expect(mailed.releaseHistory).toHaveLength(2);
    expect(mailed.releaseHistory![1].mail).toBe("accepted");
  });
  it("keeps the exact handed-out PDF snapshot and prevents a stale signature association", () => {
    const signed = withArchivedRelease(session, release);
    const report = { id: "report", createdAt: "2026-10-26T00:00:00Z", releaseId: release.record.id, language: "ja" as const, pdf: "PRIVATE-REPORT" };
    const saved = withParticipantReport(signed, report);
    expect(saved.participantReports![0]).toEqual(report);
    expect(() => withParticipantReport(session, report)).toThrow();
    expect(() => withParticipantReport(saved, { ...report, releaseId: "different" })).toThrow();
    expect(JSON.stringify(buildConversationExport(saved))).not.toContain("PRIVATE-");
  });
  it("appends all original receipt pages after the analysis without changing the source PDF", async () => {
    const analysis = await PDFDocument.create(); analysis.addPage([595, 842]);
    const receipt = await PDFDocument.create(); receipt.addPage([400, 600]); receipt.addPage([450, 650]);
    const bytes = await receipt.save(); const original = Buffer.from(bytes).toString("base64");
    const merged = await PDFDocument.load(Buffer.from(await combineParticipantPdf(await analysis.save(), original), "base64"));
    expect(merged.getPageCount()).toBe(3);
    expect(merged.getPages().map((page) => page.getSize())).toEqual([{ width: 595, height: 842 }, { width: 400, height: 600 }, { width: 450, height: 650 }]);
    expect(Buffer.from(bytes).toString("base64")).toBe(original);
    await expect(combineParticipantPdf(await analysis.save(), "corrupt")).rejects.toThrow();
  });
  it("saves handover changes only after a transaction completes and retains them on later flow saves", async () => {
    const rows = new Map<string, ArchivedSession>();
    const database = { close: () => undefined, transaction: () => {
      const tx = { oncomplete: null as null | (() => void), onabort: null as null | (() => void), onerror: null, error: null,
        abort: () => queueMicrotask(() => tx.onabort?.()),
        objectStore: () => ({
          get: (id: string) => { const request = { result: undefined as ArchivedSession | undefined, onsuccess: null as null | (() => void) }; queueMicrotask(() => { request.result = rows.get(id); request.onsuccess?.(); }); return request; },
          put: (entry: ArchivedSession) => { rows.set(entry.id, entry); queueMicrotask(() => tx.oncomplete?.()); },
        }),
      }; return tx;
    } };
    vi.stubGlobal("indexedDB", { open: () => { const request = { result: database, onsuccess: null as null | (() => void) }; queueMicrotask(() => request.onsuccess?.()); return request; } });
    const usageLedger = createUsageLedger("gpt-realtime-2.1");
    await saveArchivedSession({ ...session, usageLedger });
    await updateArchivedHandover(session.id, (current) => withArchivedRelease(current, release));
    const report = { id: "report", createdAt: "today", releaseId: release.record.id, language: "en" as const, pdf: "snapshot" };
    await updateArchivedHandover(session.id, (current) => withParticipantReport(current, report));
    await saveArchivedSession({ ...session, releaseConsent: release });
    const restored = await getArchivedSession(session.id);
    expect(restored?.releaseHistory).toHaveLength(1);
    expect(restored?.participantReports).toEqual([report]);
    expect(restored?.usageLedger).toEqual(usageLedger);
    await expect(updateArchivedHandover("missing", (current) => current)).rejects.toThrow();
  });
  it("provides bilingual history controls and preserves signature privacy in raw fallback exports", () => {
    const detail = readFileSync("src/components/live/archive-session-detail.tsx", "utf8");
    const component = readFileSync("src/components/live/participant-handover.tsx", "utf8");
    expect(detail).toContain("<ParticipantHandover");
    expect(component).toContain("分析結果＋署名控えPDFを保存");
    expect(component).toContain("Save analysis + signed receipt PDF");
    expect(component).toContain("release.record.signature");
    expect(component).toContain("isDemoOnly()");
    expect(detail).toContain("releaseHistory: undefined");
    expect(detail).toContain("participantReports: undefined");
    const list = readFileSync("src/app/live/archive/page.tsx", "utf8");
    expect(list).toContain("本人に渡すレポート・署名");
    expect(list).toContain("Participant report & signature");
    expect(list).toContain("#participant-report");
    expect(component).toContain('id="participant-report"');
    expect(component).toContain('window.location.hash !== "#participant-report"');
    expect(component).toContain("scrollIntoView");
  });
});
