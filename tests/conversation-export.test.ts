import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildConversationExport, describeConversation } from "@/lib/archive/conversation-export";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

const session: ArchivedSession = {
  id: "session-123",
  savedAt: "2026-10-26T09:00:00.000Z",
  prepare: { ...useMagazineFlowStore.getInitialState().prepare, guestName: "PRIVATE-NAME", place: "PRIVATE-PLACE" },
  slateAtMs: 100,
  draft: null,
  transcript: [
    { id: "question", speaker: "ai", text: "どんな時間ですか？", startedAt: 100, endedAt: 200 },
    { id: "answer", speaker: "guest", text: "散歩して切り替えます。", originalText: "PRIVATE-ORIGINAL", startedAt: 300, endedAt: 400 },
    { id: "excluded", speaker: "guest", text: "PRIVATE-EXCLUDED", excluded: true, startedAt: 500, endedAt: 600 },
    { id: "empty", speaker: "guest", text: "  ", startedAt: 700, endedAt: 800 },
  ],
};

describe("conversation summary and JSON downloads", () => {
  it("uses only non-excluded guest excerpts, never stale draft quotations", () => {
    const summary = describeConversation({ ...session, draft: { title: "PRIVATE-DRAFT" } as ArchivedSession["draft"] });
    expect(summary.title).toBe("散歩して切り替えます。");
    expect(summary.highlights).toEqual(["散歩して切り替えます。"]);
    expect(summary).toMatchObject({ statementCount: 2, guestStatementCount: 1, excludedStatementCount: 1 });
  });
  it("exports edited dialogue in original order with explicit millisecond times", () => {
    const file = buildConversationExport(session);
    expect(file.data.transcript).toEqual([
      { id: "question", speaker: "ai", text: "どんな時間ですか？", startedAtMs: 100, endedAtMs: 200 },
      { id: "answer", speaker: "guest", text: "散歩して切り替えます。", startedAtMs: 300, endedAtMs: 400 },
    ]);
    expect(file.data.timing).toEqual({ unit: "milliseconds", origin: "session-clock", slateAtMs: 100 });
    expect(file.data.summary.isAiGenerated).toBe(false);
  });
  it("does not serialize private metadata, corrections, consent, recordings or raw events", () => {
    const file = buildConversationExport({ ...session,
      releaseConsent: { privateValue: "PRIVATE-CONSENT" } as unknown as ArchivedSession["releaseConsent"],
      editingTimeline: [{ atMs: 1, type: "chat_update", data: "PRIVATE-EVENT" }],
      recordingBlob: new Blob(["PRIVATE-AUDIO"]),
    });
    expect(JSON.stringify(file)).not.toContain("PRIVATE-");
    expect(file.data.privacy.excludedStatementsIncluded).toBe(false);
    expect(file.data.privacy.note).toContain("個人情報は自動削除されません");
  });
  it("distinguishes sessions in filenames and strips unsafe filename characters", () => {
    const file = buildConversationExport({ ...session, id: "../unsafe/id", transcript: [{ ...session.transcript[1], text: 'Title: \\ / <test>\n?' }] });
    expect(file.filename).toMatch(/^interview-2026-10-26-unsafeid-/u);
    expect(file.filename).not.toMatch(/[<>:"/\\|?*\n]/u);
    expect(buildConversationExport(session).filename).not.toBe(buildConversationExport({ ...session, id: "session-456" }).filename);
  });
  it("handles empty legacy entries and English labels without inventing content", () => {
    const empty = buildConversationExport({ ...session, transcript: [] }, true);
    expect(empty.data.summary.title).toBe("Interview without guest statements");
    expect(empty.data.summary.highlights).toEqual([]);
    expect(empty.data.transcript).toEqual([]);
  });
  it("bounds highlights and leaves full statements intact in JSON", () => {
    const entries = Array.from({ length: 5 }, (_, index) => ({ ...session.transcript[1], id: String(index), text: `${index}${"あ".repeat(160)}` }));
    const file = buildConversationExport({ ...session, transcript: entries });
    expect(file.data.summary.highlights).toHaveLength(3);
    expect(file.data.summary.highlights[0]).toHaveLength(121);
    expect(file.data.transcript[0].text).toHaveLength(161);
  });
  it("places direct downloads on history list and detail, not participant flow", () => {
    for (const file of ["src/app/live/archive/page.tsx", "src/components/live/archive-session-detail.tsx"]) {
      expect(readFileSync(file, "utf8")).toContain("<ConversationJsonDownload");
    }
    for (const file of ["phase-prepare", "phase-conversation", "phase-results"]) {
      expect(readFileSync(`src/components/magazine-flow/${file}.tsx`, "utf8")).not.toContain("ConversationJsonDownload");
    }
  });
});
