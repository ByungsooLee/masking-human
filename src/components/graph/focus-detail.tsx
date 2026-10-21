"use client";

import type { ConversationGraph } from "@/lib/graph/build-conversation-graph";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";

type Item = { id: string; text: string; meta?: string };

type Props = {
  graph: ConversationGraph;
  selectedId: string | null;
  /** Looks up what a guest/AI/session node says. */
  describe: (id: string) => Item | null;
  heading: (word: string) => string;
  onSelect: (id: string | null) => void;
  /** Optional action for each listed item, e.g. play from its time. */
  renderAction?: (id: string) => React.ReactNode;
};

/** Backlinks for the selected node: the answers behind a word, or the words inside an answer. */
export function FocusDetail({ graph, selectedId, describe, heading, onSelect, renderAction }: Props) {
  const ui = getMagazineFlowUi();
  const node = selectedId ? graph.nodes.find((n) => n.id === selectedId) : null;
  if (!node) return null;

  if (node.kind === "tag") {
    const items = (node.uses ?? []).map(describe).filter((x): x is Item => x != null);
    return (
      <section className="ui-panel flex flex-col gap-3" aria-live="polite">
        <h2 className="text-[color:var(--color-rose)]">{heading(node.label ?? "")}</h2>
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.id} className="flex flex-col gap-1 border-l-2 border-[color:var(--color-blush)] pl-3">
              {it.meta && <span className="text-[color:var(--color-ink-muted)]">{it.meta}</span>}
              <span className="leading-[var(--leading-body)]">{it.text}</span>
              {renderAction?.(it.id)}
            </li>
          ))}
        </ul>
        <button type="button" className="ui-btn-sub py-1" onClick={() => onSelect(null)}>
          {ui.clearFocus}
        </button>
      </section>
    );
  }

  const item = describe(node.id);
  const words = graph.nodes.filter((n) => n.kind === "tag" && n.uses?.includes(node.id));
  return (
    <section className="ui-panel flex flex-col gap-3" aria-live="polite">
      {item?.meta && <span className="text-[color:var(--color-ink-muted)]">{item.meta}</span>}
      {item && <p className="leading-[var(--leading-body)]">{item.text}</p>}
      {renderAction?.(node.id)}
      {words.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[color:var(--color-ink-muted)]">{ui.wordsInAnswer}</span>
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <button key={w.id} type="button" className="ui-chip" onClick={() => onSelect(w.id)}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="ui-btn-sub py-1" onClick={() => onSelect(null)}>
        {ui.clearFocus}
      </button>
    </section>
  );
}
