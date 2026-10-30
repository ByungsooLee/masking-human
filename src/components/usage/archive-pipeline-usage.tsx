"use client";

import { useState } from "react";
import { updateArchivedHandover, type ArchivedSession } from "@/lib/archive/session-archive";
import { downloadText } from "@/lib/magazine-flow/export-png";
import { buildUsageExport } from "@/lib/usage/response-ledger";
import { PipelineCostPanel } from "./pipeline-cost-panel";
import { TranscriptionGapNotice } from "./transcription-gap-notice";

export function ArchivePipelineUsage({ session, en }: { session: ArchivedSession; en: boolean }) {
  const [cost, setCost] = useState(session.usageLedger?.pipeline ?? null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    if (!cost) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch(`/api/pipeline?sessionId=${cost.sessionId}&month=${cost.month}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Cost unavailable");
      const current = (await response.json()).cost;
      await updateArchivedHandover(session.id, (previous) => ({ ...previous, usageLedger: previous.usageLedger ? { ...previous.usageLedger, pipeline: current } : previous.usageLedger }));
      setCost(current);
    } catch { setError(true); }
    finally { setBusy(false); }
  };
  return <section className="mb-6 border-y border-[color:var(--color-thread)] py-4">
    <TranscriptionGapNotice gaps={session.usageLedger?.transcriptionGaps} en={en} />
    <PipelineCostPanel cost={cost} en={en} />
    <div className="flex flex-wrap gap-3">
      <button type="button" className="ui-btn-sub min-h-12" disabled={busy} onClick={() => void refresh()}>{busy ? (en ? "Checking…" : "確認中…") : (en ? "Refresh recorded charges" : "最新の料金を確認")}</button>
      <button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadText(`usage-${session.id}.json`, JSON.stringify(buildUsageExport(session.id, session.usageLedger ? { ...session.usageLedger, pipeline: cost ?? undefined } : null), null, 2), "application/json")}>{en ? "Download usage JSON" : "利用量JSONを保存"}</button>
    </div>
    {error && <p role="alert">{en ? "Could not refresh charges. Sign in as the operator on the start page and retry. The saved snapshot remains available." : "料金を更新できません。開始画面で運営者ログインを確認して再試行してください。保存時の料金は表示を維持しています。"}</p>}
  </section>;
}
