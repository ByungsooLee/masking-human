import { afterEach, describe, expect, it, vi } from "vitest";
import { computeBudgetStatus } from "@/lib/usage/budget";

describe("computeBudgetStatus", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("warns at 80% of budget", () => {
    vi.stubEnv("MONTHLY_BUDGET_USD", "10");
    const s = computeBudgetStatus({
      monthlyUsd: 5,
      monthlyAvailable: true,
      todayEstimatedUsd: 3.1,
    });
    expect(s.warning80).toBe(true);
    expect(s.blocked100).toBe(false);
    expect(s.remainingUsd).toBeCloseTo(1.9);
  });

  it("blocks at 100%", () => {
    vi.stubEnv("MONTHLY_BUDGET_USD", "10");
    const s = computeBudgetStatus({
      monthlyUsd: 8,
      monthlyAvailable: true,
      todayEstimatedUsd: 2.5,
    });
    expect(s.blocked100).toBe(true);
  });
});
