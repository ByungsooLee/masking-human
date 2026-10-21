import { randomUUID } from "crypto";
import { getServiceRoleClient } from "@/lib/supabase/client";
import type { AudioAssetRecord } from "../types";
import {
  AUDIO_BUCKET,
  extensionForMime,
  validateAudioMime,
  validateAudioSize,
} from "../audio-limits";
import type {
  AudioStorageBackend,
  PendingUploadParams,
  SignedUploadResult,
  StoreAudioParams,
} from "./types";

const UPLOAD_MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < UPLOAD_MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < UPLOAD_MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
      }
    }
  }
  throw last instanceof Error ? last : new Error("upload failed");
}

export class SupabaseAudioStorageBackend implements AudioStorageBackend {
  private client = getServiceRoleClient();

  private async insertAssetRow(
    record: Omit<AudioAssetRecord, "createdAt"> & { createdAt?: string },
  ): Promise<void> {
    const { error } = await this.client.from("audio_assets").insert({
      id: record.id,
      session_id: record.sessionId,
      kind: record.kind,
      source_type: record.sourceType,
      storage_path: record.storagePath,
      storage_bucket: record.storageBucket,
      mime_type: record.mimeType,
      duration_ms: record.durationMs ?? null,
      byte_size: record.byteSize ?? null,
      upload_status: record.uploadStatus,
    });
    if (error) throw error;
  }

  async store(params: StoreAudioParams): Promise<AudioAssetRecord> {
    if (!validateAudioMime(params.mimeType) || !validateAudioSize(params.data.length)) {
      throw new Error("Invalid audio mime or size");
    }
    const id = randomUUID();
    const ext = extensionForMime(params.mimeType);
    const path = `${params.sessionId}/${id}.${ext}`;
    await withRetry(async () => {
      const { error } = await this.client.storage
        .from(AUDIO_BUCKET)
        .upload(path, params.data, { contentType: params.mimeType, upsert: false });
      if (error) throw error;
    });
    const record: AudioAssetRecord = {
      id,
      sessionId: params.sessionId,
      kind: params.kind,
      sourceType: params.sourceType,
      storagePath: path,
      storageBucket: AUDIO_BUCKET,
      mimeType: params.mimeType,
      durationMs: params.durationMs,
      byteSize: params.data.length,
      uploadStatus: "ready",
      createdAt: new Date().toISOString(),
    };
    await this.insertAssetRow(record);
    return record;
  }

  async createSignedUpload(params: PendingUploadParams): Promise<SignedUploadResult> {
    if (!validateAudioMime(params.mimeType) || !validateAudioSize(params.expectedByteSize)) {
      throw new Error("Invalid audio mime or size");
    }
    const id = randomUUID();
    const ext = extensionForMime(params.mimeType);
    const path = `${params.sessionId}/${id}.${ext}`;
    const record: AudioAssetRecord = {
      id,
      sessionId: params.sessionId,
      kind: params.kind,
      sourceType: params.sourceType,
      storagePath: path,
      storageBucket: AUDIO_BUCKET,
      mimeType: params.mimeType,
      durationMs: params.durationMs,
      byteSize: params.expectedByteSize,
      uploadStatus: "pending",
      createdAt: new Date().toISOString(),
    };
    await this.insertAssetRow(record);

    const { data, error } = await this.client.storage
      .from(AUDIO_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("signed upload failed");

    return {
      asset: record,
      signedUrl: data.signedUrl,
      token: data.token,
      path,
    };
  }

  async finalizeUpload(assetId: string, expectedSize?: number): Promise<AudioAssetRecord> {
    const { data: row, error } = await this.client
      .from("audio_assets")
      .select("*")
      .eq("id", assetId)
      .maybeSingle();
    if (error || !row) throw error ?? new Error("Asset not found");

    const { data: listed, error: listErr } = await this.client.storage
      .from(row.storage_bucket ?? AUDIO_BUCKET)
      .list(row.session_id, { search: row.storage_path.split("/").pop() });
    if (listErr) throw listErr;

    const name = row.storage_path.split("/").pop();
    const obj = listed?.find((f) => f.name === name);
    if (!obj) throw new Error("Upload not found in storage");

    const size = obj.metadata?.size ?? expectedSize;
    if (expectedSize !== undefined && size !== undefined && size !== expectedSize) {
      throw new Error("Upload size mismatch");
    }
    if (size !== undefined && !validateAudioSize(Number(size))) {
      throw new Error("Uploaded file exceeds size limit");
    }

    const { error: updErr } = await this.client
      .from("audio_assets")
      .update({
        upload_status: "ready",
        byte_size: size ?? expectedSize ?? row.byte_size,
      })
      .eq("id", assetId);
    if (updErr) throw updErr;

    return {
      id: row.id,
      sessionId: row.session_id,
      kind: row.kind,
      sourceType: row.source_type,
      storagePath: row.storage_path,
      storageBucket: row.storage_bucket,
      mimeType: row.mime_type,
      durationMs: row.duration_ms ?? undefined,
      byteSize: size ?? row.byte_size ?? undefined,
      uploadStatus: "ready",
      createdAt: row.created_at,
    };
  }

  async read(assetId: string): Promise<{ meta: AudioAssetRecord; data: Buffer } | null> {
    const { data: row, error } = await this.client
      .from("audio_assets")
      .select("*")
      .eq("id", assetId)
      .maybeSingle();
    if (error || !row) return null;

    const { data: file, error: dlErr } = await this.client.storage
      .from(row.storage_bucket ?? AUDIO_BUCKET)
      .download(row.storage_path);
    if (dlErr || !file) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    return {
      meta: {
        id: row.id,
        sessionId: row.session_id,
        kind: row.kind,
        sourceType: row.source_type,
        storagePath: row.storage_path,
        storageBucket: row.storage_bucket,
        mimeType: row.mime_type,
        durationMs: row.duration_ms ?? undefined,
        byteSize: row.byte_size ?? undefined,
        uploadStatus: row.upload_status,
        createdAt: row.created_at,
      },
      data: buf,
    };
  }

  async deleteAsset(assetId: string): Promise<void> {
    const { data: row } = await this.client
      .from("audio_assets")
      .select("storage_path, storage_bucket")
      .eq("id", assetId)
      .maybeSingle();
    if (row?.storage_path) {
      await this.client.storage.from(row.storage_bucket ?? AUDIO_BUCKET).remove([row.storage_path]);
    }
    await this.client.from("audio_assets").delete().eq("id", assetId);
  }

  async listOrphanStoragePaths(sessionId: string): Promise<string[]> {
    const { data: files } = await this.client.storage.from(AUDIO_BUCKET).list(sessionId);
    if (!files?.length) return [];

    const { data: rows } = await this.client
      .from("audio_assets")
      .select("storage_path")
      .eq("session_id", sessionId);

    const known = new Set((rows ?? []).map((r) => r.storage_path));
    return files
      .map((f) => `${sessionId}/${f.name}`)
      .filter((p) => !known.has(p));
  }
}
