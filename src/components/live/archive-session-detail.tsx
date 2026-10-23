"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getArchivedSession, type ArchivedSession } from "@/lib/archive/session-archive";
import { FinalAnalysisView } from "@/components/graph/final-analysis-view";
import { PhasePublish } from "@/components/magazine-flow/phase-publish";
import { PrimaryNavigation } from "@/components/primary-navigation";
import { bloomFontClassName } from "@/themes/bloom/fonts";
import { downloadText } from "@/lib/magazine-flow/export-png";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { downloadReceipt } from "@/lib/consent/receipt-pdf";
import { exposureLabel } from "@/lib/consent/release";
import { HistoryEditingDownloads } from "@/components/live/history-editing-downloads";

export function ArchiveSessionDetail({ id }: { id: string }) {
  const router = useRouter();
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const [session, setSession] = useState<ArchivedSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"analysis" | "exports">("analysis");
  const en = language === "en";
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void getArchivedSession(id).then((entry) => {
      if (cancelled) return;
      if (entry?.recordingBlob) url = URL.createObjectURL(entry.recordingBlob);
      setRecordingUrl(url); setSession(entry); setLoaded(true);
    }).catch(() => { if (!cancelled) { setLoaded(true); setFailed(true); } });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [id]);
  return <div data-theme="bloom" className={`${bloomFontClassName} bloom-ground theme-body min-h-screen`}>
    <header className="px-[var(--space-page-x)] py-3"><PrimaryNavigation /></header>
    <main className="mx-auto max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)]">
      <Link href="/live/archive" className="ui-btn-sub inline-block mb-6">{en ? "Back to history" : "履歴に戻る"}</Link>
      {!loaded ? <p role="status">{en ? "Loading…" : "読み込んでいます…"}</p> : !session ? <p role="alert">{failed ? (en ? "Could not open browser storage. Please retry." : "ブラウザの保存領域を開けませんでした。再読み込みしてください。") : (en ? "This interview was not found in this browser." : "このブラウザには該当の履歴がありません。")}</p> : <>
        <button type="button" className="ui-btn mb-6" onClick={() => {
          useMagazineFlowStore.getState().resumeArchivedSession(session);
          router.push("/live");
        }}>{en ? "Resume review and consent" : "確認・同意を再開する"}</button>
        <details className="mb-6 border-y py-4"><summary>{en ? "Publication consent / receipt" : "掲載同意・控え"}</summary>{session.releaseConsent ? <div className="space-y-4 py-4"><p>{exposureLabel(session.releaseConsent.record.exposure, en)} / {session.releaseConsent.record.signedAt}</p><p className="break-all">{en ? "Video ID: " : "撮影ID："}{session.releaseConsent.record.videoId}</p><p>{session.releaseConsent.mail === "accepted" ? (en ? "Email service accepted the receipt; delivery is not verified." : "控えはメール送信受付済みです。到達確認ではありません。") : (en ? "Receipt email not confirmed." : "控えメールは未送信・未確認です。")}</p><p className="whitespace-pre-wrap leading-loose">{session.releaseConsent.record.terms}</p><p>{en ? "Original recordings are NOT automatically anonymized. Apply the agreed framing, cuts / masking and the signed voice-use restrictions before publication. Never publish the private receipt." : "原録画は自動匿名化されません。署名時の同意内容に沿って画角・カット・モザイク・音声の使用や加工を公開前に確認してください。個人情報を含む控えは公開しないでください。"}</p><button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadReceipt(session.releaseConsent!.pdf, session.releaseConsent!.record.id)}>{en ? "Save private consent PDF" : "非公開の同意PDFを保存"}</button></div> : <p>{en ? "No signed publication consent is linked. Do not treat interview consent as publication permission." : "掲載同意の署名は紐づいていません。会話への同意を公開許可とみなさないでください。"}</p>}</details>
        <div role="group" aria-label={en ? "History view" : "履歴の表示"} className="mb-6 flex gap-3"><button className="ui-btn-sub" type="button" aria-pressed={tab === "analysis"} onClick={() => setTab("analysis")}>{en ? "Final analysis" : "最終分析"}</button><button className="ui-btn-sub" type="button" aria-pressed={tab === "exports"} onClick={() => setTab("exports")}>{en ? "Media & social exports" : "素材保存・SNS書き出し"}</button></div>
        {tab === "analysis" ? <FinalAnalysisView session={session} /> : <>
          <HistoryEditingDownloads session={session} en={en} />
          {!recordingUrl && <p className="mb-4">{en ? "No recording is saved for this entry. Older entries may contain text only." : "この履歴には録音が保存されていません。旧形式の履歴はテキストのみの場合があります。"}</p>}
          {session.draft ? <PhasePublish session={session} recordingUrl={recordingUrl} /> : <div className="flex flex-col gap-4"><p>{en ? "There is not enough Q&A for a magazine card. You can download the original materials below. They may include excluded speech." : "雑誌カードに必要なQ&Aが不足しています。以下から原素材を保存できます。除外した発言も含まれる場合があります。"}</p><button type="button" className="ui-btn-sub" onClick={() => downloadText("interview.json", JSON.stringify({ ...session, recordingBlob: undefined, audioStems: undefined, releaseConsent: undefined }, null, 2), "application/json")}>{en ? "Save original transcript JSON" : "原文ログJSONを保存"}</button>{recordingUrl && <a className="ui-btn-sub" href={recordingUrl} download={`interview-${session.id}.${session.recordingBlob?.type.includes("mp4") ? "mp4" : "webm"}`}>{en ? "Save recording" : "録音を保存"}</a>}</div>}
        </>}
      </>}
    </main>
  </div>;
}
