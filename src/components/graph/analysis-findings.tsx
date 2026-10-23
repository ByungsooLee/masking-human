"use client";

import { useMemo, useState } from "react";
import type { Utterance } from "@/lib/realtime/types";
import { buildAnalysisFindings } from "@/lib/graph/analysis-findings";
import { downloadText } from "@/lib/magazine-flow/export-png";

type Props = { utterances: readonly (Utterance & { excluded?: boolean })[]; language: "ja" | "en"; onSeek?: (time: number, id: string) => void; feedback?: Record<string, string>; onFeedback?: (key: string, answer: string) => void; allowDownload?: boolean };

export function AnalysisFindings({ utterances, language, onSeek, feedback, onFeedback, allowDownload = true }: Props) {
  const en = language === "en";
  const findings = useMemo(() => buildAnalysisFindings(utterances, language), [utterances, language]);
  const [localAnswers, setAnswers] = useState<Record<string, string>>({});
  const answers = feedback ?? localAnswers;
  const options = en ? ["Fits", "Not quite", "Not sure yet"] : ["合っている", "少し違う", "まだ分からない"];
  const saveNotes = () => {
    const lines = [en ? "Review of your conversation findings" : "会話から見えてきたこと・確認メモ", new Date().toISOString()];
    for (const finding of findings) {
      lines.push("", finding.title, finding.finding, finding.question);
      for (const row of finding.evidence) lines.push(`「${row.text}」`);
      lines.push(`${en ? "Your review" : "自分の確認"}: ${answers[finding.reviewKey] === undefined ? (en ? "Not reviewed" : "未回答") : options[Number(answers[finding.reviewKey])]}`);
    }
    downloadText("analysis-review.txt", lines.join("\n"), "text/plain;charset=utf-8");
  };
  return <section className="analysis-findings" aria-label={en ? "Understand and review your findings" : "分析結果を理解して確認する"}>
    <h2>{en ? "What your conversation tells us" : "会話から見えてきたこと"}</h2>
    <p>{en ? "Read each finding, check your own words, and decide whether it fits. There are no right answers. These are tentative summaries, not personality or ability assessments." : "結果を読み、根拠になった自分の言葉を見て、しっくりくるか確認してください。正解を選ぶ必要はありません。性格や能力の診断ではなく、会話を整理した仮の結果です。"}</p>
    <ol>{findings.map((finding, index) => <li key={finding.reviewKey}>
      <h3>{index + 1}. {finding.title}</h3><p className="finding-result">{finding.finding}</p>
      {finding.available ? <details><summary>{en ? "Read the words behind this finding" : "根拠になった発言を読む"}</summary>{finding.evidence.map((row) => <blockquote key={row.id}><p>“{row.text}”</p>{onSeek && <button type="button" className="ui-btn-sub" onClick={() => onSeek(row.startedAt, row.id)}>{en ? "Listen to this statement" : "この発言を聞く"}</button>}</blockquote>)}</details> : <p className="finding-note">{en ? "Not enough evidence yet. Missing information is not a weakness." : "判断できる発言が不足しています。情報が少ないことは、あなたの弱点ではありません。"}</p>}
      <p>{finding.question}</p>
      {finding.available && <fieldset><legend>{en ? "How does this feel to you?" : "あなたの感覚ではどうですか？"}</legend><div className="flex flex-wrap gap-2">{options.map((option, optionIndex) => <button key={option} type="button" className="ui-btn-sub" aria-pressed={answers[finding.reviewKey] === String(optionIndex)} onClick={() => onFeedback ? onFeedback(finding.reviewKey, String(optionIndex)) : setAnswers((current) => ({ ...current, [finding.reviewKey]: String(optionIndex) }))}>{option}</button>)}</div></fieldset>}
    </li>)}</ol>
    <p>{en ? "If something feels inaccurate, go back and correct or exclude the transcript. Detailed charts are optional; their numbers are not grades." : "違和感があれば、戻って文字起こしを直したり、使わない発言を除外してください。下の図や数値は補足資料で、点数の高低が良し悪しを示すものではありません。"}</p>
    {allowDownload && <><button type="button" className="ui-btn-sub" onClick={saveNotes}>{en ? "Save findings and review notes" : "分析結果と確認メモを保存"}</button><p className="finding-note">{en ? "Review notes remain on this screen only unless saved to history. The file includes your statements." : "履歴へ保存するまでは確認メモはこの画面内だけに残ります。保存ファイルには発言が含まれます。"}</p></>}
  </section>;
}
