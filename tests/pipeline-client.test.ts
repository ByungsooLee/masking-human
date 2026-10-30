import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { summarizePipelineCost } from "@/lib/pipeline/types";

vi.mock("@/lib/pipeline/audio", async (original) => {
  const actual = await original<typeof import("@/lib/pipeline/audio")>();
  return { ...actual, InterviewPcmPlayer: class {
    speaking = false;
    stop() { this.speaking = false; }
    async play(_response: Response, onStart: () => void) { this.speaking = true; onStart(); this.speaking = false; }
  } };
});
import { PipelineInterviewClient } from "@/lib/pipeline/client";

let capture: { port: { onmessage: ((event: { data: Float32Array }) => void) | null }; disconnect: () => void };
let elapsed = 0;
const sessionId = "1807b162-f3c4-4f2a-883c-66ccfe000001";
const month = "2026-10";
const cost = () => summarizePipelineCost({ sessions: {} }, sessionId, month, 10);
const fetcher = vi.fn();
const actions: string[] = [];
let transcriptionResolve: ((response: Response) => void) | null;
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });

function client(addModule: () => Promise<void> = async () => undefined, onTimeLimit: () => void = () => undefined) {
  return new PipelineInterviewClient({
    settings: { agentId: "default", interviewLanguage: "en" }, stream: {} as MediaStream,
    context: { audioWorklet: { addModule }, resume: async () => undefined, createMediaStreamSource: () => ({ connect: () => undefined, disconnect: () => undefined }), destination: {} } as unknown as AudioContext,
    attachAiAudio: () => undefined, elapsed: () => elapsed, onTimeLimit,
  });
}

beforeEach(() => {
  useRealtimeInterviewStore.getState().reset();
  elapsed = 0; actions.length = 0; transcriptionResolve = null;
  vi.stubGlobal("AudioWorkletNode", class {
    port = { onmessage: null };
    constructor() { capture = { port: this.port, disconnect: () => undefined }; }
    connect() {}
    disconnect() {}
  });
  fetcher.mockReset(); fetcher.mockImplementation(async (_url: string, options?: { body?: string }) => {
    if (!options?.body) return json({ cost: cost() });
    const body = JSON.parse(options.body); actions.push(body.action);
    if (body.action === "start") return json({ sessionId, month, opening: "Welcome?", cost: cost(), promptMetadata: { revision: "test", characters: 10, sha256: "test" } });
    if (body.action === "speak") return new Response(new Uint8Array([0, 0]), { headers: { "Content-Type": "audio/pcm" } });
    if (body.action === "transcribe") return new Promise<Response>((resolve) => { transcriptionResolve = resolve; });
    if (body.action === "close") return json({ cost: cost() });
    throw new Error("Unexpected paid operation");
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { vi.unstubAllGlobals(); useRealtimeInterviewStore.getState().reset(); });

describe("pipeline recording lifecycle", () => {
  it("groups audio segments already queued for transcription into one response round", async () => {
    const base = fetcher.getMockImplementation()!;
    const reply = vi.fn<(body: { answerCount: number }) => Promise<Response>>(async () => json({ text: "One follow-up?", cost: cost() }));
    fetcher.mockImplementation(async (url: string, options?: { body?: string }) => {
      if (options?.body && JSON.parse(options.body).action === "reply") return reply(JSON.parse(options.body));
      return base(url, options);
    });
    const interview = client(); await interview.start();
    const turn = () => {
      for (let index = 0; index < 10; index += 1) { elapsed += 64; capture.port.onmessage?.({ data: new Float32Array(1024).fill(0.05) }); }
      for (let index = 0; index < 18; index += 1) { elapsed += 64; capture.port.onmessage?.({ data: new Float32Array(1024) }); }
    };
    turn(); await vi.waitFor(() => expect(transcriptionResolve).not.toBeNull());
    const first = transcriptionResolve!;
    turn(); first(json({ text: "First part", cost: cost() }));
    await vi.waitFor(() => expect(transcriptionResolve).not.toBe(first));
    expect(reply).not.toHaveBeenCalled();
    transcriptionResolve!(json({ text: "Continuation", cost: cost() }));
    await vi.waitFor(() => expect(reply).toHaveBeenCalledOnce());
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(1);
    expect(reply.mock.calls[0][0].answerCount).toBe(1);
    await interview.stop();
  });
  it("does not interrupt the opening or transcribe noise between its sentences", async () => {
    const base = fetcher.getMockImplementation()!;
    let speechCount = 0;
    let nextSentenceRequested = false;
    fetcher.mockImplementation(async (url: string, options?: { body?: string; signal?: AbortSignal }) => {
      if (options?.body && JSON.parse(options.body).action === "start") return json({ sessionId, month, opening: "Welcome! Tell me about yourself?", cost: cost() });
      if (options?.body && JSON.parse(options.body).action === "speak") {
        speechCount += 1;
        if (speechCount === 2) {
          nextSentenceRequested = true;
          return new Promise((_resolve, reject) => options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
        }
      }
      return base(url, options);
    });
    const interview = client();
    const starting = interview.start();
    await vi.waitFor(() => expect(nextSentenceRequested).toBe(true));
    await vi.waitFor(() => expect(useRealtimeInterviewStore.getState().utterances.at(-1)?.text).toBe("Welcome!"));
    for (let index = 0; index < 10; index += 1) { elapsed += 64; capture.port.onmessage?.({ data: new Float32Array(1024).fill(0.05) }); }
    expect(useRealtimeInterviewStore.getState().utterances.at(-1)?.interrupted).not.toBe(true);
    const stopping = interview.stop();
    await stopping; await starting;
    expect(transcriptionResolve).toBeNull();
  });
  it("finishes after eight actual answers and waits for closing speech to finish", async () => {
    const base = fetcher.getMockImplementation()!;
    let replies = 0;
    fetcher.mockImplementation(async (url: string, options?: { body?: string }) => {
      if (options?.body && JSON.parse(options.body).action === "reply") { replies += 1; return json({ text: replies < 8 ? `Question ${replies}?` : "Thank you.", cost: cost() }); }
      return base(url, options);
    });
    const finish = vi.fn();
    const interview = client(undefined, finish);
    await interview.start();
    const frame = (amplitude: number) => { elapsed += 64; capture.port.onmessage?.({ data: new Float32Array(1024).fill(amplitude) }); };
    for (let answerIndex = 1; answerIndex <= 8; answerIndex += 1) {
      transcriptionResolve = null;
      for (let index = 0; index < 10; index += 1) frame(0.05);
      for (let index = 0; index < 18; index += 1) frame(0);
      await vi.waitFor(() => expect(transcriptionResolve).not.toBeNull());
      transcriptionResolve!(json({ text: `Answer ${answerIndex}`, cost: cost() }));
      await vi.waitFor(() => expect(useRealtimeInterviewStore.getState().utterances.at(-1)?.text).toBe(answerIndex < 8 ? `Question ${answerIndex}?` : "Thank you."));
      if (answerIndex < 8) expect(finish).not.toHaveBeenCalled();
    }
    expect(finish).toHaveBeenCalledOnce();
    expect(replies).toBe(8);
    await interview.stop();
  });
  it("recovers an interrupted pending reply after noise transcribes to empty, without inventing a guest utterance", async () => {
    let replyCount = 0;
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (url: string, options?: { body?: string; signal?: AbortSignal }) => {
      if (options?.body && JSON.parse(options.body).action === "reply") {
        replyCount += 1;
        if (replyCount === 1) return new Promise((_resolve, reject) => options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
        return json({ text: "Please tell me more?", cost: cost() });
      }
      return base(url, options);
    });
    const interview = client();
    await interview.start();
    const frame = (amplitude: number) => { elapsed += 64; capture.port.onmessage?.({ data: new Float32Array(1024).fill(amplitude) }); };
    const turn = () => { for (let index = 0; index < 10; index += 1) frame(0.05); for (let index = 0; index < 18; index += 1) frame(0); };
    turn();
    await vi.waitFor(() => expect(transcriptionResolve).not.toBeNull());
    transcriptionResolve!(json({ text: "A real memory", cost: cost() }));
    await vi.waitFor(() => expect(replyCount).toBe(1));
    transcriptionResolve = null;
    turn();
    await vi.waitFor(() => expect(transcriptionResolve).not.toBeNull());
    transcriptionResolve!(json({ text: "", cost: cost() }));
    await vi.waitFor(() => expect(useRealtimeInterviewStore.getState().utterances.at(-1)?.text).toBe("Please tell me more?"));
    expect(replyCount).toBe(2);
    expect(useRealtimeInterviewStore.getState().utterances.filter((row) => row.speaker === "guest")).toHaveLength(1);
    await interview.stop();
  });
  it("preserves an untranscribed interval if final transcription fails while stopping", async () => {
    const interview = client();
    await interview.start();
    for (let index = 0; index < 10; index += 1) { elapsed += 64; capture.port.onmessage?.({ data: new Float32Array(1024).fill(0.05) }); }
    const stopping = interview.stop();
    await vi.waitFor(() => expect(transcriptionResolve).not.toBeNull());
    transcriptionResolve!(new Response(JSON.stringify({ error: "PIPELINE_UPSTREAM_UNCERTAIN" }), { status: 503 }));
    await stopping;
    expect(useRealtimeInterviewStore.getState().usageLedger?.transcriptionGaps).toHaveLength(1);
    expect(useRealtimeInterviewStore.getState().usageLedger?.transcriptionGaps?.[0]).toMatchObject({ reason: "transcription_failed", endedAt: 640 });
    expect(actions.filter((action) => action === "transcribe")).toHaveLength(1);
  });
  it("finishes an in-flight transcription before handing the transcript to history, without generating another reply", async () => {
    const interview = client();
    await interview.start();
    const frame = (amplitude: number) => {
      elapsed += 64;
      capture.port.onmessage?.({ data: new Float32Array(1024).fill(amplitude) });
    };
    for (let index = 0; index < 10; index += 1) frame(0.05);
    for (let index = 0; index < 18; index += 1) frame(0);
    await vi.waitFor(() => expect(transcriptionResolve).not.toBeNull());
    const stopping = interview.stop();
    transcriptionResolve!(json({ text: "My last answer", cost: cost() }));
    await stopping;
    expect(useRealtimeInterviewStore.getState().utterances.at(-1)?.text).toBe("My last answer");
    expect(actions.filter((action) => action === "reply")).toHaveLength(0);
    expect(actions.at(-1)).toBe("close");
    expect(useRealtimeInterviewStore.getState().connectionStatus).toBe("idle");
  });
  it("does not reconnect microphones or play speech when stopped during initialization", async () => {
    let finishModule!: () => void;
    const interview = client(() => new Promise<void>((resolve) => { finishModule = resolve; }));
    const starting = interview.start();
    await vi.waitFor(() => expect(finishModule).toBeDefined());
    await interview.stop();
    finishModule(); await starting;
    expect(actions).not.toContain("speak");
    expect(useRealtimeInterviewStore.getState().connectionStatus).toBe("idle");
  });
});
