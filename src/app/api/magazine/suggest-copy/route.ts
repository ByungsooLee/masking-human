import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getOpenAiApiKey } from "@/lib/realtime/config";
import { buildDraftFromTranscript, buildQaFromTranscript } from "@/lib/magazine-flow/build-draft-from-transcript";
import { validateMagazineDraft } from "@/lib/magazine-flow/validate-guest-text";
import type { MagazineDraft, TranscriptEntry } from "@/lib/magazine-flow/types";

const BodySchema = z.object({
  language: z.enum(["ja", "en"]),
  guestUtterances: z.array(z.object({ id: z.string(), text: z.string().min(1) })),
  aiUtterances: z.array(z.object({ id: z.string(), text: z.string().min(1) })).optional(),
});

const ResponseSchema = z.object({
  title: z.string(),
  lead: z.string(),
  heroQuote: z.object({ utteranceId: z.string(), text: z.string() }),
  qa: z
    .array(
      z.object({
        questionUtteranceId: z.string(),
        questionText: z.string(),
        answer: z.object({ utteranceId: z.string(), text: z.string() }),
      }),
    )
    .min(2)
    .max(4),
  pullQuote: z.object({ utteranceId: z.string(), text: z.string() }).nullable().optional(),
});

function getCopyModel(): string {
  return (
    process.env.OPENAI_LIVE_COPY_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export async function POST(req: Request) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.guestUtterances.length === 0) {
    return NextResponse.json({ error: "No guest utterances" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });
  const guestList = body.guestUtterances.map((u) => `- id:${u.id} "${u.text}"`).join("\n");
  const aiList = (body.aiUtterances ?? []).map((u) => `- id:${u.id} "${u.text}"`).join("\n");

  const completion = await client.chat.completions.create({
    model: getCopyModel(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Magazine editor JSON. title and lead are editorial (not guest quotes). heroQuote, qa[].answer, pullQuote must use guest utterance substrings only. qa pairs interviewer question (from AI list) with guest answer. Return: title, lead, heroQuote {utteranceId,text}, qa [{questionUtteranceId,questionText,answer:{utteranceId,text}}] 2-4, pullQuote optional.',
      },
      {
        role: "user",
        content: `Language: ${body.language}\nAI:\n${aiList || "(none)"}\nGuest:\n${guestList}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return NextResponse.json({ error: "Empty model response" }, { status: 502 });
  }

  let parsed: MagazineDraft;
  try {
    parsed = ResponseSchema.parse(JSON.parse(raw)) as MagazineDraft;
  } catch {
    return NextResponse.json({ error: "Invalid model JSON" }, { status: 502 });
  }

  const transcript: TranscriptEntry[] = [
    ...(body.aiUtterances ?? []).map((a) => ({
      id: a.id,
      speaker: "ai" as const,
      text: a.text,
      startedAt: 0,
      endedAt: 0,
    })),
    ...body.guestUtterances.map((g) => ({
      id: g.id,
      speaker: "guest" as const,
      text: g.text,
      startedAt: 0,
      endedAt: 0,
    })),
  ];

  if (!validateMagazineDraft(parsed, transcript)) {
    const fallback = buildDraftFromTranscript(transcript, {
      guestName: "",
      place: "",
      language: body.language,
    });
    if (fallback) {
      const qa = buildQaFromTranscript(transcript);
      if (qa.length >= 2) return NextResponse.json(fallback);
    }
    return NextResponse.json({ error: "Validation failed for guest quotes" }, { status: 422 });
  }

  return NextResponse.json(parsed);
}
