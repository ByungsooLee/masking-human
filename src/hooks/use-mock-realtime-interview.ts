"use client";

import { useCallback, useEffect, useRef } from "react";
import { getLiveUiCopy, resolveLiveUiLocale } from "@/lib/i18n/live-ui";
import { scheduleMockConversation } from "@/lib/realtime/mock-conversation";

export type MockStartOptions = { sessionOffsetMs?: number };
import { patchUsageSession } from "@/lib/usage/client-session-sync";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { useSessionTimeLimit } from "./use-session-time-limit";

export function useMockRealtimeInterview() {
  const cancelTimelineRef = useRef<(() => void) | null>(null);
  const copyRef = useRef(getLiveUiCopy(resolveLiveUiLocale()));
  const stopRef = useRef<(() => void) | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);

  const connectionStatus = useRealtimeInterviewStore((s) => s.connectionStatus);
  const listeningPhase = useRealtimeInterviewStore((s) => s.listeningPhase);
  const utterances = useRealtimeInterviewStore((s) => s.utterances);
  const error = useRealtimeInterviewStore((s) => s.error);
  const setConnectionStatus = useRealtimeInterviewStore((s) => s.setConnectionStatus);
  const setListeningPhase = useRealtimeInterviewStore((s) => s.setListeningPhase);
  const setUtterances = useRealtimeInterviewStore((s) => s.setUtterances);
  const setError = useRealtimeInterviewStore((s) => s.setError);
  const setIsMockSession = useRealtimeInterviewStore((s) => s.setIsMockSession);
  const setUsageSessionId = useRealtimeInterviewStore((s) => s.setUsageSessionId);
  const setSessionEstimatedUsd = useRealtimeInterviewStore((s) => s.setSessionEstimatedUsd);
  const setMockScriptComplete = useRealtimeInterviewStore((s) => s.setMockScriptComplete);
  const reset = useRealtimeInterviewStore((s) => s.reset);

  const { arm, disarm } = useSessionTimeLimit(() => {
    stopRef.current?.();
  });

  const stop = useCallback(async () => {
    cancelTimelineRef.current?.();
    cancelTimelineRef.current = null;
    const usageId = usageSessionIdRef.current;
    usageSessionIdRef.current = null;
    setConnectionStatus("disconnecting");
    setListeningPhase("hidden");
    disarm();
    if (usageId) {
      await patchUsageSession(usageId, { ended: true });
    }
    reset();
  }, [disarm, reset, setConnectionStatus, setListeningPhase]);

  useEffect(() => {
    stopRef.current = () => {
      void stop();
    };
  }, [stop]);

  const start = useCallback(async (options?: MockStartOptions) => {
    if (cancelTimelineRef.current) return;

    copyRef.current = getLiveUiCopy(resolveLiveUiLocale());
    setError(null);
    setIsMockSession(true);
    setConnectionStatus("connecting");
    setListeningPhase("connecting");
    setUtterances([]);
    setSessionEstimatedUsd(0);
    setMockScriptComplete(false);

    const trackRes = await fetch("/api/usage/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMock: true }),
    });
    if (trackRes.ok) {
      const track = (await trackRes.json()) as { sessionId?: string };
      if (track.sessionId) {
        usageSessionIdRef.current = track.sessionId;
        setUsageSessionId(track.sessionId);
      }
    }

    await new Promise((r) => setTimeout(r, 500));

    setConnectionStatus("connected");
    setListeningPhase("waiting_ai");
    arm();

    cancelTimelineRef.current = scheduleMockConversation(
      {
        onPhase: setListeningPhase,
        onUtterances: setUtterances,
        onComplete: () => setMockScriptComplete(true),
      },
      [],
      options?.sessionOffsetMs ?? 0,
    );
  }, [
    arm,
    setConnectionStatus,
    setError,
    setIsMockSession,
    setListeningPhase,
    setMockScriptComplete,
    setSessionEstimatedUsd,
    setUsageSessionId,
    setUtterances,
  ]);

  useEffect(() => {
    return () => {
      cancelTimelineRef.current?.();
      cancelTimelineRef.current = null;
    };
  }, []);

  const isLive =
    connectionStatus === "connected" || connectionStatus === "connecting";

  return {
    connectionStatus,
    listeningPhase,
    utterances,
    error,
    start,
    stop,
    isLive,
    isMock: true as const,
  };
}
