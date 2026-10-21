import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, beforeAll } from "vitest";
import { createEmptySession, startInterview } from "@/lib/interview/engine";
import { hashParticipantToken, canParticipantAccessSession } from "@/lib/interview/access-control";
import { getInterviewProvider } from "@/lib/interview/providers";
import { SupabaseSessionRepository } from "@/lib/interview/repositories/supabase-session-repository";
import { grantConsent } from "@/lib/interview/consent";
import { getUtteranceRepository } from "@/lib/voice/repositories";
import { getSttIdempotency, setSttIdempotency, clearSttIdempotencyForTests } from "@/lib/voice/stt-idempotency";
import { createSignedAudioUpload, finalizeAudioUpload, readAudioAsset } from "@/lib/voice/audio-storage/index";
import { getServiceRoleClient, getSupabaseUrl } from "@/lib/supabase/client";
import { isSupabaseLiveTestEnabled } from "./helpers/live-gate";

const LIVE = isSupabaseLiveTestEnabled();

describe.skipIf(!LIVE)("Supabase E2E (live DB)", () => {
  beforeAll(() => {
    clearSttIdempotencyForTests();
  });

  it("session CRUD: save, reload session_json, end", async () => {
    const repo = new SupabaseSessionRepository();
    const token = `live-${Date.now()}`;
    const session = createEmptySession("A", undefined, randomUUID(), token);
    session.participantTokenHash = hashParticipantToken(token);
    session.consents = grantConsent(session.consents, "recording");
    await repo.save(session);

    const loaded = await repo.getById(session.id);
    expect(loaded?.id).toBe(session.id);
    expect(loaded?.consents.recording?.granted).toBe(true);

    loaded!.status = "completed";
    loaded!.endedAt = new Date().toISOString();
    await repo.save(loaded!);

    const ended = await repo.getById(session.id);
    expect(ended?.status).toBe("completed");
  });

  it("turns mirror session_json turn count after message", async () => {
    const repo = new SupabaseSessionRepository();
    const client = getServiceRoleClient();
    const token = `turns-${Date.now()}`;
    const session = createEmptySession("B", undefined, randomUUID(), token);
    session.participantTokenHash = hashParticipantToken(token);
    await repo.save(session);

    const started = await startInterview(
      "B",
      getInterviewProvider("mock"),
      session.id,
      session.language,
    );
    await repo.save(started.session);

    const { count } = await client
      .from("interview_turns")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id);

    const reloaded = await repo.getById(session.id);
    expect(count).toBe(reloaded?.turns.length);
  });

  it("clientMessageId idempotency via message_idempotency", async () => {
    const repo = new SupabaseSessionRepository();
    const sessionId = randomUUID();
    const clientMessageId = randomUUID();
    await repo.setIdempotency(sessionId, clientMessageId, {
      assistantText: "cached-live",
      usedFallback: false,
      provider: "mock",
    });
    const cached = await repo.getIdempotency(sessionId, clientMessageId);
    expect(cached?.assistantText).toBe("cached-live");
  });

  it("STT idempotency persisted in stt_idempotency", async () => {
    const sessionId = randomUUID();
    const clientSttId = randomUUID();
    const payload = {
      text: "test transcript",
      utteranceId: randomUUID(),
      audioAssetId: randomUUID(),
      language: "en",
    };
    await setSttIdempotency(sessionId, clientSttId, payload);
    const again = await getSttIdempotency(sessionId, clientSttId);
    expect(again?.text).toBe(payload.text);
  });

  it("blocks participant B token from session A (app-layer)", async () => {
    const repo = new SupabaseSessionRepository();
    const tokenA = `a-${Date.now()}`;
    const session = createEmptySession("A", undefined, randomUUID(), tokenA);
    session.participantTokenHash = hashParticipantToken(tokenA);
    await repo.save(session);
    expect(canParticipantAccessSession(session, session.participantId, tokenA)).toBe(true);
    expect(canParticipantAccessSession(session, randomUUID(), tokenA)).toBe(false);
    expect(canParticipantAccessSession(session, session.participantId, "wrong")).toBe(false);
  });

  it("RLS: anon cannot read interview_sessions rows (authenticated client required)", async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
    const url = getSupabaseUrl();
    expect(url && anonKey).toBeTruthy();
    const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { data, error } = await anon.from("interview_sessions").select("id").limit(5);
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });

  it("RLS: authenticated owner can read own session only", async () => {
    const service = getServiceRoleClient();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const url = getSupabaseUrl()!;
    const email = `hm-test-${Date.now()}@example.com`;
    const password = `Test-${randomUUID().slice(0, 8)}!1Aa`;

    const { data: userRes, error: userErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(userErr).toBeNull();
    const authUserId = userRes.user!.id;

    const participantId = randomUUID();
    await service.from("participants").insert({ id: participantId, auth_user_id: authUserId });

    const token = `rls-${Date.now()}`;
    const session = createEmptySession("A", undefined, participantId, token);
    session.participantTokenHash = hashParticipantToken(token);
    const repo = new SupabaseSessionRepository();
    await repo.save(session);

    const other = createEmptySession("A", undefined, randomUUID(), `other-${Date.now()}`);
    other.participantTokenHash = hashParticipantToken(`other-${Date.now()}`);
    await repo.save(other);

    const authed = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErr } = await authed.auth.signInWithPassword({ email, password });
    expect(signErr).toBeNull();

    const { data: mine } = await authed.from("interview_sessions").select("id").eq("id", session.id);
    expect(mine?.length).toBe(1);

    const { data: notMine } = await authed
      .from("interview_sessions")
      .select("id")
      .eq("id", other.id);
    expect(notMine?.length ?? 0).toBe(0);
  });

  it("signed upload + finalize + utterance row (storage integration)", async () => {
    const repo = new SupabaseSessionRepository();
    const token = `up-${Date.now()}`;
    const session = createEmptySession("C", undefined, randomUUID(), token);
    session.participantTokenHash = hashParticipantToken(token);
    session.consents = grantConsent(session.consents, "recording");
    await repo.save(session);

    const sample = Buffer.from("RIFF....WAVEfmt ", "ascii");
    const signed = await createSignedAudioUpload({
      sessionId: session.id,
      kind: "participant_recording",
      sourceType: "browser_recording",
      mimeType: "audio/wav",
      expectedByteSize: sample.length,
    });

    const service = getServiceRoleClient();
    const { error: upErr } = await service.storage
      .from("interview-audio-private")
      .upload(signed.path, sample, { contentType: "audio/wav", upsert: true });
    expect(upErr).toBeNull();

    const asset = await finalizeAudioUpload(signed.asset.id, sample.length);
    expect(asset.uploadStatus).toBe("ready");

    const utterances = getUtteranceRepository();
    const row = await utterances.createFromStt({
      sessionId: session.id,
      originalTranscript: "fixture transcript",
      transcriptLanguage: "en",
      sourceAudioAssetId: asset.id,
    });
    await utterances.confirmTranscript({
      sessionId: session.id,
      utteranceId: row.id,
      confirmedTranscript: "confirmed fixture",
    });

    const stored = await readAudioAsset(asset.id);
    expect(stored?.data.length).toBe(sample.length);

    const listed = await utterances.listBySession(session.id);
    expect(listed.some((u) => u.confirmedTranscript === "confirmed fixture")).toBe(true);
  });
});

describe("Supabase E2E gate", () => {
  it(LIVE ? "live mode active" : "skipped — set SUPABASE_INTEGRATION_TEST=1 and supabase env", () => {
    expect(typeof LIVE).toBe("boolean");
  });
});
