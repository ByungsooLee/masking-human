"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildEditCsv, buildSessionJson, buildSrt, buildYoutubeDescription } from "@/lib/magazine-flow/export-transcript";
import { captureElementToPng, downloadDataUrl, downloadText } from "@/lib/magazine-flow/export-png";
import { EXPORT_PIXELS, type ExportAspect } from "@/lib/magazine-flow/types";
import { MagazineCarouselSlide } from "@/themes/magazine/magazine-carousel-slide";
import { MagazinePageView } from "@/themes/magazine/magazine-page-view";

function ExportFrame({ aspect, children }: { aspect: ExportAspect; children: React.ReactNode }) {
  return <div style={{ width: EXPORT_PIXELS[aspect].width }}>{children}</div>;
}

export function PhasePublish({ session, recordingUrl }: { session: ArchivedSession; recordingUrl: string | null }) {
  const ui = getMagazineFlowUi(session.prepare.language);
  const { prepare, transcript } = session;
  const [draft, setDraft] = useState(session.draft);
  const photoUrl = null;
  const sessionStartedAt = session.recordedAt ?? null;
  const recordingSlateAtMs = session.slateAtMs;
  const exportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeOrigin, setTimeOrigin] = useState<"recording" | "slate">("recording");
  const [offsetMs, setOffsetMs] = useState(0);
  const [lastImage, setLastImage] = useState<{ url: string; filename: string; width: number; height: number } | null>(null);
  const [exportAspect, setExportAspect] = useState<ExportAspect>("4:5");

  if (!draft) return null;

  const slateOffset = (timeOrigin === "slate" ? recordingSlateAtMs ?? 0 : 0) - offsetMs;
  const carouselQa = draft.qa.slice(0, 3);

  const capture = async (rootId: string, aspect: ExportAspect, filename: string) => {
    const root = exportRef.current?.querySelector(`#${rootId}`) as HTMLElement | null;
    if (!root) throw new Error(ui.exportFailed);
    const { width, height } = EXPORT_PIXELS[aspect];
    const url = await captureElementToPng(root, width, height);
    setLastImage({ url, filename, width, height });
    downloadDataUrl(filename, url);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch {
      setError(ui.exportFailed);
    } finally {
      setBusy(false);
    }
  };

  const downloadCarousel = () =>
    run(async () => {
      await capture("carousel-cover", "4:5", "instagram-1.png");
      for (let i = 0; i < carouselQa.length; i++) {
        await capture(`carousel-qa-${i}`, "4:5", `instagram-${i + 2}.png`);
      }
      await capture("carousel-story", "9:16", "instagram-story.png");
    });

  const downloadThumb = () => run(() => capture("export-16x9", "16:9", "youtube-thumbnail.png"));

  const downloadAudio = () => {
    const extension = session.recordingBlob?.type.includes("mp4") ? "mp4" : "webm";
    if (recordingUrl) downloadDataUrl(`interview-${session.id}.${extension}`, recordingUrl);
  };


  return (
    <div className="mx-auto w-full max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)] text-[length:var(--text-body)]">
      <h1 className="ui-heading mb-6">{prepare.language === "ja" ? "素材の保存・SNS書き出し" : "Media downloads & social exports"}</h1>
      <p className="mb-6">{prepare.language === "ja" ? "録音には除外した発言も残っています。公開前に音声・映像を編集し、本人の許可を確認してください。この操作では投稿しません。" : "Recordings still include excluded speech. Edit audio/video and confirm permission before sharing. These controls do not publish anything."}</p>
      <div className="mb-6 flex flex-wrap gap-4">
        <label>{prepare.language === "ja" ? "画像比率" : "Image ratio"}<select className="ui-field ml-2" value={exportAspect} onChange={(event) => setExportAspect(event.target.value as ExportAspect)}><option>4:5</option><option>9:16</option><option>16:9</option></select></label>
        <label>{prepare.language === "ja" ? "誌面の構成" : "Layout"}<select className="ui-field ml-2" value={draft.layout ?? "auto"} onChange={(event) => setDraft({ ...draft, layout: event.target.value === "auto" ? undefined : event.target.value as NonNullable<typeof draft.layout> })}><option value="auto">{prepare.language === "ja" ? "自動" : "Automatic"}</option><option value="quote-led">Statement</option><option value="dialogue">Conversation</option><option value="spread">Spread</option></select></label>
      </div>

      <section className="ui-panel mb-6">
        <h2 className="mb-1 text-[color:var(--color-rose)]">{ui.exportEditBundle}</h2>
        <p className="mb-4 text-[color:var(--color-ink-muted)]">{ui.exportEditHint}</p>
        <div className="mb-4 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">{prepare.language === "ja" ? "字幕の時間基準" : "Subtitle time origin"}
            <select className="ui-field" value={timeOrigin} onChange={(event) => setTimeOrigin(event.target.value as "recording" | "slate")}>
              <option value="recording">{prepare.language === "ja" ? "保存音声の先頭" : "Recording start"}</option>
              <option value="slate">{prepare.language === "ja" ? "同期音の開始（外部カメラ）" : "Sync beep onset (external camera)"}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">{prepare.language === "ja" ? "字幕をずらす（ミリ秒、＋で遅く）" : "Subtitle shift (ms, + delays)"}
            <input className="ui-field" type="number" step="100" value={offsetMs} onChange={(event) => setOffsetMs(Number(event.target.value) || 0)} />
          </label>
        </div>
        <p className="mb-4 text-[color:var(--color-ink-muted)]">{prepare.language === "ja" ? "字幕は発話区間からの推定です。保存音声と照合して調整してください。JSONの時刻は常に収録開始基準です。" : "Subtitle timing is estimated from speech intervals. Review against the recording. JSON always uses recording start."}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadAudio} disabled={!recordingUrl} className="ui-btn">
            {ui.downloadAudio}
          </button>
          <button
            type="button"
            className="ui-btn-sub"
            onClick={() => downloadText("interview-edit.csv", buildEditCsv(transcript, slateOffset), "text/csv;charset=utf-8")}
          >{prepare.language === "ja" ? "編集用CSV" : "Edit CSV"}</button>
          <button
            type="button"
            onClick={() => downloadText("interview.srt", buildSrt(transcript, prepare.language, { relativeToMs: slateOffset }), "text/plain")}
            className="ui-btn-sub"
          >
            {ui.downloadSrt}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                "interview-session.json",
                buildSessionJson({ prepare, transcript, draft, photoUrl, sessionStartedAt, slateAtMs: recordingSlateAtMs }),
              )
            }
            className="ui-btn-sub"
          >
            {ui.downloadJson}
          </button>
        </div>
      </section>

      <section className="ui-panel mb-6">
        <button type="button" disabled={busy} className="ui-btn mb-4" onClick={() => void run(() => capture("export-magazine", exportAspect, "interview-magazine.png"))}>
          {prepare.language === "ja" ? "選んだ誌面を保存" : "Save selected magazine"}
        </button>
        <h2 className="mb-1 text-[color:var(--color-rose)]">{ui.exportInstagram}</h2>
        <p className="mb-4 text-[color:var(--color-ink-muted)]">{ui.carouselHint(carouselQa.length + 1)}</p>
        <button type="button" disabled={busy} onClick={() => void downloadCarousel()} className="ui-btn">
          {ui.downloadCarousel}
        </button>
      </section>

      <section className="ui-panel mb-8">
        <h2 className="mb-4 text-[color:var(--color-rose)]">{ui.exportYoutube}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void downloadThumb()} className="ui-btn">
            {ui.downloadYoutubeThumb}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText("youtube-description.txt", buildYoutubeDescription({ draft, transcript, slateAtMs: recordingSlateAtMs }), "text/plain")
            }
            className="ui-btn-sub"
          >
            {ui.downloadYoutubeText}
          </button>
        </div>
      </section>

      {error && <p className="mt-4 text-[color:var(--color-rose)]">{error}</p>}
      {lastImage && <section className="mt-6 max-w-md">
        <a href={lastImage.url} download={lastImage.filename} className="ui-btn-sub">{prepare.language === "ja" ? "生成したPNGを保存" : "Save generated PNG"}</a>
        <Image className="mt-4 h-auto w-full" src={lastImage.url} alt={lastImage.filename} width={lastImage.width} height={lastImage.height} unoptimized />
      </section>}

      <div ref={exportRef} className="pointer-events-none fixed left-[-99999px] top-0 flex flex-col" aria-hidden>
        <ExportFrame aspect={exportAspect}>
          <MagazinePageView exportRootId="export-magazine" draft={draft} prepare={prepare} photoUrl={photoUrl} exportAspect={exportAspect} reveal={false} />
        </ExportFrame>
        <ExportFrame aspect="16:9">
          <MagazinePageView exportRootId="export-16x9" draft={draft} prepare={prepare} photoUrl={photoUrl} exportAspect="16:9" reveal={false} />
        </ExportFrame>
        <ExportFrame aspect="4:5">
          <MagazineCarouselSlide exportRootId="carousel-cover" draft={draft} prepare={prepare} exportAspect="4:5" mode="cover" />
        </ExportFrame>
        {carouselQa.map((qa, i) => (
          <ExportFrame key={qa.questionUtteranceId + i} aspect="4:5">
            <MagazineCarouselSlide
              exportRootId={`carousel-qa-${i}`}
              draft={draft}
              prepare={prepare}
              exportAspect="4:5"
              mode="qa"
              qa={qa}
              qaIndex={i}
            />
          </ExportFrame>
        ))}
        <ExportFrame aspect="9:16">
          <MagazineCarouselSlide exportRootId="carousel-story" draft={draft} prepare={prepare} exportAspect="9:16" mode="story" />
        </ExportFrame>
      </div>
    </div>
  );
}
