import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/live",
  redirect: (destination: string) => { throw new Error(`redirect:${destination}`); },
}));
vi.mock("@/hooks/use-ui-translator", () => ({ useUiTranslator: () => (text: string) => text }));
vi.mock("@/hooks/use-magazine-flow-ui", () => ({ useMagazineFlowUi: () => ({ back: "戻る" }) }));
import { PrimaryNavigation } from "@/components/primary-navigation";
import { FlowChrome } from "@/components/magazine-flow/flow-chrome";
import LegacyHistory from "@/app/live/archive/page";
import LegacyPhoto from "@/app/photo-consent/page";
import LegacyUsage from "@/app/usage/page";

describe("participant and management navigation", () => {
  it("only exposes interview and My page in the participant header, even with cost data", () => {
    const html = renderToStaticMarkup(createElement(PrimaryNavigation));
    expect(html).toContain('href="/mypage"');
    expect(html).toContain('href="/live"');
    expect(html).not.toMatch(/履歴|写真撮影許可|利用料/);
    const chrome = renderToStaticMarkup(createElement(FlowChrome, { phase: "conversation", showCost: true, sessionEstimatedUsd: 12.34, pricingConfigured: true }));
    expect(chrome).not.toContain("12.34");
    expect(chrome).not.toContain("推定");
  });
  it.each([[LegacyHistory, "/mypage/history"], [LegacyPhoto, "/mypage/photo-consent"], [LegacyUsage, "/mypage/usage"]] as const)("preserves old bookmarks with a management redirect", (page, destination) => {
    expect(page).toThrow(`redirect:${destination}`);
  });
});
