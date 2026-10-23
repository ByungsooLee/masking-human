import { computeBudgetStatus } from "./budget";
import { fetchMonthlyCostsUsd } from "./fetch-monthly-costs";
import { getSessionRecord, sumTodayEstimatedUsd, sumMonthEstimatedUsd } from "./session-usage-store";
import { buildSpendAlert } from "./spend-alert";
import type { UsageSummary } from "./types";

export async function buildUsageSummary(sessionId?: string | null): Promise<UsageSummary> {
  const monthly = await fetchMonthlyCostsUsd();
  const todayEstimatedUsd = sumTodayEstimatedUsd();
  const budget = computeBudgetStatus({
    monthlyUsd: monthly.monthlyUsd,
    monthlyAvailable: monthly.available,
    todayEstimatedUsd,
  });

  const currentSessionEstimatedUsd = sessionId
    ? (getSessionRecord(sessionId)?.estimatedUsd ?? null)
    : null;

  const costsNote = monthly.available
    ? "今月の実績は OpenAI の日次集計のため、反映に最大 24 時間かかることがあります。"
    : "今月の実績は管理者キー未設定のため表示していません。";

  return {
    ...budget,
    spendAlert: buildSpendAlert(monthly.available ? monthly.monthlyUsd : null, sumMonthEstimatedUsd()),
    currentSessionEstimatedUsd,
    costsNote,
  };
}
