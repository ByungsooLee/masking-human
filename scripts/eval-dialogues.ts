#!/usr/bin/env npx tsx
/**
 * Replays dialogue scenarios and optionally scores them with an AI judge.
 * Human review fields are left null for offline marking.
 *
 * Usage:
 *   npm run eval:dialogues              # mock provider
 *   INTERVIEW_PROVIDER=openai OPENAI_API_KEY=... npm run eval:dialogues
 *   EVAL_USE_AI_JUDGE=1 ... npm run eval:dialogues
 */
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { startInterview, submitParticipantMessage } from "../src/lib/interview/engine";
import { getInterviewProvider } from "../src/lib/interview/providers";
import { getEvalJudgeModel, getInterviewProviderMode } from "../src/lib/interview/config";
import type { InterviewThemeId, ParticipantCommand } from "../src/lib/interview/types";

interface ScenarioStep {
  text?: string;
  command?: ParticipantCommand;
}

interface Scenario {
  id: string;
  themeId: InterviewThemeId;
  turns?: string[];
  steps?: ScenarioStep[];
  endAfterTurn?: number;
}

interface AiScores {
  context_understanding: number;
  naturalness: number;
  depth_appropriateness: number;
  non_leading: number;
  respects_participant_values: number;
  notes: string;
}

interface ScenarioResult {
  scenarioId: string;
  themeId: InterviewThemeId;
  provider: string;
  transcript: { role: string; text: string; stage: string }[];
  ai_evaluation: {
    reviewer: string;
    scores: AiScores | null;
    error?: string;
  } | null;
  human_evaluation: {
    reviewer: string | null;
    scores: AiScores | null;
    notes: string | null;
  };
  flagged_for_human_review: boolean;
}

function loadScenarios(): Scenario[] {
  const file = path.join(process.cwd(), "eval/dialogue-scenarios.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as Scenario[];
}

function normalizeSteps(s: Scenario): ScenarioStep[] {
  if (s.steps) return s.steps;
  return (s.turns ?? []).map((text) => ({
    text,
    command: text === "" ? ("skip" as const) : ("none" as const),
  }));
}

async function runScenario(s: Scenario): Promise<ScenarioResult> {
  const provider = getInterviewProvider();
  const started = await startInterview(s.themeId, provider);
  let session = started.session;

  const steps = normalizeSteps(s);
  if (s.endAfterTurn === 0) {
    session = (await submitParticipantMessage(session, "", "end", provider)).session;
  } else {
    for (const step of steps) {
      if (session.status !== "active") break;
      session = (
        await submitParticipantMessage(
          session,
          step.text ?? "",
          step.command ?? "none",
          provider,
        )
      ).session;
    }
  }

  const transcript = session.turns
    .filter((t) => t.role === "assistant" || t.role === "user")
    .map((t) => ({ role: t.role, text: t.text, stage: t.stage }));

  return {
    scenarioId: s.id,
    themeId: s.themeId,
    provider: provider.name,
    transcript,
    ai_evaluation: null,
    human_evaluation: {
      reviewer: null,
      scores: null,
      notes: null,
    },
    flagged_for_human_review: false,
  };
}

async function aiJudge(result: ScenarioResult): Promise<ScenarioResult> {
  if (process.env.EVAL_USE_AI_JUDGE !== "1") {
    result.flagged_for_human_review = true;
    return result;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    result.ai_evaluation = {
      reviewer: "none",
      scores: null,
      error: "OPENAI_API_KEY missing for judge",
    };
    result.flagged_for_human_review = true;
    return result;
  }

  const client = new OpenAI({ apiKey: key });
  const model = getEvalJudgeModel();
  const prompt = `You evaluate interview transcripts for THE HUMAN MIRROR (1-5 each, 5 best).
Criteria: context understanding, naturalness, depth appropriateness, non-leading tone, respects participant values.
Return JSON only: { "context_understanding", "naturalness", "depth_appropriateness", "non_leading", "respects_participant_values", "notes" }

Transcript:
${result.transcript.map((t) => `${t.role}: ${t.text}`).join("\n")}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const scores = JSON.parse(raw) as AiScores;
    result.ai_evaluation = { reviewer: `ai:${model}`, scores };
    const min = Math.min(
      scores.context_understanding,
      scores.naturalness,
      scores.depth_appropriateness,
      scores.non_leading,
      scores.respects_participant_values,
    );
    result.flagged_for_human_review = min < 4;
  } catch (err) {
    result.ai_evaluation = {
      reviewer: `ai:${model}`,
      scores: null,
      error: err instanceof Error ? err.message : "judge failed",
    };
    result.flagged_for_human_review = true;
  }
  return result;
}

async function main() {
  const scenarios = loadScenarios();
  console.log(`Running ${scenarios.length} scenarios (provider: ${getInterviewProviderMode()})`);

  const results: ScenarioResult[] = [];
  for (const s of scenarios) {
    let r = await runScenario(s);
    r = await aiJudge(r);
    results.push(r);
    console.log(`  ✓ ${s.id}${r.flagged_for_human_review ? " [flagged]" : ""}`);
  }

  const outDir = path.join(process.cwd(), "eval/results");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `run-${stamp}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        provider: getInterviewProviderMode(),
        ai_judge_enabled: process.env.EVAL_USE_AI_JUDGE === "1",
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
