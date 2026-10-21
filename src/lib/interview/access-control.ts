import { createHash, timingSafeEqual } from "crypto";
import type { InterviewSession } from "./types";

export function hashParticipantToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyParticipantToken(session: InterviewSession, token: string): boolean {
  if (!session.participantTokenHash || !token) return false;
  const hash = hashParticipantToken(token);
  try {
    return timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(session.participantTokenHash, "hex"),
    );
  } catch {
    return false;
  }
}

/** Participant may access only their own non-deleted session with valid token. */
export function canParticipantAccessSession(
  session: InterviewSession | null | undefined,
  participantId: string | undefined,
  token: string | undefined,
): boolean {
  if (!session || session.deletedAt) return false;
  if (!participantId || session.participantId !== participantId) return false;
  if (!verifyParticipantToken(session, token ?? "")) return false;
  return true;
}

/** Admin service key routes — never expose to browser clients. */
export function isValidAdminKey(provided: string | null | undefined): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !provided) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isSessionPublished(session: InterviewSession): boolean {
  return session.publishStatus === "published";
}

export function canPublicReadSession(session: InterviewSession): boolean {
  return isSessionPublished(session) && !session.deletedAt;
}
