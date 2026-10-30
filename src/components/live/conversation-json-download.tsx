"use client";

import { useState } from "react";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildConversationExport, describeConversation } from "@/lib/archive/conversation-export";
import { downloadBlob } from "@/lib/recording/editing-files";

export function ConversationJsonDownload({ session, en = false }: { session: ArchivedSession; en?: boolean }) {
  const summary = describeConversation(session, en);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const download = () => {
    try {
      const file = buildConversationExport(session, en);
      downloadBlob(file.filename, new Blob([JSON.stringify(file.data, null, 2)], { type: "application/json;charset=utf-8" }));
      setFailed(false);
      setSaved(true);
    } catch {
      setFailed(true);
      setSaved(false);
    }
  };
  return <section className="space-y-3" aria-label={en ? "Conversation summary and JSON" : "会話の要約とJSON"}>
    <h3 className="text-[length:var(--text-lead)] leading-[var(--leading-body)] text-[color:var(--color-ink)] break-words">{summary.title}</h3>
    <p className="text-[color:var(--color-ink-muted)] break-words">
      {en ? "Saved" : "保存日時"}: {session.savedAt.replace("T", " ").replace(/\.\d+Z$/u, " UTC")}<br />
      {en ? "Conversation ID" : "会話ID"}: {session.id}<br />
      {en ? `${summary.statementCount} statements / ${summary.guestStatementCount} guest / ${summary.excludedStatementCount} excluded` : `発言 ${summary.statementCount}件 ／ 本人 ${summary.guestStatementCount}件 ／ 除外 ${summary.excludedStatementCount}件`}
    </p>
    <p className="text-[color:var(--color-ink-muted)]">{en ? "At a glance — guest excerpts, not an AI-generated summary" : "内容の要約 — 本人の発言を抜粋（AI生成ではありません）"}</p>
    {summary.highlights.length ? <ul className="space-y-2 leading-loose break-words">
      {summary.highlights.map((text, index) => <li key={index}>「{text}」</li>)}
    </ul> : <p>{en ? "No guest statements available to summarize." : "要約できる本人の発言がありません。"}</p>}
    <p className="text-[color:var(--color-ink-muted)] leading-loose">{en ? "Includes AI questions and edited answers in order. Excluded speech, original corrections, signatures and audio are omitted. Check spoken personal details before sharing." : "AIの質問と修正後の回答を順番に保存します。除外発言・修正前の文・署名・音声は含みません。発言中の個人情報は共有前に確認してください。"}</p>
    <button type="button" className="ui-btn-sub min-h-12" aria-label={`${en ? "Download conversation JSON" : "会話JSONをダウンロード"}: ${summary.title} (${session.id})`} onClick={download}>
      {en ? "Download conversation JSON" : "会話JSONをダウンロード"}
    </button>
    {failed ? <p role="alert">{en ? "Download failed. Please try again." : "ダウンロードできませんでした。もう一度お試しください。"}</p> : saved && <p role="status">{en ? "Download requested. Check your browser downloads." : "保存を開始しました。ブラウザのダウンロードを確認してください。"}</p>}
  </section>;
}
