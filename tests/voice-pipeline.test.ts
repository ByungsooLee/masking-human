import { describe, expect, it } from "vitest";
import {
  canStartAnswerRecording,
  canSubmitTranscript,
  shouldBlockRecordingDuringTts,
} from "@/lib/voice/pipeline-state";
import { getSttLanguageCode, getTtsVoice, getVoiceProviderMode } from "@/lib/voice/config";
import { SUPPORTED_INTERVIEW_LANGUAGES } from "@/lib/interview/languages";

describe("voice pipeline state", () => {
  const base = {
    hasRecordingConsent: true,
    hasAiConversationConsent: true,
    isTtsPlaying: false,
    isRecording: false,
    isSending: false,
    micPermission: "granted" as const,
  };

  it("blocks recording during TTS playback", () => {
    expect(shouldBlockRecordingDuringTts(true)).toBe(true);
    expect(canStartAnswerRecording({ ...base, isTtsPlaying: true })).toBe(false);
  });

  it("blocks recording without consent", () => {
    expect(canStartAnswerRecording({ ...base, hasRecordingConsent: false })).toBe(false);
  });

  it("blocks mic denied", () => {
    expect(canStartAnswerRecording({ ...base, micPermission: "denied" })).toBe(false);
  });

  it("rejects empty transcript submit", () => {
    expect(canSubmitTranscript("", base)).toBe(false);
    expect(canSubmitTranscript("hello", base)).toBe(true);
  });
});

describe("voice language config (4 locales)", () => {
  it("defines STT/TTS codes for each language", () => {
    for (const lang of SUPPORTED_INTERVIEW_LANGUAGES) {
      expect(getSttLanguageCode(lang)).toBeTruthy();
      expect(getTtsVoice(lang)).toBeTruthy();
    }
  });

  it("defaults to mock without explicit openai voice provider", () => {
    const prev = process.env.VOICE_PROVIDER;
    delete process.env.VOICE_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    expect(getVoiceProviderMode()).toBe("mock");
    process.env.VOICE_PROVIDER = prev;
  });
});
