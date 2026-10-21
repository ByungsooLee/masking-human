import { resolveLiveUiLocale, type LiveUiLocale } from "./live-ui";

export type UsageUiCopy = {
  pageTitle: string;
  sessionEstimate: string;
  monthActual: string;
  budgetRemaining: string;
  unavailable: string;
  pricingUnset: string;
  sessionsHeading: string;
  dailyHeading: string;
  budgetWarning: string;
  budgetBlocked: string;
};

const JA: UsageUiCopy = {
  pageTitle: "利用状況",
  sessionEstimate: "このセッション（推定）",
  monthActual: "今月の実績",
  budgetRemaining: "予算の残り",
  unavailable: "取得できません",
  pricingUnset: "単価未設定（推定費用は表示されません）。config/pricing.ts にモデルを追加してください。",
  sessionsHeading: "セッション",
  dailyHeading: "日ごとの推定",
  budgetWarning: "予算の 80% に達しました。",
  budgetBlocked: "予算に達したため、新しいインタビューは開始できません。",
};

const EN: UsageUiCopy = {
  pageTitle: "Usage",
  sessionEstimate: "This session (est.)",
  monthActual: "This month (actual)",
  budgetRemaining: "Budget left",
  unavailable: "Unavailable",
  pricingUnset: "Pricing unset — cost estimates are hidden. Add the model in config/pricing.ts.",
  sessionsHeading: "Sessions",
  dailyHeading: "Daily estimates",
  budgetWarning: "You have used 80% of your budget.",
  budgetBlocked: "Budget reached. New interviews cannot start.",
};

export function getUsageUiCopy(locale?: LiveUiLocale): UsageUiCopy {
  const loc = locale ?? resolveLiveUiLocale();
  return loc === "en" ? EN : JA;
}

export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toFixed(2)}`;
}

export function formatEstimatedUsd(
  estimatedUsd: number | null | undefined,
  pricingConfigured: boolean,
  locale?: LiveUiLocale,
): string {
  const copy = getUsageUiCopy(locale);
  if (!pricingConfigured) return copy.pricingUnset;
  return formatUsd(estimatedUsd);
}
