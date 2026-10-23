import { create } from "zustand";
import type { ConnectionStatus, ListeningPhase, Utterance } from "@/lib/realtime/types";

type RealtimeInterviewState = {
  connectionStatus: ConnectionStatus;
  listeningPhase: ListeningPhase;
  utterances: Utterance[];
  error: string | null;
  sessionEndsAt: number | null;
  isMockSession: boolean;
  usageSessionId: string | null;
  sessionEstimatedUsd: number | null;
  mockScriptComplete: boolean;
  inputState: "idle" | "speaking" | "transcribing" | "failed";
  inputPendingSince: number | null;
  setInputState: (state: "idle" | "speaking" | "transcribing" | "failed") => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setListeningPhase: (phase: ListeningPhase) => void;
  setUtterances: (utterances: Utterance[]) => void;
  setError: (error: string | null) => void;
  setSessionEndsAt: (at: number | null) => void;
  setIsMockSession: (mock: boolean) => void;
  setUsageSessionId: (id: string | null) => void;
  setSessionEstimatedUsd: (usd: number | null) => void;
  setMockScriptComplete: (complete: boolean) => void;
  reset: () => void;
};

const initialState = {
  connectionStatus: "idle" as ConnectionStatus,
  listeningPhase: "hidden" as ListeningPhase,
  utterances: [] as Utterance[],
  error: null as string | null,
  sessionEndsAt: null as number | null,
  isMockSession: false,
  usageSessionId: null as string | null,
  sessionEstimatedUsd: null,
  mockScriptComplete: false,
  inputState: "idle" as const,
  inputPendingSince: null as number | null,
};

export const useRealtimeInterviewStore = create<RealtimeInterviewState>((set) => ({
  ...initialState,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setListeningPhase: (listeningPhase) => set({ listeningPhase }),
  setUtterances: (utterances) => set({ utterances }),
  setError: (error) => set({ error }),
  setSessionEndsAt: (sessionEndsAt) => set({ sessionEndsAt }),
  setIsMockSession: (isMockSession) => set({ isMockSession }),
  setUsageSessionId: (usageSessionId) => set({ usageSessionId }),
  setSessionEstimatedUsd: (sessionEstimatedUsd) => set({ sessionEstimatedUsd }),
  setMockScriptComplete: (mockScriptComplete) => set({ mockScriptComplete }),
  setInputState: (inputState) => set({ inputState, inputPendingSince: inputState === "transcribing" ? Date.now() : null }),
  reset: () => set({ ...initialState }),
}));
