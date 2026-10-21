import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type { InterviewLanguage } from "@/lib/interview/languages";
import { getSttLanguageCode, getSttModel } from "../config";
import type { SttResult } from "../types";

export async function openaiTranscribe(
  audio: Buffer,
  language: InterviewLanguage,
  filename = "recording.webm",
): Promise<SttResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey: key });
  const file = await toFile(audio, filename, { type: "audio/webm" });
  const start = Date.now();
  const result = await client.audio.transcriptions.create({
    file,
    model: getSttModel(),
    language: getSttLanguageCode(language),
  });
  return {
    text: result.text,
    language,
    durationMs: Date.now() - start,
  };
}
