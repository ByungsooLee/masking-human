"use client";

import { useRef, useState } from "react";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { saveArchivedSession } from "@/lib/archive/session-archive";
import { buildSessionJson, buildSrt, buildYoutubeDescription } from "@/lib/magazine-flow/export-transcript";
import { captureElementToPng, downloadDataUrl, downloadText } from "@/lib/magazine-flow/export-png";
import { EXPORT_PIXELS, type ExportAspect } from "@/lib/magazine-flow/types";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { MagazineCarouselSlide } from "@/themes/magazine/magazine-carousel-slide";
import { MagazinePageView } from "@/themes/magazine/magazine-page-view";

function ExportFrame({ aspect, children }: { aspect: ExportAspect; children: React.ReactNode }) {
  return <div style={{ width: EXPORT_PIXELS[aspect].width }}>{children}</div>;
}

export function PhasePublish() {
  const ui = getMagazineFlowUi();
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const transcript = useMagazineFlowStore((s) => s.transcript);
  const draft = useMagazineFlowStore((s) => s.draft);
  const photoUrl = useMagazineFlowStore((s) => s.photoUrl);
  const publishConsentConfirmed = useMagazineFlowStore((s) => s.publishConsentConfirmed);
  const setPublishConsentConfirmed = useMagazineFlowStore((s) => s.setPublishConsentConfirmed);
  const sessionStartedAt = useMagazineFlowStore((s) => s.sessionStartedAt);
  const recordingSlateAtMs = useMagazineFlowStore((s) => s.recordingSlateAtMs);
  const setPrepare = useMagazineFlowStore((s) => s.setPrepare);
  const recorder = useRecordingSession();
  const exportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!draft) return null;

  const slateOffset = recordingSlateAtMs ?? 0;
  const carouselQa = draft.qa.slice(0, 3);

  const capture = async (rootId: string, aspect: ExportAspect, filename: string) => {
    const root = exportRef.current?.querySelector(`#${rootId}`) as HTMLElement | null;
    if (!root) throw new Error(ui.exportFailed);
    const { width, height } = EXPORT_PIXELS[aspect];
    downloadDataUrl(filename, await captureElementToPng(root, width, height));
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
    if (recorder.blobUrl) downloadDataUrl("interview-audio.webm", recorder.blobUrl);
  };

  const confirmPublish = async () => {
    const prepareForArchive = {
      ...prepare,
      consents: { ...prepare.consents, snsPublish: publishConsentConfirmed },
    };
    setPrepare({ consents: prepareForArchive.consents });
    await saveArchivedSession({
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      prepare: prepareForArchive,
      transcript,
      draft,
      slateAtMs: recordingSlateAtMs,
    });
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page-x)] py-[var(--space-page-y)] text-[length:var(--text-body)]">
      <h1 className="ui-heading mb-[var(--space-block)]">{ui.publishHeading}</h1>

      <section className="ui-panel mb-6">
        <h2 className="mb-1 text-[color:var(--color-rose)]">{ui.exportEditBundle}</h2>
        <p className="mb-4 text-[color:var(--color-ink-muted)]">{ui.exportEditHint}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadAudio} disabled={!recorder.blobUrl} className="ui-btn">
            {ui.downloadAudio}
          </button>
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

      <label className="flex gap-3">
        <input type="checkbox" checked={publishConsentConfirmed} onChange={(e) => setPublishConsentConfirmed(e.target.checked)} />
        <span>{ui.publishConfirm}</span>
      </label>
      <button
        type="button"
        disabled={!publishConsentConfirmed || saved}
        onClick={() => void confirmPublish()}
        className="ui-btn mt-4"
      >
        {saved ? ui.savedToArchive : ui.finish}
      </button>
      {error && <p className="mt-4 text-[color:var(--color-rose)]">{error}</p>}

      <div ref={exportRef} className="pointer-events-none fixed left-[-99999px] top-0 flex flex-col" aria-hidden>
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
