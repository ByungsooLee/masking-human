import { describe, expect, it } from "vitest";
import { buildMindMapText, buildSelfAnalysisMap } from "@/lib/graph/self-analysis-map";
import type { Utterance } from "@/lib/realtime/types";

function guest(id: string, text: string): Utterance {
  return { id, text, speaker: "guest", startedAt: 100, endedAt: 1000 };
}

describe("strict self analysis map", () => {
  it("organizes five axes using only exact guest phrases without cross-category duplicates", () => {
    const rows = [
      guest("trigger", "肌の乾燥がきっかけです。"),
      guest("memory", "中学生の頃、母の記憶があります。"),
      guest("present", "今は鏡の前で乳液を使う。安心感があります。"),
      guest("future", "これから娘と同じ乳液を使いたい。"),
      guest("value", "家族との時間が一番大切です。"),
    ];
    const map = buildSelfAnalysisMap(rows);
    expect(map.categories).toHaveLength(5);
    expect(map.categories.map((category) => category.id)).toEqual(["trigger", "experience", "present", "future", "value"]);
    expect(new Set(map.nodes.map((node) => node.label)).size).toBe(map.nodes.length);
    for (const node of map.nodes) {
      for (const id of node.evidenceIds) expect(rows.find((row) => row.id === id)?.text).toContain(node.label);
    }
    expect(map.nodes.some((node) => ["料理", "傾聴", "継承", "家族の絆"].includes(node.label))).toBe(false);
    expect(map.nodes.find((node) => node.id === map.coreNodeId)?.label).toBe("家族との時間");
    expect(buildMindMapText(map)).toContain("☁️【重要：コア軸】 家族との時間");
  });

  it("does not convert family members, listening, or English speech into invented words", () => {
    const map = buildSelfAnalysisMap([guest("one", "母が大切です。話を聞くことが好き。I value freedom.")]);
    expect(map.nodes.some((node) => ["家族", "傾聴", "自由"].includes(node.label))).toBe(false);
    expect(map.nodes.some((node) => node.label === "freedom")).toBe(true);
    expect(map.coreNodeId).toBeNull();
  });

  it("ignores AI, host and excluded statements rather than treating examples as guest facts", () => {
    const map = buildSelfAnalysisMap([
      { ...guest("ai", "料理が得意。家族の絆が一番大切。"), speaker: "ai" },
      { ...guest("host", "傾聴が得意。"), speaker: "host" },
      { ...guest("excluded", "自由が大切。"), excluded: true },
      guest("guest", "乳液を使う。"),
    ]);
    expect(map.guests.map((row) => row.id)).toEqual(["guest"]);
    expect(map.nodes.map((node) => node.label)).toEqual(["乳液"]);
    expect(map.relations).toEqual([]);
  });

  it("does not turn co-occurrence or a time sequence into a causal arrow", () => {
    const map = buildSelfAnalysisMap([guest("one", "昔、母と乳液を使った。今は安心感があります。家族との時間が大切。")]);
    expect(map.relations).toEqual([]);
    expect(map.storyLines).toHaveLength(3);
    expect(map.storyLines.every((line) => line.includes("未確認"))).toBe(true);
  });

  it("connects an explicit unambiguous reason in the correct direction with its quote", () => {
    const map = buildSelfAnalysisMap([guest("one", "肌の乾燥があるので乳液を使う。"), guest("two", "安心感があるのは母の記憶があるからです。")]);
    const pairs = map.relations.map((relation) => [map.nodes.find((node) => node.id === relation.source)?.label, map.nodes.find((node) => node.id === relation.target)?.label]);
    expect(pairs).toContainEqual(["肌の乾燥", "乳液"]);
    expect(pairs).toContainEqual(["母の記憶", "安心感"]);
    expect(map.relations[0]).toMatchObject({ evidenceIds: ["one"], quote: "肌の乾燥があるので乳液を使う" });
    expect(buildMindMapText(map)).toContain("[因果：肌の乾燥 ➔ 乳液]");
  });

  it("abstains from negated or ambiguous causal statements and negated values", () => {
    const map = buildSelfAnalysisMap([guest("one", "母の記憶があるので安心感があるわけではない。自由は大切じゃない。肌の乾燥があるので化粧水と乳液を使う。")]);
    expect(map.relations).toEqual([]);
    expect(map.nodes.some((node) => node.important)).toBe(false);
  });

  it("retains all evidence when a term is repeated in different contexts", () => {
    const map = buildSelfAnalysisMap([guest("one", "昔、乳液を使った。"), guest("two", "今は乳液を使う。"), guest("three", "乳液を毎日使う。")]);
    expect(map.nodes.filter((node) => node.label === "乳液")).toHaveLength(1);
    expect(map.nodes.find((node) => node.label === "乳液")).toMatchObject({ category: "present", evidenceIds: ["one", "two", "three"] });
    const tree = buildMindMapText(map);
    expect(tree).toContain("【コスメから紐解く自分の軸】");
    expect(tree).toContain("ストーリーの繋がり（3行要約）");
    expect(tree).toContain("最も重要なコア軸：未確認");
  });
});
