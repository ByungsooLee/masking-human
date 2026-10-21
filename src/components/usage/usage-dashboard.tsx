"use client";

import { useEffect, useState } from "react";
import { isPricingConfigured } from "../../../config/pricing";
import { formatEstimatedUsd, formatUsd, getUsageUiCopy } from "@/lib/i18n/usage-ui";
import type { UsageSummary } from "@/lib/usage/types";

type SessionRow = {
  sessionId: string;
  startedAt: number;
  estimatedUsd: number;
  model: string;
  isMock: boolean;
};

type DailyRow = { date: string; estimatedUsd: number };

export function UsageDashboard() {
  const copy = getUsageUiCopy();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);

  useEffect(() => {
    void (async () => {
      const [sRes, lRes] = await Promise.all([
        fetch("/api/usage/summary"),
        fetch("/api/usage/sessions"),
      ]);
      if (sRes.ok) setSummary((await sRes.json()) as UsageSummary);
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
              {formatEstimatedUsd(s.estimatedUsd, isPricingConfigured(s.model))} · {s.model}
              {s.isMock ? " · mock" : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
