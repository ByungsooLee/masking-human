"use client";

import { useUiTranslator } from "@/hooks/use-ui-translator";

import Link from "next/link";
import { useUsageSummary } from "@/hooks/use-usage-summary";

export function SpendAlertBanner() {
  const t = useUiTranslator();
  const { summary, error } = useUsageSummary(null);
  const alert = summary?.spendAlert;
  if (!alert?.exceeded) {
    return error ? <p role="status" className="recording-exclude px-5 py-2 text-sm">{t("利用料アラートを更新できません。接続を確認してください。")}</p> : null;
  }
  return <aside role="alert" aria-atomic="true" className="recording-exclude sticky top-0 z-50 border-b-2 px-5 py-4" style={{ background: "#fff3db", color: "#59380d", borderColor: "#926010" }}>
    <div className="mx-auto max-w-5xl">
      <p className="font-medium">{t("利用料アラート：今月")}{alert.source === "estimate" ? t("の推定") : t("の実績")}{t("が1ドルを超えました（$")}{alert.amountUsd.toFixed(3)}）</p>
      <p className="mt-1 text-sm">{t(alert.note)} {t("会話は自動停止しません。")}</p>
      {error && <p className="mt-1 text-sm">{t("更新に失敗したため、最後に取得した金額を表示しています。")}</p>}
      <Link href="/usage" className="mt-2 inline-block underline">{t("利用料を確認する")}</Link>
    </div>
  </aside>;
}
