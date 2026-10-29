"use client";

import { useMemo } from "react";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildEditorialReviewExport, CLIP_SIGNALS } from "@/lib/archive/editorial-review";
import { downloadBlob } from "@/lib/recording/editing-files";

const checks = {
  no_question_marker: { ja: "質問の目印なし（締め・相づち等も手動確認）", en: "No question marker — manually check closings/acknowledgments" },
  multiple_question_marks: { ja: "疑問符が複数（一焦点か確認）", en: "Multiple question marks — check for one focus" },
  interpretation_phrase: { ja: "解釈の表現（本人の発言に根拠があるか確認）", en: "Interpretive phrase — check guest evidence" },
  repeated_reply: { ja: "同じ返答の繰り返し", en: "Exact repeated reply" },
};

export function HistoryEditorialReview({ session, en }: { session: ArchivedSession; en: boolean }) {
  const data = useMemo(() => buildEditorialReviewExport(session.id, session.transcript), [session.id, session.transcript]);
  const time = (value: number | null) => value === null ? (en ? "No timing" : "時刻なし") : `${Math.floor(value / 60000)}:${String(Math.floor(value / 1000) % 60).padStart(2, "0")}`;
  return <section className="mb-10 space-y-4 border-y border-[color:var(--color-thread)] py-6" aria-label={en ? "Private editorial review" : "運営者用・会話の振り返りと切り抜き候補"}>
    <h2 className="ui-heading">{en ? "Conversation review & clip ideas" : "会話の振り返り・切り抜き候補"}</h2>
    <p>{en ? "Local text matches only: not AI scoring or a prediction of virality. No additional API calls. Up to five guest statements appear in conversation order when words about change, choices or scenes match. Empty results do not mean a poor conversation." : "単語の一致によるローカル整理です。AI採点やバズの予測ではなく、追加API料金はかかりません。変化・選択・場面を表す語に一致した本人発言を、会話順に最大5件表示します。候補がなくても会話が悪いという意味ではありません。"}</p>
    <p className="text-[color:var(--color-ink-muted)]">{en ? "Review full context, negations, privacy and signed scope before editing. These intervals are approximate, do not cut media and do not prove publication permission. A loud reaction is not automatically a highlight." : "前後関係・否定・個人情報・署名時の範囲を確認してください。時刻は目安で、素材を自動カットせず、公開許可も判定しません。強い反応があるだけで見どころとは扱いません。"}</p>
    {data.candidates.length ? <ol className="space-y-5">{data.candidates.map((candidate) => <li key={candidate.id} className="space-y-2 border-t border-[color:var(--color-thread)] pt-4">
      <p>{time(candidate.startMs)} - {time(candidate.endMs)} ／ {candidate.signals.map((signal) => { const item = CLIP_SIGNALS.find((item) => item.id === signal)!; return en ? item.en : item.ja; }).join(" / ")}</p>
      <blockquote className="whitespace-pre-wrap break-words leading-loose">{candidate.quote}</blockquote>
      <details><summary>{en ? "Read surrounding statements" : "前後の会話を確認"}</summary><ol className="space-y-3 py-3">{candidate.context.map((row) => <li key={row.id} className="whitespace-pre-wrap break-words">{row.speaker === "guest" ? (en ? "Guest" : "本人") : row.speaker === "ai" ? "AI" : (en ? "Host" : "運営者")}: {row.text}</li>)}</ol></details>
      {candidate.contextMayBeIncomplete && <p>{en ? "Context is partial; check the original media privately." : "前後の情報が一部ありません。原素材を非公開で確認してください。"}</p>}
    </li>)}</ol> : <p>{en ? "No automatic candidates. Review the transcript manually; no story or highlight is invented." : "自動候補はありません。会話ログから手動で探してください。物語や見どころを創作して埋めることはしません。"}</p>}
    <button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadBlob(`editorial-review-${session.id}.json`, new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }))}>{en ? "Save review and clip ideas JSON" : "振り返り・切り抜き候補JSONを保存"}</button>
    <details><summary>{en ? "Review AI questions (text markers only)" : "AIの質問を振り返る（テキストの目印のみ）"}</summary>
      <p className="py-3">{en ? `AI: ${data.review.aiTurnCount} / Guest: ${data.review.guestTurnCount}. Markers can be wrong; they do not assess responsiveness, truth, delivery or actual interruption.` : `AI ${data.review.aiTurnCount}発言 ／ 本人 ${data.review.guestTurnCount}発言。目印には誤検出・見逃しがあります。文脈理解・真偽・声色・実際の割り込みは判定しません。`}</p>
      <ul className="space-y-3">{data.review.turnsToReview.map((turn) => <li key={turn.id}><p>{turn.checks.map((check) => { const item = checks[check as keyof typeof checks]; return en ? item.en : item.ja; }).join(" / ")}</p><p className="whitespace-pre-wrap leading-loose">{turn.text}</p></li>)}</ul>
      {!data.review.turnsToReview.length && <p>{en ? "No text markers found. This does not certify conversation quality." : "該当する目印はありません。会話品質の合格を意味するものではありません。"}</p>}
      <h3 className="mt-5">{en ? "Review responses after dissatisfaction or correction" : "不満・訂正の後の応答を確認"}</h3>
      {data.review.recoveryToReview.map((pair) => <div key={pair.guest.id} className="space-y-2 py-3"><p>{en ? "Guest" : "本人"}: {pair.guest.text}</p><p>AI: {pair.nextAi?.text ?? (en ? "No adjacent response available" : "直後の応答がありません")}</p></div>)}
    </details>
    <details><summary>{en ? "After posting: compare separately from interview quality" : "投稿後の比較ポイント（会話品質とは分けて確認）"}</summary><p className="py-3 leading-loose">{en ? "Record platform, post date, duration, opening style and equal observation periods. Compare chose-to-watch, average watch time, completion, shares and saves where available. Keep original meaning and consent. No platform connection or automatic metric collection is performed here." : "媒体・投稿日・尺・冒頭の構成・同じ観測期間を記録し、取得できる視聴選択率・平均視聴時間・視聴率・シェア・保存を比較してください。原意と同意を守り、再生数だけで会話の良し悪しを決めません。媒体への接続や実績の自動取得は行いません。"}</p></details>
  </section>;
}
