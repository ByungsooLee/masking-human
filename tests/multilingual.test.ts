import { describe, expect, it } from "vitest";
import {
  startInterview,
  submitParticipantMessage,
  applyLanguageChange,
} from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";
import { defaultLanguageSettings, parseInterviewLanguage } from "@/lib/interview/languages";
import { getFallbackQuestion } from "@/lib/interview/fallback-questions";
import { validateQuestionText } from "@/lib/interview/safety";

const provider = new MockInterviewProvider();

describe("multilingual interviews", () => {
  it("starts in English", async () => {
    const r = await startInterview("A", provider, undefined, defaultLanguageSettings("en"));
    expect(r.session.language.interviewLanguage).toBe("en");
    expect(r.assistantText).toMatch(/beauty|skincare|typical day/i);
  });

  it("starts in Japanese", async () => {
    const r = await startInterview("A", provider, undefined, defaultLanguageSettings("ja"));
    expect(r.assistantText).toMatch(/美容|スキンケア/);
  });

  it("starts in Korean", async () => {
    const r = await startInterview("B", provider, undefined, defaultLanguageSettings("ko"));
    expect(r.assistantText).toMatch(/뷰티|스킨케어/);
  });

  it("starts in Chinese", async () => {
    const r = await startInterview("C", provider, undefined, defaultLanguageSettings("zh-CN"));
    expect(r.assistantText).toMatch(/美容|护肤/);
  });

  it("switches ja → en without resetting stage or question count", async () => {
    let session = (
      await startInterview("A", provider, undefined, defaultLanguageSettings("ja"))
    ).session;
    session = (
      await submitParticipantMessage(
        session,
        "毎朝 SPF だけは塗っています。",
        "none",
        provider,
      )
    ).session;
    const stage = session.currentStage;
    const count = session.totalQuestionsAsked;
    const r = await submitParticipantMessage(session, "", "change_language", provider, undefined, {
      interviewLanguage: "en",
      publishingLanguage: "en",
    });
    expect(r.session.language.interviewLanguage).toBe("en");
    expect(r.session.currentStage).toBe(stage);
    expect(r.session.totalQuestionsAsked).toBe(count);
    expect(r.assistantText).toMatch(/Language updated|次の質問/i);
  });

  it("switches ko → en mid-session", async () => {
    const session = (
      await startInterview("D", provider, undefined, defaultLanguageSettings("ko"))
    ).session;
    const r = await submitParticipantMessage(session, "", "change_language", provider, undefined, {
      interviewLanguage: "en",
    });
    expect(r.session.language.interviewLanguage).toBe("en");
  });

  it("handles code-switching in answers", async () => {
    const session = (
      await startInterview("A", provider, undefined, defaultLanguageSettings("ja"))
    ).session;
    const r = await submitParticipantMessage(
      session,
      "化粧は almost never ですが、SPF は毎日。",
      "none",
      provider,
    );
    expect(r.session.turns.some((t) => t.role === "user" && t.text.includes("SPF"))).toBe(true);
  });

  it("returns language-specific fallback questions", () => {
    expect(getFallbackQuestion("observation", "ja")).toMatch(/美容/);
    expect(getFallbackQuestion("closing", "ko")).toMatch(/한 문장/);
  });

  it("detects leading language in Japanese", () => {
    const r = validateQuestionText("つまりあなたは自信がないに違いないですね？", "ja");
    expect(r.ok).toBe(false);
  });

  it("detects diagnostic language in Korean", () => {
    const r = validateQuestionText("당신은 불안장애가 있는 것 같아요", "ko");
    expect(r.ok).toBe(false);
  });

  it("rejects unsupported language codes", async () => {
    expect(parseInterviewLanguage("es")).toBeNull();
    expect(parseInterviewLanguage("fr")).toBeNull();
    const session = (
      await startInterview("A", provider, undefined, defaultLanguageSettings("en"))
    ).session;
    const bad = applyLanguageChange(session, {
      interviewLanguage: "es" as unknown as import("@/lib/interview/languages").InterviewLanguage,
    });
    expect(bad.ok).toBe(false);
  });
});
