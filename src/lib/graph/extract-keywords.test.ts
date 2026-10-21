import { describe, expect, it } from "vitest";
import { extractKeywords } from "./extract-keywords";

describe("extractKeywords", () => {
  it("picks kanji and katakana runs from Japanese", () => {
    expect(extractKeywords("肌が乾燥しやすいので、化粧水と乳液をいつも使っています。")).toEqual([
      "乾燥",
      "化粧水",
      "乳液",
    ]);
  });

  it("skips stop words and single characters", () => {
    expect(extractKeywords("母ですね。一緒に鏡の前で")).toEqual([]);
  });

  it("keeps katakana words such as product names", () => {
    expect(extractKeywords("ニベアのクリームを")).toEqual(["ニベア", "クリーム"]);
  });

  it("picks longer English words", () => {
    expect(extractKeywords("I use lotion after every shower")).toEqual(["lotion", "shower"]);
  });
});
