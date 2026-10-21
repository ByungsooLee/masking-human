import { NextResponse } from "next/server";
import { InterviewRequestSchema } from "@/lib/interview/schemas";
import { getInterviewProvider } from "@/lib/interview/providers";
import {
  startInterview,
  submitParticipantMessage,
} from "@/lib/interview/engine";
import { ProviderError } from "@/lib/interview/providers/types";
import {
  toPublicSession,
  type PublicInterviewResponse,
} from "@/lib/interview/public-dto";
import { withSessionLock } from "@/lib/interview/session-lock";
import { defaultLanguageSettings, parseInterviewLanguage } from "@/lib/interview/languages";
import { canParticipantAccessSession } from "@/lib/interview/access-control";
import { loadSession, persistSession } from "@/lib/interview/session-service";
import { getSessionRepository } from "@/lib/interview/repositories";
import { getUtteranceRepository } from "@/lib/voice/repositories";
import { canUseAiConversation } from "@/lib/voice/access";

function toResponse(result: {
  session: Parameters<typeof toPublicSession>[0];
  assistantText: string;
  usedFallback: boolean;
  provider: string;
  error?: string;
  duplicate?: boolean;
}): PublicInterviewResponse {
  return {
    session: toPublicSession(result.session),
    message: result.assistantText,
    meta: {
      provider: result.provider,
      usedFallback: result.usedFallback,
      error: result.error,
    },
  };
}

function readParticipantAuth(request: Request): {
  participantId?: string;
  token?: string;
} {
  return {
    participantId: request.headers.get("x-participant-id") ?? undefined,
    token: request.headers.get("x-participant-token") ?? undefined,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InterviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const provider = getInterviewProvider();
  const repo = getSessionRepository();

  try {
    if (parsed.data.action === "resume") {
      const sessionId = parsed.data.sessionId;
      const auth = readParticipantAuth(request);
      const session = await loadSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      if (!canParticipantAccessSession(session, auth.participantId, auth.token)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const utterances = await getUtteranceRepository().listBySession(sessionId);
      const lastAssistant = [...session.turns].reverse().find((t) => t.role === "assistant");
      return NextResponse.json({
        session: toPublicSession(session),
        message: lastAssistant?.text ?? "",
        utterances: utterances.map((u) => ({
          id: u.id,
          speaker: u.speaker,
          originalTranscript: u.originalTranscript,
          confirmedTranscript: u.confirmedTranscript,
          sequenceNum: u.sequenceNum,
        })),
        consents: session.consents,
      });
    }

    if (parsed.data.action === "start") {
      const interviewLanguage = parseInterviewLanguage(parsed.data.interviewLanguage);
      const publishingLanguage = parseInterviewLanguage(parsed.data.publishingLanguage);
      if (!interviewLanguage || !publishingLanguage) {
        return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
      }
      const result = await startInterview(
        parsed.data.themeId,
        provider,
        undefined,
        defaultLanguageSettings(interviewLanguage, publishingLanguage),
      );
      await persistSession(result.session);
      const response = NextResponse.json({
        ...toResponse(result),
        participantCredentials: {
          participantId: result.session.participantId,
          participantToken: result.participantToken,
        },
      });
      if (result.participantToken) {
        response.cookies.set("hm_participant_token", result.participantToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
        response.cookies.set("hm_participant_id", result.session.participantId, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      }
      return response;
    }

    const sessionId = parsed.data.sessionId;
    const payload = parsed.data;
    const auth = readParticipantAuth(request);

    const result = await withSessionLock(sessionId, async () => {
      const session = await loadSession(sessionId);
      if (!session) return null;

      if (
        !canParticipantAccessSession(session, auth.participantId, auth.token)
      ) {
        return { forbidden: true as const };
      }

      if (
        payload.command !== "change_language" &&
        !canUseAiConversation(session)
      ) {
        return { consentBlocked: true as const };
      }

      if (payload.utteranceId && payload.text.trim()) {
        const u = await getUtteranceRepository().getById(sessionId, payload.utteranceId);
        if (!u || u.speaker !== "participant") {
          return { badUtterance: true as const };
        }
        if (!u.confirmedTranscript || u.confirmedTranscript !== payload.text.trim()) {
          return { badUtterance: true as const };
        }
      }

      if (payload.clientMessageId) {
        const cached = await repo.getIdempotency(sessionId, payload.clientMessageId);
        if (cached) {
          return {
            session,
            assistantText: cached.assistantText,
            usedFallback: cached.usedFallback,
            provider: cached.provider,
            error: cached.error,
            duplicate: true,
          };
        }
      }

      if (payload.command === "change_language") {
        if (payload.interviewLanguage && !parseInterviewLanguage(payload.interviewLanguage)) {
          return { unsupported: true as const };
        }
        if (payload.publishingLanguage && !parseInterviewLanguage(payload.publishingLanguage)) {
          return { unsupported: true as const };
        }
      }

      const turn = await submitParticipantMessage(
        session,
        payload.text,
        payload.command,
        provider,
        payload.clientMessageId,
        {
          interviewLanguage: payload.interviewLanguage,
          publishingLanguage: payload.publishingLanguage,
        },
      );

      if (payload.clientMessageId && !turn.duplicate) {
        await repo.setIdempotency(sessionId, payload.clientMessageId, {
          assistantText: turn.assistantText,
          usedFallback: turn.usedFallback,
          provider: turn.provider,
          error: turn.error,
        });
      }

      await persistSession(turn.session);

      if (payload.utteranceId && payload.text.trim()) {
        const userTurns = turn.session.turns.filter((t) => t.role === "user");
        const lastUser = userTurns[userTurns.length - 1];
        const utteranceRepo = getUtteranceRepository();
        const utterance = await utteranceRepo.getById(sessionId, payload.utteranceId);
        if (lastUser && utterance?.confirmedTranscript) {
          if (lastUser.text !== utterance.confirmedTranscript) {
            lastUser.text = utterance.confirmedTranscript;
          }
          await utteranceRepo.linkInterviewTurn({
            sessionId,
            utteranceId: payload.utteranceId,
            interviewTurnId: lastUser.id,
          });
          await persistSession(turn.session);
        }
      }

      return turn;
    });

    if (result && "forbidden" in result) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (result && "consentBlocked" in result) {
      return NextResponse.json({ error: "AI conversation consent required" }, { status: 403 });
    }
    if (result && "badUtterance" in result) {
      return NextResponse.json({ error: "Transcript not confirmed" }, { status: 400 });
    }
    if (result && "unsupported" in result) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }
    if (!result) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (result.error?.startsWith("unsupported_")) {
      return NextResponse.json({ error: "Unsupported language", code: result.error }, { status: 400 });
    }

    return NextResponse.json(toResponse(result));
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "config" ? 500 : 502 },
      );
    }
    throw err;
  }
}
