import { NextResponse } from "next/server";
import { loadSession } from "@/lib/interview/session-service";
import { assertParticipantSessionAccess, canUseRecording } from "@/lib/voice/access";
import { transcribeAudio } from "@/lib/voice";
import { readAudioAsset, storeAudioAsset } from "@/lib/voice/audio-storage/index";
import { getUtteranceRepository } from "@/lib/voice/repositories";
import { parseInterviewLanguage } from "@/lib/interview/languages";
import { getSttIdempotency, setSttIdempotency } from "@/lib/voice/stt-idempotency";
import { safeErrorMessage } from "@/lib/logging/safe-log";

function authHeaders(request: Request) {
  return {
    participantId: request.headers.get("x-participant-id") ?? undefined,
    token: request.headers.get("x-participant-token") ?? undefined,
  };
}

export async function POST(request: Request) {
  const auth = authHeaders(request);
  const form = await request.formData();
  const sessionId = String(form.get("sessionId") ?? "");
  const languageRaw = String(form.get("language") ?? "en");
  const file = form.get("audio");
  const audioAssetId = form.get("audioAssetId")?.toString();
  const clientSttId = form.get("clientSttId")?.toString();

  if (!sessionId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session = await loadSession(sessionId);
  if (!assertParticipantSessionAccess(session, auth.participantId, auth.token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canUseRecording(session)) {
    return NextResponse.json({ error: "Recording consent required" }, { status: 403 });
  }

  if (clientSttId) {
    const cached = await getSttIdempotency(sessionId, clientSttId);
    if (cached) {
      return NextResponse.json({ ...cached, duplicate: true });
    }
  }

  const language = parseInterviewLanguage(languageRaw) ?? session.language.interviewLanguage;

  if (form.get("simulateFailure") === "1") {
    return NextResponse.json({ error: "STT failed", code: "stt_failure" }, { status: 502 });
  }

  try {
    const recordedStart = form.get("startMs");
    const recordedEnd = form.get("endMs");
    const startMs = recordedStart ? Number(recordedStart) : undefined;
    const endMs = recordedEnd ? Number(recordedEnd) : undefined;

    let buffer: Buffer;
    let assetId: string;

    if (audioAssetId) {
      const stored = await readAudioAsset(audioAssetId);
      if (!stored || stored.meta.sessionId !== sessionId) {
        return NextResponse.json({ error: "Audio asset not found" }, { status: 404 });
      }
      if (stored.meta.uploadStatus !== "ready") {
        return NextResponse.json({ error: "Upload not finalized" }, { status: 400 });
      }
      buffer = stored.data;
      assetId = stored.meta.id;
    } else if (file instanceof Blob) {
      buffer = Buffer.from(await file.arrayBuffer());
      const asset = await storeAudioAsset({
        sessionId,
        kind: "participant_recording",
        sourceType: "browser_recording",
        data: buffer,
        mimeType: file.type || "audio/webm",
        durationMs:
          startMs !== undefined && endMs !== undefined ? endMs - startMs : undefined,
      });
      assetId = asset.id;
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const stt = await transcribeAudio(buffer, language);
    const utterances = getUtteranceRepository();
    const utterance = await utterances.createFromStt({
      sessionId,
      originalTranscript: stt.text,
      transcriptLanguage: language,
      sourceAudioAssetId: assetId,
      startMs: startMs !== undefined && !Number.isNaN(startMs) ? startMs : undefined,
      endMs: endMs !== undefined && !Number.isNaN(endMs) ? endMs : undefined,
    });

    const payload = {
      text: stt.text,
      utteranceId: utterance.id,
      audioAssetId: assetId,
      language,
    };

    if (clientSttId) {
      await setSttIdempotency(sessionId, clientSttId, payload);
    }

    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: safeErrorMessage(err), code: "stt_failure" },
      { status: 502 },
    );
  }
}
