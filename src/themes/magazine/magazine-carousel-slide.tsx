"use client";

import type { ExportAspect, MagazineDraft, PrepareState, QaPair } from "@/lib/magazine-flow/types";
import { Masthead, quoted } from "@/themes/magazine/layouts/magazine-layout-body";
import { HeroQuote } from "@/themes/magazine/hero-quote";
import { aspectRatioCss } from "@/themes/magazine/magazine-page-view";

type SlideProps = {
  draft: MagazineDraft;
  prepare: Pick<PrepareState, "guestName" | "place">;
  exportAspect: ExportAspect;
  mode: "cover" | "qa" | "story";
  qa?: QaPair;
  qaIndex?: number;
  exportRootId: string;
};

export function MagazineCarouselSlide({ draft, prepare, exportAspect, mode, qa, exportRootId }: SlideProps) {
  const date = new Date().toISOString().slice(0, 10);

  return (
    <div
      id={exportRootId}
      data-theme="magazine"
      data-aspect={exportAspect}
      className="mag-page flex w-full flex-col gap-[var(--mag-gap)] overflow-hidden p-[var(--mag-pad)]"
      style={{ aspectRatio: aspectRatioCss(exportAspect) }}
    >
      <Masthead prepare={prepare} date={date} />
      {(mode === "cover" || mode === "story") && (
        <div className="flex min-h-0 flex-1 flex-row-reverse items-center gap-[var(--mag-pad)] py-[var(--mag-gap)]">
          <HeroQuote text={draft.heroQuote.text} aspect={exportAspect} />
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-[0.6em]">
            <p className="mag-voice mag-body">{draft.title}</p>
            {mode === "story" && <p className="mag-caption text-[color:var(--color-ink-muted)]">{draft.lead}</p>}
          </div>
        </div>
      )}
      {mode === "qa" && qa && (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[calc(var(--mag-gap)*1.5)]">
          <p className="mag-body text-[color:var(--color-plum)]">{qa.questionText}</p>
          <p className="mag-voice mag-body max-w-[16em] leading-[1.85]">{quoted(qa.answer.text)}</p>
        </div>
      )}
    </div>
  );
}
