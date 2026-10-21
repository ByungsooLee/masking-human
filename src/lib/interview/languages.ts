export const SUPPORTED_INTERVIEW_LANGUAGES = ["en", "ja", "ko", "zh-CN"] as const;

export type InterviewLanguage = (typeof SUPPORTED_INTERVIEW_LANGUAGES)[number];

export type PublishingLanguage = InterviewLanguage;

export interface LanguageSettings {
  interviewLanguage: InterviewLanguage;
  publishingLanguage: PublishingLanguage;
}

export interface LanguageChangeRecord {
  from: InterviewLanguage;
  to: InterviewLanguage;
  timestamp: string;
}

/** Phase 2+: map interview language to provider locale codes (verify against vendor docs before prod). */
export interface VoiceLanguageProfile {
  interviewLanguage: InterviewLanguage;
  /** BCP-47 for STT (e.g. OpenAI whisper) */
  sttLanguageCode: string;
  /** BCP-47 for TTS */
  ttsLanguageCode: string;
  ttsVoiceHint?: string;
}

const VOICE_PROFILES: Record<InterviewLanguage, VoiceLanguageProfile> = {
  en: {
    interviewLanguage: "en",
    sttLanguageCode: "en",
    ttsLanguageCode: "en-US",
    ttsVoiceHint: "alloy",
  },
  ja: {
    interviewLanguage: "ja",
    sttLanguageCode: "ja",
    ttsLanguageCode: "ja-JP",
  },
  ko: {
    interviewLanguage: "ko",
    sttLanguageCode: "ko",
    ttsLanguageCode: "ko-KR",
  },
  "zh-CN": {
    interviewLanguage: "zh-CN",
    sttLanguageCode: "zh",
    ttsLanguageCode: "zh-CN",
  },
};

export function getVoiceLanguageProfile(lang: InterviewLanguage): VoiceLanguageProfile {
  return VOICE_PROFILES[lang];
}

export function parseInterviewLanguage(raw: unknown): InterviewLanguage | null {
  if (typeof raw !== "string") return null;
  return (SUPPORTED_INTERVIEW_LANGUAGES as readonly string[]).includes(raw)
    ? (raw as InterviewLanguage)
    : null;
}

export function defaultLanguageSettings(
  interviewLanguage: InterviewLanguage = "en",
  publishingLanguage?: InterviewLanguage,
): LanguageSettings {
  return {
    interviewLanguage,
    publishingLanguage: publishingLanguage ?? interviewLanguage,
  };
}

export function languageDisplayName(lang: InterviewLanguage): string {
  const names: Record<InterviewLanguage, string> = {
    en: "English",
    ja: "日本語",
    ko: "한국어",
    "zh-CN": "简体中文",
  };
  return names[lang];
}

/** Register hook for future locales (es, fr, pt, …). */
export function isRegisteredInterviewLanguage(code: string): code is InterviewLanguage {
  return parseInterviewLanguage(code) !== null;
}
