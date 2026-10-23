import { afterEach, describe, expect, it, vi } from "vitest";
import type { SignedRelease } from "@/lib/consent/release";
import { saveArchivedSession, type ArchivedSession } from "@/lib/archive/session-archive";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

const entry: ArchivedSession = {
  id: "first", savedAt: "2026-10-23T00:00:00Z", reviewPhase: "review", slateAtMs: 1,
  prepare: { ...useMagazineFlowStore.getInitialState().prepare, guestName: "First guest", consents: { aiConversation: true, photoVideo: false, recording: true, snsPublish: true } },
  transcript: [{ id: "first-text", speaker: "guest", text: "First guest words", startedAt: 1, endedAt: 100 }],
  draft: null, recordingBlob: new Blob(["audio"], { type: "audio/webm" }),
};

afterEach(() => { vi.unstubAllGlobals(); useMagazineFlowStore.getState().resetFlow(); });

describe("consecutive interview storage", () => {
  it("resumes the same interview and resets identity, consent and media references for the next guest", () => {
    const release = { record: { videoId: entry.id }, pdf: "private fixture", mail: "pending" } as SignedRelease;
    const store = useMagazineFlowStore;
    store.getState().resumeArchivedSession({ ...entry, releaseConsent: release, analysisFeedback: { first: "1" } });
    store.getState().restorePrepareDefaults();
    expect(store.getState().prepare.guestName).toBe("First guest");
    expect(store.getState().phase).toBe("review");
    expect(store.getState().archiveId).toBe(entry.id);
    expect(store.getState().resumedSession?.recordingBlob).toBe(entry.recordingBlob);
    const epoch = store.getState().sessionEpoch;
    store.getState().resetFlow();
    expect(store.getState()).toMatchObject({ phase: "prepare", archiveId: null, releaseConsent: null, resumedSession: null, transcript: [], analysisFeedback: {} });
    expect(store.getState().prepare.guestName).toBe("");
    expect(Object.values(store.getState().prepare.consents)).toEqual([false, false, false, false]);
    expect(store.getState().sessionEpoch).toBe(epoch + 1);
    store.getState().markSessionStart();
    expect(store.getState().archiveId).not.toBe(entry.id);
    expect(entry.transcript[0].text).toBe("First guest words");
  });

  it("rejects an aborted save, closes the DB and allows a later save of the same interview", async () => {
    let abort = true;
    const writes: string[] = [];
    const close = vi.fn();
    const db = { close, transaction: () => {
      const tx = {
        error: new DOMException("Quota", "QuotaExceededError"),
        onabort: null as null | (() => void), oncomplete: null as null | (() => void),
        objectStore: () => ({ put: (value: ArchivedSession) => {
          queueMicrotask(() => {
            if (abort) tx.onabort?.();
            else { writes.push(value.transcript[0].text); tx.oncomplete?.(); }
          });
        } }),
      };
      return tx;
    } };
    vi.stubGlobal("indexedDB", { open: () => {
      const request = { result: db, onsuccess: null as null | (() => void) };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    } });
    await expect(saveArchivedSession(entry)).rejects.toMatchObject({ name: "QuotaExceededError" });
    expect(close).toHaveBeenCalledTimes(1);
    abort = false;
    await Promise.all([
      saveArchivedSession({ ...entry, transcript: [{ ...entry.transcript[0], text: "earlier" }] }),
      saveArchivedSession({ ...entry, transcript: [{ ...entry.transcript[0], text: "latest" }] }),
    ]);
    expect(writes).toEqual(["earlier", "latest"]);
    expect(close).toHaveBeenCalledTimes(3);
  });
});
