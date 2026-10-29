"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { updateArchivedHandover } from "@/lib/archive/session-archive";
import { reportSource, signedReleases, withArchivedRelease, withParticipantReport } from "@/lib/archive/participant-handover";
import type { SignedRelease } from "@/lib/consent/release";
import { exposureLabel } from "@/lib/consent/release";
import { downloadReceipt } from "@/lib/consent/receipt-pdf";
import { downloadBlob } from "@/lib/recording/editing-files";
import { isDemoOnly } from "@/lib/demo-mode";
import { ReleaseConsent } from "./release-consent";

export function ParticipantHandover({ session, language, onSaved }: { session: ArchivedSession; language: "ja" | "en"; onSaved: (session: ArchivedSession) => void }) {
  const en = language === "en";
  const [signAgain, setSignAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SignedRelease | null>(null);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash !== "#participant-report") return;
    section.current?.scrollIntoView({ block: "start" });
    section.current?.focus({ preventScroll: true });
  }, []);
  const saveRelease = async (release: SignedRelease) => {
    setPending(release); setBusy(true); setError("");
    try {
      const saved = await updateArchivedHandover(session.id, (current) => withArchivedRelease(current, release));
      onSaved(saved); setPending(null); setSignAgain(false); setComplete(false);
    } catch { setError(en ? "The server saved the signature, but browser history could not be updated. Keep this page open and retry history save." : "サーバーに署名は保存されましたが、このブラウザの履歴へ保存できませんでした。画面を閉じず「履歴への保存を再試行」を押してください。"); }
    finally { setBusy(false); }
  };
  const download = (pdf: string, id: string) => {
    downloadBlob(`personal-report-${session.id}-${id}.pdf`, new Blob([Uint8Array.from(atob(pdf), (character) => character.charCodeAt(0))], { type: "application/pdf" }));
  };
  const createReport = async () => {
    setBusy(true); setError(""); setComplete(false);
    try {
      const { createParticipantReport } = await import("@/lib/archive/participant-report-pdf");
      const createdAt = new Date().toISOString();
      const pdf = await createParticipantReport(session, language, createdAt);
      const report = { id: crypto.randomUUID(), createdAt, releaseId: session.releaseConsent!.record.id, language, pdf };
      const saved = await updateArchivedHandover(session.id, (current) => {
        if (reportSource(current) !== reportSource(session)) throw new Error("Report source changed");
        return withParticipantReport(current, report);
      });
      onSaved(saved); download(pdf, report.id); setComplete(true);
    } catch { setError(en ? "Could not create or save the PDF. Check the signature receipt and browser storage, then retry. Saved PDFs below can still be downloaded." : "PDFの作成・履歴保存ができませんでした。署名控えとブラウザの空き容量を確認して再試行してください。作成済みPDFは下から再保存できます。"); }
    finally { setBusy(false); }
  };
  return <section id="participant-report" ref={section} tabIndex={-1} className="my-8 scroll-mt-6 space-y-5 border-y border-[color:var(--color-thread)] py-8" aria-label={en ? "Participant report and signatures" : "本人に渡すPDF・署名履歴"}>
    <h2 className="ui-heading">{en ? "A report to take with you" : "本人に渡すレポート"}</h2>
    <p>{en ? "Review the analysis below, save final publication consent, then download one PDF containing the map, summary, reference counts and original signed receipt. Signing permits the selected publication scope; it does not certify that automated analysis is correct." : "下の分析を本人と確認し、最終的な掲載同意を保存してから、マインドマップ・要約・参考集計・署名済み控えを1つのPDFで渡せます。署名は選択した掲載範囲への同意であり、分析の正しさを認めるものではありません。"}</p>
    <p className="text-[color:var(--color-ink-muted)]">{en ? "Private: includes name, email and signature. Give it only to the participant or their guardian; never publish it on social media. No report email is automatically sent. Browser storage is local, not a cloud backup." : "氏名・メール・署名を含む非公開資料です。本人または保護者にのみ渡し、SNSへ公開しないでください。レポートPDFのメール自動送信は行いません。履歴はこのブラウザ内の保存で、クラウドバックアップではありません。"}</p>
    {isDemoOnly() ? <p>{en ? "Demo: signing and participant PDF delivery are disabled." : "デモでは実際の署名・本人向けPDFの発行はできません。"}</p> : <>
      {(!session.releaseConsent || signAgain) && !pending && <ReleaseConsent language={language} sessionId={session.id} value={null} onChange={(release) => { if (release) void saveRelease(release); }} />}
      {pending && <button type="button" className="ui-btn-sub min-h-12" disabled={busy} onClick={() => void saveRelease(pending)}>{en ? "Retry saving history" : "履歴への保存を再試行"}</button>}
      {session.releaseConsent && !signAgain && <p role="status">{en ? "Signature saved" : "署名保存済み"}: {session.releaseConsent.record.name} / {session.releaseConsent.record.signedAt}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="ui-btn min-h-12" disabled={busy || !session.releaseConsent || signAgain || Boolean(pending)} onClick={() => void createReport()}>{busy ? (en ? "Saving…" : "保存しています…") : (en ? "Save analysis + signed receipt PDF" : "分析結果＋署名控えPDFを保存")}</button>
        {session.releaseConsent && <button type="button" className="ui-btn-sub min-h-12" disabled={busy || Boolean(pending)} onClick={() => setSignAgain(!signAgain)}>{signAgain ? (en ? "Keep existing signature" : "既存の署名に戻る") : (en ? "Sign again (keep previous record)" : "再署名する（前の記録も残す）")}</button>}
      </div>
      {!session.releaseConsent && <p>{en ? "PDF delivery is available after the final signature is saved." : "最終署名を保存すると、本人向けPDFを発行できます。"}</p>}
    </>}
    {complete && <p role="status">{en ? "PDF saved to history and download requested. Download does not prove delivery to the participant." : "PDFを履歴に保存し、ダウンロードを開始しました。本人への受け渡し完了を確認したものではありません。"}</p>}
    {error && <p role="alert">{error}</p>}
    <h3>{en ? "Previously created PDFs" : "作成済みの本人向けPDF"}</h3>
    {(session.participantReports ?? []).length === 0 ? <p>{en ? "No PDF created yet." : "まだ作成していません。"}</p> : <ul className="space-y-3">{session.participantReports!.map((report) => <li key={report.id}><p>{report.createdAt} / {report.language} / {en ? "Consent" : "同意ID"}: {report.releaseId}</p><button type="button" className="ui-btn-sub min-h-12" onClick={() => download(report.pdf, report.id)}>{en ? "Download saved PDF" : "作成時のPDFを再保存"}</button></li>)}</ul>}
    <h3>{en ? "Signature history" : "署名履歴"}</h3>
    {signedReleases(session).length === 0 ? <p>{en ? "No signatures yet." : "まだ署名がありません。"}</p> : signedReleases(session).map((release) => <details key={release.record.id} className="border-t border-[color:var(--color-thread)] py-4">
      <summary>{release.record.name} / {release.record.signedAt} / {exposureLabel(release.record.exposure, en)}</summary>
      <div className="space-y-4 py-4"><p>{en ? "Consent ID" : "同意ID"}: {release.record.id}<br />{en ? "Interview ID" : "会話ID"}: {release.record.videoId}<br />{release.record.email}</p>
        <Image unoptimized src={release.record.signature} width={1000} height={300} alt={en ? "Saved handwritten signature" : "保存した手書き署名"} className="h-auto w-full max-w-md border bg-white" />
        <p className="whitespace-pre-wrap leading-loose">{release.record.terms}</p>
        <button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadReceipt(release.pdf, release.record.id)}>{en ? "Save original signed receipt" : "署名時の控えPDFを保存"}</button>
      </div>
    </details>)}
  </section>;
}
