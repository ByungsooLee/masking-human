import { getServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteAudioAsset, getAudioStorageBackend } from "@/lib/voice/audio-storage";
import { getUtteranceRepository } from "@/lib/voice/repositories";
import { loadSession, persistSession } from "../session-service";
import type { DeletionJob } from "./types";

const MAX_ATTEMPTS = 5;

export async function enqueueSessionDeletion(params: {
  sessionId: string;
  participantId: string;
  reason?: string;
}): Promise<DeletionJob> {
  if (process.env.DELETION_STORE?.toLowerCase() === "memory" || !isSupabaseConfigured()) {
    const { enqueueDeletionMemory } = await import("./memory-deletion-queue");
    return enqueueDeletionMemory(params);
  }
  const client = getServiceRoleClient();
  const { data, error } = await client
    .from("deletion_requests")
    .insert({
      session_id: params.sessionId,
      participant_id: params.participantId,
      reason: params.reason ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    sessionId: data.session_id,
    participantId: data.participant_id,
    reason: data.reason ?? undefined,
    status: data.status,
    requestedAt: data.requested_at,
    processedAt: data.processed_at ?? undefined,
    attempts: data.attempts ?? 0,
    lastError: data.last_error ?? undefined,
  };
}

export async function processNextDeletionJob(): Promise<DeletionJob | null> {
  if (process.env.DELETION_STORE?.toLowerCase() === "memory" || !isSupabaseConfigured()) {
    const { processNextDeletionJobMemory } = await import("./memory-deletion-queue");
    return processNextDeletionJobMemory(async (job) => purgeSessionData(job));
  }

  const client = getServiceRoleClient();
  const { data: jobs, error } = await client
    .from("deletion_requests")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("requested_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const row = jobs?.[0];
  if (!row) return null;

  const { error: lockErr } = await client
    .from("deletion_requests")
    .update({
      status: "processing",
      attempts: row.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", row.status);
  if (lockErr) return null;

  const job: DeletionJob = {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    reason: row.reason ?? undefined,
    status: "processing",
    requestedAt: row.requested_at,
    attempts: row.attempts + 1,
  };

  try {
    await purgeSessionData(job);
    const processedAt = new Date().toISOString();
    await client
      .from("deletion_requests")
      .update({ status: "completed", processed_at: processedAt, last_error: null })
      .eq("id", job.id);
    return { ...job, status: "completed", processedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await client
      .from("deletion_requests")
      .update({ status: "failed", last_error: message })
      .eq("id", job.id);
    return { ...job, status: "failed", lastError: message };
  }
}

/** Removes participant content; retains minimal deletion audit row in deletion_requests. */
export async function purgeSessionData(job: DeletionJob): Promise<void> {
  const session = await loadSession(job.sessionId);
  if (session) {
    session.deletedAt = new Date().toISOString();
    session.status = "ended_early";
    session.publishStatus = "private";
    session.turns = [];
    session.accumulator = {
      facts: [],
      participant_stated_values: [],
      hypotheses: [],
      confirmed_insights: [],
    };
    await persistSession(session);
  }

  const utterances = getUtteranceRepository();
  await utterances.deleteForSession(job.sessionId);

  const client = isSupabaseConfigured() ? getServiceRoleClient() : null;
  if (client) {
    const { data: assets } = await client
      .from("audio_assets")
      .select("id")
      .eq("session_id", job.sessionId);
    for (const a of assets ?? []) {
      await deleteAudioAsset(a.id);
    }
    const orphans = await getAudioStorageBackend().listOrphanStoragePaths(job.sessionId);
    if (orphans.length) {
      await client.storage.from("interview-audio-private").remove(orphans);
    }
  }
}
