import { describe, expect, it, vi } from "vitest";
import cases from "../eval/interviewer-story-cases.json";
import { reviewConversation } from "@/lib/archive/editorial-review";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";

describe("episodic interview instruction contracts, not generated dialogue quality", () => {
  it("keeps the compact prompt focused on varied guest-led directions rather than mandatory episodes", () => {
    expect(Array.from(readFileSync("prompts/interviewer.md", "utf8")).length).toBeLessThan(3000);
    const { instructions } = buildRealtimeClientSecretSession();
    for (const rule of ["出来事なら展開、人が出たらその関わり、選択なら迷いや判断", "順番に消化する台本ではない", "意見・好み・普通の暮らしを聞いてよい", "習慣・ケアへ回収しない"]) expect(instructions).toContain(rule);
    expect(instructions).toContain("その日は、どんな話をしたんですか？");
  });
  it.each(["default", "reflective"] as const)("delivers story invitations and exit criteria to %s in both UI languages", (agentId) => {
    for (const interviewLanguage of ["ja", "en"] as const) {
      const { instructions } = buildRealtimeClientSecretSession({ agentId, interviewLanguage });
      for (const rule of [
        "エピソードを語れる問い",
        "一つの出来事を自由に語れる問い",
        "その焦点はその時点で終了",
        "短答2回を待つ必要はない",
        "何が起きたか → 本人がどうしたか → その後どうなったか → 今どう捉えるか",
        "聞き取りや指示対象の確認は例外",
        "文字起こしの不確かな語から場面や行動を確定しない",
        "短い答え・話題変更・終了も尊重",
      ]) expect(instructions).toContain(rule);
      expect(instructions).not.toContain("普段の一日の中で、ほっとできるのはどんな時間ですか？");
      expect(instructions).toContain("1回につき質問は1つだけ");
      expect(instructions).toContain("不足を推測で補わない");
    }
  });

  it("keeps a bilingual synthetic manual-review pack without claiming model evaluation", () => {
    expect(cases.provenance).toContain("not participant transcripts or generated model results");
    expect(cases.cases).toHaveLength(5);
    expect(new Set(cases.cases.map((scenario) => scenario.id)).size).toBe(5);
    for (const scenario of cases.cases) {
      expect(scenario.preferred).not.toBe(scenario.avoid);
      expect(scenario.manualCheck.length).toBeGreaterThan(30);
    }
  });

  it("does not mistake zero text markers for good storytelling", () => {
    const review = reviewConversation([{
      id: "synthetic-question", speaker: "ai", excluded: false,
      text: "毎日の習慣の中で、いちばん最初にすることは何ですか？",
      startedAt: 0, endedAt: 1000,
    }]);
    expect(review.turnsToReview).toEqual([]);
    expect(review).not.toHaveProperty("qualityScore");
  });
});
