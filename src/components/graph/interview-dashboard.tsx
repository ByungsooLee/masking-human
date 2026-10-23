"use client";

import { useMemo, useState } from "react";
import { analyzeInterview } from "@/lib/graph/interview-analytics";
import type { Utterance } from "@/lib/realtime/types";

export function InterviewDashboard({ utterances, language }: { utterances: Utterance[]; language: "ja" | "en" }) {
  const data = useMemo(() => analyzeInterview(utterances), [utterances]);
  const [selection, setSelection] = useState<{ label: string; ids: string[] } | null>(null);
  const ja = language === "ja";
  const total = data.guestMs + data.aiMs;
  const ratio = total > 0 ? Math.round(data.guestMs / total * 100) : 0;
  const max = Math.max(1, ...data.timeLenses.map((lens) => lens.utteranceIds.length));

  return <section className="interview-dashboard" aria-label={ja ? "会話の観測" : "Conversation observations"}>
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[length:var(--text-lead)]">{ja ? "ことばの輪郭" : "The shape of a conversation"}</h2>
      <span>{data.guestTurns} {ja ? "発言" : "guest turns"}</span>
    </div>
    <p className="text-[color:var(--color-ink-muted)]">{ja ? "ゲストの発言に現れた語。大きさは実際の出現回数。" : "Guest words, sized by actual occurrences."}</p>
    <div className="flex min-h-28 flex-wrap items-center justify-center gap-x-5 gap-y-2 py-5">
      {data.words.map((item) => <button key={item.word} type="button" onClick={() => setSelection({ label: item.word, ids: item.utteranceIds })}
        aria-label={`${item.word}: ${item.count}`} aria-pressed={selection?.label === item.word}
        className="text-[color:var(--color-rose)]" style={{ fontSize: `${18 + 28 * Math.sqrt(item.count / Math.max(1, data.words[0]?.count ?? 1))}px` }}>
        {item.word}<sup className="ml-1 text-sm">{item.count}</sup>
      </button>)}
      {!data.words.length && <p>{ja ? "話し始めると、ことばが集まります。" : "Words will gather as the guest speaks."}</p>}
    </div>
    <div className="grid gap-3">
      {data.timeLenses.map((lens) => <button type="button" key={lens.id} className="grid grid-cols-[3em_1fr_2em] items-center gap-3 text-left"
        onClick={() => setSelection({ label: ja ? lens.ja : lens.en, ids: lens.utteranceIds })}>
        <span>{ja ? lens.ja : lens.en}</span>
        <span className="h-3 rounded-full bg-[color:var(--color-thread)]"><span className="block h-full rounded-full bg-[color:var(--color-rose)]" style={{ width: `${lens.utteranceIds.length / max * 100}%` }} /></span>
        <span>{lens.utteranceIds.length}</span>
      </button>)}
    </div>
    <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">{ja ? "時間を示す表現がある発言の数。一つの発言は複数に入ります。" : "Turns containing time expressions; categories can overlap."}</p>
    <details className="mt-5">
      <summary>{ja ? "選択・成長・つながりの手がかり" : "Clues about choice, growth & connection"}</summary>
      <p className="my-3 text-sm text-[color:var(--color-ink-muted)]">{ja ? "自己決定理論の3つの観点を、発言を探すレンズとして使用。棒は関連する表現があった発言数で、欲求の強さ・充足度を測るものではありません。" : "Three lenses inspired by self-determination theory. Bars count turns with related expressions, not need strength or satisfaction."}</p>
      {data.motivationLenses.map((lens) => <button type="button" key={lens.id} onClick={() => setSelection({ label: ja ? lens.ja : lens.en, ids: lens.utteranceIds })} className="my-3 grid w-full grid-cols-[10em_1fr_2em] items-center gap-3 text-left">
        <span>{ja ? lens.ja : lens.en}</span>
        <span className="h-3 rounded-full bg-[color:var(--color-thread)]"><span className="block h-full rounded-full bg-[color:var(--color-rose)]" style={{ width: `${lens.utteranceIds.length / Math.max(1, data.guestTurns) * 100}%` }} /></span>
        <span>{lens.utteranceIds.length}</span>
      </button>)}
      <a className="text-sm underline" href="https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf" target="_blank" rel="noreferrer">Ryan & Deci, 2000</a>
    </details>
    <div className="my-5 flex flex-wrap gap-2">
      {data.feelings.map((item) => <button key={item.label} type="button" className="ui-btn-sub" onClick={() => setSelection({ label: item.label, ids: item.utteranceIds })}>{item.label} {item.utteranceIds.length}</button>)}
    </div>
    <p>{ja ? "ゲストの発話時間" : "Guest speaking time"}: {ratio}%</p>
    <div className="my-2 h-2 overflow-hidden rounded-full bg-[color:var(--color-thread)]" role="meter" aria-label={ja ? "ゲストの発話時間の割合" : "Guest speaking time ratio"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={ratio}>
      <div className="h-full bg-[color:var(--color-rose)]" style={{ width: `${ratio}%` }} />
    </div>
    <p className="text-sm text-[color:var(--color-ink-muted)]">{ja ? "感情は辞書に一致した表現の観測です。否定・皮肉・文脈を判定せず、性格や心理状態の診断は行いません。発話時間は暫定の字幕時刻から算出。" : "Emotion expressions are dictionary matches, without negation or context analysis. These are observations, not psychological diagnoses. Speaking time uses provisional transcript timings."}</p>
    {selection && <div className="mt-4 max-h-48 overflow-auto rounded-xl bg-[color:var(--color-milk)] p-4" aria-live="polite">
      <div className="flex justify-between gap-4"><h3>{selection.label}</h3><button type="button" onClick={() => setSelection(null)}>{ja ? "閉じる" : "Close"}</button></div>
      {utterances.filter((row) => selection.ids.includes(row.id)).map((row) => <blockquote key={row.id} className="mt-3"><span className="mr-3 text-sm">{Math.floor(row.startedAt / 60000)}:{String(Math.floor(row.startedAt / 1000) % 60).padStart(2, "0")}</span>{row.text}</blockquote>)}
    </div>}
  </section>;
}
