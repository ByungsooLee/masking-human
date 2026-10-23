"use client";

import { useRef, useState } from "react";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { saveArchivedSession, type ArchivedSession } from "@/lib/archive/session-archive";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

export function SaveAndNext({ phase, disabled = false }: { disabled?: boolean; phase: NonNullable<ArchivedSession["reviewPhase"]> }) {
  const recorder = useRecordingSession();
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const en = language === "en";
  const next = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const state = useMagazineFlowStore.getState();
      if (!state.archiveId) throw new Error("Missing interview ID");
      await saveArchivedSession({
        id: state.archiveId, savedAt: new Date().toISOString(), reviewPhase: phase,
        recordedAt: state.sessionStartedAt, prepare: state.prepare, transcript: state.transcript,
        draft: state.draft, slateAtMs: state.recordingSlateAtMs, recordingBlob: recorder.blob,
        audioStems: recorder.audioStems, editingTimeline: recorder.editingTimeline,
        analysisFeedback: state.analysisFeedback, releaseConsent: state.releaseConsent,
      });
      useRealtimeInterviewStore.getState().reset();
      useMagazineFlowStore.getState().resetFlow();
    } catch {
      pending.current = false;
      setFailed(true);
      setBusy(false);
    }
  };
  return <section className="my-6 space-y-3 border-y py-5">
    <button type="button" className="ui-btn" disabled={busy || disabled} onClick={() => void next()}>{busy ? (en ? "Saving…" : "保存しています…") : (en ? "Save and prepare the next interview" : "保存して次の人の準備へ")}</button>
    <p>{en ? "Keep this interview in this browser and continue without downloading. Resume review from history. Without signed publication consent, it remains private material." : "ダウンロードせず、このブラウザの履歴に保存して次へ進めます。確認は履歴から再開できます。掲載同意の署名がない素材は公開できません。"}</p>
    {failed && <p role="alert">{en ? "Could not save. Your current interview is still open. Check storage and retry." : "保存できませんでした。現在のインタビューはそのまま残しています。空き容量を確認して再試行してください。"}</p>}
  </section>;
}
