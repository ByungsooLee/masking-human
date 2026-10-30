import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
import { consumeOperatorAttempt } from "@/lib/pipeline/login-limit.server";
import { operatorAuthorized, operatorCookieValue, sameOrigin } from "@/lib/pipeline/auth.server";
import { DELETE, POST } from "@/app/api/pipeline/operator/route";
import { proxy } from "@/proxy";
import { POST as deletion } from "@/app/api/admin/deletion/process/route";
import { POST as sweep } from "@/app/api/admin/storage/sweep/route";

let directory: string;
const request = () => new Request("http://local/api/pipeline/operator", { method: "POST", headers: { origin: "http://local" }, body: JSON.stringify({ password: "testpass" }) });

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "operator-security-"));
  vi.stubEnv("INTERVIEW_USAGE_DIR", directory);
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "testpass");
  vi.stubEnv("INTERVIEW_SESSION_SECRET", "test-only-random-session-secret-32-plus");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("NEXT_PUBLIC_DEMO_ONLY", "0");
  vi.stubEnv("INTERVIEW_APP_ORIGIN", "");
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe("operator and scheduled-job security", () => {
  it("atomically limits even concurrent attempts, persists across calls and resets after 15 minutes", async () => {
    const now = Date.now();
    const results = await Promise.all(Array.from({ length: 12 }, () => consumeOperatorAttempt(request(), now)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await consumeOperatorAttempt(request(), now + 60_000)).toBe(false);
    expect(await consumeOperatorAttempt(request(), now + 15 * 60_000)).toBe(true);
  });
  it("returns 429 with a retry time without checking more passwords or billing a provider", async () => {
    for (let index = 0; index < 5; index += 1) expect(await consumeOperatorAttempt(request())).toBe(true);
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(await response.json()).toEqual({ error: "PIPELINE_RATE_LIMIT" });
  });
  it("uses an independent secret and invalidates sessions after password or secret rotation", () => {
    const cookie = operatorCookieValue();
    const authorized = () => operatorAuthorized(new Request("http://local", { headers: { cookie: `interview_operator=${cookie}` } }));
    expect(authorized()).toBe(true);
    vi.stubEnv("INTERVIEW_SESSION_SECRET", "another-test-session-secret-32-characters");
    expect(authorized()).toBe(false);
    vi.stubEnv("INTERVIEW_SESSION_SECRET", "test-only-random-session-secret-32-plus");
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "changedpass");
    expect(authorized()).toBe(false);
  });
  it("supports explicit HTTPS public origin without trusting arbitrary forwarded headers", async () => {
    vi.stubEnv("INTERVIEW_APP_ORIGIN", "https://interview.example");
    expect(sameOrigin(new Request("http://internal/api", { headers: { host: "internal", origin: "https://interview.example" } }))).toBe(true);
    expect(sameOrigin(new Request("http://internal/api", { headers: { origin: "https://evil.example", "x-forwarded-host": "evil.example" } }))).toBe(false);
    const response = await POST(new Request("http://internal/api/pipeline/operator", { method: "POST", headers: { origin: "https://interview.example" }, body: JSON.stringify({ password: "testpass" }) }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect((await DELETE(new Request("http://internal/api/pipeline/operator", { method: "DELETE", headers: { origin: "https://interview.example" } }))).headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it.each(["/api/admin/deletion/process", "/api/admin/storage/sweep"])("allows %s through the cookie gate, but still requires its admin key", async (route) => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "");
    const incoming = new NextRequest(`http://local${route}`, { method: "POST" });
    expect(proxy(incoming).headers.get("x-middleware-next")).toBe("1");
    expect((await (route.includes("deletion") ? deletion(incoming) : sweep(incoming))).status).toBe(403);
    vi.stubEnv("NEXT_PUBLIC_DEMO_ONLY", "1");
    expect(proxy(incoming).status).toBe(403);
  });
  it("does not exempt arbitrary admin routes from operator authentication", () => {
    expect(proxy(new NextRequest("http://local/api/admin/future", { method: "POST" })).status).toBe(401);
  });
});
