import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildUsageExport } from "@/lib/usage/response-ledger";

function excerpt(text: string, limit: number) {
  const characters = Array.from(text.trim().replace(/\s+/gu, " "));
  return characters.length > limit ? `${characters.slice(0, limit).join("")}…` : characters.join("");
}

export function describeConversation(session: ArchivedSession, en = false) {
  const transcript = session.transcript.filter((entry) => !entry.excluded && entry.text.trim());
  const answers = transcript.filter((entry) => entry.speaker === "guest");
  const positions = [0, Math.floor(answers.length / 2), answers.length - 1];
  const highlights = [...new Set(positions.filter((position) => position >= 0)
    .map((position) => answers[position]?.text.trim()).filter((text): text is string => Boolean(text)))];
  return {
    title: answers[0] ? excerpt(answers[0].text, 44) : (en ? "Interview without guest statements" : "本人の発言がない会話"),
    highlights: highlights.map((text) => excerpt(text, 120)),
    statementCount: transcript.length,
    guestStatementCount: answers.length,
    excludedStatementCount: session.transcript.filter((entry) => entry.excluded).length,
  };
}

export function buildConversationExport(session: ArchivedSession, en = false) {
  const summary = describeConversation(session, en);
  const transcript = session.transcript.filter((entry) => !entry.excluded && entry.text.trim())
    .map((entry) => ({ id: entry.id, speaker: entry.speaker, text: entry.text, startedAtMs: entry.startedAt, endedAtMs: entry.endedAt }));
  const safeId = session.id.replace(/[^a-zA-Z0-9_-]/gu, "").slice(0, 36) || "session";
  const date = session.savedAt.match(/^\d{4}-\d{2}-\d{2}/u)?.[0] ?? "undated";
  const safeTitle = Array.from(summary.title).filter((character) => character.codePointAt(0)! >= 32)
    .join("").replace(/[<>:"/\\|?*]/gu, "").replace(/\s+/gu, "-").slice(0, 40);
  return {
    filename: `interview-${date}-${safeId}-${safeTitle || "conversation"}.json`,
    data: {
      schemaVersion: 1,
      kind: "interview-conversation",
      sessionId: session.id,
      savedAt: session.savedAt,
      language: session.prepare.language,
      summary: { ...summary, method: "guest-excerpts", isAiGenerated: false },
      timing: { unit: "milliseconds", origin: "session-clock", slateAtMs: session.slateAtMs },
      privacy: {
        excludedStatementsIncluded: false,
        originalTextIncluded: false,
        consentRecordsIncluded: false,
        mediaIncluded: false,
        note: en
          ? "Edited text only. Spoken personal details are not automatically removed. Review before sharing. Not publication permission or a full backup."
          : "修正後の会話テキストのみ。発言中の個人情報は自動削除されません。共有前に確認してください。公開許可や完全なバックアップではありません。",
      },
      transcript,
      usage: buildUsageExport(session.id, session.usageLedger),
    },
  };
}
