import { afterEach, describe, expect, it } from "vitest";
import { buildSpendAlert } from "@/lib/usage/spend-alert";
import { clearSessionUsageStoreForTests, createSessionRecord, sumMonthEstimatedUsd, updateSessionUsage } from "@/lib/usage/session-usage-store";

describe("one-dollar spend alert", () => {
  afterEach(() => clearSessionUsageStoreForTests());

  it("alerts strictly above one dollar", () => {
    expect(buildSpendAlert(0.99, 0).exceeded).toBe(false);
    expect(buildSpendAlert(1, 0).exceeded).toBe(false);
    expect(buildSpendAlert(1.001, 0).exceeded).toBe(true);
  });

  it("does not double count actual spend and overlapping estimates", () => {
    expect(buildSpendAlert(0.7, 0.6)).toMatchObject({ amountUsd: 0.7, exceeded: false, source: "actual" });
  });

  it("warns on the estimate before delayed billing catches up", () => {
    expect(buildSpendAlert(0.8, 1.2)).toMatchObject({ amountUsd: 1.2, exceeded: true, source: "estimate" });
    expect(buildSpendAlert(null, 1.2).note).toContain("再起動で記録が消えます");
  });

  it("only totals non-mock records in the current UTC month", () => {
    const now = new Date("2026-10-21T00:00:00Z");
    const previous = createSessionRecord({ model: "gpt-realtime-2.1" });
    previous.startedAt = Date.parse("2026-09-30T23:59:59Z");
    updateSessionUsage(previous.sessionId, { estimatedUsd: 9 });
    const real = createSessionRecord({ model: "gpt-realtime-2.1" });
    real.startedAt = Date.parse("2026-10-01T00:00:00Z");
    updateSessionUsage(real.sessionId, { estimatedUsd: 0.7 });
    const mock = createSessionRecord({ model: "gpt-realtime-2.1", isMock: true });
    mock.startedAt = now.getTime();
    updateSessionUsage(mock.sessionId, { estimatedUsd: 10 });
    expect(sumMonthEstimatedUsd(now)).toBeCloseTo(0.7);
  });
});
