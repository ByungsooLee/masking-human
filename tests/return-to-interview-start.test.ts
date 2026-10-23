import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type MouseEvent } from "react";
import type { MagazineFlowPhase } from "@/lib/magazine-flow/types";

vi.mock("@/components/primary-navigation", () => ({ PrimaryNavigation: () => null }));
vi.mock("@/components/usage/session-cost-badge", () => ({ SessionCostBadge: () => null }));
vi.mock("@/hooks/use-magazine-flow-ui", () => ({ useMagazineFlowUi: () => ({ back: "戻る" }) }));
vi.mock("@/hooks/use-ui-translator", () => ({ useUiTranslator: () => (text: string) => text }));

import { FlowChrome } from "@/components/magazine-flow/flow-chrome";

type LinkProps = { href: string; onClick: (event: MouseEvent<HTMLAnchorElement>) => void };

function findReturnLink(element: unknown): ReactElement<LinkProps> | undefined {
  if (!isValidElement<{ children?: unknown }>(element)) return;
  if (element.type === "a") return element as ReactElement<LinkProps>;
  const children = element.props.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const link = findReturnLink(child);
    if (link) return link;
  }
}

function renderChrome(phase: MagazineFlowPhase, mockOnly = false) {
  return FlowChrome({ phase, mockOnly, sessionEstimatedUsd: null, pricingConfigured: false, showCost: false });
}

afterEach(() => vi.unstubAllGlobals());

describe("return to interview start", () => {
  it("is hidden at preparation and available throughout the rest of the flow", () => {
    expect(findReturnLink(renderChrome("prepare"))).toBeUndefined();
    for (const phase of ["slate", "conversation", "review", "magazine", "publish"] as const) {
      expect(findReturnLink(renderChrome(phase))?.props.href).toBe("/live");
    }
    expect(findReturnLink(renderChrome("conversation", true))?.props.href).toBe("/live?mock=1");
  });

  it.each([false, true])("only navigates after confirmation: %s", (accepted) => {
    const confirm = vi.fn(() => accepted);
    vi.stubGlobal("window", { confirm });
    const preventDefault = vi.fn();
    const link = findReturnLink(renderChrome("conversation"))!;
    link.props.onClick({ preventDefault } as unknown as MouseEvent<HTMLAnchorElement>);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("会話・録音を終了"));
    expect(preventDefault).toHaveBeenCalledTimes(accepted ? 0 : 1);
  });
});
