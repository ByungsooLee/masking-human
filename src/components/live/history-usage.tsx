"use client";

import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildUsageExport } from "@/lib/usage/response-ledger";
import { downloadText } from "@/lib/magazine-flow/export-png";
import { ArchivePipelineUsage } from "@/components/usage/archive-pipeline-usage";

export function HistoryUsage({ session, en }: { session: ArchivedSession; en: boolean }) {
  const ledger = session.usageLedger;
  if (ledger?.pipeline) return <ArchivePipelineUsage key={session.id} session={session} en={en} />;
  const responses = ledger?.entries.filter((entry) => entry.kind === "response") ?? [];
  const transcriptions = ledger?.entries.filter((entry) => entry.kind === "transcription") ?? [];
  const knownTotal = responses.reduce((total, entry) => total + (entry.estimatedUsd ?? 0), 0);
  const unknown = responses.filter((entry) => entry.estimatedUsd === null).length;
  const usd = (value: number | null) => value === null ? "—" : `$${value.toFixed(5)}`;
  return <details className="mb-6 border-y border-[color:var(--color-thread)] py-4">
    <summary className="min-h-12 cursor-pointer">{en ? "API usage per response (operator)" : "返答ごとのAPI利用量（運営者用）"}</summary>
    {!ledger ? <p className="py-4">{en ? "No usage was recorded for this entry. Old sessions and demos cannot be reconstructed." : "この履歴には利用量の記録がありません。旧履歴・デモからの復元はできません。"}</p> : <div className="space-y-4 py-4">
      <p>{ledger.model} · {en ? "Observed response subtotal: " : "観測できた返答分の推定小計："}{usd(knownTotal)} · {responses.length}{en ? " responses" : "応答"}{unknown > 0 && ` / ${en ? "unpriced" : "料金不明"}: ${unknown}`}</p>
      <p>{en ? "Not an invoice or a complete bill. Excludes input-transcription costs and missing events. Includes interrupted responses and speech later excluded from analysis. Cached tokens are included in input totals, not additional tokens." : "請求確定額・総請求額ではありません。入力文字起こし料金や未受信イベント分は含みません。途中で止めた応答や後から除外した発言の処理分も含みます。キャッシュは入力総数の内数です。"}</p>
      {ledger.prompt && <p className="break-all">{en ? "Initial prompt revision / characters (not tokens): " : "開始時の指示版／文字数（トークン数ではありません）："}{ledger.prompt.revision} / {ledger.prompt.characters}<br />SHA-256: {ledger.prompt.sha256}<br />{en ? "The closing-time notice may be appended later." : "締めの時間連絡は会話中に別途追加されます。"}</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="pb-3 text-left">{en ? "Each generated response; time is approximate elapsed recording time. In / out = tokens received / generated. No conversation text is stored here." : "生成された応答ごとの内訳。時刻は録音開始からの推定経過時間、入／出は入力／出力トークンです。会話本文は含みません。"}</caption><thead><tr>{(en ? ["# / time", "Text in / out", "Audio in / out", "Cached text / audio", "Reasoning", "Estimate"] : ["応答／秒", "テキスト 入／出", "音声 入／出", "キャッシュ 文字／音声", "推論", "推定料金"]).map((heading) => <th key={heading} className="border-b p-3">{heading}</th>)}</tr></thead><tbody>{responses.map((entry, index) => <tr key={entry.id}>
        <th scope="row" className="border-b p-3 font-normal"><details><summary>{index + 1} / {(entry.atMs / 1000).toFixed(1)}s</summary><p className="break-all">{entry.id}<br />{entry.status ?? "—"}<br />{entry.outputItemIds.join(", ")}</p></details></th>
        <td className="border-b p-3">{entry.tokens ? `${entry.tokens.inputTextTokens + entry.tokens.cachedInputTextTokens} / ${entry.tokens.outputTextTokens}` : "—"}</td>
        <td className="border-b p-3">{entry.tokens ? `${entry.tokens.inputAudioTokens + entry.tokens.cachedInputAudioTokens} / ${entry.tokens.outputAudioTokens}` : "—"}</td>
        <td className="border-b p-3">{entry.tokens ? `${entry.tokens.cachedInputTextTokens} / ${entry.tokens.cachedInputAudioTokens}` : "—"}</td>
        <td className="border-b p-3">{entry.tokens?.reasoningOutputTokens ?? "—"}</td><td className="border-b p-3"><details><summary>{usd(entry.estimatedUsd)}</summary>{entry.costBreakdown && <dl>{Object.entries(entry.costBreakdown).map(([key, amount]) => <div key={key}><dt>{({ textInput: en ? "Text input" : "文字入力", audioInput: en ? "Audio input" : "音声入力", cachedTextInput: en ? "Cached text" : "文字キャッシュ", cachedAudioInput: en ? "Cached audio" : "音声キャッシュ", textOutput: en ? "Text output" : "文字出力", reasoningOutput: en ? "Reasoning" : "推論", audioOutput: en ? "Audio output" : "音声出力" } as Record<string, string>)[key]}</dt><dd>{usd(amount)}</dd></div>)}</dl>}</details></td>
      </tr>)}</tbody></table></div>
      <p>{en ? "Observed transcription events (not priced): " : "文字起こしの観測イベント（料金未集計）："}{transcriptions.length}</p>
      <p>{en ? "Local repetition guidance sent: " : "ローカル反復検知による注意送信："}{ledger.dialogueGuidance?.length ?? 0}{en ? ". Heuristic only; its short context can add input tokens to later responses. It does not regenerate speech." : "回。簡易ルールによる補助です。注意文は後続応答の入力トークンを少量増やす場合があります。音声の再生成はしません。"}</p>
      <button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadText(`usage-${session.id}.json`, JSON.stringify(buildUsageExport(session.id, ledger), null, 2), "application/json")}>{en ? "Download usage JSON" : "利用量JSONを保存"}</button>
    </div>}
  </details>;
}
