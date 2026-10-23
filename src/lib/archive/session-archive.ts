import type { MagazineDraft, PrepareState, TranscriptEntry } from "@/lib/magazine-flow/types";
import type { SignedRelease } from "@/lib/consent/release";
import type { AudioStems, EditingEvent } from "@/lib/recording/editing-capture";

export type ArchivedSession = {
  id: string;
  savedAt: string;
  prepare: PrepareState;
  transcript: TranscriptEntry[];
  draft: MagazineDraft | null;
  slateAtMs: number | null;
  recordedAt?: number | null;
  recordingBlob?: Blob | null;
  analysisFeedback?: Record<string, string>;
  releaseConsent?: SignedRelease | null;
  audioStems?: AudioStems | null;
  editingTimeline?: EditingEvent[];
};

const DB_NAME = "masking-human-sessions";
const STORE = "sessions";

export async function getArchivedSession(id: string): Promise<ArchivedSession | null> {
  const db = await openDb();
  try {
    return await new Promise<ArchivedSession | null>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveArchivedSession(entry: ArchivedSession): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listArchivedSessions(): Promise<ArchivedSession[]> {
  const db = await openDb();
  const rows = await new Promise<ArchivedSession[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as ArchivedSession[]).sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function deleteArchivedSession(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
