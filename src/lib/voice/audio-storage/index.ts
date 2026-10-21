import type { AudioStorageBackend } from "./types";
import { MemoryAudioStorageBackend, clearMemoryAudioStorageForTests } from "./memory-backend";
import { SupabaseAudioStorageBackend } from "./supabase-backend";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AudioAssetRecord } from "../types";
import type { PendingUploadParams, SignedUploadResult, StoreAudioParams } from "./types";

let cached: AudioStorageBackend | null = null;

export function getAudioStorageMode(): "memory" | "supabase" {
  const explicit = process.env.AUDIO_STORE?.toLowerCase();
  if (explicit === "memory") return "memory";
  if (explicit === "supabase") return "supabase";
  const sessionStore = process.env.SESSION_STORE?.toLowerCase();
  if (sessionStore === "supabase" && isSupabaseConfigured()) return "supabase";
  return "memory";
}

export function getAudioStorageBackend(): AudioStorageBackend {
  const mode = getAudioStorageMode();
  if (cached) {
    const name = cached.constructor.name;
    if ((mode === "supabase" && name.includes("Supabase")) || (mode === "memory" && name.includes("Memory"))) {
      return cached;
    }
  }
  cached = mode === "supabase" ? new SupabaseAudioStorageBackend() : new MemoryAudioStorageBackend();
  return cached;
}

export async function storeAudioAsset(params: StoreAudioParams): Promise<AudioAssetRecord> {
  return getAudioStorageBackend().store(params);
}

export async function createSignedAudioUpload(
  params: PendingUploadParams,
): Promise<SignedUploadResult> {
  return getAudioStorageBackend().createSignedUpload(params);
}

export async function finalizeAudioUpload(
  assetId: string,
  expectedSize?: number,
): Promise<AudioAssetRecord> {
  return getAudioStorageBackend().finalizeUpload(assetId, expectedSize);
}

export async function readAudioAsset(
  id: string,
): Promise<{ meta: AudioAssetRecord; data: Buffer } | null> {
  return getAudioStorageBackend().read(id);
}

export async function deleteAudioAsset(id: string): Promise<void> {
  return getAudioStorageBackend().deleteAsset(id);
}

export { clearMemoryAudioStorageForTests };
export type { StoreAudioParams, PendingUploadParams, SignedUploadResult, AudioSourceType } from "./types";
