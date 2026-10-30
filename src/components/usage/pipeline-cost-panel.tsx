"use client";

import { useEffect, useState } from "react";
import type { PipelineCost } from "@/lib/pipeline/types";

const usd = (value: number) => `$${value.toFixed(4)}`;

export function PipelineCostPanel({ cost, en, live = false }: { cost: PipelineCost | null; en: boolean; live?: boolean }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(timer);
  }, [live]);
  const stale = live && cost && now - Date.parse(cost.updatedAt) > 15000;
  return <details className="recording-exclude max-w-[min(90vw,34rem)] text-sm">
    <summary className="min-h-12 cursor-pointer content-center">
      {en ? "This interview" : "今回"} {cost ? usd(cost.sessionUsd) : "—"} <span className="text-[color:var(--color-ink-muted)]">{en ? "(reported + estimated)" : "（報告額＋推定）"}</span>
      {(!cost || cost.pending > 0) && ` · ${en ? "Calculating…" : "集計中…"}`}
      {cost && <span className="ml-2">{en ? "Month" : "今月"} {usd(cost.monthUsd)} / ${cost.budgetUsd}</span>}
      {stale && <span role="status"> · {en ? "Update delayed" : "更新が遅れています"}</span>}
      {cost && cost.alerts.length > 0 && <span role="status" className="ml-2 text-[color:var(--color-rose)]">{cost.alerts.includes("100") ? (en ? "Budget reached" : "予算上限") : cost.alerts.includes("80") ? (en ? "80% of budget" : "予算80%到達") : (en ? "$1 reached" : "$1到達")}</span>}
      {cost && cost.unknown > 0 && <span> · {en ? "Unresolved charges" : "未確定料金あり"}</span>}
    </summary>
    <div className="max-h-[65dvh] space-y-3 overflow-y-auto border-t border-[color:var(--color-thread)] py-4">
      {!cost ? <p>{en ? "Cost has not been retrieved. This does not mean $0." : "料金を取得できていません。$0という意味ではありません。"}</p> : <>
        <dl className="grid grid-cols-2 gap-2">
          {(["transcription", "reply", "speech"] as const).map((stage, index) => <div key={stage}>
            <dt>{(en ? ["Transcription", "Replies", "AI voice"] : ["文字起こし", "返答生成", "AI読み上げ"])[index]}</dt>
            <dd>{usd(cost.entries.filter((entry) => entry.stage === stage).reduce((total, entry) => total + (entry.usd ?? 0), 0))}{cost.entries.some((entry) => entry.stage === stage && entry.usd === null) && (en ? " + unresolved" : " ＋未確定")}</dd>
          </div>)}
          <div><dt>{en ? "Monthly budget left" : "月間予算の残り"}</dt><dd>{usd(cost.remainingUsd)}</dd></div>
          <div><dt>{en ? "Pending / unresolved reserve (month)" : "処理中・未確定の仮確保（今月）"}</dt><dd>{usd(cost.reservedUsd)}</dd></div>
        </dl>
        <p>{en ? "OpenRouter requests made through this app only. Reported charges are provider-reported, not a settled invoice. Excludes OpenAI Realtime, fees, tax, hosting and other apps. UTC session-start month." : "このアプリ経由のOpenRouter利用のみ。報告額も請求書の確定額ではありません。OpenAI Realtime・手数料・税・ホスティング・他アプリは対象外。月は会話開始時のUTC月です。"}</p>
        {cost.alerts.length > 0 && <p role="status" className="text-[color:var(--color-rose)]">{cost.alerts.includes("100") ? (en ? "Budget reached. New AI requests are blocked." : "予算上限です。新しいAI処理は停止します。") : cost.alerts.includes("80") ? (en ? "80% of the monthly budget is used or reserved." : "月間予算の80%を利用・仮確保しました。") : (en ? "Monthly usage has reached $1." : "今月の利用が$1に達しました。")}</p>}
        <table className="w-full text-left text-xs"><caption className="pb-2 text-left">{en ? "Requests, including retries" : "再試行を含むリクエスト内訳"}</caption><thead><tr><th>{en ? "Model / stage" : "モデル／処理"}</th><th>{en ? "Status / USD" : "状態／金額"}</th></tr></thead><tbody>{cost.entries.map((entry) => <tr key={entry.id} className="border-t border-[color:var(--color-thread)]">
          <td className="break-all py-2">{entry.model}<br />{(en ? { transcription: "Transcription", reply: "Reply", speech: "AI voice" } : { transcription: "文字起こし", reply: "返答", speech: "読み上げ" })[entry.stage]}{entry.id.endsWith(":fallback") && (en ? " · fallback" : "・予備モデル")}</td>
          <td className="py-2">{(en ? { pending: "Calculating", reported: "Reported", estimated: "Estimated", unknown: "Unresolved", rejected: "Rejected" } : { pending: "集計中", reported: "報告額", estimated: "推定", unknown: "確認待ち", rejected: "受付拒否" })[entry.status]}<br />{entry.usd === null ? "—" : usd(entry.usd)}</td>
        </tr>)}</tbody></table>
      </>}
    </div>
  </details>;
}
