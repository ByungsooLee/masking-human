"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ThoughtGraph, type GraphMode } from "@/components/graph/thought-graph";
import { DepthLadder } from "@/components/graph/depth-ladder";
import { analyzeConversation, buildConversationGraph } from "@/lib/graph/build-conversation-graph";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { useMicLevel } from "@/hooks/use-mic-level";
import { useMockRealtimeInterview } from "@/hooks/use-mock-realtime-interview";
import { useRealtimeInterview } from "@/hooks/use-realtime-interview";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { MOCK_CLIMAX_UTTERANCE_ID } from "@/lib/realtime/mock-conversation";
import { isClimaxGuestUtterance } from "@/themes/shared/quote-feature";

type Props = { mockOnly: boolean };

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PhaseConversation({ mockOnly }: Props) {
  const ui = getMagazineFlowUi();
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const setTranscript = useMagazineFlowStore((s) => s.setTranscript);
  const setPhase = useMagazineFlowStore((s) => s.setPhase);
  const recorder = useRecordingSession();
  const live = useRealtimeInterview();
  const mock = useMockRealtimeInterview();
  const active = mockOnly ? mock : live;
  const utterances = useRealtimeInterviewStore((s) => s.utterances);
  const listeningPhase = useRealtimeInterviewStore((s) => s.listeningPhase);
  const mockScriptComplete = useRealtimeInterviewStore((s) => s.mockScriptComplete);
  const mic = useMicLevel(!mockOnly);
  const startedRef = useRef(false);
  const endingRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [ending, setEnding] = useState(false);
  const [guestVisible, setGuestVisible] = useState("");
  const prevGuestRef = useRef("");
  // The demo has no real guest voice, so each revealed phrase stands in for one.
  const demoVoiceRef = useRef(0);

  useEffect(() => {
    if (!mockOnly) return;
    const id = window.setInterval(() => {
      demoVoiceRef.current *= 0.88;
    }, 50);
    return () => window.clearInterval(id);
  }, [mockOnly]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const offset = recorder.clock.elapsedMs();
    if (mockOnly) void mock.start({ sessionOffsetMs: offset });
    else
      void live.start({
        agentId: prepare.agentId,
        interviewLanguage: prepare.language,
        getElapsedMs: () => recorder.clock.elapsedMs(),
      });
  }, [mockOnly, mock, live, prepare.agentId, prepare.language, recorder.clock]);

  useEffect(() => {
    const id = setInterval(() => setTick(recorder.clock.elapsedMs()), 500);
    return () => clearInterval(id);
  }, [recorder.clock]);

  useEffect(() => {
    // stop() clears the realtime store; keep the transcript captured before ending.
    if (endingRef.current) return;
    setTranscript(utterances.map((u) => ({ ...u, originalText: undefined })));
  }, [utterances, setTranscript]);

  const aiText = useMemo(() => {
    for (let i = utterances.length - 1; i >= 0; i--) {
      if (utterances[i].speaker === "ai") return utterances[i].text;
    }
    return null;
  }, [utterances]);

  const latestGuest = useMemo(() => {
    for (let i = utterances.length - 1; i >= 0; i--) {
      if (utterances[i].speaker === "guest") return utterances[i];
    }
    return null;
  }, [utterances]);

  const aiTyped = useTypewriter(aiText ?? ui.waitingFirstQuestion);

  useEffect(() => {
    const text = latestGuest?.text ?? "";
    if (!text || text === prevGuestRef.current) return;
    prevGuestRef.current = text;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGuestVisible(text);
      return;
    }
    setGuestVisible("");
    const parts = text.split(/(?<=[、。！？\s])/);
    let acc = "";
    let i = 0;
    let timer = 0;
    const step = () => {
      if (i >= parts.length) return;
      acc += parts[i];
      setGuestVisible(acc);
      demoVoiceRef.current = 0.55 + Math.random() * 0.3;
      i += 1;
      timer = window.setTimeout(step, 260);
    };
    step();
    return () => window.clearTimeout(timer);
  }, [latestGuest?.text]);

  const guestClimax =
    latestGuest != null &&
    (mockOnly
      ? latestGuest.id === MOCK_CLIMAX_UTTERANCE_ID
      : isClimaxGuestUtterance(latestGuest, utterances));

  // The featured answer stays lit on the graph after the talk moves on.
  const climaxId = useMemo(() => {
    if (mockOnly) return utterances.some((u) => u.id === MOCK_CLIMAX_UTTERANCE_ID) ? MOCK_CLIMAX_UTTERANCE_ID : null;
    return utterances.find((u) => isClimaxGuestUtterance(u, utterances))?.id ?? null;
  }, [mockOnly, utterances]);

  const graph = useMemo(() => buildConversationGraph(utterances), [utterances]);
  const insight = useMemo(() => analyzeConversation(utterances), [utterances]);
  const tagCount = graph.nodes.filter((n) => n.kind === "tag").length;

  const coreMode: GraphMode =
    listeningPhase === "connecting" || listeningPhase === "hidden"
      ? "boot"
      : listeningPhase === "ai_speaking"
        ? "speaking"
        : listeningPhase === "waiting_ai"
          ? "thinking"
          : "listening";

  const stateLabel =
    coreMode === "speaking"
      ? ui.stateSpeaking
      : coreMode === "thinking"
        ? ui.stateThinking
        : coreMode === "listening"
          ? ui.stateListening
          : ui.stateConnecting;

  const canFinish = !mockOnly || mockScriptComplete;

  const end = async () => {
    if (!canFinish || endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    const snapshot = useMagazineFlowStore.getState().transcript.length
      ? useMagazineFlowStore.getState().transcript
      : utterances;
    setTranscript(snapshot);
    await active.stop();
    await recorder.stop();
    setPhase("review");
  };

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[80rem] flex-col px-[var(--space-page-x)] py-6">
      <div className="recording-exclude flex flex-wrap items-center justify-between gap-4 text-[length:var(--text-body)]">
        <p className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              recorder.recording ? "bg-[color:var(--color-rose)]" : "bg-[color:var(--color-thread)]"
            }`}
            aria-hidden
          />
          <span className={recorder.recording ? "text-[color:var(--color-rose)]" : "text-[color:var(--color-ink-muted)]"}>
            {recorder.recording ? ui.recordingOn : ui.recordingOff}
          </span>
          <span className="ui-num text-[length:var(--text-lead)]">{formatElapsed(tick)}</span>
        </p>
        <p className="flex gap-5 text-[color:var(--color-ink-muted)]">
          <span>{ui.linkedWords(tagCount)}</span>
          <span className="text-[color:var(--color-rose)]" aria-live="polite">
            {stateLabel}
          </span>
        </p>
      </div>

      <div className="grid flex-1 items-center gap-4 py-4 landscape:md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] landscape:md:gap-10">
        <div className="relative h-[min(46vh,30rem)] w-full landscape:md:h-[min(68vh,40rem)]">
          <ThoughtGraph
            graph={graph}
            mode={ending ? "thinking" : coreMode}
            micRef={mockOnly ? demoVoiceRef : mic.rawRef}
            highlightId={climaxId}
            ringLabels={ui.depthRings}
            className="h-full w-full"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="recording-exclude flex flex-col gap-2 text-[length:var(--text-body)]">
            <DepthLadder reached={insight.depthReached} />
            {insight.openWords.length > 0 && (
              <p className="text-[color:var(--color-ink-muted)]">
                {ui.openWordsLabel}
                <span className="ml-3 text-[color:var(--color-ink)]">{insight.openWords.join("、")}</span>
              </p>
            )}
          </div>
          <p
            className="min-h-[3.6em] max-w-[24em] border-l-2 border-[color:var(--color-lilac)] pl-4 text-[length:var(--text-lead)] leading-[var(--leading-body)] text-[color:var(--color-ink-muted)]"
            aria-live="polite"
          >
            {aiTyped}
          </p>

          <p
            aria-live="polite"
            className={`max-w-[16em] text-[length:var(--text-display)] leading-[1.6] ${
              guestClimax
                ? "rounded-[var(--radius-soft)] bg-[color:var(--color-blush)] px-5 py-3 text-[color:var(--color-ink)]"
                : "text-[color:var(--color-ink)]"
            }`}
            style={{ fontFeatureSettings: '"palt"' }}
          >
            {guestVisible || latestGuest?.text || ""}
          </p>
        </div>
      </div>

      <div className="recording-exclude flex flex-col items-start gap-2">
        {mockOnly && !mockScriptComplete && (
          <p className="text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]">{ui.demoWaitForClimax}</p>
        )}
        {active.error && <p className="text-[length:var(--text-body)] text-[color:var(--color-rose)]">{active.error}</p>}
        <button type="button" disabled={!canFinish || ending} onClick={() => void end()} className="ui-btn text-[length:var(--text-body)]">
          {ending ? ui.endingConversation : ui.endConversation}
        </button>
      </div>
    </div>
  );
}
