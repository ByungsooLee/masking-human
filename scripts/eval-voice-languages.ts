#!/usr/bin/env npx tsx
/**
 * Voice eval: mock by default; set VOICE_PROVIDER=openai + OPENAI_API_KEY for live STT/TTS.
 */
import fs from "fs";
import path from "path";
import { mockTranscribe } from "../src/lib/voice/providers/stt-mock";
import { mockSynthesizeSpeech } from "../src/lib/voice/providers/tts-mock";
import { openaiTranscribe } from "../src/lib/voice/providers/stt-openai";
import { openaiSynthesizeSpeech } from "../src/lib/voice/providers/tts-openai";
import { getVoiceProviderMode } from "../src/lib/voice/config";

const LANGS = ["en", "ja", "ko", "zh-CN"] as const;

async function main() {
  const live =
    process.env.VOICE_LIVE_TEST === "1" &&
    Boolean(process.env.OPENAI_API_KEY) &&
    getVoiceProviderMode() === "openai";
  const results: Array<{ lang: string; stt: string; ttsAssetId: string; live: boolean }> = [];

  for (const lang of LANGS) {
    const sample = Buffer.from("eval-audio-placeholder");
    const stt = live
      ? await openaiTranscribe(sample, lang)
      : await mockTranscribe(sample, lang);
    const tts = live
      ? await openaiSynthesizeSpeech({
          sessionId: "eval-session",
          text: stt.text.slice(0, 80) || "Hello",
          language: lang,
        })
      : await mockSynthesizeSpeech({
          sessionId: "eval-session",
          text: stt.text,
          language: lang,
        });
    results.push({ lang, stt: stt.text, ttsAssetId: tts.assetId, live });
  }

  const label = live ? "openai" : "mock";
  const out = path.join(process.cwd(), "eval/results", `voice-${label}-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify({ mode: label, liveApiVerified: live, results }, null, 2),
  );
  console.log("Wrote", out);
  if (!live) {
    console.log("Live OpenAI not run (set OPENAI_API_KEY and VOICE_LIVE_TEST=1 to verify real audio).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
