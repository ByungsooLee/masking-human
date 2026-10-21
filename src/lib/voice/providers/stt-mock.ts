import type { InterviewLanguage } from "@/lib/interview/languages";
import type { SttResult } from "../types";

export async function mockTranscribe(
  _audio: Buffer,
  language: InterviewLanguage,
): Promise<SttResult> {
  const samples: Record<InterviewLanguage, string> = {
    en: "I use sunscreen every morning.",
    ja: "毎朝日焼け止めを塗っています。",
    ko: "매일 아침 선크림을 바릅니다.",
    "zh-CN": "我每天早上涂防晒。",
  };
  return { text: samples[language], language, durationMs: 1200 };
}

export async function mockTranscribeFailure(): Promise<never> {
  throw new Error("Simulated STT failure");
}
