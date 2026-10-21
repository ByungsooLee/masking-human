import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/lib/interview/session-service";
import {
  assertParticipantSessionAccess,
  canUseAiConversation,
  canUseRecording,
} from "@/lib/voice/access";
import { getUtteranceRepository } from "@/lib/voice/repositories";
import { canSubmitTranscript } from "@/lib/voice/pipeline-state";

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  utteranceId: z.string().uuid(),
  confirmedTranscript: z.string().max(8000),
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

  const pipelineOk = canSubmitTranscript(parsed.data.confirmedTranscript, {
    hasRecordingConsent: canUseRecording(session),
    hasAiConversationConsent: canUseAiConversation(session),
    isTtsPlaying: false,
    isRecording: false,
    isSending: false,
    micPermission: "granted",
  });
  if (!pipelineOk) {
    return NextResponse.json({ error: "Consent or empty transcript" }, { status: 403 });
  }

  const repo = getUtteranceRepository();
  const row = await repo.confirmTranscript({
    sessionId: parsed.data.sessionId,
    utteranceId: parsed.data.utteranceId,
    confirmedTranscript: parsed.data.confirmedTranscript,
  });
  if (!row) {
    return NextResponse.json({ error: "Utterance not found" }, { status: 404 });
  }

  return NextResponse.json({
    utteranceId: row.id,
    originalTranscript: row.originalTranscript,
    confirmedTranscript: row.confirmedTranscript,
  });
}
