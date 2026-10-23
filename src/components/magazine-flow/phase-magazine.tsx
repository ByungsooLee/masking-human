"use client";

import { SaveAndNext } from "./save-and-next";

import { AnalysisFindings } from "@/components/graph/analysis-findings";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function PhaseMagazine() {
  const transcript = useMagazineFlowStore((state) => state.transcript);
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const feedback = useMagazineFlowStore((state) => state.analysisFeedback);
  const setFeedback = useMagazineFlowStore((state) => state.setAnalysisFeedback);
  const setPhase = useMagazineFlowStore((state) => state.setPhase);
  const ja = language === "ja";
  return <div className="mx-auto max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)]">
    <p className="mb-4">{ja ? "ステップ2 / 3 — 分析候補への確認" : "Step 2 / 3 — Review the findings"}</p>
    <SaveAndNext phase="magazine" />
    <AnalysisFindings utterances={transcript} language={language} feedback={feedback} onFeedback={setFeedback} allowDownload={false} />
    <p className="mt-6">{ja ? "回答は任意です。「少し違う」「まだ分からない」は未確定として最終結果に残します。" : "Answers are optional. “Not quite” and “Not sure yet” remain tentative in the final report."}</p>
    <button type="button" className="ui-btn mt-6" onClick={() => setPhase("publish")}>{ja ? "最終分析を見る" : "View the final analysis"}</button>
  </div>;
}
