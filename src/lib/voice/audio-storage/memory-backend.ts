import { randomUUID } from "crypto";
import type { AudioAssetRecord } from "../types";
import type {
  AudioStorageBackend,
  PendingUploadParams,
  SignedUploadResult,
  StoreAudioParams,
} from "./types";

const memoryBuckets = globalThis as unknown as {
  voiceAudio?: Map<string, { meta: AudioAssetRecord; data: Buffer }>;
  pendingUploads?: Map<string, Buffer>;
};

function bucket(): Map<string, { meta: AudioAssetRecord; data: Buffer }> {
  if (!memoryBuckets.voiceAudio) memoryBuckets.voiceAudio = new Map();
  return memoryBuckets.voiceAudio;
}

function pending(): Map<string, Buffer> {
  if (!memoryBuckets.pendingUploads) memoryBuckets.pendingUploads = new Map();
  return memoryBuckets.pendingUploads;
}

export class MemoryAudioStorageBackend implements AudioStorageBackend {
  async store(params: StoreAudioParams): Promise<AudioAssetRecord> {
    const id = randomUUID();
    const record: AudioAssetRecord = {
      id,
      sessionId: params.sessionId,
      kind: params.kind,
      sourceType: params.sourceType,
      storagePath: `memory://${params.sessionId}/${id}`,
      storageBucket: "memory",
      mimeType: params.mimeType,
      durationMs: params.durationMs,
      byteSize: params.data.length,
      uploadStatus: "ready",
      createdAt: new Date().toISOString(),
    };
    bucket().set(id, { meta: record, data: params.data });
    return record;
  }

  async createSignedUpload(params: PendingUploadParams): Promise<SignedUploadResult> {
    const id = randomUUID();
    const path = `${params.sessionId}/${id}`;
    const record: AudioAssetRecord = {
      id,
      sessionId: params.sessionId,
      kind: params.kind,
      sourceType: params.sourceType,
      storagePath: `memory://${path}`,
      storageBucket: "memory",
      mimeType: params.mimeType,
      durationMs: params.durationMs,
      byteSize: params.expectedByteSize,
      uploadStatus: "pending",
      createdAt: new Date().toISOString(),
    };
    bucket().set(id, { meta: record, data: Buffer.alloc(0) });
    pending().set(id, Buffer.alloc(0));
    return {
      asset: record,
      signedUrl: `memory-upload://${id}`,
      token: id,
      path,
    };
  }

  async finalizeUpload(assetId: string, expectedSize?: number): Promise<AudioAssetRecord> {
    const entry = bucket().get(assetId);
    if (!entry) throw new Error("Asset not found");
    const data = pending().get(assetId) ?? entry.data;
    if (expectedSize !== undefined && data.length !== expectedSize) {
      throw new Error("Upload size mismatch");
    }
    entry.meta.uploadStatus = "ready";
    entry.meta.byteSize = data.length;
    entry.data = data;
    pending().delete(assetId);
    return entry.meta;
  }

  /** Test helper: simulate client upload to memory signed URL */
  simulateClientUpload(assetId: string, data: Buffer): void {
    pending().set(assetId, data);
    const entry = bucket().get(assetId);
    if (entry) entry.data = data;
  }

  async read(assetId: string): Promise<{ meta: AudioAssetRecord; data: Buffer } | null> {
    return bucket().get(assetId) ?? null;
  }

  async deleteAsset(assetId: string): Promise<void> {
    bucket().delete(assetId);
    pending().delete(assetId);
  }

  async listOrphanStoragePaths(): Promise<string[]> {
    return [];
  }
}

export function clearMemoryAudioStorageForTests(): void {
  bucket().clear();
  pending().clear();
}
