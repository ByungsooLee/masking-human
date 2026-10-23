"use client";

import { useUiTranslator } from "@/hooks/use-ui-translator";

import { useEffect, useState } from "react";
import { isPricingConfigured } from "../../../config/pricing";
import { formatEstimatedUsd, formatUsd, getUsageUiCopy } from "@/lib/i18n/usage-ui";
import { useUsageSummary } from "@/hooks/use-usage-summary";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

type SessionRow = {
  sessionId: string;
  startedAt: number;
  estimatedUsd: number;
  model: string;
  isMock: boolean;
};

type DailyRow = { date: string; estimatedUsd: number };

export function UsageDashboard() {
  const t = useUiTranslator();
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const copy = getUsageUiCopy(language);
  const { summary } = useUsageSummary(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);

  useEffect(() => {
    void (async () => {
      const lRes = await fetch("/api/usage/sessions");
      if (lRes.ok) {
        const data = (await lRes.json()) as {
          sessions: SessionRow[];
          dailyTotals: DailyRow[];
        };
        setSessions(data.sessions);
        setDaily(data.dailyTotals);
      }
    })();
  }, []);

  return (
    <div className="theme-ground theme-body mx-auto min-h-screen max-w-[var(--content-max)] px-[var(--space-page-x)] py-[var(--space-page-y)]">
      <h1 className="mb-[var(--space-block)] text-[length:var(--text-display)]">{copy.pageTitle}</h1>
      {summary?.spendAlert && <section className="mb-6 rounded-xl border p-4">
        <h2>{t("今月の1ドルアラート：")}{summary.spendAlert.exceeded ? t("超過") : t("未超過")}</h2>
        <p>{t("判定額：$")}{summary.spendAlert.amountUsd.toFixed(3)}（{summary.spendAlert.source === "actual" ? t("実績") : t("推定")}）</p>
        <p className="mt-2 text-sm">{t(summary.spendAlert.note)}</p>
        <p className="mt-2 text-sm">{t("アプリを開いている間、約30秒ごとに確認します。期間はUTCの暦月です。通知のみで自動停止はしません。")}</p>
      </section>}

      {!summary?.pricingConfigured && (
        <p className="mb-6 text-sm text-[color:var(--color-ink-muted)]">{copy.pricingUnset}</p>
      )}

      <div className="mb-[var(--space-block)] grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-[color:var(--color-ink-muted)]">{copy.sessionEstimate}</p>
          <p className="text-[length:var(--text-lead)]">
            {formatEstimatedUsd(
              summary?.currentSessionEstimatedUsd,
              summary?.pricingConfigured ?? true,
              language,
            )}
          </p>
        </div>
        <div>
          <p className="text-sm text-[color:var(--color-ink-muted)]">{copy.monthActual}</p>
          <p className="text-[length:var(--text-lead)]">
            {summary?.monthlyAvailable ? formatUsd(summary.monthlyUsd) : copy.unavailable}
          </p>
        </div>
        <div>
          <p className="text-sm text-[color:var(--color-ink-muted)]">{copy.budgetRemaining}</p>
          <p className="text-[length:var(--text-lead)]">
            {summary?.budgetUsd != null ? formatUsd(summary.remainingUsd) : copy.unavailable}
          </p>
        </div>
      </div>

      {summary?.costsNote && (
        <p className="mb-8 text-xs text-[color:var(--color-mist)]">{summary.costsNote}</p>
      )}

      <h2 className="mb-3 text-[length:var(--text-lead)]">{copy.dailyHeading}</h2>
      <ul className="mb-[var(--space-block)] space-y-2 text-sm">
        {daily.map((d) => (
          <li key={d.date} className="flex justify-between gap-4">
            <span>{d.date}</span>
            <span>{formatUsd(d.estimatedUsd)}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-[length:var(--text-lead)]">{copy.sessionsHeading}</h2>
      <ul className="space-y-3 text-sm">
        {sessions.map((s) => (
          <li key={s.sessionId} className="border-l border-[color:var(--color-line)] pl-3">
            <p>{new Date(s.startedAt).toLocaleString()}</p>
            <p className="text-[color:var(--color-ink-muted)]">
              {formatEstimatedUsd(s.estimatedUsd, isPricingConfigured(s.model), language)} · {s.model}
              {s.isMock ? " · mock" : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
