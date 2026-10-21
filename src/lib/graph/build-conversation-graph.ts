import type { Utterance } from "@/lib/realtime/types";
import { extractKeywords } from "./extract-keywords";
import { classifyDepth, findFeelings, findPeople, isLexiconWord, type Depth } from "./lexicon";

export type GraphNodeKind = "hub" | "ai" | "guest" | "tag" | "seed" | "session";

/** What a tag node stands for. */
export type TagFacet = "word" | "person" | "feeling";

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  /** Drawn next to tag and session nodes. */
  label?: string;
  /** Node that a new node grows out of. */
  parentId?: string;
  /** Guest nodes grow with what they said. */
  weight: number;
  facet?: TagFacet;
  /** Guest answers sit on the ring of their laddering depth. */
  depth?: Depth;
  /** Tag nodes: ids of the answers (or sessions) that used the word. */
  uses?: string[];
};

export type GraphEdge = { source: string; target: string; kind: "thread" | "tag" };

export type ConversationGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type ConversationInsight = {
  /** Deepest laddering step any answer reached; -1 before the first answer. */
  depthReached: Depth | -1;
  /** Words the guest said once, at a shallow depth, that the listener has not picked up yet. */
  openWords: string[];
};

export const HUB_ID = "hub";
const MAX_TAGS = 16;

export function tagId(facet: TagFacet, word: string) {
  return `tag:${facet}:${word}`;
}

/**
 * Hub = the AI listener. Each AI question hangs off the hub, each guest answer off its question,
 * and words, people and feelings become tags that tie together every answer that used them.
 */
export function buildConversationGraph(utterances: Utterance[], seedCount = 0): ConversationGraph {
  const nodes: GraphNode[] = [{ id: HUB_ID, kind: "hub", weight: 1 }];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < seedCount; i++) {
    const id = `seed-${i}`;
    nodes.push({ id, kind: "seed", parentId: HUB_ID, weight: 0.4 });
    edges.push({ source: HUB_ID, target: id, kind: "thread" });
  }

  let lastAi: string | null = null;
  let lastGuest: string | null = null;
  const tagUses = new Map<string, { facet: TagFacet; word: string; uses: string[] }>();
  const addUse = (facet: TagFacet, word: string, id: string) => {
    const key = tagId(facet, word);
    const entry = tagUses.get(key) ?? { facet, word, uses: [] };
    entry.uses.push(id);
    tagUses.set(key, entry);
  };

  for (const u of utterances) {
    if (!u.text.trim()) continue;
    if (u.speaker === "ai") {
      const parent = lastGuest ?? HUB_ID;
      nodes.push({ id: u.id, kind: "ai", parentId: parent, weight: 0.6 });
      edges.push({ source: HUB_ID, target: u.id, kind: "thread" });
      if (lastGuest) edges.push({ source: lastGuest, target: u.id, kind: "thread" });
      lastAi = u.id;
    } else {
      const parent = lastAi ?? HUB_ID;
      nodes.push({
        id: u.id,
        kind: "guest",
        parentId: parent,
        weight: Math.min(1.6, 0.8 + u.text.length / 60),
        depth: classifyDepth(u.text),
      });
      edges.push({ source: parent, target: u.id, kind: "thread" });
      lastGuest = u.id;
      for (const p of findPeople(u.text)) addUse("person", p, u.id);
      for (const f of findFeelings(u.text)) addUse("feeling", f, u.id);
      for (const w of extractKeywords(u.text)) if (!isLexiconWord(w)) addUse("word", w, u.id);
    }
  }

  // People and feelings first: they are what the laddering is digging for.
  const rank = (f: TagFacet) => (f === "word" ? 0 : 1);
  const tags = [...tagUses.entries()]
    .sort((a, b) => rank(b[1].facet) - rank(a[1].facet) || b[1].uses.length - a[1].uses.length)
    .slice(0, MAX_TAGS);
  for (const [id, { facet, word, uses }] of tags) {
    nodes.push({ id, kind: "tag", facet, label: word, uses, parentId: uses[0], weight: 0.3 + uses.length * 0.15 });
    for (const target of uses) edges.push({ source: id, target, kind: "tag" });
  }

  return { nodes, edges };
}

export function analyzeConversation(utterances: Utterance[]): ConversationInsight {
  let depthReached: Depth | -1 = -1;
  const said = new Map<string, { count: number; at: number; deep: boolean }>();
  const picked = new Set<string>();
  utterances.forEach((u, i) => {
    if (!u.text.trim()) return;
    if (u.speaker === "ai") {
      for (const word of said.keys()) if (u.text.includes(word)) picked.add(word);
      return;
    }
    const depth = classifyDepth(u.text);
    if (depth > depthReached) depthReached = depth;
    for (const w of extractKeywords(u.text)) {
      if (isLexiconWord(w)) continue;
      const prev = said.get(w);
      said.set(w, { count: (prev?.count ?? 0) + 1, at: i, deep: Boolean(prev?.deep) || depth === 2 });
    }
  });
  const openWords = [...said.entries()]
    .filter(([w, s]) => s.count === 1 && !s.deep && !picked.has(w))
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 3)
    .map(([w]) => w);
  return { depthReached, openWords };
}
