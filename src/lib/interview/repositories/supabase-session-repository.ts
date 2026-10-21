import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterviewSession, IdempotencyRecord } from "../types";
import type { SessionRepository } from "./types";
import { getServiceRoleClient } from "@/lib/supabase/client";

function getServiceClient(): SupabaseClient {
  return getServiceRoleClient();
}

function consentsToJson(session: InterviewSession) {
  return Object.entries(session.consents)
    .filter(([, record]) => record)
    .map(([type, record]) => ({
      consent_type: type,
      granted: record!.granted,
      recorded_at: record!.recordedAt,
      revoked_at: record!.revokedAt ?? null,
      source: record!.source ?? "participant",
    }));
}

function turnsToJson(session: InterviewSession) {
  return session.turns.map((t) => ({
    id: t.id,
    role: t.role,
    text: t.text,
    stage: t.stage,
    questionNumber: t.questionNumber ?? null,
    technique: t.technique ?? null,
    language: t.language ?? null,
    timestamp: t.timestamp,
  }));
}

export class SupabaseSessionRepository implements SessionRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async save(session: InterviewSession): Promise<void> {
    const { error } = await this.client.rpc("save_interview_session_atomic", {
      p_session: session,
      p_turns: turnsToJson(session),
      p_consents: consentsToJson(session),
    });
    if (error) {
      // Fallback for projects without migration 003 yet
      if (error.message?.includes("save_interview_session_atomic")) {
        await this.saveLegacy(session);
        return;
      }
      throw error;
    }
  }

  private async saveLegacy(session: InterviewSession): Promise<void> {
    const { error: pErr } = await this.client.from("participants").upsert({
      id: session.participantId,
    });
    if (pErr) throw pErr;

    const { error } = await this.client.from("interview_sessions").upsert({
      id: session.id,
      participant_id: session.participantId,
      participant_token_hash: session.participantTokenHash,
      theme_id: session.themeId,
      interview_language: session.language.interviewLanguage,
      publishing_language: session.language.publishingLanguage,
      status: session.status,
      publish_status: session.publishStatus,
      current_stage: session.currentStage,
      stage_question_count: session.stageQuestionCount,
      total_questions_asked: session.totalQuestionsAsked,
      max_questions: session.maxQuestions,
      started_at: session.startedAt,
      ended_at: session.endedAt ?? null,
      deleted_at: session.deletedAt ?? null,
      deletion_requested_at: session.deletionRequestedAt ?? null,
      session_json: session,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    const turns = session.turns.map((t) => ({
      id: t.id,
      session_id: session.id,
      role: t.role,
      text: t.text,
      stage: t.stage,
      question_number: t.questionNumber ?? null,
      technique: t.technique ?? null,
      language: t.language ?? null,
      created_at: t.timestamp,
    }));
    if (turns.length > 0) {
      const { error: turnError } = await this.client.from("interview_turns").upsert(turns);
      if (turnError) throw turnError;
    }

    const consentRows = consentsToJson(session);
    if (consentRows.length > 0) {
      const { error: cErr } = await this.client.from("session_consents").upsert(consentRows, {
        onConflict: "session_id,consent_type",
      });
      if (cErr) throw cErr;
    }
  }

  async getById(sessionId: string): Promise<InterviewSession | null> {
    const { data, error } = await this.client
      .from("interview_sessions")
      .select("session_json")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.session_json) return null;
    return data.session_json as InterviewSession;
  }

  async delete(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from("interview_sessions")
      .update({ deleted_at: new Date().toISOString(), status: "ended_early" })
      .eq("id", sessionId);
    if (error) throw error;
  }

  async getIdempotency(
    sessionId: string,
    clientMessageId: string,
  ): Promise<IdempotencyRecord | null> {
    const { data, error } = await this.client
      .from("message_idempotency")
      .select("response_json")
      .eq("session_id", sessionId)
      .eq("client_message_id", clientMessageId)
      .maybeSingle();
    if (error) throw error;
    return (data?.response_json as IdempotencyRecord) ?? null;
  }

  async setIdempotency(
    sessionId: string,
    clientMessageId: string,
    record: IdempotencyRecord,
  ): Promise<void> {
    const { error } = await this.client.rpc("claim_message_idempotency", {
      p_session_id: sessionId,
      p_client_message_id: clientMessageId,
      p_response: record,
    });
    if (error) {
      if (error.message?.includes("claim_message_idempotency")) {
        const { error: insErr } = await this.client.from("message_idempotency").upsert({
          session_id: sessionId,
          client_message_id: clientMessageId,
          response_json: record,
        });
        if (insErr) throw insErr;
        return;
      }
      throw error;
    }
  }
}
