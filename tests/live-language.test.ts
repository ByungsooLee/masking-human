import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { translateInterfaceText } from "@/lib/i18n/interface-text";
import { buildAnalyticsReport } from "@/lib/graph/analytics-report";
import { buildMindMapText, buildSelfAnalysisMap } from "@/lib/graph/self-analysis-map";
import { buildRealtimeSessionConfig } from "@/lib/realtime/session-payload";
import { scheduleMockConversation } from "@/lib/realtime/mock-conversation";
import type { Utterance } from "@/lib/realtime/types";

vi.mock("server-only", () => ({}));
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";

afterEach(() => vi.useRealTimers());
const japanese = /[ぁ-んァ-ヶ一-龯]/u;

describe("live language selection", () => {
  it("fully translates the interface dictionary without browser-language dependence", () => {
    const ui = getMagazineFlowUi("en");
    for (const value of Object.values(ui)) {
      if (typeof value === "string") expect(value).not.toMatch(japanese);
    }
    expect(ui.playFrom("00:10")).toBe("Play from 00:10");
  });

  it("has English translations for every translated literal in the report, chrome and alerts", () => {
    for (const file of ["src/components/graph/analytics-magazine-report.tsx", "src/components/magazine-flow/flow-chrome.tsx", "src/components/usage/spend-alert-banner.tsx", "src/components/usage/usage-dashboard.tsx", "src/themes/magazine/layouts/magazine-layout-body.tsx"]) {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          expect(translateInterfaceText(node.arguments[0].text, "en"), `${file}: ${node.arguments[0].text}`).not.toMatch(japanese);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  });

  it("uses English for the entire scripted demo", () => {
    vi.useFakeTimers();
    let transcript: Utterance[] = [];
    const cancel = scheduleMockConversation({ onPhase: () => undefined, onUtterances: (rows) => { transcript = rows; } }, [], 0, "en");
    vi.runAllTimers();
    expect(transcript.filter((row) => row.speaker === "guest")).toHaveLength(18);
    expect(transcript.every((row) => !japanese.test(row.text))).toBe(true);
    cancel();
  });

  it("localizes analysis labels and text export without translating guest evidence", () => {
    const rows: Utterance[] = [{ id: "guest", speaker: "guest", text: "I value freedom and calm.", startedAt: 0, endedAt: 100 }];
    const report = buildAnalyticsReport(rows, null, "en");
    expect(report.axes.every((axis) => !japanese.test(axis.label + axis.description))).toBe(true);
    expect(report.density.every((category) => !japanese.test(category.label))).toBe(true);
    expect(report.topicProfile.nextQuestion).not.toMatch(japanese);
    expect(report.map.storyLines.join(" ")).not.toMatch(japanese);
    expect(buildMindMapText(buildSelfAnalysisMap(rows), "Self", "en")).not.toMatch(japanese);
    expect(report.map.guests[0].text).toBe(rows[0].text);
  });

  it("enables opening-language matching only for English mode on server and client", () => {
    const english = buildRealtimeClientSecretSession({ interviewLanguage: "en" });
    const japaneseSession = buildRealtimeClientSecretSession({ interviewLanguage: "ja" });
    expect(english.instructions).toContain("first substantive utterance");
    expect(english.instructions).toContain("Korean or Chinese");
    expect(english.instructions).toContain("not a greeting, name, accent");
    expect(english.audio.input.transcription).not.toHaveProperty("languages");
    expect(buildRealtimeSessionConfig("en").audio.input.transcription).not.toHaveProperty("languages");
    expect(japaneseSession.instructions).toContain("Do not automatically switch languages");
    expect(japaneseSession.audio.input.transcription.languages).toEqual(["ja"]);
    expect(buildRealtimeSessionConfig("ja").audio.input.transcription.languages).toEqual(["ja"]);
  });
});
