"use client";

import { useUiTranslator } from "@/hooks/use-ui-translator";

import type { ExportAspect, MagazineDraft, MagazineLayoutKind, PrepareState } from "@/lib/magazine-flow/types";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";

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
  const t = useUiTranslator();
  const ui = useMagazineFlowUi();
  return (
    <div className="mag-masthead mag-caption flex flex-wrap items-baseline justify-between gap-[1.5em] text-[color:var(--color-ink-muted)]">
      <span className="text-[color:var(--color-plum)]">{ui.appName}</span>
      <span className="flex flex-wrap gap-[1.2em]">
        {prepare.guestName ? <span>{prepare.guestName}</span> : null}
        {prepare.place ? <span>{prepare.place}</span> : null}
        <span>{date}</span>
        <span>{t("収録インタビュー")}</span>
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
    <div className="mag-qa-list">
      {pairs.map((pair) => (
        <div key={pair.questionUtteranceId + pair.answer.utteranceId} className="mag-qa-pair">
          <p className="mag-question"><span aria-hidden="true">Q.</span> {pair.questionText}</p>
          <p className="mag-answer mag-body">{pair.answer.text}</p>
        </div>
      ))}
    </div>
  );
}

function TitleBlock({ draft }: { draft: MagazineDraft }) {
  return (
    <div className="flex flex-col gap-[0.6em]">
      <h2 className="mag-title">{draft.title}</h2>
      <p className="mag-caption text-[color:var(--color-ink-muted)]">{draft.lead}</p>
    </div>
  );
}

function EditorialQuote({ text, exportAspect }: { text: string; exportAspect: ExportAspect }) {
  const cap = exportAspect === "16:9" ? 3.2 : 5;
  const fontSize = Math.max(2.2, Math.min(cap, 32 / Math.sqrt(Math.max(1, text.length))));
  return <blockquote className="mag-pullquote" style={{ fontSize: `${fontSize}cqw` }}>
    <span className="mag-quote-mark" aria-hidden="true">“</span>
    <p>{text}</p>
    <span className="mag-quote-close" aria-hidden="true">”</span>
  </blockquote>;
}

export function MagazineLayoutBody({ draft, prepare, layout, exportAspect, date }: Props) {
  if (layout === "quote-led") {
    return <div className="flex h-full min-h-0 flex-1 flex-col justify-between gap-[var(--mag-gap)] p-[var(--mag-pad)]">
      <Masthead prepare={prepare} date={date} />
      <TitleBlock draft={draft} />
      <div className="flex min-h-0 flex-1 items-center py-[var(--mag-pad)]">
        <EditorialQuote text={draft.heroQuote.text} exportAspect={exportAspect} />
      </div>
      <p className="mag-caption text-[color:var(--color-ink-muted)]">{prepare.guestName || "Anonymous"}</p>
    </div>;
  }
  if (layout === "spread") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-[var(--mag-gap)] p-[var(--mag-pad)]">
        <Masthead prepare={prepare} date={date} />
        <div className={`flex min-h-0 flex-1 gap-[calc(var(--mag-pad)*1.4)] ${exportAspect === "16:9" ? "flex-row-reverse" : "flex-col"}`}>
          <div className={`flex min-h-0 items-center justify-center ${exportAspect === "16:9" ? "w-[44%]" : "flex-1"}`}>
            <EditorialQuote text={draft.heroQuote.text} exportAspect={exportAspect} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-[calc(var(--mag-gap)*1.4)] overflow-hidden">
            <TitleBlock draft={draft} />
            <div className="mag-sheet pt-[var(--mag-gap)]">
              <QaList draft={draft} maxPairs={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qaCap = exportAspect === "9:16" ? 3 : 2;

  return (
    <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,0.9fr)_minmax(0,1.2fr)] gap-[var(--mag-gap)] p-[var(--mag-pad)]">
      <Masthead prepare={prepare} date={date} />
      <TitleBlock draft={draft} />
      <div className="flex min-h-0 items-center">
        <EditorialQuote text={draft.heroQuote.text} exportAspect={exportAspect} />
      </div>
      <div className="mag-sheet min-h-0 overflow-hidden pt-[var(--mag-gap)]">
        <QaList draft={draft} maxPairs={qaCap} />
      </div>
    </div>
  );
}
