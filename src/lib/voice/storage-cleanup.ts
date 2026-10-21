import { getServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AUDIO_BUCKET } from "./audio-limits";
import { deleteAudioAsset, getAudioStorageBackend } from "./audio-storage/index";

const STALE_PENDING_MS = 60 * 60 * 1000;

export async function markUploadFailed(assetId: string, reason: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const client = getServiceRoleClient();
  await client
    .from("audio_assets")
    .update({ upload_status: "failed" })
    .eq("id", assetId);
  try {
    await deleteAudioAsset(assetId);
  } catch {
    void reason;
  }
}

/** Remove pending DB rows + storage objects with no matching ready asset (service role). */
export async function sweepOrphanAssets(sessionId?: string): Promise<{ removed: number }> {
  if (!isSupabaseConfigured()) {
    return { removed: 0 };
  }
  const client = getServiceRoleClient();
  const cutoff = new Date(Date.now() - STALE_PENDING_MS).toISOString();
  let query = client
    .from("audio_assets")
    .select("id, session_id, storage_path, storage_bucket, upload_status, created_at")
    .eq("upload_status", "pending")
    .lt("created_at", cutoff);
  if (sessionId) query = query.eq("session_id", sessionId);
  const { data: stale, error } = await query;
  if (error) throw error;

  let removed = 0;
  for (const row of stale ?? []) {
    try {
      await client.storage.from(row.storage_bucket ?? AUDIO_BUCKET).remove([row.storage_path]);
    } catch {
      /* ignore */
    }
    await client.from("audio_assets").delete().eq("id", row.id);
    removed++;
  }

  if (sessionId) {
    const orphans = await getAudioStorageBackend().listOrphanStoragePaths(sessionId);
    if (orphans.length) {
      await client.storage.from(AUDIO_BUCKET).remove(orphans);
      removed += orphans.length;
    }
  }

  return { removed };
}
