"use client";

import type { GraphNode, TagFacet } from "@/lib/graph/build-conversation-graph";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";

type Props = {
  nodes: GraphNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const ORDER: TagFacet[] = ["person", "feeling", "word"];

/** Keyboard path into the graph: every tag node is also a toggle button, grouped by what it stands for. */
export function FacetChips({ nodes, selectedId, onSelect }: Props) {
  const ui = useMagazineFlowUi();
  const title: Record<TagFacet, string> = { person: ui.facetPerson, feeling: ui.facetFeeling, word: ui.facetWord };
  const groups = ORDER.map((facet) => ({ facet, tags: nodes.filter((n) => n.kind === "tag" && n.facet === facet) })).filter(
    (g) => g.tags.length > 0,
  );
  if (groups.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ facet, tags }) => (
        <div key={facet} className="flex flex-wrap items-center gap-2">
          <span className="ui-facet-mark w-[4.5rem] shrink-0 whitespace-nowrap text-[color:var(--color-ink-muted)]" data-facet={facet}>
            {title[facet]}
          </span>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className="ui-chip"
              aria-pressed={selectedId === t.id}
              onClick={() => onSelect(selectedId === t.id ? null : t.id)}
            >
              {t.label}
              {(t.uses?.length ?? 0) > 1 && <span className="ui-num text-[color:var(--color-ink-muted)]">{t.uses?.length}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
