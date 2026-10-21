import type { InterviewSession } from "./types";
import type { ConsentType } from "./consent";
import { grantConsent, revokeConsent } from "./consent";
import { getSessionRepository } from "./repositories";

export async function persistSession(session: InterviewSession): Promise<void> {
  await getSessionRepository().save(session);
}

export async function loadSession(sessionId: string): Promise<InterviewSession | null> {
  return getSessionRepository().getById(sessionId);
}

export async function requestSessionDeletion(
  session: InterviewSession,
  reason?: string,
): Promise<InterviewSession> {
  session.deletionRequestedAt = new Date().toISOString();
  session.status = "ended_early";
  session.publishStatus = "private";
  for (const type of [
    "ai_conversation",
    "recording",
    "photo_video",
    "sns_publish",
    "commercial",
  ] as ConsentType[]) {
    session.consents = revokeConsent(session.consents, type);
  }
  await persistSession(session);
  const { enqueueSessionDeletion } = await import("./deletion/deletion-service");
  await enqueueSessionDeletion({
    sessionId: session.id,
    participantId: session.participantId,
    reason,
  });
  return session;
}

export async function recordParticipantConsent(
  session: InterviewSession,
  type: ConsentType,
  granted: boolean,
): Promise<InterviewSession> {
  session.consents = granted
    ? grantConsent(session.consents, type, "participant")
    : revokeConsent(session.consents, type);
  await persistSession(session);
  return session;
}
