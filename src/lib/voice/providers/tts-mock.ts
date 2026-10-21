import type { InterviewLanguage } from "@/lib/interview/languages";
import { storeAudioAsset } from "../audio-storage/index";

/** Minimal valid silent-ish mp3 header stub for tests (not playable in all players). */
const MOCK_MP3 = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export async function mockSynthesizeSpeech(params: {
  sessionId: string;
  text: string;
  language: InterviewLanguage;
}): Promise<{ assetId: string; mimeType: string; audioBase64: string }> {
  void params.text;
  void params.language;
  const asset = await storeAudioAsset({
    sessionId: params.sessionId,
    kind: "assistant_tts",
    sourceType: "assistant_tts",
    data: MOCK_MP3,
    mimeType: "audio/mpeg",
    durationMs: undefined,
  });
  return {
    assetId: asset.id,
    mimeType: asset.mimeType,
    audioBase64: MOCK_MP3.toString("base64"),
  };
}
