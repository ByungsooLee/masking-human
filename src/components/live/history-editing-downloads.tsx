"use client";

import { useMemo, useRef, useState } from "react";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildEditingFiles, convertAudioToWav, downloadBlob } from "@/lib/recording/editing-files";
import { buildEditingZip } from "@/lib/recording/editing-zip";
import { SelfAnalysisMap } from "@/components/graph/self-analysis-map";

export function HistoryEditingDownloads({ session, en }: { session: ArchivedSession; en: boolean }) {
  const files = useMemo(() => buildEditingFiles(session), [session]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (task: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await task(); }
    catch { setError(en ? "Could not export. Large files may exceed device memory, or audio decoding may be unsupported. Download original files individually." : "書き出せませんでした。大きなファイルによるメモリ不足や、音声形式が非対応の可能性があります。原素材を個別に保存してください。"); }
    finally { setBusy(false); }
  };
  const zip = async () => {
    const bundle = [...files];
    const svg = mapRef.current?.querySelector("svg");
    if (svg) {
      const copy = svg.cloneNode(true) as SVGSVGElement;
      copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const originals = [svg, ...svg.querySelectorAll("*")];
      const clones = [copy, ...copy.querySelectorAll("*")];
      originals.forEach((element, index) => {
        const style = getComputedStyle(element);
        for (const property of ["fill", "stroke", "font-family", "font-size", "font-weight"]) (clones[index] as SVGElement).style.setProperty(property, style.getPropertyValue(property));
        (clones[index] as SVGElement).style.animation = "none";
      });
      bundle.push({ name: "map-final.svg", blob: new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }) });
    }
    downloadBlob(`editing-${session.id}.zip`, await buildEditingZip(bundle));
  };
  return <section className="mb-10 space-y-5 border-y py-6">
    <h2 className="ui-heading">{en ? "Private editing materials" : "自分用・動画編集素材"}</h2>
    <p className="leading-loose">{en ? "Download again at any time while this history remains in this browser. This is not cloud backup: browser data deletion, storage eviction or device loss removes access. Keep a ZIP backup. Nothing is uploaded or published by these buttons." : "このブラウザに履歴が残っている間は、何度でも保存できます。クラウド保管ではありません。ブラウザデータの削除・保存領域の整理・端末紛失に備え、ZIPをバックアップしてください。この操作ではアップロード・投稿しません。"}</p>
    <p className="leading-loose">{en ? "Private originals include excluded speech and observed map / chat content. Remove it from all audio and visuals before publication. Signed consent PDFs and contact information are excluded from this bundle." : "原素材には除外した発言・会話中のマップやチャットも含まれます。公開前に音声・映像の両方を編集してください。同意PDF・署名・連絡先はこの一括素材に含めません。"}</p>
    <p>{en ? "Includes original mix / available separate tracks, SRT, edit CSV, edited transcript, final map, raw event timeline and per-update map data. Animated MP4 chat/map clips and external camera video are not generated here." : "原音声・保存済みの分離音声、SRT字幕、編集CSV、編集後の会話、最終マップ、元の表示イベント、更新ごとのマップデータを保存できます。チャット・マップのアニメーションMP4生成や外部カメラ動画の取り込みは未対応です。"}</p>
    {(!session.editingTimeline?.length || !session.audioStems) && <p>{en ? "Older entries / demos may lack separate tracks or live events. Missing data cannot be recreated from a final report." : "旧履歴・デモには分離音声や会話中の表示イベントがない場合があります。最終結果だけから過去のデータは復元できません。"}</p>}
    {Boolean(session.audioStems?.issues.length) && <p>{en ? "Separate-track capture notes: " : "分離録音の注意："}{session.audioStems?.issues.join(", ")}</p>}
    <button className="ui-btn min-h-12" type="button" disabled={busy} onClick={() => void run(zip)}>{busy ? (en ? "Preparing…" : "準備しています…") : (en ? "Download all editing materials (ZIP)" : "編集素材をまとめて保存（ZIP）")}</button>
    <p>{en ? "For a private replay, extract the entire ZIP and open replay.html in a compatible PC browser. It reconstructs chat / map changes alongside the original mix audio, with approximate animation." : "ZIPをすべて展開し、PCの対応ブラウザでreplay.htmlを開くと、元のミックス音声に合わせてチャットとマップの更新を確認できます。演出は簡易的な再現です。"}</p>
    <p>{en ? "Timing is estimated. Use the recorded sync sound / clap to align the external video and check drift. Separate audio recorders may have encoder delay. WAV conversion does not improve source quality." : "時刻は推定を含みます。外部動画とは同期音・拍手で位置を合わせ、終盤のズレも確認してください。分離音声にはエンコーダー遅延がある場合があります。WAV変換で元音質が改善するわけではありません。"}</p>
    <div className="space-y-3">{files.filter((file) => file.name.startsWith("audio/")).map((file) => <div key={file.name} className="flex flex-wrap items-center gap-3"><span>{file.name} ({(file.blob.size / 1024 / 1024).toFixed(1)} MB)</span><button className="ui-btn-sub min-h-12" type="button" disabled={busy} onClick={() => downloadBlob(`${session.id}-${file.name.split("/").at(-1)}`, file.blob)}>{en ? "Original" : "原形式で保存"}</button><button className="ui-btn-sub min-h-12" type="button" disabled={busy} onClick={() => void run(async () => downloadBlob(`${session.id}-${file.name.split("/").at(-1)}.wav`, await convertAudioToWav(file.blob)))}>{en ? "Convert to WAV" : "WAVに変換して保存"}</button></div>)}</div>
    <details><summary>{en ? "Individual text / data files" : "テキスト・データを個別に保存"}</summary><div className="flex flex-wrap gap-3 pt-4">{files.filter((file) => !file.name.startsWith("audio/")).map((file) => <button type="button" className="ui-btn-sub min-h-12" key={file.name} disabled={busy} onClick={() => downloadBlob(file.name.replaceAll("/", "-"), file.blob)}>{file.name}</button>)}</div></details>
    <details><summary>{en ? "Final map — SVG / text" : "最終マップ（SVG・テキスト）"}</summary><div ref={mapRef}><SelfAnalysisMap utterances={session.transcript} guestName={session.prepare.guestName} language={session.prepare.language} showStory={false} /></div></details>
    {error && <p role="alert">{error}</p>}
  </section>;
}
