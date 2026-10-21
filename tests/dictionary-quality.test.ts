import { describe, expect, it } from "vitest";
import { getFallbackQuestion } from "@/lib/interview/fallback-questions";
import { MOCK_RESPONSES } from "@/lib/interview/mock-responses";
import { getUiDictionary } from "@/lib/i18n";
import type { InterviewLanguage } from "@/lib/interview/languages";

function hasHangul(s: string): boolean {
  return /[\uAC00-\uD7AF]/.test(s);
}
function hasJapaneseScript(s: string): boolean {
  return /[\u3040-\u30FF\u4E00-\u9FFF]/.test(s);
}
function hasCjk(s: string): boolean {
  return /[\u4E00-\u9FFF]/.test(s);
}

describe("locale dictionary quality", () => {
  it("ja/ko/zh-CN fallbacks avoid English boilerplate", () => {
    for (const lang of ["ja", "ko", "zh-CN"] as InterviewLanguage[]) {
      const q = getFallbackQuestion("observation", lang);
      expect(q).not.toMatch(/^Could you walk/i);
      expect(q).not.toMatch(/\bwhat matters to you\b/i);
    }
  });

  it("korean copy uses Hangul", () => {
    const ko = MOCK_RESPONSES.ko;
    expect(hasHangul(ko.changeTopic)).toBe(true);
    expect(hasHangul(getFallbackQuestion("closing", "ko"))).toBe(true);
  });

  it("japanese copy uses Japanese scripts", () => {
    expect(hasJapaneseScript(MOCK_RESPONSES.ja.noMakeupFollowUp)).toBe(true);
    expect(hasJapaneseScript(getUiDictionary("ja").beginInterview)).toBe(true);
  });

  it("chinese copy uses CJK without stray English sentences", () => {
    const zh = MOCK_RESPONSES["zh-CN"];
    expect(hasCjk(zh.appearanceWorry)).toBe(true);
    expect(zh.changeTopic).not.toMatch(/\bwhat part of your\b/i);
  });
});
