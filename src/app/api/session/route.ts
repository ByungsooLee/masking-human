import { NextResponse } from "next/server";
import { getOpenAiApiKey } from "@/lib/realtime/config";
import { SELECTABLE_REALTIME_MODELS } from "@/lib/realtime/model-options";
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";
import { safeErrorMessage } from "@/lib/logging/safe-log";
import { buildUsageSummary } from "@/lib/usage/summary";
import { createSessionRecord } from "@/lib/usage/session-usage-store";
import { z } from "zod";
import { createHash } from "node:crypto";

const BodySchema = z
  .object({
    agentId: z.enum(["default", "reflective"]).optional(),
    interviewLanguage: z.enum(["ja", "en"]).optional(),
    realtimeModel: z.enum(SELECTABLE_REALTIME_MODELS).optional(),
    interviewerProfile: z.object({
      age: z.enum(["young", "adult", "senior"]),
      gender: z.enum(["woman", "man", "neutral"]),
    }).optional(),
  })
  .optional();

export async function POST(req: Request) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 503 },
    );
  }

  const summary = await buildUsageSummary();
  if (summary.blocked100) {
    return NextResponse.json(
      {
        error: "Monthly budget reached. New interviews cannot be started.",
        code: "BUDGET_EXCEEDED",
      },
      { status: 402 },
    );
  }

  let body: z.infer<typeof BodySchema> = undefined;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid interview settings." }, { status: 400 });
  }

  const sessionConfig = buildRealtimeClientSecretSession(body);
  const model = sessionConfig.model;
  const record = createSessionRecord({ model, isMock: false });

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: sessionConfig,
      }),
    });

    const data = (await response.json()) as { value?: string; error?: { message?: string } };

    if (!response.ok || !data.value) {
      const detail = data.error?.message ?? `HTTP ${response.status}`;
      return NextResponse.json(
        { error: "Failed to create realtime session.", detail },
        { status: 502 },
      );
    }

    return NextResponse.json({
      clientSecret: data.value,
      model,
      instructions: sessionConfig.instructions,
      promptMetadata: { revision: "2026-10-30.story.1", sha256: createHash("sha256").update(sessionConfig.instructions).digest("hex"), characters: Array.from(sessionConfig.instructions).length },
      voice: sessionConfig.audio.output.voice,
      sessionId: record.sessionId,
      patchToken: record.patchToken,
      budgetWarning: summary.warning80,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create realtime session.", detail: safeErrorMessage(err) },
      { status: 500 },
    );
  }
}
