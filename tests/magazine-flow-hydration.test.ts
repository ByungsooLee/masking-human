import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("magazine flow hydration", () => {
  it("renders the same default heading regardless of the host or browser language", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const server = renderToString(createElement("h1", null, getMagazineFlowUi().prepareHeading));
    vi.stubGlobal("navigator", { language: "ja-JP" });
    const client = renderToString(createElement("h1", null, getMagazineFlowUi().prepareHeading));
    expect(client).toBe(server);
    expect(client).toContain("インタビューの準備");
    expect(getMagazineFlowUi("en").prepareHeading).toBe("Prepare your interview");
  });

  it("starts with stable defaults and restores saved preferences only once after mount", async () => {
    const getItem = vi.fn(() => JSON.stringify({ language: "en", place: "保存した場所" }));
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem });
    const { useMagazineFlowStore } = await import("@/stores/magazine-flow-store");
    expect(getItem).not.toHaveBeenCalled();
    expect(useMagazineFlowStore.getState().prepare.language).toBe("ja");
    useMagazineFlowStore.getState().restorePrepareDefaults();
    expect(useMagazineFlowStore.getState().prepare).toMatchObject({ language: "en", place: "保存した場所" });
    useMagazineFlowStore.getState().setPrepare({ place: "変更した場所" });
    useMagazineFlowStore.getState().restorePrepareDefaults();
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(useMagazineFlowStore.getState().prepare.place).toBe("変更した場所");
  });

  it("keeps defaults when stored preferences are malformed", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => "invalid json" });
    const { useMagazineFlowStore } = await import("@/stores/magazine-flow-store");
    useMagazineFlowStore.getState().restorePrepareDefaults();
    expect(useMagazineFlowStore.getState().prepare.language).toBe("ja");
  });
});
