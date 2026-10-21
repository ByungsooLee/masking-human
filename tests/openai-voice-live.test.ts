import { describe, expect, it, beforeEach } from "vitest";
import { mockTranscribe } from "@/lib/voice/providers/stt-mock";
import { mockSynthesizeSpeech } from "@/lib/voice/providers/tts-mock";
import { openaiTranscribe } from "@/lib/voice/providers/stt-openai";
import { openaiSynthesizeSpeech } from "@/lib/voice/providers/tts-openai";
import {
  isOpenAiLiveTestEnabled,
  resetOpenAiCallBudgetForTests,
  trackOpenAiCall,
} from "./helpers/live-gate";

const LIVE = isOpenAiLiveTestEnabled();
const LANGS = (process.env.OPENAI_LIVE_LANGS ?? "en,ja,ko,zh-CN").split(",") as Array<
  "en" | "ja" | "ko" | "zh-CN"
>;

/** Minimal WAV (silence) — valid container for Whisper smoke test. */
function minimalWav(seconds = 0.25): Buffer {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

describe.skipIf(!LIVE)("OpenAI voice live (cost-limited)", () => {
  beforeEach(() => resetOpenAiCallBudgetForTests());

  it.each(LANGS)("TTS then STT smoke for %s", async (lang) => {
    trackOpenAiCall();
    const tts = await openaiSynthesizeSpeech({
      sessionId: "00000000-0000-4000-8000-000000000001",
      text:
        lang === "ja"
          ? "日焼け止めを使っていますか。"
          : lang === "ko"
            ? "선크림을 사용하시나요?"
            : lang === "zh-CN"
              ? "你使用防晒吗？"
              : "Do you use sunscreen?",
      language: lang,
    });
    expect(tts.assetId).toBeTruthy();

    trackOpenAiCall();
    const wav = minimalWav();
    const stt = await openaiTranscribe(wav, lang);
    expect(typeof stt.text).toBe("string");
  });
});

describe("OpenAI live gate", () => {
  it("mock path when live disabled", async () => {
    if (LIVE) return;
    const stt = await mockTranscribe(Buffer.from("x"), "en");
    expect(stt.text.length).toBeGreaterThan(0);
    const tts = await mockSynthesizeSpeech({
      sessionId: "sess",
      text: "hi",
      language: "en",
    });
    expect(tts.assetId).toBeTruthy();
  });
});
