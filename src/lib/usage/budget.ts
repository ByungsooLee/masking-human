import { isPricingConfigured } from "../../../config/pricing";
import { getRealtimeModel } from "@/lib/realtime/config";
import type { BudgetStatus } from "./types";

export function getMonthlyBudgetUsd(): number | null {
  const raw = process.env.MONTHLY_BUDGET_USD?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeBudgetStatus(params: {
  monthlyUsd: number | null;
  monthlyAvailable: boolean;
  todayEstimatedUsd: number;
  model?: string;
}): BudgetStatus {
  const budgetUsd = getMonthlyBudgetUsd();
  const monthly = params.monthlyAvailable ? (params.monthlyUsd ?? 0) : 0;
  const spent = monthly + params.todayEstimatedUsd;

  let remainingUsd: number | null = null;
  let warning80 = false;
  let blocked100 = false;

  if (budgetUsd !== null) {
    remainingUsd = budgetUsd - spent;
    const ratio = spent / budgetUsd;
    warning80 = ratio >= 0.8 && ratio < 1;
    blocked100 = ratio >= 1;
  }

  const model = params.model ?? getRealtimeModel();

  return {
    budgetUsd,
    monthlyUsd: params.monthlyUsd,
    monthlyAvailable: params.monthlyAvailable,
    todayEstimatedUsd: params.todayEstimatedUsd,
    remainingUsd,
    warning80,
    blocked100,
    pricingConfigured: isPricingConfigured(model),
  };
}
