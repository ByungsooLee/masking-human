import type { AudioAssetKind, AudioAssetRecord } from "../types";

export type AudioSourceType = "browser_recording" | "assistant_tts" | "external_wav";

export interface StoreAudioParams {
  sessionId: string;
  kind: AudioAssetKind;
  sourceType: AudioSourceType;
  data: Buffer;
  mimeType: string;
  durationMs?: number;
}

export interface PendingUploadParams {
  sessionId: string;
  kind: AudioAssetKind;
  sourceType: AudioSourceType;
  mimeType: string;
  expectedByteSize: number;
  durationMs?: number;
}

export interface SignedUploadResult {
  asset: AudioAssetRecord;
  signedUrl: string;
  token: string;
  path: string;
}

export interface AudioStorageBackend {
  store(params: StoreAudioParams): Promise<AudioAssetRecord>;
  createSignedUpload(params: PendingUploadParams): Promise<SignedUploadResult>;
  finalizeUpload(assetId: string, expectedSize?: number): Promise<AudioAssetRecord>;
  read(assetId: string): Promise<{ meta: AudioAssetRecord; data: Buffer } | null>;
  deleteAsset(assetId: string): Promise<void>;
  listOrphanStoragePaths(sessionId: string): Promise<string[]>;
}
