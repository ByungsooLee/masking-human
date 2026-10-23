export const SPEND_ALERT_THRESHOLD_USD = 1;

export function buildSpendAlert(monthlyActualUsd: number | null, monthlyEstimatedUsd: number, now = new Date()) {
  const actual = monthlyActualUsd !== null && Number.isFinite(monthlyActualUsd) && monthlyActualUsd >= 0
    ? monthlyActualUsd : null;
  const estimate = Number.isFinite(monthlyEstimatedUsd) ? Math.max(0, monthlyEstimatedUsd) : 0;
  const source = actual !== null && actual >= estimate ? "actual" as const : "estimate" as const;
  const amountUsd = Math.max(actual ?? 0, estimate);
  return {
    thresholdUsd: SPEND_ALERT_THRESHOLD_USD,
    amountUsd,
    exceeded: amountUsd > SPEND_ALERT_THRESHOLD_USD,
    source,
    month: now.toISOString().slice(0, 7),
    note: source === "actual"
      ? "OpenAIの組織全体の今月実績です。反映には遅れがあります。"
      : "このサーバー起動後に記録した今月のRealtime会話の推定です。文字起こし・雑誌生成などは含まず、再起動で記録が消えます。",
  };
}

export type SpendAlert = ReturnType<typeof buildSpendAlert>;
