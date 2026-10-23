"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { saveArchivedSession, type ArchivedSession } from "@/lib/archive/session-archive";
import { FinalAnalysisView } from "@/components/graph/final-analysis-view";
import { ReleaseConsent } from "@/components/live/release-consent";

export function PhaseResults({ mockOnly = false }: { mockOnly?: boolean }) {
  const state = useMagazineFlowStore();
  const recorder = useRecordingSession();
  const entry = useMemo<ArchivedSession>(() => ({ id: state.archiveId ?? "pending", savedAt: new Date(state.sessionStartedAt ?? 0).toISOString(), recordedAt: state.sessionStartedAt, prepare: state.prepare, transcript: state.transcript, draft: state.draft, slateAtMs: state.recordingSlateAtMs, recordingBlob: recorder.blob, analysisFeedback: state.analysisFeedback, releaseConsent: state.releaseConsent, audioStems: recorder.audioStems, editingTimeline: recorder.editingTimeline }), [state.archiveId, state.sessionStartedAt, state.prepare, state.transcript, state.draft, state.recordingSlateAtMs, recorder.blob, state.analysisFeedback, state.releaseConsent, recorder.audioStems, recorder.editingTimeline]);
  const [saved, setSaved] = useState<ArchivedSession | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const en = state.prepare.language === "en";
  useEffect(() => {
    if (!state.archiveId) return;
    let cancelled = false;
    queue.current = queue.current.catch(() => undefined).then(() => saveArchivedSession({ ...entry, savedAt: new Date().toISOString() }));
    void queue.current.then(() => { if (!cancelled) setSaved(entry); }, () => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [entry, attempt, state.archiveId]);
  return <div className="mx-auto max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)]">
    <p className="mb-4">{en ? "Step 3 / 3 — Final analysis" : "ステップ3 / 3 — 最終分析"}</p>
    <p role="status" className="mb-6">{error ? (en ? "Could not save to this browser. Keep this page open and retry. Storage space may be insufficient." : "このブラウザの履歴へ保存できませんでした。この画面を閉じずに再試行してください。空き容量不足の可能性があります。") : saved === entry ? (en ? "Saved to this browser's history. Media export is available from history. Nothing has been published." : "このブラウザの履歴に保存しました。素材の保存は履歴から行えます。公開はしていません。") : (en ? "Saving to this browser's history…" : "このブラウザの履歴に保存しています…")}</p>
    {error && <button className="ui-btn-sub mb-4" type="button" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>{en ? "Retry" : "再試行"}</button>}
    <FinalAnalysisView session={entry} />
    <section className="mt-12 space-y-4 border-t pt-8">
      <h2 className="ui-heading">{en ? "Final publication consent" : "最終的な掲載同意"}</h2>
      <p>{en ? "Review the recording and exclusions with the operator before signing. Excluding text does not remove it from the original audio or video. Without a saved signature this material must not be published." : "署名前に運営者と録音・映像と除外箇所を確認してください。テキストの除外だけでは原音声・原動画から消えません。署名保存のない素材は公開できません。"}</p>
      {mockOnly ? <p>{en ? "Demo: no real signature is collected." : "デモでは実際の署名を収集しません。"}</p> : state.archiveId && <ReleaseConsent language={state.prepare.language} value={state.releaseConsent} sessionId={state.archiveId} onChange={state.setReleaseConsent} />}
    </section>
    {saved === entry && <Link className="ui-btn-sub mt-8 inline-block" href="/live/archive">{en ? "Open interview history" : "過去の履歴を見る"}</Link>}
  </div>;
}
