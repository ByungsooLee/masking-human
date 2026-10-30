import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";
import { INTERVIEW_OPENING } from "@/lib/realtime/interview-opening";

describe("interviewer session instructions", () => {
  it.each(["default", "reflective"] as const)("opens %s with the project purpose before one product question, in the selected language", (agentId) => {
    for (const interviewLanguage of ["ja", "en"] as const) {
      const { instructions } = buildRealtimeClientSecretSession({ agentId, interviewLanguage });
      const opening = INTERVIEW_OPENING[interviewLanguage];
      expect(instructions).toContain(opening);
      expect(opening.match(/[?？]/gu)).toHaveLength(1);
      expect(opening.indexOf(interviewLanguage === "ja" ? "企画です" : "get to know you")).toBeLessThan(opening.indexOf(interviewLanguage === "ja" ? "まず、" : "What’s one"));
      expect(instructions).toContain("first turn only");
      expect(instructions).toContain("Do not repeat the introduction later");
      expect(instructions).not.toContain("最初の一声は挨拶と");
      expect(instructions).toContain("冒頭だけ短い3文");
    }
  });
  it.each(["default", "reflective"] as const)("moves %s from the cosmetic opening into the guest's own life story", (agentId) => {
    const { instructions } = buildRealtimeClientSecretSession({ agentId });
    expect(instructions).toContain("コスメは入口、主役はその人の人生");
    expect(instructions).toContain("入口の商品・使い心地の質問は1〜2問を目安");
    expect(instructions).toContain("コスメに戻す必要はない");
    expect(instructions).toContain("商品説明へ戻ることを既定にしない");
    expect(instructions).toContain("最後のまとめは、本人が語った生き方や大切にしていることを軸");
    expect(instructions).toContain("家族・仕事・成功体験を必須の着地点にしない");
    expect(instructions).not.toContain("答えが短いときは具体的な使い方へ戻る");
  });
  it.each(["default", "reflective"] as const)("keeps %s consistent with the single-question protocol and goal-back checklist", (agentId) => {
    const { instructions } = buildRealtimeClientSecretSession({ agentId });
    expect(instructions).toContain("1回につき質問は1つだけ");
    expect(instructions).toContain("一度に扱う焦点も1つだけ");
    expect(instructions).toContain("未確認／本人が語った／話したくない");
    expect(instructions).toContain("7つの質問アプローチ");
    expect(instructions).toContain("家族の話を必須にしない");
    expect(instructions).toContain("今ある情報でまとめ、不足を推測で補わない");
    expect(instructions).not.toContain("3回に1回は質問しない");
    expect(instructions).not.toContain("毎回質問せず");
    expect(instructions).not.toContain("共通の5ステップ");
  });
  it("includes the cosmetics interview and guest-owned keyword before summarizing", () => {
    const { instructions } = buildRealtimeClientSecretSession({ agentId: "default" });
    expect(instructions).toContain("会話の4フェーズ");
    expect(instructions).toContain("ひとことで言うと");
    expect(instructions).toContain("5W1H");
    expect(instructions).toContain("1ブランチ1キーワード");
    expect(instructions).toContain("YES/NOや二択で終わる質問は避け");
  });
  it("combines the full interview arc with the selected listening style", () => {
    const session = buildRealtimeClientSecretSession({ agentId: "reflective", interviewLanguage: "en" });
    expect(session.instructions).toContain("6〜8問");
    expect(session.instructions).toContain("10分を上限");
    expect(session.instructions).toContain("最初の一声");
    expect(session.instructions).toContain("落ち着いた間");
    expect(session.instructions).toContain("Conduct the interview in English");
  });
  it("makes the selected generation and voice reach the Realtime session", () => {
    const senior = buildRealtimeClientSecretSession({ interviewerProfile: { age: "senior", gender: "man" } });
    const young = buildRealtimeClientSecretSession({ interviewerProfile: { age: "young", gender: "woman" } });
    expect(senior.instructions).toContain("年配の聞き手");
    expect(young.instructions).toContain("若い成人の聞き手");
    expect(senior.audio.output.voice).toBe("cedar");
    expect(young.audio.output.voice).toBe("marin");
    expect(senior.instructions).toContain("性別から性格や関心を決めつけない");
  });
});
