import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MagazineLayoutBody } from "@/themes/magazine/layouts/magazine-layout-body";
import type { ExportAspect, MagazineDraft, MagazineLayoutKind } from "@/lib/magazine-flow/types";

const draft: MagazineDraft = {
  title: "家族との時間が育むスキンケアの習慣",
  lead: "乳液を通して振り返る日常。",
  heroQuote: { utteranceId: "answer", text: "家族との時間が大切。乳液を塗ると安心して、母を思い出します。" },
  qa: [{ questionUtteranceId: "question", questionText: "どんな気持ちになりますか？", answer: { utteranceId: "answer", text: "安心します。" } }],
};

describe("editorial magazine card", () => {
  for (const layout of ["quote-led", "dialogue", "spread"] satisfies MagazineLayoutKind[]) {
    for (const exportAspect of ["4:5", "9:16", "16:9"] satisfies ExportAspect[]) {
      it(`preserves guest copy without nested background cards: ${layout}, ${exportAspect}`, () => {
        const html = renderToStaticMarkup(createElement(MagazineLayoutBody, {
          draft, layout, exportAspect, date: "2026-10-21", prepare: { guestName: "ゲスト", place: "東京" },
        }));
        expect(html).toContain(draft.title);
        expect(html).toContain(draft.heroQuote.text);
        expect(html).toContain("<blockquote");
        expect(html).toContain("mag-title");
        expect(html).toContain("収録インタビュー");
        expect(html).toContain("2026-10-21");
        expect(html).not.toContain("bg-[");
        expect(html).not.toContain("rounded-[");
        if (layout !== "quote-led") {
          expect(html).toContain("mag-question");
          expect(html).toContain("mag-answer");
          expect(html).toContain(draft.qa[0].answer.text);
        }
      });
    }
  }
});
