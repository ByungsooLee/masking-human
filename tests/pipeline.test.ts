import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { encodeInterviewWav, InterviewVoiceDetector } from "@/lib/pipeline/audio";
import { PipelineCostPanel } from "@/components/usage/pipeline-cost-panel";
import { OperatorAccessStatus } from "@/components/live/interview-engine-settings";
import { pipelineError } from "@/lib/pipeline/copy";

vi.mock("server-only", () => ({}));
import { PIPELINE_MODELS, verifyPipelineCredit } from "@/lib/pipeline/config.server";
import { operatorAuthorized, operatorCookieValue, sameOrigin, validOperatorPassword } from "@/lib/pipeline/auth.server";
import { closePipeline, decodePipelineWav, pipelineCost, replyPipeline, reservePipelineCharge, settlePipelineCharge, speakPipeline, startPipeline, transcribePipeline } from "@/lib/pipeline/service.server";
import { POST } from "@/app/api/pipeline/route";
import type { PipelineCharge } from "@/lib/pipeline/types";

let directory: string;
const settings = { agentId: "default", interviewLanguage: "ja" } as const;
const rates = {
  [PIPELINE_MODELS.reply]: { prompt: "0.00000025", completion: "0.0000015" },
  [PIPELINE_MODELS.fallback]: { prompt: "0.00000015", completion: "0.0000006" },
  [PIPELINE_MODELS.transcription]: { prompt: "0.00000333", completion: "0" },
  [PIPELINE_MODELS.speech]: { prompt: "0.000004", completion: "0" },
};
const catalog = () => new Response(JSON.stringify({ data: Object.entries(rates).map(([id, pricing]) => ({ id, pricing, supported_voices: ["nadine"] })) }));
const fetcher = vi.fn();

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "interview-cost-test-"));
  vi.stubEnv("INTERVIEW_USAGE_DIR", directory);
  vi.stubEnv("OPENROUTER_API_KEY", "test-only-key");
  vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "test-only-password-long-enough");
  vi.stubEnv("INTERVIEW_MONTHLY_BUDGET_USD", "10");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("VERCEL", "");
  fetcher.mockReset(); fetcher.mockImplementation(async (url: string) => url.endsWith("/credits") ? new Response("{}", { status: 403 }) : url.endsWith("/key") ? new Response(JSON.stringify({ data: { limit: 5, limit_remaining: 5 } })) : catalog());
  vi.stubGlobal("fetch", fetcher);
});
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe("pipeline cost and authorization", () => {
  it("uses the browser-facing host when Next rewrites a loopback URL internally", () => {
    const request = (origin: string) => new Request("http://localhost:3000/api/pipeline/operator", { headers: { host: "127.0.0.1:3000", origin } });
    expect(sameOrigin(request("http://127.0.0.1:3000"))).toBe(true);
    expect(sameOrigin(request("http://localhost:3000"))).toBe(false);
    expect(sameOrigin(request("https://malicious.example"))).toBe(false);
    expect(sameOrigin(request("http://127.0.0.1:3001"))).toBe(false);
    expect(sameOrigin(request("null"))).toBe(false);
  });
  it("accepts an eight-character operator password and rejects shorter settings", () => {
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "testpass");
    expect(validOperatorPassword("testpass")).toBe(true);
    expect(operatorAuthorized(new Request("http://local", { headers: { cookie: `interview_operator=${operatorCookieValue()}` } }))).toBe(true);
    vi.stubEnv("INTERVIEW_OPERATOR_PASSWORD", "shortpw");
    expect(validOperatorPassword("shortpw")).toBe(false);
    expect(operatorAuthorized(new Request("http://local", { headers: { cookie: `interview_operator=${operatorCookieValue()}` } }))).toBe(false);
  });
  it("rejects forged, expired and cross-origin operator credentials without calling a provider", async () => {
    const cookie = operatorCookieValue();
    expect(validOperatorPassword("wrong")).toBe(false);
    expect(operatorAuthorized(new Request("http://local", { headers: { cookie: `interview_operator=${cookie}` } }))).toBe(true);
    expect(operatorAuthorized(new Request("http://local", { headers: { cookie: `interview_operator=${cookie.slice(0, -1)}z` } }))).toBe(false);
    expect(operatorAuthorized(new Request("http://local", { headers: { cookie: `interview_operator=${operatorCookieValue(Date.now() - 9 * 60 * 60 * 1000)}` } }))).toBe(false);
    const request = (headers: Record<string, string>) => new Request("http://local/api/pipeline", { method: "POST", headers, body: JSON.stringify({ action: "start", settings }) });
    expect((await POST(request({}))).status).toBe(401);
    expect((await POST(request({ cookie: `interview_operator=${cookie}`, origin: "https://other.example" }))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves reservations and charges across concurrent requests and process-style reloads", async () => {
    const session = await startPipeline(settings);
    vi.stubEnv("INTERVIEW_MONTHLY_BUDGET_USD", "0.01");
    const charges: PipelineCharge[] = Array.from({ length: 12 }, () => ({ id: randomUUID(), stage: "speech", model: PIPELINE_MODELS.speech, status: "pending", usd: null, reservedUsd: 0.004, at: new Date().toISOString() }));
    const results = await Promise.allSettled(charges.map((charge) => reservePipelineCharge(session.month, session.sessionId, charge)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    const cost = await pipelineCost(session.month, session.sessionId);
    expect(cost.reservedUsd).toBeCloseTo(0.008);
    expect(cost.remainingUsd).toBeCloseTo(0.002);
    const entry = cost.entries[0];
    await settlePipelineCharge(session.month, session.sessionId, entry.id, { status: "reported", usd: 0.001 });
    const again = await pipelineCost(session.month, session.sessionId);
    expect(again.sessionUsd).toBe(0.001);
    expect(again.reservedUsd).toBe(0.004);
    const stored = await readFile(path.join(directory, `${session.month}.json`), "utf8");
    expect(stored).not.toContain("test-only-key");
    expect(stored).not.toContain("test-only-password");
  });
  it("keeps uncertain requests reserved, blocks duplicate billing and closes sessions", async () => {
    const session = await startPipeline(settings);
    const charge: PipelineCharge = { id: randomUUID(), stage: "reply", model: PIPELINE_MODELS.reply, status: "pending", usd: null, reservedUsd: 0.01, at: new Date().toISOString() };
    await reservePipelineCharge(session.month, session.sessionId, charge);
    await settlePipelineCharge(session.month, session.sessionId, charge.id, { status: "unknown" });
    const cost = await pipelineCost(session.month, session.sessionId);
    expect(cost.unknown).toBe(1); expect(cost.reservedUsd).toBe(0.01);
    await expect(reservePipelineCharge(session.month, session.sessionId, charge)).rejects.toThrow("PIPELINE_DUPLICATE");
    await closePipeline(session.month, session.sessionId);
    await expect(reservePipelineCharge(session.month, session.sessionId, { ...charge, id: randomUUID() })).rejects.toThrow("PIPELINE_SESSION");
    expect((await pipelineCost(session.month, session.sessionId)).entries).toHaveLength(1);
  });
  it("fails closed for corrupt files and ephemeral Vercel storage", async () => {
    vi.stubEnv("VERCEL", "1");
    await expect(pipelineCost("2026-10", "")).rejects.toThrow("PIPELINE_STORAGE");
    vi.stubEnv("VERCEL", "");
    await expect(pipelineCost("../private", "")).rejects.toThrow("PIPELINE_SESSION");
  });
});

describe("provider contract and usage", () => {
  it("blocks an exhausted key limit without claiming to have checked the account balance", async () => {
    fetcher.mockResolvedValue(new Response(JSON.stringify({ data: { limit: 5, limit_remaining: 0 } })));
    await expect(startPipeline(settings)).rejects.toThrow("PIPELINE_KEY_LIMIT");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(pipelineError("PIPELINE_CREDITS", false)).toContain("月間上限の設定だけでは残高は追加されません");
  });
  it("does not treat a failed key lookup as a zero account balance", async () => {
    fetcher.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(verifyPipelineCredit()).rejects.toThrow("PIPELINE_CREDIT_CHECK");
  });
  it("uses only the normal-key endpoint even when the management-only credits endpoint rejects access", async () => {
    expect(await verifyPipelineCredit()).toEqual({ accountBalanceChecked: false, keyRemainingUsd: 5 });
    const session = await startPipeline(settings);
    expect(session.sessionId).toBeTruthy();
    expect(fetcher.mock.calls.some(([url]) => url.endsWith("/credits"))).toBe(false);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith("/key"))).toHaveLength(2);
  });
  it("accepts explicitly unlimited keys but rejects malformed limit data", async () => {
    fetcher.mockResolvedValue(new Response(JSON.stringify({ data: { limit: null, limit_remaining: null } })));
    expect(await verifyPipelineCredit()).toEqual({ accountBalanceChecked: false, keyRemainingUsd: null });
    for (const data of [{}, { limit: 5, limit_remaining: null }, { limit: 5, limit_remaining: "5" }]) {
      fetcher.mockResolvedValue(new Response(JSON.stringify({ data })));
      await expect(verifyPipelineCredit()).rejects.toThrow("PIPELINE_CREDIT_CHECK");
    }
  });
  it("uses a duration-validated WAV and reports STT costs without a second transcription call", async () => {
    const session = await startPipeline(settings);
    const audio = encodeInterviewWav([new Float32Array(16000).fill(0.1)]);
    expect(decodePipelineWav(audio)).toBe(1);
    fetcher.mockResolvedValue(new Response(JSON.stringify({ text: "これはテストです", usage: { cost: 0.000004 } })));
    const requestId = randomUUID();
    const result = await transcribePipeline({ action: "transcribe", month: session.month, sessionId: session.sessionId, requestId, audio });
    expect(result.text).toBe("これはテストです");
    expect(result.cost.entries[0].status).toBe("reported");
    expect(result.cost.sessionUsd).toBe(0.000004);
    const body = JSON.parse(fetcher.mock.calls.at(-1)![1].body);
    expect(body.language).toBe("ja"); expect(body.provider.data_collection).toBe("deny");
    const calls = fetcher.mock.calls.length;
    await expect(transcribePipeline({ action: "transcribe", month: session.month, sessionId: session.sessionId, requestId, audio })).rejects.toThrow("PIPELINE_DUPLICATE");
    expect(fetcher).toHaveBeenCalledTimes(calls);
    const invalid = Buffer.from(audio, "base64"); invalid.writeUInt32LE(999999, 40);
    expect(() => decodePipelineWav(invalid.toString("base64"))).toThrow("PIPELINE_AUDIO");
  });
  it.each([429, 404])("falls back exactly once on %s and preserves the full refusal and correction context", async (status) => {
    const session = await startPipeline({ ...settings, interviewLanguage: "en" });
    fetcher.mockReset();
    fetcher.mockResolvedValueOnce(new Response("{}", { status }));
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id: "generation-test", choices: [{ message: { content: "What would you like to talk about instead?" }, finish_reason: "stop" }], usage: { prompt_tokens: 800, completion_tokens: 30, cost: 0.0002 } })));
    const messages = [{ role: "assistant" as const, content: "What matters to you?" }, { role: "user" as const, content: "I don't want to talk about my family. Also, I meant work, not school." }];
    const result = await replyPipeline({ action: "reply", month: session.month, sessionId: session.sessionId, requestId: randomUUID(), messages });
    expect(result.model).toBe(PIPELINE_MODELS.fallback);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.cost.entries.map((entry) => entry.status)).toEqual(["rejected", "reported"]);
    const body = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(body.messages.slice(1)).toEqual(messages);
    expect(body.messages[0].content).toContain("Korean or Chinese");
    expect(body.provider.max_price).toBeDefined();
    expect(body.provider.data_collection).toBe("deny");
    expect(body.max_tokens).toBe(512);
    expect(JSON.stringify(await pipelineCost(session.month, session.sessionId))).not.toContain("my family");
  });
  it("does not automatically repeat a request after a network timeout or invent missing usage", async () => {
    const session = await startPipeline(settings);
    fetcher.mockReset(); fetcher.mockRejectedValue(new Error("timeout"));
    await expect(replyPipeline({ action: "reply", month: session.month, sessionId: session.sessionId, requestId: randomUUID(), messages: [{ role: "user", content: "test" }] })).rejects.toThrow("PIPELINE_UPSTREAM_UNCERTAIN");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const cost = await pipelineCost(session.month, session.sessionId);
    expect(cost.entries[0].usd).toBeNull(); expect(cost.entries[0].status).toBe("unknown");
    expect(cost.reservedUsd).toBeGreaterThan(0);
  });
  it("streams speech and marks character-priced charges as estimated", async () => {
    const session = await startPipeline(settings);
    vi.stubEnv("OPENROUTER_TTS_VOICE", "changed-after-start");
    fetcher.mockResolvedValue(new Response(new Uint8Array([0, 0, 100, 0]), { headers: { "Content-Type": "audio/pcm", "X-Generation-Id": "speech-test" } }));
    const response = await speakPipeline({ action: "speak", month: session.month, sessionId: session.sessionId, requestId: randomUUID(), text: "こんにちは" });
    expect(response.headers.get("X-Audio-Sample-Rate")).toBe("44100");
    expect((await response.arrayBuffer()).byteLength).toBe(4);
    const cost = await pipelineCost(session.month, session.sessionId);
    expect(cost.entries[0].status).toBe("estimated");
    expect(cost.sessionUsd).toBeCloseTo(5 * 0.000004);
    expect(cost.reservedUsd).toBe(0);
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).voice).toBe("nadine");
  });
});

describe("capture and operator display", () => {
  it.each([false, true])("shows distinct login states and actionable failures (English=%s)", (en) => {
    const states = ["checking", "signed-out", "signing-in", "signed-in"] as const;
    const labels = en ? ["Checking login…", "Not signed in", "Signing in…", "✓ Signed in"] : ["ログイン状態を確認中…", "未ログイン", "ログイン確認中…", "✓ ログイン済み"];
    states.forEach((state, index) => {
      const html = renderToStaticMarkup(createElement(OperatorAccessStatus, { state, en }));
      expect(html).toContain(labels[index]);
      if (state === "signed-in") expect(html).toContain("#eef5ef");
    });
    expect(pipelineError("PIPELINE_BAD_PASSWORD", en)).toContain(en ? "Check the operator password" : "パスワードを確認");
    expect(pipelineError("PIPELINE_COOKIE", en)).toContain(en ? "Allow cookies" : "Cookieを許可");
    expect(pipelineError("PIPELINE_LOGIN_NETWORK", en)).toContain(en ? "connection" : "通信状態");
  });
  it("waits through a natural pause, keeps pre-roll and splits long answers without generating a turn", () => {
    const start = vi.fn(); const segment = vi.fn();
    const detector = new InterviewVoiceDetector({ start, segment });
    const voice = new Float32Array(1024).fill(0.05); const silence = new Float32Array(1024);
    for (let index = 0; index < 8; index += 1) detector.push(silence, false);
    for (let index = 0; index < 10; index += 1) detector.push(voice, false);
    for (let index = 0; index < 8; index += 1) detector.push(silence, false);
    expect(segment).not.toHaveBeenCalled();
    for (let index = 0; index < 10; index += 1) detector.push(silence, false);
    expect(start).toHaveBeenCalledOnce(); expect(segment).toHaveBeenCalledOnce(); expect(segment.mock.calls[0][1]).toBe(true);
    for (let index = 0; index < 600; index += 1) detector.push(voice, false);
    expect(segment.mock.calls.at(-1)![1]).toBe(false);
    detector.flush(); expect(segment.mock.calls.at(-1)![1]).toBe(true);
  });
  it("labels unknown costs and distinguishes reported, estimated, and pending in both languages", async () => {
    const session = await startPipeline(settings);
    await reservePipelineCharge(session.month, session.sessionId, { id: randomUUID(), stage: "reply", model: PIPELINE_MODELS.reply, status: "unknown", usd: null, reservedUsd: 0.01, at: new Date().toISOString() });
    const cost = await pipelineCost(session.month, session.sessionId);
    for (const en of [true, false]) {
      const html = renderToStaticMarkup(createElement(PipelineCostPanel, { cost, en }));
      expect(html).toContain(en ? "Unresolved charges" : "未確定料金あり");
      expect(html).toContain("$0.0100");
      const missing = renderToStaticMarkup(createElement(PipelineCostPanel, { cost: null, en }));
      expect(missing).toContain(en ? "does not mean $0" : "$0という意味ではありません");
    }
  });
});
