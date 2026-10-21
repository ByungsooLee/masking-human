"use client";

import type { ExportAspect, MagazineDraft, MagazineLayoutKind, PrepareState } from "@/lib/magazine-flow/types";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { HeroQuote } from "@/themes/magazine/hero-quote";

type Props = {
  draft: MagazineDraft;
  prepare: Pick<PrepareState, "guestName" | "place">;
  layout: MagazineLayoutKind;
  exportAspect: ExportAspect;
  date: string;
};

/** 「…」 with the closing full stop dropped, as Japanese magazines set quotes. */
export function quoted(text: string) {
  return `「${text.trim().replace(/[。.]$/, "")}」`;
}

export function Masthead({
  prepare,
  date,
}: {
  prepare: Pick<PrepareState, "guestName" | "place">;
  date: string;
}) {
  const ui = getMagazineFlowUi();
  return (
    <div className="mag-caption flex items-baseline justify-between gap-[1.5em] text-[color:var(--color-ink-muted)]">
      <span className="text-[color:var(--color-plum)]">{ui.appName}</span>
      <span className="flex gap-[1.2em]">
        {prepare.guestName ? <span>{prepare.guestName}</span> : null}
        {prepare.place ? <span>{prepare.place}</span> : null}
        <span>{date}</span>
      </span>
    </div>
  );
}

function QaList({
  draft,
  skipHero = false,
  maxPairs,
}: {
  draft: MagazineDraft;
  skipHero?: boolean;
  maxPairs?: number;
}) {
  let pairs = skipHero ? draft.qa.filter((pair) => pair.answer.text !== draft.heroQuote.text) : draft.qa;
  if (maxPairs != null) pairs = pairs.slice(0, maxPairs);
  return (
    <div className="flex flex-col gap-[var(--mag-gap)]">
      {pairs.map((pair) => (
        <div key={pair.questionUtteranceId + pair.answer.utteranceId} className="flex flex-col gap-[0.4em]">
          <p className="mag-caption text-[color:var(--color-plum)]">{pair.questionText}</p>
          <p className="mag-body text-[color:var(--color-ink)]">{pair.answer.text}</p>
        </div>
      ))}
    </div>
  );
}

function TitleBlock({ draft }: { draft: MagazineDraft }) {
  return (
    <div className="flex flex-col gap-[0.6em]">
      <p className="mag-voice mag-body text-[color:var(--color-ink)]">{draft.title}</p>
      <p className="mag-caption text-[color:var(--color-ink-muted)]">{draft.lead}</p>
    </div>
  );
}

export function MagazineLayoutBody({ draft, prepare, layout, exportAspect, date }: Props) {
  if (layout === "spread" && exportAspect === "16:9") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-[var(--mag-gap)] p-[var(--mag-pad)]">
        <Masthead prepare={prepare} date={date} />
        <div className="flex min-h-0 flex-1 flex-row-reverse gap-[calc(var(--mag-pad)*1.4)]">
          <div className="flex min-h-0 w-[44%] items-center justify-center">
            <HeroQuote text={draft.heroQuote.text} aspect={exportAspect} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-[calc(var(--mag-gap)*1.4)] overflow-hidden">
            <TitleBlock draft={draft} />
            <div className="mag-sheet rounded-[1.2cqw] bg-[color:var(--color-milk)] p-[var(--mag-pad)]">
              <QaList draft={draft} maxPairs={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qaCap = exportAspect === "9:16" ? 3 : 2;

  return (
    <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1.05fr)_minmax(0,1.2fr)] gap-[var(--mag-gap)] p-[var(--mag-pad)]">
      <Masthead prepare={prepare} date={date} />
      <div className="flex min-h-0 flex-row-reverse items-center gap-[var(--mag-pad)]">
        <HeroQuote text={draft.heroQuote.text} aspect={exportAspect} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <TitleBlock draft={draft} />
        </div>
      </div>
      <div className="mag-sheet min-h-0 overflow-hidden rounded-[2cqw] bg-[color:var(--color-milk)] p-[var(--mag-pad)]">
        <QaList draft={draft} skipHero={layout === "quote-led"} maxPairs={qaCap} />
      </div>
    </div>
  );
}
