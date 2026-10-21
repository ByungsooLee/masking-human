import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/lib/interview/session-service";
import { assertParticipantSessionAccess, canUseRecording } from "@/lib/voice/access";
import { finalizeAudioUpload } from "@/lib/voice/audio-storage/index";
import { markUploadFailed } from "@/lib/voice/storage-cleanup";

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  assetId: z.string().uuid(),
  byteSize: z.number().int().positive().optional(),
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
  if (!canUseRecording(session)) {
    return NextResponse.json({ error: "Recording consent required" }, { status: 403 });
  }

  try {
    const asset = await finalizeAudioUpload(parsed.data.assetId, parsed.data.byteSize);
    if (asset.sessionId !== parsed.data.sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ assetId: asset.id, uploadStatus: asset.uploadStatus });
  } catch (err) {
    await markUploadFailed(parsed.data.assetId, "finalize failed");
    const message = err instanceof Error ? err.message : "Finalize failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
