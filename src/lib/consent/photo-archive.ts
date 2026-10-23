import type { SignedRelease } from "./release";

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("masking-human-photo-permissions", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("permissions", { keyPath: "record.id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function savePhotoPermission(release: SignedRelease): Promise<void> {
  if (release.record.purpose !== "photography" || !release.record.photo) throw new Error("Not a photo permission");
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("permissions", "readwrite");
      transaction.objectStore("permissions").put(release);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
export async function listPhotoPermissions(): Promise<SignedRelease[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("permissions", "readonly").objectStore("permissions").getAll();
      request.onsuccess = () => resolve((request.result as SignedRelease[]).sort((first, second) => second.record.signedAt.localeCompare(first.record.signedAt)));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
