"use client";

import { buildAnalysisFindings } from "@/lib/graph/analysis-findings";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { AnalyticsMagazineReport } from "./analytics-magazine-report";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function FinalAnalysisView({ session }: { session: ArchivedSession }) {
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const en = language === "en";
  const findings = buildAnalysisFindings(session.transcript, language);
  const options = en ? ["Fits", "Not quite — tentative", "Not sure yet — tentative"] : ["合っている", "少し違う — 未確定", "まだ分からない — 未確定"];
  return <>
    <section className="analysis-findings mb-8"><h1>{en ? "Your final analysis" : "あなたの最終分析"}</h1><p>{en ? "Read the map together with the explanations. Numbers describe this conversation, not your ability or personality. Your review below takes priority over the automated summary." : "マップと説明を合わせてご覧ください。数値は今回の会話の構成で、能力や性格の点数ではありません。自動整理より、下のあなた自身の確認を優先します。"}</p>
      <ol>{findings.map((finding) => <li key={finding.reviewKey}><h3>{finding.title}</h3><p>{finding.finding}</p><p className="finding-note">{en ? "Your review: " : "あなたの確認："}{!finding.available ? (en ? "Insufficient evidence" : "根拠不足") : options[Number(session.analysisFeedback?.[finding.reviewKey])] ?? (en ? "Not reviewed — tentative" : "未回答 — 未確定")}</p></li>)}</ol>
    </section>
    <AnalyticsMagazineReport utterances={session.transcript} guestName={session.prepare.guestName} draft={session.draft} recordedAt={session.recordedAt} allowDownloads={false} />
  </>;
}
