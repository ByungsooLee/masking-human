import type { ResponseUsageLedger } from "@/lib/usage/response-ledger";

export function TranscriptionGapNotice({ gaps, en }: { gaps: ResponseUsageLedger["transcriptionGaps"]; en: boolean }) {
  if (!gaps?.length) return null;
  const time = (milliseconds: number) => `${Math.floor(Math.max(0, milliseconds) / 60000)}:${String(Math.floor(Math.max(0, milliseconds) / 1000) % 60).padStart(2, "0")}`;
  return <div role="alert" className="my-4 border-y border-[color:var(--color-rose)] py-4">
    <p>{en ? "Some audio was not transcribed. Check the recording before using the analysis; missing speech is not included. No automatic paid retry was made." : "文字起こしできなかった区間があります。分析に含まれないため、録音を確認してください。料金が発生する自動再送は行っていません。"}</p>
    <ul>{gaps.map((gap) => <li key={gap.id}>{time(gap.startedAt)} – {time(gap.endedAt)}</li>)}</ul>
  </div>;
}
