import { describe, expect, it } from "vitest";
import type { Utterance } from "@/lib/realtime/types";
import { analyzeConversation, buildConversationGraph, HUB_ID } from "./build-conversation-graph";

const u = (id: string, speaker: "ai" | "guest", text: string): Utterance => ({
  id,
  speaker,
  text,
  startedAt: 0,
  endedAt: 0,
});

describe("buildConversationGraph", () => {
  it("starts with only the hub", () => {
    expect(buildConversationGraph([]).nodes.map((n) => n.id)).toEqual([HUB_ID]);
  });

  it("hangs answers off their question and questions off the hub", () => {
    const g = buildConversationGraph([u("q1", "ai", "何を塗りますか"), u("a1", "guest", "乳液です")]);
    expect(g.edges).toContainEqual({ source: HUB_ID, target: "q1", kind: "thread" });
    expect(g.edges).toContainEqual({ source: "q1", target: "a1", kind: "thread" });
  });

  it("links answers that share a keyword through one tag", () => {
    const g = buildConversationGraph([
      u("q1", "ai", "何を塗りますか"),
      u("a1", "guest", "化粧水です"),
      u("q2", "ai", "いつからですか"),
      u("a2", "guest", "母の化粧水を借りていました"),
    ]);
    const tagEdges = g.edges.filter((e) => e.source === "tag:word:化粧水");
    expect(tagEdges.map((e) => e.target)).toEqual(["a1", "a2"]);
  });

  it("turns people and feelings into their own tags and puts answers on a depth", () => {
    const g = buildConversationGraph([
      u("q1", "ai", "何を塗りますか"),
      u("a1", "guest", "乳液です"),
      u("q2", "ai", "誰から教わりましたか"),
      u("a2", "guest", "祖母です。懐かしいです"),
    ]);
    const facets = g.nodes.filter((n) => n.kind === "tag").map((n) => `${n.facet}:${n.label}`);
    expect(facets).toContain("person:祖母");
    expect(facets).toContain("feeling:懐かしい");
    expect(facets).not.toContain("person:母");
    expect(facets).not.toContain("word:祖母");
    expect(g.nodes.find((n) => n.id === "a1")?.depth).toBe(0);
    expect(g.nodes.find((n) => n.id === "a2")?.depth).toBe(2);
  });
});

describe("analyzeConversation", () => {
  it("tracks the deepest step and words the listener has not picked up", () => {
    const talk = [
      u("q1", "ai", "何を塗りますか"),
      u("a1", "guest", "肌が乾燥しやすいので、化粧水と乳液です"),
      u("q2", "ai", "化粧水と乳液、毎日なんですね"),
    ];
    expect(analyzeConversation([])).toEqual({ depthReached: -1, openWords: [] });
    expect(analyzeConversation(talk)).toEqual({ depthReached: 1, openWords: ["乾燥"] });
    const deeper = analyzeConversation([...talk, u("a2", "guest", "母に教わりました")]);
    expect(deeper.depthReached).toBe(2);
  });

  it("adds seed nodes around the hub", () => {
    expect(buildConversationGraph([], 3).nodes.filter((n) => n.kind === "seed")).toHaveLength(3);
  });
});
