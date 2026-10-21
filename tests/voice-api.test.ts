import { describe, expect, it, beforeEach } from "vitest";
import { createEmptySession } from "@/lib/interview/engine";
import { grantConsent, revokeConsent } from "@/lib/interview/consent";
import { canUseRecording, canUseAiConversation } from "@/lib/voice/access";
import {
  MemoryUtteranceRepository,
  clearUtterancesForTests,
} from "@/lib/voice/repositories/memory-utterance-repository";
import { mockTranscribe } from "@/lib/voice/providers/stt-mock";
import { mockSynthesizeSpeech } from "@/lib/voice/providers/tts-mock";
import { clearMemoryAudioStorageForTests } from "@/lib/voice/audio-storage/index";

describe("voice consent gates", () => {
  it("forbids recording without consent", () => {
    const s = createEmptySession("A");
    expect(canUseRecording(s)).toBe(false);
    s.consents = grantConsent(s.consents, "recording");
    expect(canUseRecording(s)).toBe(true);
    s.consents = revokeConsent(s.consents, "recording");
    expect(canUseRecording(s)).toBe(false);
  });

  it("requires ai conversation consent", () => {
    const s = createEmptySession("B");
    expect(canUseAiConversation(s)).toBe(false);
    s.consents = grantConsent(s.consents, "ai_conversation");
    expect(canUseAiConversation(s)).toBe(true);
  });
});

describe("utterance storage", () => {
  const repo = new MemoryUtteranceRepository();

  beforeEach(async () => {
    clearUtterancesForTests();
    clearMemoryAudioStorageForTests();
  });

  it("stores participant transcript edits as confirmed text", async () => {
    const row = await repo.createFromStt({
      sessionId: "s1",
      originalTranscript: "raw stt",
      transcriptLanguage: "ja",
      sourceAudioAssetId: "audio-1",
    });
    const confirmed = await repo.confirmTranscript({
      sessionId: "s1",
      utteranceId: row.id,
      confirmedTranscript: "edited by participant",
    });
    expect(confirmed?.confirmedTranscript).toBe("edited by participant");
    expect(confirmed?.originalTranscript).toBe("raw stt");
  });

  it("does not mark unconfirmed utterances public", async () => {
    const row = await repo.appendAssistant({
      sessionId: "s2",
      text: "q",
      language: "en",
      audioAssetId: "a1",
    });
    expect(await repo.markPublicConfirmed("s2", row.id)).toBe(false);
  });

  it("rejects partial timing without both start and end", async () => {
    await expect(
      repo.createFromStt({
        sessionId: "s3",
        originalTranscript: "a",
        transcriptLanguage: "en",
        sourceAudioAssetId: "a1",
        startMs: 10,
      }),
    ).rejects.toThrow();
  });
});

describe("mock voice providers (no live API)", () => {
  it("mock STT returns language-appropriate sample", async () => {
    const ja = await mockTranscribe(Buffer.from("x"), "ja");
    expect(ja.text).toMatch(/日焼け止め/);
  });

  it("mock TTS stores asset linked to session", async () => {
    const tts = await mockSynthesizeSpeech({
      sessionId: "sess-1",
      text: "Hello",
      language: "en",
    });
    expect(tts.assetId).toBeTruthy();
  });
});
