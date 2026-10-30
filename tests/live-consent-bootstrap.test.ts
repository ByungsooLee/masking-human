import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/session-service", () => ({ persistSession: vi.fn(async () => undefined) }));
import { persistSession } from "@/lib/interview/session-service";
import { POST } from "@/app/api/live-consent/route";
import { operatorCookieValue } from "@/lib/pipeline/auth.server";
import { createLiveConsentSession } from "@/hooks/use-live-consent-session";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("initial consent without hidden generation", () => {
  it("saves selected consents together with a fresh session, never granting publication", async () => {
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "test-only-password-long-enough");
    const create = () => POST(new Request("http://local/api/live-consent", { method: "POST", headers: { cookie: `interview_operator=${operatorCookieValue()}` }, body: JSON.stringify({ language: "ja", consents: { ai: true, photoVideo: false, recording: true } }) }));
    const first = await create();
    const second = await create();
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    expect((await first.json()).session.id).not.toBe((await second.json()).session.id);
    const session = vi.mocked(persistSession).mock.calls.at(-1)![0];
    expect(session.consents.ai_conversation?.granted).toBe(true);
    expect(session.consents.recording?.granted).toBe(true);
    expect(session.consents.photo_video?.granted).not.toBe(true);
    expect(session.consents.sns_publish?.granted).not.toBe(true);
  });
  it("returns a recoverable save error instead of a framework error page", async () => {
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "");
    vi.mocked(persistSession).mockRejectedValueOnce(new Error("Storage unavailable"));
    const response = await POST(new Request("http://local/api/live-consent", { method: "POST", body: JSON.stringify({ language: "ja", consents: { ai: true, photoVideo: false, recording: true } }) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "CONSENT_SAVE_FAILED" });
  });
  it("ignores old browser credentials and storage restrictions when starting another interview", async () => {
    const storage = { getItem: vi.fn(() => JSON.stringify({ sessionId: "stale-after-server-restart" })), setItem: vi.fn(() => { throw new Error("Storage disabled"); }) };
    vi.stubGlobal("sessionStorage", storage);
    const provider = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ session: { id: crypto.randomUUID() }, participantCredentials: { participantId: "participant", participantToken: "test-token" } })));
    vi.stubGlobal("fetch", provider);
    const consents = { ai: true, photoVideo: false, recording: true };
    const first = await createLiveConsentSession("ja", consents);
    const second = await createLiveConsentSession("en", consents);
    expect(first.sessionId).not.toBe(second.sessionId);
    expect(storage.getItem).not.toHaveBeenCalled(); expect(storage.setItem).not.toHaveBeenCalled();
    expect(provider).toHaveBeenCalledTimes(2);
    expect(JSON.parse(provider.mock.calls[0][1]!.body as string)).toEqual({ language: "ja", consents });
  });
  it("distinguishes an expired operator login from consent storage failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "PIPELINE_AUTH" }), { status: 401 })));
    await expect(createLiveConsentSession("ja", { ai: true, photoVideo: false, recording: true })).rejects.toThrow("PIPELINE_AUTH");
  });
  it.each(["ja", "en"])("creates %s consent credentials without any model request", async (language) => {
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "test-only-password-long-enough");
    const provider = vi.fn(); vi.stubGlobal("fetch", provider);
    const response = await POST(new Request("http://local/api/live-consent", { method: "POST", headers: { cookie: `interview_operator=${operatorCookieValue()}` }, body: JSON.stringify({ language }) }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.participantCredentials.participantToken).toBeTruthy();
    expect(body.session.id).toBeTruthy();
    expect(persistSession).toHaveBeenCalledOnce();
    expect(provider).not.toHaveBeenCalled();
    expect(body).not.toHaveProperty("participantTokenHash");
  });
  it("requires operator access when configured", async () => {
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "test-only-password-long-enough");
    expect((await POST(new Request("http://local/api/live-consent", { method: "POST", body: JSON.stringify({ language: "ja" }) }))).status).toBe(401);
    expect(persistSession).not.toHaveBeenCalled();
  });
});
