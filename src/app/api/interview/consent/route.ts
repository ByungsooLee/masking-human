import { NextResponse } from "next/server";
import { z } from "zod";
import { CONSENT_TYPES } from "@/lib/interview/consent";
import { canParticipantAccessSession } from "@/lib/interview/access-control";
import { loadSession, recordParticipantConsent } from "@/lib/interview/session-service";

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  consentType: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
});

function readParticipantAuth(request: Request) {
  return {
    participantId: request.headers.get("x-participant-id") ?? undefined,
    token: request.headers.get("x-participant-token") ?? undefined,
  };
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const session = await loadSession(parsed.data.sessionId);
  const auth = readParticipantAuth(request);
  if (!canParticipantAccessSession(session ?? undefined, auth.participantId, auth.token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await recordParticipantConsent(
    session!,
    parsed.data.consentType,
    parsed.data.granted,
  );

  return NextResponse.json({
    sessionId: updated.id,
    consents: Object.fromEntries(
      CONSENT_TYPES.map((t) => [t, updated.consents[t] ?? null]),
    ),
  });
}
