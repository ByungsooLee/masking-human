import type { InterviewSession } from "@/lib/interview/types";
import { canParticipantAccessSession } from "@/lib/interview/access-control";
import { hasActiveConsent } from "@/lib/interview/consent";

export function assertParticipantSessionAccess(
  session: InterviewSession | null | undefined,
  participantId?: string,
  token?: string,
): session is InterviewSession {
  return canParticipantAccessSession(session, participantId, token);
}

export function canUseRecording(session: InterviewSession): boolean {
  return hasActiveConsent(session.consents, "recording");
}

export function canUseAiConversation(session: InterviewSession): boolean {
  return hasActiveConsent(session.consents, "ai_conversation");
}
