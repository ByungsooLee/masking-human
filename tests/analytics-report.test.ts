import { describe, expect, it } from "vitest";
import { buildAnalyticsReport } from "@/lib/graph/analytics-report";
import type { Utterance } from "@/lib/realtime/types";

const guest = (id: string, text: string): Utterance => ({ id, text, speaker: "guest", startedAt: 0, endedAt: 100 });

describe("evidence-based analytics", () => {
  it("calculates transparent mention coverage rather than psychological scores", () => {
    const report = buildAnalyticsReport([guest("one", "母と一緒に乳液を使う。安心します。"), guest("two", "質感が大切。"), { ...guest("ai", "安心"), speaker: "ai" }, { ...guest("excluded", "安心"), excluded: true }]);
    expect(report.kpis.guestTurnCount).toBe(2);
    expect(report.axes[1]).toMatchObject({ coverage: 50, evidenceIds: ["one"], psychologicalScore: null });
    expect(report.axes[2].coverage).toBe(50);
    expect(report.kpis.identityStability.score).toBeNull();
    expect(report.metadata.extractionLlmCalls).toBe(0);
    expect(report.metadata.sessionPromptSnapshot).toBeNull();
  });
  it("does not invent relatives, transmission or emotional drivers", () => {
    const report = buildAnalyticsReport([guest("one", "リップの色が好き。")]);
    expect(report.flow[0].nodes).toEqual([]);
    expect(report.flow[2].nodes).toEqual([]);
    expect(report.kpis.emotionalDrivers).toEqual([]);
    expect(report.kpis.coreValueTags).toEqual([]);
    expect(report.map.storyLines).toHaveLength(3);
  });
  it("keeps missing data null and records only supplied analysis timestamps", () => {
    const report = buildAnalyticsReport([]);
    expect(report.axes.every((axis) => axis.coverage === null)).toBe(true);
    expect(report.metadata.analyzedAt).toBeNull();
    expect(buildAnalyticsReport([], "2026-10-21T10:00:00Z").metadata.analyzedAt).toBe("2026-10-21T10:00:00Z");
  });
  it("uses explicit reasons and original phrases for emotional driver candidates", () => {
    const report = buildAnalyticsReport([guest("one", "乳液を塗ることで安心感があります。")]);
    expect(report.kpis.emotionalDrivers[0]).toMatchObject({ sourceLabel: "乳液", targetLabel: "安心感", evidenceIds: ["one"] });
  });
  it("normalizes nonempty node composition to exactly 100 and reports the displayed-node denominator", () => {
    const report = buildAnalyticsReport([guest("one", "肌の乾燥。昔、母の記憶。今は乳液。家族との時間が一番大切。")]);
    expect(report.density.reduce((sum, category) => sum + (category.percentage ?? 0), 0)).toBe(100);
    expect(report.density.reduce((sum, category) => sum + category.count, 0)).toBe(report.map.nodes.length);
    expect(buildAnalyticsReport([]).density.every((category) => category.percentage === null)).toBe(true);
  });
  it("shows pursuit, security, overlaps and unclassified turns without treating missing evidence as zero motivation", () => {
    const report = buildAnalyticsReport([guest("one", "憧れと安心がある。"), guest("two", "ワクワクする。"), guest("three", "乳液を使う。")]);
    expect(report.motives.map((motive) => motive.percentage)).toEqual([67, 33]);
    expect(report.motiveCoverage).toEqual({ classifiedTurnCount: 2, bothTurnCount: 1, unclassifiedTurnCount: 1 });
    expect(buildAnalyticsReport([guest("one", "乳液を使う。")]).motives.every((motive) => motive.percentage === null)).toBe(true);
    expect(buildAnalyticsReport([guest("one", "安心を求めているわけではない。")]).motives.every((motive) => motive.percentage === null)).toBe(true);
  });
  it("uses the requested five themes as evidence coverage, not personality scores", () => {
    const report = buildAnalyticsReport([guest("one", "伝統を受け継ぎたい。安心して、自分らしく表現し、新しい挑戦をしたい。母と一緒です。")]);
    expect(report.axes.map((axis) => axis.requestedTrait)).toEqual(["伝統・継承度", "安心・安定度", "他者共感度", "自己表現度", "変革・挑戦度"]);
    expect(report.axes.every((axis) => axis.coverage === 100 && axis.psychologicalScore === null)).toBe(true);
    expect(report.topicProfile.caution).toContain("客観的な能力を示しません");
    expect(buildAnalyticsReport([]).topicProfile.label).toBe("データ不足");
  });
});
