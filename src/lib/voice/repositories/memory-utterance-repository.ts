import { randomUUID } from "crypto";
import type { InterviewLanguage } from "@/lib/interview/languages";
import type { UtteranceRecordRow } from "../types";
import type { UtteranceRepository } from "./types";

const globalUtterances = globalThis as unknown as {
  utteranceRows?: Map<string, UtteranceRecordRow[]>;
};

function rowsFor(sessionId: string): UtteranceRecordRow[] {
  if (!globalUtterances.utteranceRows) globalUtterances.utteranceRows = new Map();
  if (!globalUtterances.utteranceRows.has(sessionId)) {
    globalUtterances.utteranceRows.set(sessionId, []);
  }
  return globalUtterances.utteranceRows.get(sessionId)!;
}

function mapRow(row: UtteranceRecordRow): UtteranceRecordRow {
  return { ...row };
}

export class MemoryUtteranceRepository implements UtteranceRepository {
  async nextSequence(sessionId: string): Promise<number> {
    return rowsFor(sessionId).length + 1;
  }

  async createFromStt(params: {
    sessionId: string;
    originalTranscript: string;
    transcriptLanguage: InterviewLanguage | "mixed";
    sourceAudioAssetId: string;
    startMs?: number;
    endMs?: number;
  }): Promise<UtteranceRecordRow> {
    if (
      (params.startMs !== undefined && params.endMs === undefined) ||
      (params.startMs === undefined && params.endMs !== undefined)
    ) {
      throw new Error("Both start_ms and end_ms required when timing is recorded");
    }
    const row: UtteranceRecordRow = {
      id: randomUUID(),
      sessionId: params.sessionId,
      speaker: "participant",
      textOriginal: params.originalTranscript,
      textDisplay: params.originalTranscript,
      originalTranscript: params.originalTranscript,
      confirmedTranscript: undefined,
      transcriptLanguage: params.transcriptLanguage,
      language: params.transcriptLanguage,
      sequenceNum: await this.nextSequence(params.sessionId),
      audioAssetId: params.sourceAudioAssetId,
      sourceAudioAssetId: params.sourceAudioAssetId,
      startMs: params.startMs,
      endMs: params.endMs,
      isPublic: false,
      participantConfirmed: false,
      createdAt: new Date().toISOString(),
    };
    rowsFor(params.sessionId).push(row);
    return mapRow(row);
  }

  async confirmTranscript(params: {
    sessionId: string;
    utteranceId: string;
    confirmedTranscript: string;
  }): Promise<UtteranceRecordRow | null> {
    const row = rowsFor(params.sessionId).find((r) => r.id === params.utteranceId);
    if (!row || row.speaker !== "participant") return null;
    row.confirmedTranscript = params.confirmedTranscript.trim();
    row.textDisplay = row.confirmedTranscript;
    row.participantConfirmed = true;
    return mapRow(row);
  }

  async linkInterviewTurn(params: {
    sessionId: string;
    utteranceId: string;
    interviewTurnId: string;
  }): Promise<void> {
    const row = rowsFor(params.sessionId).find((r) => r.id === params.utteranceId);
    if (row) row.turnId = params.interviewTurnId;
  }

  async appendAssistant(params: {
    sessionId: string;
    text: string;
    language: InterviewLanguage | "mixed";
    audioAssetId: string;
  }): Promise<UtteranceRecordRow> {
    const row: UtteranceRecordRow = {
      id: randomUUID(),
      sessionId: params.sessionId,
      speaker: "assistant",
      textOriginal: params.text,
      textDisplay: params.text,
      originalTranscript: params.text,
      confirmedTranscript: params.text,
      transcriptLanguage: params.language,
      language: params.language,
      sequenceNum: await this.nextSequence(params.sessionId),
      audioAssetId: params.audioAssetId,
      sourceAudioAssetId: params.audioAssetId,
      isPublic: false,
      participantConfirmed: false,
      createdAt: new Date().toISOString(),
    };
    rowsFor(params.sessionId).push(row);
    return mapRow(row);
  }

  async listBySession(sessionId: string): Promise<UtteranceRecordRow[]> {
    return rowsFor(sessionId).map(mapRow);
  }

  async getById(sessionId: string, utteranceId: string): Promise<UtteranceRecordRow | null> {
    const row = rowsFor(sessionId).find((r) => r.id === utteranceId);
    return row ? mapRow(row) : null;
  }

  async markPublicConfirmed(sessionId: string, utteranceId: string): Promise<boolean> {
    const row = rowsFor(sessionId).find((r) => r.id === utteranceId);
    if (!row || !row.participantConfirmed) return false;
    row.isPublic = true;
    return true;
  }

  async deleteForSession(sessionId: string): Promise<void> {
    globalUtterances.utteranceRows?.delete(sessionId);
  }
}

export function clearUtterancesForTests(): void {
  globalUtterances.utteranceRows?.clear();
}
