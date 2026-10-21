import OpenAI from "openai";
import type { InterviewLanguage } from "@/lib/interview/languages";
import { getTtsModel, getTtsVoice } from "../config";
import { storeAudioAsset } from "../audio-storage/index";

export async function openaiSynthesizeSpeech(params: {
  sessionId: string;
  text: string;
  language: InterviewLanguage;
}): Promise<{ assetId: string; mimeType: string; audioBase64: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey: key });
  const response = await client.audio.speech.create({
    model: getTtsModel(),
    voice: getTtsVoice(params.language) as "alloy",
    input: params.text,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const asset = await storeAudioAsset({
    sessionId: params.sessionId,
    kind: "assistant_tts",
    sourceType: "assistant_tts",
    data: buffer,
    mimeType: "audio/mpeg",
  });
  return {
    assetId: asset.id,
    mimeType: asset.mimeType,
    audioBase64: buffer.toString("base64"),
  };
}
