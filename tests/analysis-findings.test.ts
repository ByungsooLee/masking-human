import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildAnalysisFindings } from "@/lib/graph/analysis-findings";
import { AnalysisFindings } from "@/components/graph/analysis-findings";
import { PhaseMagazine } from "@/components/magazine-flow/phase-magazine";
import type { Utterance } from "@/lib/realtime/types";

const guest = (id: string, text: string): Utterance => ({ id, text, speaker: "guest", startedAt: 100, endedAt: 200 });

describe("plain-language analysis findings", () => {
  it("explains three findings with original guest evidence, not psychological scores", () => {
    const rows = [guest("value", "家族との時間が一番大切。"), guest("reason", "乳液を塗ることで安心感がある。"), guest("future", "これから娘と同じ乳液を使いたい。")];
    const findings = buildAnalysisFindings(rows);
    expect(findings).toHaveLength(3);
    expect(findings.every((finding) => finding.available)).toBe(true);
    expect(findings[0].finding).toContain("家族との時間");
    expect(findings[1].finding).toContain("安心感");
    for (const finding of findings) for (const row of finding.evidence) expect(rows).toContain(row);
    expect(findings.map((finding) => finding.finding).join(" ")).not.toContain("安定度");
  });
  it("shows unconfirmed findings without inventing values or advice", () => {
    const findings = buildAnalysisFindings([guest("one", "乳液を使う。")]);
    expect(findings.every((finding) => !finding.available)).toBe(true);
    expect(findings[0].finding).toContain("まだ確認できていません");
    expect(findings[2].finding).toContain("今すぐ決める必要はありません");
  });
  it("does not use excluded, AI or host statements as evidence", () => {
    const findings = buildAnalysisFindings([{ ...guest("one", "家族が大切。"), excluded: true }, { ...guest("ai", "自由が大切。"), speaker: "ai" }, { ...guest("host", "挑戦したい。"), speaker: "host" }]);
    expect(findings.every((finding) => !finding.available)).toBe(true);
  });
  it("invalidates review keys when the underlying transcript changes", () => {
    const first = buildAnalysisFindings([guest("one", "家族との時間が大切。")]);
    const edited = buildAnalysisFindings([guest("one", "自由が大切。")]);
    expect(first[0].reviewKey).not.toBe(edited[0].reviewKey);
  });
  it("provides understandable review choices and evidence controls", () => {
    const html = renderToStaticMarkup(createElement(AnalysisFindings, { utterances: [guest("one", "家族との時間が大切。")], language: "ja" }));
    expect(html).toContain("根拠になった発言を読む");
    expect(html).toContain("合っている");
    expect(html).toContain("少し違う");
    expect(html).toContain("まだ分からない");
    expect(html).toContain("分析結果と確認メモを保存");
  });
  it("keeps English UI English and preserves source statements", () => {
    const html = renderToStaticMarkup(createElement(AnalysisFindings, { utterances: [guest("one", "I value freedom.")], language: "en" }));
    expect(html).not.toMatch(/[ぁ-んァ-ヶ一-龯]/u);
    expect(html).toContain("I value freedom.");
    expect(html).toContain("Not quite");
  });
  it("shows findings even without enough dialogue to build a magazine draft", () => {
    const html = renderToStaticMarkup(createElement(PhaseMagazine));
    expect(html).toContain("ステップ2 / 3");
    expect(html).toContain("情報が少ないことは、あなたの弱点ではありません");
    expect(html).toContain("最終分析を見る");
    expect(html).not.toContain("SNS投稿用");
    expect(html).not.toContain("抜粋は相手が話した言葉の範囲で選んでください");
  });
});
