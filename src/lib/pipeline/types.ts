import type { InterviewerAgentId, InterviewLanguage, InterviewerProfile } from "@/lib/magazine-flow/types";

export type PipelineSettings = {
  agentId: InterviewerAgentId;
  interviewLanguage: InterviewLanguage;
  interviewerProfile?: InterviewerProfile;
};
export type PipelineStage = "transcription" | "reply" | "speech";
export type PipelineCharge = {
  id: string;
  stage: PipelineStage;
  model: string;
  status: "pending" | "reported" | "estimated" | "unknown" | "rejected";
  reservedUsd: number;
  usd: number | null;
  at: string;
  inputTokens?: number;
  outputTokens?: number;
  seconds?: number;
  characters?: number;
  generationId?: string;
};
export type PipelineCost = {
  sessionId: string;
  month: string;
  budgetUsd: number;
  sessionUsd: number;
  monthUsd: number;
  reservedUsd: number;
  remainingUsd: number;
  pending: number;
  unknown: number;
  alerts: ("dollar" | "80" | "100")[];
  entries: PipelineCharge[];
  updatedAt: string;
};
export type PipelineSession = {
  id: string;
  createdAt: number;
  closed: boolean;
  settings: PipelineSettings;
  instructions: string;
  voice: string;
  rates: Record<string, { input: number; output: number }>;
  entries: PipelineCharge[];
};
export type PipelineMonth = { sessions: Record<string, PipelineSession>; other?: { usd: number; reservedUsd: number; unknown: number } };

export function summarizePipelineCost(state: PipelineMonth, sessionId: string, month: string, budgetUsd: number): PipelineCost {
  const entries = Object.values(state.sessions).flatMap((session) => session.entries);
  const current = state.sessions[sessionId]?.entries ?? [];
  const total = (rows: PipelineCharge[]) => rows.reduce((sum, entry) => sum + (entry.usd ?? 0), 0);
  const monthUsd = total(entries) + (state.other?.usd ?? 0);
  const reservedUsd = entries.reduce((sum, entry) => sum + (entry.usd === null ? entry.reservedUsd : 0), state.other?.reservedUsd ?? 0);
  const exposure = monthUsd + reservedUsd;
  return {
    sessionId, month, budgetUsd, sessionUsd: total(current), monthUsd, reservedUsd,
    remainingUsd: Math.max(0, budgetUsd - exposure),
    pending: current.filter((entry) => entry.status === "pending").length,
    unknown: entries.filter((entry) => entry.status === "unknown").length + (state.other?.unknown ?? 0),
    alerts: [...(monthUsd >= 1 ? ["dollar" as const] : []), ...(exposure >= budgetUsd * 0.8 ? ["80" as const] : []), ...(exposure >= budgetUsd ? ["100" as const] : [])],
    entries: current.map((entry) => ({ ...entry })), updatedAt: new Date().toISOString(),
  };
}
