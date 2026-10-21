"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSessionRecorder } from "@/hooks/use-session-recorder";

type RecordingSessionContextValue = ReturnType<typeof useSessionRecorder>;

const RecordingSessionContext = createContext<RecordingSessionContextValue | null>(null);

export function RecordingSessionProvider({ children }: { children: ReactNode }) {
  const recorder = useSessionRecorder();
  return <RecordingSessionContext.Provider value={recorder}>{children}</RecordingSessionContext.Provider>;
}

export function useRecordingSession(): RecordingSessionContextValue {
  const ctx = useContext(RecordingSessionContext);
  if (!ctx) throw new Error("useRecordingSession requires RecordingSessionProvider");
  return ctx;
}
