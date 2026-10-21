import { NextResponse } from "next/server";
import { getOpenAiApiKey, getRealtimeModel } from "@/lib/realtime/config";
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";
import { safeErrorMessage } from "@/lib/logging/safe-log";
import { buildUsageSummary } from "@/lib/usage/summary";
import { createSessionRecord } from "@/lib/usage/session-usage-store";
import { z } from "zod";

const BodySchema = z
  .object({
    agentId: z.enum(["default", "reflective"]).optional(),
    interviewLanguage: z.enum(["ja", "en"]).optional(),
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
    body = undefined;
  }

  const model = getRealtimeModel();
  const record = createSessionRecord({ model, isMock: false });

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: buildRealtimeClientSecretSession({
          agentId: body?.agentId,
          interviewLanguage: body?.interviewLanguage,
        }),
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
      sessionId: record.sessionId,
      budgetWarning: summary.warning80,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create realtime session.", detail: safeErrorMessage(err) },
      { status: 500 },
    );
  }
}
