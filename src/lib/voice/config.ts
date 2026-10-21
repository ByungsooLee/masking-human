import type { InterviewLanguage } from "@/lib/interview/languages";
import { getVoiceLanguageProfile } from "@/lib/interview/languages";

export function getSttModel(): string {
  return process.env.OPENAI_STT_MODEL ?? "whisper-1";
}

export function getTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL ?? "tts-1";
}

export function getTtsVoice(language: InterviewLanguage): string {
  const profile = getVoiceLanguageProfile(language);
  return process.env.OPENAI_TTS_VOICE ?? profile.ttsVoiceHint ?? "alloy";
}

export function getSttLanguageCode(language: InterviewLanguage): string {
  return getVoiceLanguageProfile(language).sttLanguageCode;
}

export function getVoiceProviderMode(): "mock" | "openai" {
  if (process.env.VOICE_PROVIDER === "mock") return "mock";
  if (process.env.VOICE_PROVIDER === "openai") return "openai";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}
