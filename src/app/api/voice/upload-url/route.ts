import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/lib/interview/session-service";
import { assertParticipantSessionAccess, canUseRecording } from "@/lib/voice/access";
import { createSignedAudioUpload } from "@/lib/voice/audio-storage/index";
import { validateAudioMime, validateAudioSize } from "@/lib/voice/audio-limits";

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  mimeType: z.string(),
  byteSize: z.number().int().positive(),
  durationMs: z.number().int().positive().optional(),
  sourceType: z.enum(["browser_recording", "external_wav"]).default("browser_recording"),
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

  if (!validateAudioMime(parsed.data.mimeType) || !validateAudioSize(parsed.data.byteSize)) {
    return NextResponse.json({ error: "Invalid audio type or size" }, { status: 400 });
  }

  const session = await loadSession(parsed.data.sessionId);
  if (!assertParticipantSessionAccess(session, auth.participantId, auth.token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canUseRecording(session)) {
    return NextResponse.json({ error: "Recording consent required" }, { status: 403 });
  }

  try {
    const signed = await createSignedAudioUpload({
      sessionId: parsed.data.sessionId,
      kind: "participant_recording",
      sourceType: parsed.data.sourceType,
      mimeType: parsed.data.mimeType,
      expectedByteSize: parsed.data.byteSize,
      durationMs: parsed.data.durationMs,
    });
    return NextResponse.json({
      assetId: signed.asset.id,
      signedUrl: signed.signedUrl,
      token: signed.token,
      path: signed.path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload URL failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
