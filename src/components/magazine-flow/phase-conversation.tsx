"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationWorkspace } from "@/components/live/conversation-workspace";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";
import { useMockRealtimeInterview } from "@/hooks/use-mock-realtime-interview";
import { useRealtimeInterview } from "@/hooks/use-realtime-interview";
import { usePipelineInterview } from "@/hooks/use-pipeline-interview";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { saveArchivedSession } from "@/lib/archive/session-archive";
import { INTERVIEW_ANSWER_LIMIT } from "@/lib/realtime/interview-progress";

type Props = { mockOnly: boolean };

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PhaseConversation({ mockOnly }: Props) {
  const answerCount = useRealtimeInterviewStore((state) => state.answerCount);
  const ui = useMagazineFlowUi();
  const prepare = useMagazineFlowStore((state) => state.prepare);
  const setTranscript = useMagazineFlowStore((state) => state.setTranscript);
  const setPhase = useMagazineFlowStore((state) => state.setPhase);
  const recorder = useRecordingSession();
  const live = useRealtimeInterview();
  const pipeline = usePipelineInterview();
  const mock = useMockRealtimeInterview();
  const pipelineMode = !mockOnly && prepare.interviewEngine === "pipeline";
  const active = mockOnly ? mock : pipelineMode ? pipeline : live;
  const utterances = useRealtimeInterviewStore((state) => state.utterances);
  const listeningPhase = useRealtimeInterviewStore((state) => state.listeningPhase);
  const mockScriptComplete = useRealtimeInterviewStore((state) => state.mockScriptComplete);
  const inputState = useRealtimeInterviewStore((state) => state.inputState);
  const pendingSince = useRealtimeInterviewStore((state) => state.inputPendingSince);
  const startedRef = useRef(false);
  const endingRef = useRef(false);
  const endRef = useRef<(() => Promise<void>) | null>(null);
  const [tick, setTick] = useState(0);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const offset = recorder.clock.elapsedMs();
    if (mockOnly) {
      useRealtimeInterviewStore.getState().setUsageLedger(null);
      void mock.start({ sessionOffsetMs: offset, language: prepare.language });
    }
    else if (pipelineMode) {
      const input = recorder.getAudioInput();
      if (!input.stream || !input.context) { useRealtimeInterviewStore.getState().setError(prepare.language === "en" ? "Microphone recording is unavailable." : "マイクの録音に接続できません。"); return; }
      void pipeline.start({ settings: { agentId: prepare.agentId, interviewLanguage: prepare.language, interviewerProfile: prepare.interviewerProfile }, stream: input.stream, context: input.context, attachAiAudio: recorder.attachAiAudio, elapsed: () => recorder.clock.elapsedMs(), onTimeLimit: () => { void endRef.current?.(); } });
    }
    else void live.start({ agentId: prepare.agentId, interviewLanguage: prepare.language, interviewerProfile: prepare.interviewerProfile, realtimeModel: prepare.realtimeModel, attachAiAudio: recorder.attachAiAudio, onTimeLimit: () => { void endRef.current?.(); }, getElapsedMs: () => recorder.clock.elapsedMs() });
  }, [mockOnly, mock, live, pipelineMode, pipeline, prepare.agentId, prepare.language, prepare.interviewerProfile, prepare.realtimeModel, recorder]);

  useEffect(() => {
    const timer = setInterval(() => setTick(recorder.clock.elapsedMs()), 500);
    return () => clearInterval(timer);
  }, [recorder.clock]);

  useEffect(() => {
    if (!endingRef.current) setTranscript(utterances.map((row) => ({ ...row, originalText: undefined })));
  }, [utterances, setTranscript]);

  const canFinish = !mockOnly || mockScriptComplete;
  const end = async () => {
    if (!canFinish || endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    setTranscript(useMagazineFlowStore.getState().transcript.length ? useMagazineFlowStore.getState().transcript : utterances);
    await active.stop();
    if (pipelineMode) setTranscript(useRealtimeInterviewStore.getState().utterances.map((row) => ({ ...row })));
    const recordingBlob = await recorder.stop();
    const current = useMagazineFlowStore.getState();
    if (current.archiveId) {
      try { await saveArchivedSession({ id: current.archiveId, savedAt: new Date().toISOString(), recordedAt: current.sessionStartedAt, prepare: current.prepare, transcript: current.transcript, draft: current.draft, slateAtMs: recorder.getSlateAtMs(), recordingBlob, audioStems: recorder.getAudioStems(), editingTimeline: recorder.getEditingTimeline(), analysisFeedback: current.analysisFeedback, releaseConsent: current.releaseConsent, usageLedger: useRealtimeInterviewStore.getState().usageLedger }); }
      catch { setPhase("review"); return; }
    }
    setPhase("review");
  };
  useEffect(() => { endRef.current = end; });

  return <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[88rem] flex-col px-[var(--space-page-x)] py-4">
    <div className="recording-exclude flex items-center justify-between gap-4 pb-4 text-sm">
      <p>{recorder.recording ? ui.recordingOn : ui.recordingOff} <span className="ui-num ml-3">{formatElapsed(tick)}</span></p>
      <p>{mockOnly ? (prepare.language === "ja" ? "無料デモ" : "Free demo") : `${prepare.language === "ja" ? "回答" : "Answers"} ${Math.min(answerCount, INTERVIEW_ANSWER_LIMIT)} / ${INTERVIEW_ANSWER_LIMIT}`}</p>
    </div>
    <ConversationWorkspace utterances={utterances} language={prepare.language} guestName={prepare.guestName} inputState={inputState} pendingSince={pendingSince} phase={listeningPhase} error={active.error} onCapture={recorder.captureEditingEvent} />
    <div className="conversation-actions recording-exclude flex flex-col items-start gap-2">
      {mockOnly && !mockScriptComplete && <p className="text-sm text-[color:var(--color-ink-muted)]">{ui.demoWaitForClimax}</p>}
      {active.error && <p role="alert" className="text-[color:var(--color-rose)]">{active.error}</p>}
      {pipelineMode && active.error && <button type="button" className="ui-btn-sub min-h-12" onClick={() => void pipeline.resume()}>{prepare.language === "en" ? "Resume AI (new requests may incur charges)" : "AIを再開（新しい処理の料金が発生します）"}</button>}
      {!mockOnly && !pipelineMode && active.error && <button type="button" className="ui-btn-sub min-h-12" onClick={() => live.resume()}>{prepare.language === "en" ? "Resume AI (new requests may incur charges)" : "AIを再開（新しい処理の料金が発生します）"}</button>}
      <button type="button" disabled={!canFinish || ending} onClick={() => void end()} className="ui-btn">{ending ? ui.endingConversation : ui.endConversation}</button>
    </div>
  </div>;
}
