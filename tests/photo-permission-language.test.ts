import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoConsentPage } from "@/components/live/photo-consent-page";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

vi.mock("@/themes/bloom/fonts", () => ({ bloomFontClassName: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/photo-consent" }));
vi.mock("@/stores/magazine-flow-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/magazine-flow-store")>();
  const store = actual.useMagazineFlowStore;
  return { useMagazineFlowStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
afterEach(() => useMagazineFlowStore.getState().resetFlow());

describe("photography permission language", () => {
  it("shows a Japanese form with both language buttons", () => {
    useMagazineFlowStore.getState().setPrepare({ language: "ja" });
    const html = renderToStaticMarkup(createElement(PhotoConsentPage));
    expect(html).toContain("写真撮影へのご協力ありがとうございます");
    expect(html).toContain("お名前");
    expect(html).toContain("企業広告・第三者への素材販売・AI学習・顔の合成には使いません");
    expect(html).toContain("18歳以上で、このページに記載された撮影・作品利用に同意します");
    expect(html).toContain("同意して保存");
    expect(html).toContain("メール（任意・控えをご希望の方のみ）");
    expect(html).toContain('aria-label="表示言語 / Display language"');
    expect(html).toContain('lang="ja" aria-pressed="true"');
    expect(html).toContain('lang="en" aria-pressed="false"');
  });
  it("translates the form, instructions and header into English", () => {
    useMagazineFlowStore.getState().setPrepare({ language: "en" });
    const html = renderToStaticMarkup(createElement(PhotoConsentPage));
    expect(html).toContain("Thank you for being part of my photography");
    expect(html).toContain("Your name");
    expect(html).toContain("No corporate ads, third-party stock licensing, AI training or face swaps");
    expect(html).toContain("Agree &amp; save");
    expect(html).toContain("Email — optional, only for a receipt");
    expect(html).toContain("My page");
    expect(html).not.toContain('href="/photo-consent"');
    expect(html).toContain('lang="en" aria-pressed="true"');
    expect(html).not.toContain("写真撮影へのご協力ありがとうございます");
  });
});
