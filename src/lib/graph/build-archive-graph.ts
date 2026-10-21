import { extractKeywords } from "./extract-keywords";
import { findFeelings, findPeople, isLexiconWord } from "./lexicon";
import { tagId, type ConversationGraph, type GraphEdge, type GraphNode, type TagFacet } from "./build-conversation-graph";

export type ArchiveGraphInput = { id: string; label: string; guestTexts: string[] };

const MAX_TAGS = 18;

/**
 * Each saved interview is a node; words, people and feelings that more than one interview shared
 * tie them together. With a single interview its own strongest words are shown instead.
 */
export function buildArchiveGraph(sessions: ArchiveGraphInput[]): ConversationGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const tagUses = new Map<string, { facet: TagFacet; word: string; uses: string[] }>();

  for (const s of sessions) {
    nodes.push({ id: s.id, kind: "session", label: s.label, weight: 1 });
    const text = s.guestTexts.join("\n");
    const found: [TagFacet, string][] = [
      ...findPeople(text).map((w): [TagFacet, string] => ["person", w]),
      ...findFeelings(text).map((w): [TagFacet, string] => ["feeling", w]),
      ...extractKeywords(text)
        .filter((w) => !isLexiconWord(w))
        .map((w): [TagFacet, string] => ["word", w]),
    ];
    for (const [facet, word] of found) {
      const key = tagId(facet, word);
      const entry = tagUses.get(key) ?? { facet, word, uses: [] };
      entry.uses.push(s.id);
      tagUses.set(key, entry);
    }
  }

  const minUses = sessions.length > 1 ? 2 : 1;
  const tags = [...tagUses.entries()]
    .filter(([, t]) => t.uses.length >= minUses)
    .sort((a, b) => b[1].uses.length - a[1].uses.length || (a[1].facet === "word" ? 1 : 0) - (b[1].facet === "word" ? 1 : 0))
    .slice(0, sessions.length > 1 ? MAX_TAGS : 8);
  for (const [id, { facet, word, uses }] of tags) {
    nodes.push({ id, kind: "tag", facet, label: word, uses, parentId: uses[0], weight: 0.3 + uses.length * 0.2 });
    for (const target of uses) edges.push({ source: id, target, kind: "tag" });
  }
  return { nodes, edges };
}
