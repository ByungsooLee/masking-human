import type { InterviewLanguage } from "@/lib/interview/languages";
import { getVoiceProviderMode } from "./config";
import { mockTranscribe } from "./providers/stt-mock";
import { openaiTranscribe } from "./providers/stt-openai";
import { mockSynthesizeSpeech } from "./providers/tts-mock";
import { openaiSynthesizeSpeech } from "./providers/tts-openai";
import type { SttResult } from "./types";

export async function transcribeAudio(
  audio: Buffer,
  language: InterviewLanguage,
): Promise<SttResult> {
  if (getVoiceProviderMode() === "openai") {
    return openaiTranscribe(audio, language);
  }
  return mockTranscribe(audio, language);
}

export async function synthesizeQuestionAudio(params: {
  sessionId: string;
  text: string;
  language: InterviewLanguage;
}) {
  if (getVoiceProviderMode() === "openai") {
    return openaiSynthesizeSpeech(params);
  }
  return mockSynthesizeSpeech(params);
}

export * from "./pipeline-state";
export * from "./config";
export * from "./types";
