import { randomUUID } from "crypto";
import type { SessionUsageRecord, UsageTokenSnapshot } from "./types";
import { addUsageSnapshots, emptyUsageSnapshot } from "./normalize-usage";
import { isPricingConfigured } from "../../../config/pricing";
import { estimateUsdFromSnapshot } from "./estimate-cost";

const sessions = new Map<string, SessionUsageRecord>();

function utcDayStartMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isSameUtcDay(ts: number, ref: Date): boolean {
  return utcDayStartMs(new Date(ts)) === utcDayStartMs(ref);
}

export function createSessionRecord(params: {
  model: string;
  isMock?: boolean;
}): SessionUsageRecord {
  const sessionId = randomUUID();
  const record: SessionUsageRecord = {
    sessionId,
    patchToken: randomUUID(),
    model: params.model,
    startedAt: Date.now(),
    endedAt: null,
    estimatedUsd: isPricingConfigured(params.model)
      ? estimateUsdFromSnapshot(params.model, emptyUsageSnapshot())
      : null,
    usage: emptyUsageSnapshot(),
    isMock: params.isMock ?? false,
  };
  sessions.set(sessionId, record);
  return record;
}

export function getSessionRecord(sessionId: string): SessionUsageRecord | undefined {
  return sessions.get(sessionId);
}

export function updateSessionUsage(
  sessionId: string,
  patch: Partial<Pick<SessionUsageRecord, "usage" | "estimatedUsd" | "endedAt">>,
): SessionUsageRecord | undefined {
  const existing = sessions.get(sessionId);
  if (!existing) return undefined;
  const next: SessionUsageRecord = {
    ...existing,
    ...patch,
    usage: patch.usage ?? existing.usage,
    estimatedUsd: patch.estimatedUsd ?? existing.estimatedUsd,
  };
  sessions.set(sessionId, next);
  return next;
}

export function mergeSessionUsageDelta(
  sessionId: string,
  delta: UsageTokenSnapshot,
): SessionUsageRecord | undefined {
  const existing = sessions.get(sessionId);
  if (!existing) return undefined;
  const usage = addUsageSnapshots(existing.usage, delta);
  const estimatedUsd = estimateUsdFromSnapshot(existing.model, usage);
  return updateSessionUsage(sessionId, { usage, estimatedUsd });
}

export function endSession(sessionId: string): SessionUsageRecord | undefined {
  return updateSessionUsage(sessionId, { endedAt: Date.now() });
}

export function listSessions(): SessionUsageRecord[] {
  return [...sessions.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export function sumTodayEstimatedUsd(now = new Date()): number {
  let sum = 0;
  for (const s of sessions.values()) {
    if (isSameUtcDay(s.startedAt, now)) sum += s.estimatedUsd ?? 0;
  }
  return sum;
}

export function sumMonthEstimatedUsd(now = new Date()): number {
  const month = now.toISOString().slice(0, 7);
  let total = 0;
  for (const session of sessions.values()) {
    if (!session.isMock && new Date(session.startedAt).toISOString().slice(0, 7) === month) {
      total += session.estimatedUsd ?? 0;
    }
  }
  return total;
}

export function dailyTotalsLastDays(days: number, now = new Date()): { date: string; estimatedUsd: number }[] {
  const out: { date: string; estimatedUsd: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    let sum = 0;
    for (const s of sessions.values()) {
      if (new Date(s.startedAt).toISOString().slice(0, 10) === key) {
        sum += s.estimatedUsd ?? 0;
      }
    }
    out.push({ date: key, estimatedUsd: sum });
  }
  return out;
}

/** Test helper */
export function clearSessionUsageStoreForTests(): void {
  sessions.clear();
}
