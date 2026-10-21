import type { InterviewLanguage } from "@/lib/interview/languages";

export type AudioAssetKind = "participant_recording" | "assistant_tts";

export type AudioSourceType = "browser_recording" | "assistant_tts" | "external_wav";

export type UploadStatus = "pending" | "ready" | "failed";

export interface AudioAssetRecord {
  id: string;
  sessionId: string;
  kind: AudioAssetKind;
  sourceType: AudioSourceType;
  storagePath: string;
  storageBucket: string;
  mimeType: string;
  durationMs?: number;
  byteSize?: number;
  uploadStatus: UploadStatus;
  createdAt: string;
}

export interface UtteranceRecordRow {
  id: string;
  sessionId: string;
  turnId?: string;
  speaker: "participant" | "assistant";
  /** @deprecated use originalTranscript */
  textOriginal: string;
  /** @deprecated use confirmedTranscript */
  textDisplay: string;
  originalTranscript: string;
  confirmedTranscript?: string;
  transcriptLanguage: InterviewLanguage | "mixed";
  language: InterviewLanguage | "mixed";
  sequenceNum: number;
  audioAssetId?: string;
  sourceAudioAssetId?: string;
  startMs?: number;
  endMs?: number;
  isPublic: boolean;
  participantConfirmed: boolean;
  createdAt: string;
}

export interface SttResult {
  text: string;
  language?: string;
  durationMs?: number;
}

export interface TtsResult {
  audioAssetId: string;
  mimeType: string;
  /** Base64 for client playback when bucket not public */
  audioBase64?: string;
}
