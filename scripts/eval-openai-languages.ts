#!/usr/bin/env npx tsx
/**
 * Real LLM dialogue quality check for en / ja / ko / zh-CN (requires OPENAI_API_KEY).
 */
import fs from "fs";
import path from "path";
import { startInterview, submitParticipantMessage } from "../src/lib/interview/engine";
import { getInterviewProvider } from "../src/lib/interview/providers";
import { defaultLanguageSettings } from "../src/lib/interview/languages";
import OpenAI from "openai";
import { getEvalJudgeModel } from "../src/lib/interview/config";

const LANGS = ["en", "ja", "ko", "zh-CN"] as const;
const USER_LINES: Record<(typeof LANGS)[number], string[]> = {
  en: ["I use sunscreen daily but skip makeup.", "It feels like respect, not vanity."],
  ja: ["毎日 SPF は塗るけど、メイクはほとんどしない。", "虚栄心というより、自分への敬意に近い。"],
  ko: ["매일 자외선 차단은 하는데 메이크업은 거의 안 해요.", "허영보다는 제 자신을 존중하는 느낌이에요."],
  "zh-CN": ["我每天都涂防晒，但几乎不化妆。", "更像是尊重自己，而不是虚荣。"],
};

async function judge(transcript: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = getEvalJudgeModel();
  const prompt = `Evaluate this interview transcript. Score 1-5 each: naturalness_consistency, context_alignment, depth_appropriateness, non_leading, respects_participant_agency. List any problematic interviewer lines. JSON only. Transcript:\n${transcript}`;
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}");
}

async function main() {
  const outDir = path.join(process.cwd(), "eval/results");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (!process.env.OPENAI_API_KEY || process.env.INTERVIEW_PROVIDER !== "openai") {
    const skipped = {
      status: "skipped",
      reason: "OPENAI_API_KEY or INTERVIEW_PROVIDER=openai not set",
      at: new Date().toISOString(),
    };
    const p = path.join(outDir, `openai-language-eval-skipped-${stamp}.json`);
    fs.writeFileSync(p, JSON.stringify(skipped, null, 2));
    console.log("Skipped real LLM eval:", p);
    return;
  }

  const provider = getInterviewProvider("openai");
  const results = [];

  for (const lang of LANGS) {
    let session = (
      await startInterview("A", provider, undefined, defaultLanguageSettings(lang))
    ).session;
    const lines: string[] = [];
    for (const line of USER_LINES[lang]) {
      const r = await submitParticipantMessage(session, line, "none", provider);
      session = r.session;
      lines.push(`assistant: ${r.assistantText}`);
      lines.push(`user: ${line}`);
    }
    const transcript = lines.join("\n");
    const ai_evaluation = await judge(transcript);
    results.push({ lang, transcript, ai_evaluation, human_evaluation: null });
  }

  const report = {
    status: "completed",
    reviewer: `ai:${getEvalJudgeModel()}`,
    generated_at: new Date().toISOString(),
    results,
  };
  const outPath = path.join(outDir, `openai-language-eval-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
