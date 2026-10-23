import { afterEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());

describe("demo deployment API boundary", () => {
  it("rejects API requests even if live credentials are configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_ONLY", "1");
    vi.stubEnv("OPENAI_API_KEY", "not-a-real-key");
    vi.stubEnv("CONSENT_OPERATOR_TOKEN", "not-a-real-token");
    const response = proxy();
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: "DEMO_ONLY" });
  });

  it("preserves the normal application when demo mode is off", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_ONLY", "0");
    expect(proxy().headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/api", "/api/session", "/api/voice/tts", "/api/release-consent", "/api/admin/deletion/process", "/api/usage/summary", "/api/future-route"])("guards %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });

  it.each(["/live?mock=1", "/live/archive/example", "/photo-consent", "/_next/static/example.js"])("keeps %s accessible", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
  });
});
