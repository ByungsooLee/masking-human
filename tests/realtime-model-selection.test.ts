import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { getRealtimeModel } from "@/lib/realtime/config";
import { SELECTABLE_REALTIME_MODELS, isSelectableRealtimeModel } from "@/lib/realtime/model-options";
import { ModelComparisonSettings } from "@/components/live/model-comparison-settings";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { clearSessionUsageStoreForTests, getSessionRecord } from "@/lib/usage/session-usage-store";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/usage/summary", () => ({ buildUsageSummary: async () => ({ blocked100: false, warning80: false }) }));
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";
import { POST } from "@/app/api/session/route";

afterEach(() => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs(); clearSessionUsageStoreForTests();
  useMagazineFlowStore.setState(useMagazineFlowStore.getInitialState(), true);
});

describe("operator model comparison", () => {
  it("keeps server defaults while accepting only the two explicit choices", () => {
    vi.stubEnv("OPENAI_REALTIME_MODEL", "server-configured-model");
    expect(getRealtimeModel()).toBe("server-configured-model");
    expect(getRealtimeModel("gpt-realtime-2.1-mini")).toBe("gpt-realtime-2.1-mini");
    for (const bad of [null, "gpt-realtime-mini", "unknown", "__proto__", {}, ""]) expect(isSelectableRealtimeModel(bad)).toBe(false);
  });
  it("changes only the model, preserving prompts, language, voice and transcription", () => {
    for (const interviewLanguage of ["ja", "en"] as const) {
      const standard = buildRealtimeClientSecretSession({ realtimeModel: "gpt-realtime-2.1", interviewLanguage });
      const mini = buildRealtimeClientSecretSession({ realtimeModel: "gpt-realtime-2.1-mini", interviewLanguage });
      expect(standard.instructions).toBe(mini.instructions);
      expect(standard.audio).toEqual(mini.audio);
      expect(mini.model).toBe("gpt-realtime-2.1-mini");
    }
  });
  it.each(SELECTABLE_REALTIME_MODELS)("sends %s to the upstream session and the usage record without a paid call", async (realtimeModel) => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-placeholder");
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: "test-client-secret" }), { status: 200 }));
    vi.stubGlobal("fetch", upstream);
    const response = await POST(new Request("http://local/api/session", { method: "POST", body: JSON.stringify({ realtimeModel, interviewLanguage: "ja" }) }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.parse(upstream.mock.calls[0][1].body).session.model).toBe(realtimeModel);
    expect(data.model).toBe(realtimeModel);
    expect(getSessionRecord(data.sessionId)?.model).toBe(realtimeModel);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it("rejects unsupported models and malformed requests rather than silently billing a default", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-placeholder");
    const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    for (const body of [JSON.stringify({ realtimeModel: "unknown" }), "invalid-json"]) {
      expect((await POST(new Request("http://local/api/session", { method: "POST", body }))).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });
  it("persists and restores only supported explicit model choices", () => {
    const saved = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => saved.get(key), setItem: (key: string, value: string) => saved.set(key, value) });
    const store = useMagazineFlowStore.getState();
    store.setPrepare({ realtimeModel: "gpt-realtime-2.1-mini" }); store.persistPrepare();
    useMagazineFlowStore.setState({ prepareDefaultsLoaded: false, prepare: useMagazineFlowStore.getInitialState().prepare });
    store.restorePrepareDefaults();
    expect(useMagazineFlowStore.getState().prepare.realtimeModel).toBe("gpt-realtime-2.1-mini");
    saved.set("magazineFlowPrepare", JSON.stringify({ realtimeModel: "unrecognized" }));
    useMagazineFlowStore.setState({ prepareDefaultsLoaded: false }); store.restorePrepareDefaults();
    expect(useMagazineFlowStore.getState().prepare.realtimeModel).toBeUndefined();
  });
  it("renders bilingual operator-only choices and disables misleading demo comparisons", () => {
    for (const en of [false, true]) {
      const html = renderToStaticMarkup(createElement(ModelComparisonSettings, { value: "gpt-realtime-2.1-mini", en, mockOnly: false, onChange: () => undefined }));
      expect(html).toContain(en ? "Operator settings" : "運営者設定");
      expect(html).toContain('value="gpt-realtime-2.1-mini" selected=""');
      expect(html).toContain(en ? "No automatic fallback" : "自動切替はしません");
      expect(renderToStaticMarkup(createElement(ModelComparisonSettings, { en, mockOnly: true, onChange: () => undefined }))).toContain('disabled=""');
    }
    expect(readFileSync("src/components/magazine-flow/phase-conversation.tsx", "utf8")).toContain("realtimeModel: prepare.realtimeModel");
  });
});
