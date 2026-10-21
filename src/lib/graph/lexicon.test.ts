import { describe, expect, it } from "vitest";
import { classifyDepth, findFeelings, findPeople, isLexiconWord } from "./lexicon";

describe("lexicon", () => {
  it("finds people without confusing look-alike words", () => {
    expect(findPeople("母ですね")).toEqual(["母"]);
    expect(findPeople("祖母の鏡台")).toEqual(["祖母"]);
    expect(findPeople("大丈夫です")).toEqual([]);
  });

  it("finds feelings", () => {
    expect(findFeelings("少し大人になった気がして、嬉しかった")).toEqual(["嬉しい", "大人になった"]);
  });

  it("treats parts of people and feeling labels as lexicon words", () => {
    expect(isLexiconWord("大人")).toBe(true);
    expect(isLexiconWord("祖母")).toBe(true);
    expect(isLexiconWord("乳液")).toBe(false);
  });

  it("ladders answers from doing, to reasons, to memories", () => {
    expect(classifyDepth("化粧水と乳液です")).toBe(0);
    expect(classifyDepth("肌が乾燥しやすいので")).toBe(1);
    expect(classifyDepth("鏡の前で塗るところを見せてくれました")).toBe(0);
    expect(classifyDepth("中学生のころ、母に教わりました")).toBe(2);
  });
});
