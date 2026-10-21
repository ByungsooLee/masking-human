import { getServiceRoleClient } from "@/lib/supabase/client";
import type { InterviewLanguage } from "@/lib/interview/languages";
import type { UtteranceRecordRow } from "../types";
import type { UtteranceRepository } from "./types";

function fromDb(row: Record<string, unknown>): UtteranceRecordRow {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    turnId: (row.interview_turn_id as string) ?? undefined,
    speaker: row.speaker as "participant" | "assistant",
    textOriginal: (row.original_transcript ?? row.text_original) as string,
    textDisplay: (row.confirmed_transcript ?? row.text_display ?? row.original_transcript) as string,
    originalTranscript: (row.original_transcript ?? row.text_original) as string,
    confirmedTranscript: (row.confirmed_transcript as string) ?? undefined,
    transcriptLanguage: (row.transcript_language ?? row.language) as InterviewLanguage | "mixed",
    language: row.language as InterviewLanguage | "mixed",
    sequenceNum: row.sequence_num as number,
    audioAssetId: (row.audio_asset_id as string) ?? undefined,
    sourceAudioAssetId: (row.source_audio_asset_id as string) ?? undefined,
    startMs: typeof row.start_ms === "number" ? row.start_ms : undefined,
    endMs: typeof row.end_ms === "number" ? row.end_ms : undefined,
    isPublic: row.is_public as boolean,
    participantConfirmed: row.participant_confirmed as boolean,
    createdAt: row.created_at as string,
  };
}

export class SupabaseUtteranceRepository implements UtteranceRepository {
  private client = getServiceRoleClient();

  async nextSequence(sessionId: string): Promise<number> {
    const { count, error } = await this.client
      .from("utterance_records")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);
    if (error) throw error;
    return (count ?? 0) + 1;
  }

  async createFromStt(params: {
    sessionId: string;
    originalTranscript: string;
    transcriptLanguage: InterviewLanguage | "mixed";
    sourceAudioAssetId: string;
    startMs?: number;
    endMs?: number;
  }): Promise<UtteranceRecordRow> {
    const sequenceNum = await this.nextSequence(params.sessionId);
    const { data, error } = await this.client
      .from("utterance_records")
      .insert({
        session_id: params.sessionId,
        speaker: "participant",
        text_original: params.originalTranscript,
        text_display: params.originalTranscript,
        original_transcript: params.originalTranscript,
        confirmed_transcript: null,
        transcript_language: params.transcriptLanguage,
        language: params.transcriptLanguage,
        sequence_num: sequenceNum,
        audio_asset_id: params.sourceAudioAssetId,
        source_audio_asset_id: params.sourceAudioAssetId,
        start_ms: params.startMs ?? null,
        end_ms: params.endMs ?? null,
        participant_confirmed: false,
        is_public: false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return fromDb(data);
  }

  async confirmTranscript(params: {
    sessionId: string;
    utteranceId: string;
    confirmedTranscript: string;
  }): Promise<UtteranceRecordRow | null> {
    const confirmed = params.confirmedTranscript.trim();
    const { data, error } = await this.client
      .from("utterance_records")
      .update({
        confirmed_transcript: confirmed,
        text_display: confirmed,
        participant_confirmed: true,
      })
      .eq("session_id", params.sessionId)
      .eq("id", params.utteranceId)
      .eq("speaker", "participant")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromDb(data) : null;
  }

  async linkInterviewTurn(params: {
    sessionId: string;
    utteranceId: string;
    interviewTurnId: string;
  }): Promise<void> {
    const { error } = await this.client
      .from("utterance_records")
      .update({ interview_turn_id: params.interviewTurnId })
      .eq("session_id", params.sessionId)
      .eq("id", params.utteranceId);
    if (error) throw error;
  }

  async appendAssistant(params: {
    sessionId: string;
    text: string;
    language: InterviewLanguage | "mixed";
    audioAssetId: string;
  }): Promise<UtteranceRecordRow> {
    const sequenceNum = await this.nextSequence(params.sessionId);
    const { data, error } = await this.client
      .from("utterance_records")
      .insert({
        session_id: params.sessionId,
        speaker: "assistant",
        text_original: params.text,
        text_display: params.text,
        original_transcript: params.text,
        confirmed_transcript: params.text,
        transcript_language: params.language,
        language: params.language,
        sequence_num: sequenceNum,
        audio_asset_id: params.audioAssetId,
        source_audio_asset_id: params.audioAssetId,
        participant_confirmed: false,
        is_public: false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return fromDb(data);
  }

  async listBySession(sessionId: string): Promise<UtteranceRecordRow[]> {
    const { data, error } = await this.client
      .from("utterance_records")
      .select("*")
      .eq("session_id", sessionId)
      .order("sequence_num", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(fromDb);
  }

  async getById(sessionId: string, utteranceId: string): Promise<UtteranceRecordRow | null> {
    const { data, error } = await this.client
      .from("utterance_records")
      .select("*")
      .eq("session_id", sessionId)
      .eq("id", utteranceId)
      .maybeSingle();
    if (error) throw error;
    return data ? fromDb(data) : null;
  }

  async markPublicConfirmed(sessionId: string, utteranceId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("utterance_records")
      .update({ is_public: true })
      .eq("session_id", sessionId)
      .eq("id", utteranceId)
      .eq("participant_confirmed", true)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async deleteForSession(sessionId: string): Promise<void> {
    const { error } = await this.client.from("utterance_records").delete().eq("session_id", sessionId);
    if (error) throw error;
  }
}
