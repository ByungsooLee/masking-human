import { describe, expect, it } from "vitest";
import { buildArchiveGraph } from "./build-archive-graph";

describe("buildArchiveGraph", () => {
  it("links interviews through what they share", () => {
    const g = buildArchiveGraph([
      { id: "s1", label: "渋谷", guestTexts: ["母に教わった乳液です"] },
      { id: "s2", label: "中目黒", guestTexts: ["母の化粧水を借りていました"] },
    ]);
    const tags = g.nodes.filter((n) => n.kind === "tag");
    expect(tags.map((n) => n.label)).toEqual(["母"]);
    expect(g.edges.map((e) => e.target).sort()).toEqual(["s1", "s2"]);
  });

  it("shows a single interview's own words", () => {
    const g = buildArchiveGraph([{ id: "s1", label: "渋谷", guestTexts: ["乳液です"] }]);
    expect(g.nodes.map((n) => n.label)).toEqual(["渋谷", "乳液"]);
  });
});
