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
import { createOpeningGate, INTERVIEW_ANSWER_LIMIT, interviewTurnGuidance } from "@/lib/realtime/interview-progress";

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

      const answeredItems = new Set<string>();
      const ignoredOpeningItems = new Set<string>();
      let responsePending = true;
      let pendingAnswer = false;
      let closing = false;
      let closingCompleted = false;
      let closingAudioStopped = false;
      let closingAudioStarted = false;
      let finished = false;
      let closingForTime = false;
      const openingGate = createOpeningGate(() => {
        if (sessionRef.current !== session) return;
        session.mute(false);
        setListeningPhase("guest_may_speak");
      });
      const finishClosing = () => {
        if (!finished && closingCompleted && closingAudioStopped && sessionRef.current === session) {
          finished = true;
          queueMicrotask(() => {
            if (sessionRef.current !== session) return;
            if (onTimeLimitRef.current) onTimeLimitRef.current();
            else stopRef.current?.();
          });
        }
      };
      const respondToAnswer = () => {
        if (!pendingAnswer || responsePending || finished || closing || sessionRef.current !== session) return;
        pendingAnswer = false;
        responsePending = true;
        closing = answeredItems.size >= INTERVIEW_ANSWER_LIMIT || closingForTime;
        if (closing) session.mute(true);
        setListeningPhase("waiting_ai");
        session.transport.sendEvent({ type: "response.create", response: { instructions: `${data.instructions ?? ""}\n${interviewTurnGuidance(closing ? INTERVIEW_ANSWER_LIMIT : answeredItems.size)}` } });
      };

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
          historyToUtterances(history, timingRef.current, Date.now(), elapsedRef.current).filter((row) => !ignoredOpeningItems.has(row.id)),
        );
        guideNextTurn();
      });

      session.on("audio_start", () => {
        if (sessionRef.current !== session) return;
        if (closing) closingAudioStarted = true;
        setListeningPhase("ai_speaking");
        markAiAudioStart(timingRef.current, elapsedRef.current());
      });

      session.on("audio_stopped", () => {
        if (sessionRef.current !== session) return;
        if (!openingGate.ready) openingGate.audioStopped();
        if (closing && closingAudioStarted) { closingAudioStopped = true; finishClosing(); }
        else if (openingGate.ready) setListeningPhase("guest_may_speak");
        markAiAudioStop(timingRef.current, elapsedRef.current());
        setUtterances(useRealtimeInterviewStore.getState().utterances.map((row) => ({ ...row, ...timingRef.current.get(row.id) })));
      });

      session.on("transport_event", (event) => {
        if (useRealtimeInterviewStore.getState().usageSessionId !== data.sessionId) return;
        const incoming = event as { type: string; item_id?: string; transcript?: string; response?: { status?: string } };
        if (incoming.type === "input_audio_buffer.speech_started" && !openingGate.ready && incoming.item_id) ignoredOpeningItems.add(incoming.item_id);
        if (incoming.type === "conversation.item.input_audio_transcription.completed" && incoming.item_id && (!openingGate.ready || ignoredOpeningItems.has(incoming.item_id))) {
          ignoredOpeningItems.add(incoming.item_id);
          session.transport.sendEvent({ type: "conversation.item.delete", item_id: incoming.item_id });
        }
        if (incoming.type === "conversation.item.input_audio_transcription.completed" && openingGate.ready && !closing && incoming.item_id && incoming.transcript?.trim() && !ignoredOpeningItems.has(incoming.item_id) && !answeredItems.has(incoming.item_id)) {
          setError(null);
          answeredItems.add(incoming.item_id);
          pendingAnswer = true;
          respondToAnswer();
        }
        if (incoming.type === "response.done") {
          responsePending = false;
          if (!openingGate.ready && incoming.response?.status === "completed") openingGate.responseCompleted();
          if (!openingGate.ready && incoming.response?.status !== "completed") {
            setError(copyRef.current.connectionFailed);
            setListeningPhase("hidden");
          }
          if (openingGate.ready && !closing && !pendingAnswer && incoming.response?.status !== "completed") setListeningPhase("guest_may_speak");
          if (closing && incoming.response?.status === "completed") { closingCompleted = true; finishClosing(); }
          if (closing && incoming.response?.status !== "completed") {
            setError(copyRef.current.connectionFailed);
            setListeningPhase("hidden");
          }
          respondToAnswer();
        }
        if (incoming.type === "conversation.item.input_audio_transcription.failed") {
          setError(startOptions?.interviewLanguage === "en" ? "Could not transcribe that audio. Try speaking again, or finish to save the recording." : "音声を文字起こしできませんでした。もう一度話すか、終了して録音を保存してください。");
          useRealtimeInterviewStore.getState().setInputState("failed");
          setListeningPhase(openingGate.ready && !closing ? "guest_may_speak" : "hidden");
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
      session.mute(true);
      setConnectionStatus("connected");
      setListeningPhase("waiting_ai");
      arm();
      session.transport.sendEvent({ type: "response.create" });
      closingTimerRef.current = setTimeout(() => {
        if (sessionRef.current !== session) return;
        closingForTime = true;
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
