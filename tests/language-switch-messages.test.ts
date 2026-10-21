import { describe, expect, it } from "vitest";
import { startInterview, submitParticipantMessage } from "@/lib/interview/engine";
import { MockInterviewProvider } from "@/lib/interview/providers/mock-provider";
import { defaultLanguageSettings } from "@/lib/interview/languages";
import { getEngineMessages } from "@/lib/interview/engine-messages";

const provider = new MockInterviewProvider();

describe("messages after language switch", () => {
  it("returns Korean engine messages and questions after ja→ko switch", async () => {
    let session = (
      await startInterview("A", provider, undefined, defaultLanguageSettings("ja"))
    ).session;
    session = (
      await submitParticipantMessage(session, "", "change_language", provider, undefined, {
        interviewLanguage: "ko",
        publishingLanguage: "ko",
      })
    ).session;
    expect(session.language.interviewLanguage).toBe("ko");
    expect(getEngineMessages("ko").languageChanged).toMatch(/언어/);

    const r = await submitParticipantMessage(
      session,
      "메이크업은 거의 하지 않아요.",
      "none",
      provider,
    );
    expect(r.assistantText).toMatch(/고마|나답|피부|외mo|외모/i);
    expect(r.assistantText).toMatch(/[\uAC00-\uD7AF]/);
  });

  it("ends early in selected language after switch to zh-CN", async () => {
    let session = (
      await startInterview("B", provider, undefined, defaultLanguageSettings("en"))
    ).session;
    session = (
      await submitParticipantMessage(session, "", "change_language", provider, undefined, {
        interviewLanguage: "zh-CN",
      })
    ).session;
    const r = await submitParticipantMessage(session, "", "end", provider);
    expect(r.assistantText).toBe(getEngineMessages("zh-CN").endedEarly);
  });

  it("provider retry message uses interview language", async () => {
    let session = (
      await startInterview("C", provider, undefined, defaultLanguageSettings("ja"))
    ).session;
    session.id = "force-api-failure";
    const r = await submitParticipantMessage(session, "テスト", "none", provider);
    expect(r.assistantText).toBe(getEngineMessages("ja").providerRetry);
  });
});
