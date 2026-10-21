import type { MagazineDraft, PrepareState, TranscriptEntry } from "@/lib/magazine-flow/types";

export type ArchivedSession = {
  id: string;
  savedAt: string;
  prepare: PrepareState;
  transcript: TranscriptEntry[];
  draft: MagazineDraft | null;
  slateAtMs: number | null;
};

const DB_NAME = "masking-human-sessions";
const STORE = "sessions";

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
