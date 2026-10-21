import type { InterviewLanguage } from "@/lib/interview/languages";
import type { UtteranceRecordRow } from "../types";

export interface UtteranceRepository {
  nextSequence(sessionId: string): Promise<number>;
  createFromStt(params: {
    sessionId: string;
    originalTranscript: string;
    transcriptLanguage: InterviewLanguage | "mixed";
    sourceAudioAssetId: string;
    startMs?: number;
    endMs?: number;
  }): Promise<UtteranceRecordRow>;
  confirmTranscript(params: {
    sessionId: string;
    utteranceId: string;
    confirmedTranscript: string;
  }): Promise<UtteranceRecordRow | null>;
  linkInterviewTurn(params: {
    sessionId: string;
    utteranceId: string;
    interviewTurnId: string;
  }): Promise<void>;
  appendAssistant(params: {
    sessionId: string;
    text: string;
    language: InterviewLanguage | "mixed";
    audioAssetId: string;
  }): Promise<UtteranceRecordRow>;
  listBySession(sessionId: string): Promise<UtteranceRecordRow[]>;
  getById(sessionId: string, utteranceId: string): Promise<UtteranceRecordRow | null>;
  markPublicConfirmed(sessionId: string, utteranceId: string): Promise<boolean>;
  deleteForSession(sessionId: string): Promise<void>;
}
