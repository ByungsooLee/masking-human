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
import { createUsageLedger, usageEntryFromEvent, type PromptMetadata } from "@/lib/usage/response-ledger";
import { createDialogueGuard, dialogueGuardEvent } from "@/lib/realtime/dialogue-guard";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import type { InterviewerAgentId, InterviewLanguage, InterviewerProfile } from "@/lib/magazine-flow/types";
import { useSessionTimeLimit } from "./use-session-time-limit";
import { inputStateFromTransportEvent } from "@/lib/graph/map-update-status";
import { INTERVIEW_ANSWER_LIMIT, interviewRestateGuidance, interviewTurnGuidance } from "@/lib/realtime/interview-progress";
import { WebRtcInterviewControl } from "@/lib/realtime/web-rtc-interview-control";

export type RealtimeStartOptions = {
  agentId?: InterviewerAgentId;
  interviewLanguage?: InterviewLanguage;
  interviewerProfile?: InterviewerProfile;
  realtimeModel?: import("@/lib/realtime/model-options").SelectableRealtimeModel;
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
  const controlRef = useRef<WebRtcInterviewControl | null>(null);
  const inputStreamRef = useRef<MediaStream | null>(null);
  const lifecycleRef = useRef(0);

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
    lifecycleRef.current += 1;
    const session = sessionRef.current;
    sessionRef.current = null;
    controlRef.current?.stop(); controlRef.current = null;
    inputStreamRef.current?.getTracks().forEach((track) => track.stop()); inputStreamRef.current = null;
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
      await patchUsageSession(usageId, patchToken, { ended: true }).catch(() => null);
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
    const lifecycle = ++lifecycleRef.current;

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
    useRealtimeInterviewStore.getState().setAnswerCount(0);
    setSessionEstimatedUsd(null);
    setUsageSessionId(null);
    useRealtimeInterviewStore.getState().setUsageLedger(null);

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
        promptMetadata?: PromptMetadata;
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
      if (lifecycleRef.current !== lifecycle) return;
      useRealtimeInterviewStore.getState().setUsageLedger(createUsageLedger(model, data.promptMetadata ?? null));
      const reportedResponses = new Set<string>();
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
      const inputStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (lifecycleRef.current !== lifecycle) { inputStream.getTracks().forEach((track) => track.stop()); return; }
      inputStream.getAudioTracks().forEach((track) => { track.enabled = false; });
      inputStreamRef.current = inputStream;
      const transport = new OpenAIRealtimeWebRTC({
        audioElement,
        mediaStream: inputStream,
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

      const control = new WebRtcInterviewControl({
        request: ({ kind, answers, eventId, restate }) => session.transport.sendEvent({ type: "response.create", event_id: eventId, response: { metadata: { interview_request: eventId }, instructions: kind === "opening" ? data.instructions : `${data.instructions ?? ""}\n${restate ? interviewRestateGuidance() : interviewTurnGuidance(kind === "closing" ? INTERVIEW_ANSWER_LIMIT : answers)}` } }),
        cancel: ({ responseId, clearAudio }) => {
          try {
            if (responseId) session.transport.sendEvent({ type: "response.cancel", response_id: responseId });
            if (clearAudio) session.transport.sendEvent({ type: "output_audio_buffer.clear" });
          } catch { return; }
        },
        mute: (muted) => session.mute(muted),
        phase: setListeningPhase,
        count: (answers) => useRealtimeInterviewStore.getState().setAnswerCount(answers),
        error: (code) => {
          setError(code ? (startOptions?.interviewLanguage === "en" ? "AI response or playback could not be confirmed. Resume explicitly (new requests may cost money), or finish to save." : "AIの返答・再生完了を確認できません。再開（追加料金の可能性あり）するか、終了して保存してください。") : null);
          if (code) useRealtimeInterviewStore.getState().setInputState("failed");
        },
        finish: () => {
          if (sessionRef.current !== session) return;
          if (onTimeLimitRef.current) onTimeLimitRef.current(); else stopRef.current?.();
        },
        deleteItem: (id) => session.transport.sendEvent({ type: "conversation.item.delete", item_id: id }),
        audioStart: () => markAiAudioStart(timingRef.current, elapsedRef.current()),
        audioStop: () => {
          markAiAudioStop(timingRef.current, elapsedRef.current());
          setUtterances(useRealtimeInterviewStore.getState().utterances.map((row) => ({ ...row, ...timingRef.current.get(row.id) })));
        },
      });
      controlRef.current = control;
      session.on("error", (event) => {
        const server = (event as { error?: { type?: unknown; event_id?: unknown } }).error;
        if (server?.type === "error" && typeof server.event_id === "string") return;
        control.transportError();
      });

      const dialogueGuard = createDialogueGuard();
      const completedAiItems = new Set<string>();
      const guideNextTurn = () => {
        if (sessionRef.current !== session) return;
        const notice = dialogueGuard.observe(useRealtimeInterviewStore.getState().utterances, completedAiItems);
        if (notice) {
          try {
            session.transport.sendEvent(dialogueGuardEvent(notice));
            const ledger = useRealtimeInterviewStore.getState().usageLedger;
            if (ledger) useRealtimeInterviewStore.getState().setUsageLedger({ ...ledger, dialogueGuidance: [...(ledger.dialogueGuidance ?? []), { afterItemId: notice.afterItemId, reason: notice.reason, atMs: elapsedRef.current() }] });
          }
          catch { return; }
        }
      };
      session.on("history_updated", (history) => {
        setUtterances(
          historyToUtterances(history, timingRef.current, Date.now(), elapsedRef.current).filter((row) => !control.isIgnored(row.id)),
        );
        guideNextTurn();
      });

      session.on("transport_event", (event) => {
        if (useRealtimeInterviewStore.getState().usageSessionId !== data.sessionId) return;
        control.handle(event as Parameters<WebRtcInterviewControl["handle"]>[0]);
        const incoming = event as { type: string };
        if (incoming.type === "conversation.item.input_audio_transcription.failed") {
          setError(startOptions?.interviewLanguage === "en" ? "Could not transcribe that audio. Try speaking again, or finish to save the recording." : "音声を文字起こしできませんでした。もう一度話すか、終了して録音を保存してください。");
          useRealtimeInterviewStore.getState().setInputState("failed");
          setListeningPhase("guest_may_speak");
        }
        const usageEntry = usageEntryFromEvent(event, model, elapsedRef.current());
        if (usageEntry) useRealtimeInterviewStore.getState().recordUsage(usageEntry);
        if (usageEntry?.kind === "response" && usageEntry.status === "completed") {
          for (const itemId of usageEntry.outputItemIds) completedAiItems.add(itemId);
          guideNextTurn();
        }
        const inputState = inputStateFromTransportEvent(event);
        if (inputState) useRealtimeInterviewStore.getState().setInputState(inputState);
        applyTimingFromTransportEvent(event, timingRef.current, elapsedRef.current());
        const usage = extractResponseDoneUsage(event);
        const sid = usageSessionIdRef.current;
        const patchToken = usagePatchTokenRef.current;
        if (!usage || !sid || !patchToken || !usageEntry || reportedResponses.has(usageEntry.id)) return;
        reportedResponses.add(usageEntry.id);
        void patchUsageSession(sid, patchToken, { usage, responseId: usageEntry.id }).then((usd) => {
          if (typeof usd === "number" && useRealtimeInterviewStore.getState().usageSessionId === sid) setSessionEstimatedUsd(Math.max(usd, useRealtimeInterviewStore.getState().sessionEstimatedUsd ?? 0));
        }).catch(() => undefined);
      });

      sessionRef.current = session;
      await session.connect({ apiKey: data.clientSecret });
      if (lifecycleRef.current !== lifecycle) { session.close(); inputStream.getTracks().forEach((track) => track.stop()); return; }
      session.mute(true);
      setConnectionStatus("connected");
      setListeningPhase("waiting_ai");
      arm();
      control.start();
      closingTimerRef.current = setTimeout(() => {
        if (sessionRef.current !== session) return;
        control.closeSoon();
      }, 9 * 60 * 1000);
    } catch (err) {
      if (lifecycleRef.current !== lifecycle) return;
      sessionRef.current?.close();
      sessionRef.current = null;
      controlRef.current?.stop(); controlRef.current = null;
      inputStreamRef.current?.getTracks().forEach((track) => track.stop()); inputStreamRef.current = null;
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
      lifecycleRef.current += 1;
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
      sessionRef.current?.close();
      sessionRef.current = null;
      controlRef.current?.stop(); controlRef.current = null;
      inputStreamRef.current?.getTracks().forEach((track) => track.stop()); inputStreamRef.current = null;
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
    resume: () => controlRef.current?.resume(),
    isLive,
    isMock: false as const,
  };
}
