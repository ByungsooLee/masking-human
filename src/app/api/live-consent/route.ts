import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createEmptySession } from "@/lib/interview/engine";
import { defaultLanguageSettings } from "@/lib/interview/languages";
import { persistSession } from "@/lib/interview/session-service";
import { operatorAuthorized, sameOrigin } from "@/lib/pipeline/auth.server";
import { grantConsent } from "@/lib/interview/consent";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request) || (process.env.INTERVIEW_OPERATOR_PASSWORD && !operatorAuthorized(request))) return NextResponse.json({ error: "PIPELINE_AUTH" }, { status: 401, headers });
  const data = await request.json().catch(() => null);
  if (!data || !["ja", "en"].includes(data.language)) return NextResponse.json({ error: "Invalid language" }, { status: 400, headers });
  if (data.consents !== undefined && (!data.consents || data.consents.ai !== true || typeof data.consents.photoVideo !== "boolean" || typeof data.consents.recording !== "boolean")) return NextResponse.json({ error: "Invalid consent" }, { status: 400, headers });
  const token = randomUUID();
  const session = createEmptySession("A", defaultLanguageSettings(data.language, data.language), undefined, token);
  if (data.consents) {
    session.consents = grantConsent(session.consents, "ai_conversation", "participant");
    if (data.consents.photoVideo) session.consents = grantConsent(session.consents, "photo_video", "participant");
    if (data.consents.recording) session.consents = grantConsent(session.consents, "recording", "participant");
  }
  try { await persistSession(session); }
  catch { return NextResponse.json({ error: "CONSENT_SAVE_FAILED" }, { status: 503, headers }); }
  return NextResponse.json({ session: { id: session.id }, participantCredentials: { participantId: session.participantId, participantToken: token } }, { headers });
}
