"use client";

import { useCallback, useEffect, useRef } from "react";
import { OpenAIRealtimeWebRTC, RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { getLiveUiCopy } from "@/lib/i18n/live-ui";
import { DEFAULT_REALTIME_MODEL } from "@/lib/realtime/config";
import {
  createUtteranceTimingState,
  historyToUtterances,
} from "@/lib/realtime/history-to-utterances";
import {
  applyTimingFromTransportEvent,
  markAiAudioStart,
  markAiAudioStop,
  resetAiTimingCursor,
} from "@/lib/realtime/utterance-timing-events";
import { buildRealtimeSessionConfig } from "@/lib/realtime/session-payload";
import { patchUsageSession } from "@/lib/usage/client-session-sync";
import { extractResponseDoneUsage } from "@/lib/usage/report-response-done";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import type { InterviewerAgentId, InterviewLanguage, InterviewerProfile } from "@/lib/magazine-flow/types";
import { useSessionTimeLimit } from "./use-session-time-limit";
import { inputStateFromTransportEvent } from "@/lib/graph/map-update-status";

export type RealtimeStartOptions = {
  agentId?: InterviewerAgentId;
  interviewLanguage?: InterviewLanguage;
  interviewerProfile?: InterviewerProfile;
  attachAiAudio?: (stream: MediaStream) => void;
  onTimeLimit?: () => void;
  getElapsedMs?: () => number;
};

export function useRealtimeInterview() {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const timingRef = useRef(createUtteranceTimingState());
  const elapsedRef = useRef<() => number>(() => Date.now());
  const copyRef = useRef(getLiveUiCopy("ja"));
  const stopRef = useRef<(() => void) | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);
  const usagePatchTokenRef = useRef<string | null>(null);
  const onTimeLimitRef = useRef<(() => void) | undefined>(undefined);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const { arm, disarm } = useSessionTimeLimit(() => {
    if (onTimeLimitRef.current) onTimeLimitRef.current();
    else stopRef.current?.();
  });

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    const usageId = usageSessionIdRef.current;
    const patchToken = usagePatchTokenRef.current;
    usageSessionIdRef.current = null;
    usagePatchTokenRef.current = null;

    setConnectionStatus("disconnecting");
    setListeningPhase("hidden");
    disarm();
    try {
      session?.close();
    } catch {
      /* ignore */
    }
    if (usageId && patchToken) {
      await patchUsageSession(usageId, patchToken, { ended: true });
    }
    timingRef.current = createUtteranceTimingState();
    resetAiTimingCursor();
    setConnectionStatus("idle");
  }, [disarm, setConnectionStatus, setListeningPhase]);

  useEffect(() => {
    stopRef.current = () => {
      void stop();
    };
  }, [stop]);

  const start = useCallback(async (startOptions?: RealtimeStartOptions) => {
    if (sessionRef.current) return;

    copyRef.current = getLiveUiCopy(startOptions?.interviewLanguage ?? "ja");
    setError(null);
    onTimeLimitRef.current = startOptions?.onTimeLimit;
    setIsMockSession(false);
    setConnectionStatus("connecting");
    setListeningPhase("connecting");
    timingRef.current = createUtteranceTimingState();
    resetAiTimingCursor();
    elapsedRef.current = startOptions?.getElapsedMs ?? (() => Date.now());
    setUtterances([]);
    setSessionEstimatedUsd(null);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startOptions ?? {}),
      });
      const data = (await res.json()) as {
        clientSecret?: string;
        model?: string;
        instructions?: string;
        voice?: string;
        sessionId?: string;
        patchToken?: string;
        error?: string;
        detail?: string;
        code?: string;
      };
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.detail ?? data.error ?? copyRef.current.connectionFailed);
      }
      const model = data.model ?? DEFAULT_REALTIME_MODEL;
      if (data.sessionId && data.patchToken) {
        usageSessionIdRef.current = data.sessionId;
        usagePatchTokenRef.current = data.patchToken;
        setUsageSessionId(data.sessionId);
      }

      const agent = new RealtimeAgent({
        name: "Interviewer",
        instructions: data.instructions,
        voice: data.voice,
      });

      const audioElement = new Audio();
      audioElement.autoplay = true;
      const transport = new OpenAIRealtimeWebRTC({
        audioElement,
        changePeerConnection: (connection) => {
          connection.addEventListener("track", (event) => {
            if (event.track.kind === "audio") {
              startOptions?.attachAiAudio?.(event.streams[0] ?? new MediaStream([event.track]));
            }
          });
          return connection;
        },
      });

      const session = new RealtimeSession(agent, {
        model,
        transport,
        config: buildRealtimeSessionConfig(startOptions?.interviewLanguage ?? "ja"),
      });

      session.on("history_updated", (history) => {
        setUtterances(
          historyToUtterances(history, timingRef.current, Date.now(), elapsedRef.current),
        );
      });

      session.on("audio_start", () => {
        setListeningPhase("ai_speaking");
        markAiAudioStart(timingRef.current, elapsedRef.current());
      });

      session.on("audio_stopped", () => {
        setListeningPhase("guest_may_speak");
        markAiAudioStop(timingRef.current, elapsedRef.current());
        setUtterances(useRealtimeInterviewStore.getState().utterances.map((row) => ({ ...row, ...timingRef.current.get(row.id) })));
      });

      session.on("transport_event", (event) => {
        const inputState = inputStateFromTransportEvent(event);
        if (inputState) useRealtimeInterviewStore.getState().setInputState(inputState);
        applyTimingFromTransportEvent(event, timingRef.current, elapsedRef.current());
        const usage = extractResponseDoneUsage(event);
        const sid = usageSessionIdRef.current;
        const patchToken = usagePatchTokenRef.current;
        if (!usage || !sid || !patchToken) return;
        void patchUsageSession(sid, patchToken, { usage }).then((usd) => {
          if (typeof usd === "number") setSessionEstimatedUsd(usd);
        });
      });

      sessionRef.current = session;
      await session.connect({ apiKey: data.clientSecret });
      setConnectionStatus("connected");
      setListeningPhase("waiting_ai");
      arm();
      session.transport.sendEvent({ type: "response.create" });
      closingTimerRef.current = setTimeout(() => {
        if (sessionRef.current !== session) return;
        session.transport.sendEvent({
          type: "session.update",
          session: { type: "realtime", instructions: `${data.instructions ?? ""}\n運営からの時間連絡：残り約1分です。次の応答から未来の一言と振り返りへ向かい、10分以内に感謝で締めてください。` },
        });
      }, 9 * 60 * 1000);
    } catch (err) {
      sessionRef.current?.close();
      sessionRef.current = null;
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
      usageSessionIdRef.current = null;
      timingRef.current = createUtteranceTimingState();
      disarm();
      setConnectionStatus("error");
      setListeningPhase("hidden");
      setError(err instanceof Error ? err.message : copyRef.current.connectionFailed);
    }
  }, [
    arm,
    disarm,
    setConnectionStatus,
    setError,
    setIsMockSession,
    setListeningPhase,
    setSessionEstimatedUsd,
    setUsageSessionId,
    setUtterances,
  ]);

  useEffect(() => {
    return () => {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
      sessionRef.current?.close();
      sessionRef.current = null;
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
    isMock: false as const,
  };
}
