import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/lib/interview/session-service";
import { assertParticipantSessionAccess, canUseAiConversation } from "@/lib/voice/access";
import { synthesizeQuestionAudio } from "@/lib/voice";
import { getUtteranceRepository } from "@/lib/voice/repositories";

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(1).max(4000),
});

function authHeaders(request: Request) {
  return {
    participantId: request.headers.get("x-participant-id") ?? undefined,
    token: request.headers.get("x-participant-token") ?? undefined,
  };
}

export async function POST(request: Request) {
  const auth = authHeaders(request);
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const session = await loadSession(parsed.data.sessionId);
  if (!assertParticipantSessionAccess(session, auth.participantId, auth.token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canUseAiConversation(session)) {
    return NextResponse.json({ error: "AI conversation consent required" }, { status: 403 });
  }

  const language = session.language.interviewLanguage;
  const tts = await synthesizeQuestionAudio({
    sessionId: session.id,
    text: parsed.data.text,
    language,
  });

  const utterances = getUtteranceRepository();
  await utterances.appendAssistant({
    sessionId: session.id,
    text: parsed.data.text,
    language,
    audioAssetId: tts.assetId,
  });

  return NextResponse.json({
    audioAssetId: tts.assetId,
    mimeType: tts.mimeType,
    audioBase64: tts.audioBase64,
    language,
    disclosure: "AI-generated voice",
  });
}
