import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (callback: unknown) => callback,
  useEffect: (callback: () => unknown) => { callback(); },
}));
vi.mock("@/hooks/use-session-time-limit", () => ({ useSessionTimeLimit: () => ({ arm: vi.fn(), disarm: vi.fn() }) }));
vi.mock("@/stores/realtime-interview-store", async (original) => {
  const actual = await original<typeof import("@/stores/realtime-interview-store")>();
  return { useRealtimeInterviewStore: Object.assign((selector: (state: unknown) => unknown) => selector(actual.useRealtimeInterviewStore.getState()), actual.useRealtimeInterviewStore) };
});
vi.mock("@openai/agents/realtime", () => ({
  RealtimeAgent: class {},
  OpenAIRealtimeWebRTC: class {
    constructor(options: { mediaStream: MediaStream }) { expect(options.mediaStream.getAudioTracks()[0].enabled).toBe(false); }
  },
  RealtimeSession: class {
    handlers = new Map<string, (event?: unknown) => void>();
    transport = { sendEvent: vi.fn() };
    mute = vi.fn((muted: boolean) => { microphone.enabled = !muted; });
    close = vi.fn();
    constructor() { current = { handlers: this.handlers, transport: this.transport, mute: this.mute }; }
    on(name: string, callback: (event?: unknown) => void) { this.handlers.set(name, callback); }
    async connect() { expect(microphone.enabled).toBe(false); }
  },
}));
import { useRealtimeInterview } from "@/hooks/use-realtime-interview";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

let current: {
  handlers: Map<string, (event?: unknown) => void>;
  transport: { sendEvent: ReturnType<typeof vi.fn> };
  mute: ReturnType<typeof vi.fn>;
};
const emit = (event: unknown) => current.handlers.get("transport_event")!(event);
const created = (id: string) => emit({ type: "response.created", response: { id } });
const completed = (id: string, status = "completed") => emit({ type: "response.done", response: { id, status } });
const playback = (id: string, action: "started" | "stopped" | "cleared") => emit({ type: `output_audio_buffer.${action}`, response_id: id });
const answer = (id: string, transcript = "A real answer") => emit({ type: "conversation.item.input_audio_transcription.completed", item_id: id, transcript });
let microphone: { enabled: boolean; stop: ReturnType<typeof vi.fn> };

beforeEach(() => {
  useRealtimeInterviewStore.getState().reset();
  microphone = { enabled: true, stop: vi.fn() };
  const stream = { getAudioTracks: () => [microphone], getTracks: () => [microphone] };
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
  vi.stubGlobal("Audio", class { autoplay = false; });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ clientSecret: "test-secret", sessionId: "test-session", patchToken: "test-patch", instructions: "Test instructions", model: "test-model" }))));
});
afterEach(() => { vi.unstubAllGlobals(); useRealtimeInterviewStore.getState().reset(); });

describe("Realtime manual turn orchestration with a mocked SDK, not a live voice evaluation", () => {
  it("does not respond to opening noise, duplicate transcription or empty text; closes after eight answers and audio drain", async () => {
    const finish = vi.fn();
    const hook = useRealtimeInterview();
    await hook.start({ onTimeLimit: finish, getElapsedMs: () => 0 });
    created("opening"); playback("opening", "started");
    expect(current.mute).toHaveBeenLastCalledWith(true);
    emit({ type: "input_audio_buffer.speech_started", item_id: "delayed-opening-noise" });
    answer("noise-before-intro");
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(1);
    expect(current.transport.sendEvent).toHaveBeenCalledWith({ type: "conversation.item.delete", item_id: "noise-before-intro" });
    completed("opening");
    emit({ type: "response.output_audio.done", response_id: "opening" });
    current.handlers.get("audio_stopped")?.();
    expect(current.mute).toHaveBeenLastCalledWith(true);
    playback("unrelated-response", "stopped");
    expect(current.mute).toHaveBeenLastCalledWith(true);
    playback("opening", "stopped");
    expect(current.mute).toHaveBeenLastCalledWith(false);
    answer("delayed-opening-noise");
    expect(current.transport.sendEvent).toHaveBeenCalledWith({ type: "conversation.item.delete", item_id: "delayed-opening-noise" });
    answer("empty", " ");
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(1);
    for (let index = 1; index <= 8; index += 1) {
      answer(`answer-${index}`); answer(`answer-${index}`);
      const requested = current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create");
      expect(requested).toHaveLength(index + 1);
      expect(useRealtimeInterviewStore.getState().answerCount).toBe(index);
      created(`reply-${index}`);
      if (index === 6) expect(requested.at(-1)![0].response.instructions).toContain("Two questions remain");
      if (index === 7) expect(requested.at(-1)![0].response.instructions).toContain("final question only");
      if (index === 8) {
        expect(requested.at(-1)![0].response.instructions).toContain("Do not ask a question");
        expect(current.mute).toHaveBeenLastCalledWith(true);
        playback("reply-7", "stopped");
        completed(`reply-${index}`);
        expect(finish).not.toHaveBeenCalled();
        playback(`reply-${index}`, "started");
        playback(`reply-${index}`, "stopped");
      } else { playback(`reply-${index}`, "started"); completed(`reply-${index}`); playback(`reply-${index}`, "stopped"); }
    }
    await Promise.resolve();
    expect(finish).toHaveBeenCalledOnce();
    answer("extra-answer"); playback("reply-8", "stopped");
    expect(finish).toHaveBeenCalledOnce();
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(9);
    await hook.stop();
    expect(microphone.stop).toHaveBeenCalledOnce();
  });
  it.each(["error", "failed", "incomplete"])("makes %s recoverable without counting the same answer again or automatically rebilling", async (failure) => {
    const hook = useRealtimeInterview();
    await hook.start(); created("opening"); playback("opening", "started"); completed("opening"); playback("opening", "stopped");
    answer("answer-1");
    const requests = () => current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create");
    if (failure === "error") {
      emit({ type: "error", event_id: "server-unrelated", error: { type: "invalid_request_error", event_id: "conversation-item-retrieve" } });
      expect(useRealtimeInterviewStore.getState().error).toBeNull();
      emit({ type: "error", event_id: "server-rejected", error: { type: "invalid_request_error", event_id: requests().at(-1)![0].event_id } });
    } else { created("failed-reply"); completed("failed-reply", failure); }
    expect(useRealtimeInterviewStore.getState().error).toBeTruthy();
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.cancel")).toHaveLength(0);
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(1);
    const before = requests().length;
    hook.resume(); hook.resume();
    expect(requests()).toHaveLength(before + 1);
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(1);
    created("retry"); playback("retry", "started"); completed("retry"); playback("retry", "stopped");
    expect(useRealtimeInterviewStore.getState().error).toBeNull();
    await hook.stop();
  });
  it("coalesces queued transcription segments and ignores a short acknowledgment during AI playback", async () => {
    const hook = useRealtimeInterview();
    await hook.start(); created("opening"); playback("opening", "started"); completed("opening"); playback("opening", "stopped");
    answer("first-answer"); created("first-reply"); playback("first-reply", "started");
    emit({ type: "input_audio_buffer.speech_started", item_id: "ack", audio_start_ms: 1000 });
    emit({ type: "input_audio_buffer.speech_stopped", item_id: "ack", audio_end_ms: 1400 });
    answer("ack", "はい");
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(1);
    answer("segment-1", "One part"); answer("segment-2", "Another part");
    completed("first-reply");
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(1);
    playback("first-reply", "stopped");
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(2);
    await hook.stop();
  });
  it("restates a question cleared by the server for a short acknowledgment instead of going silent", async () => {
    const hook = useRealtimeInterview();
    await hook.start(); created("opening"); playback("opening", "started"); completed("opening"); playback("opening", "stopped");
    answer("first-answer"); created("first-reply"); playback("first-reply", "started"); completed("first-reply");
    emit({ type: "input_audio_buffer.speech_started", item_id: "ack", audio_start_ms: 1000 });
    playback("first-reply", "cleared");
    emit({ type: "input_audio_buffer.speech_stopped", item_id: "ack", audio_end_ms: 1300 });
    answer("ack", "はい");
    const requests = current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create").map(([event]) => event);
    expect(requests).toHaveLength(3);
    expect(requests[2].response.instructions).toContain("restate only the interrupted question");
    expect(requests[2].response.metadata).toEqual({ interview_request: requests[2].event_id });
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(1);
    await hook.stop();
  });
  it("cancels the server response and clears playback when the connection reports an error mid-reply", async () => {
    const hook = useRealtimeInterview();
    await hook.start(); created("opening"); playback("opening", "started"); completed("opening"); playback("opening", "stopped");
    answer("first-answer"); created("first-reply"); playback("first-reply", "started");
    current.handlers.get("error")?.({ type: "error", error: new Error("data channel closed") });
    expect(current.transport.sendEvent).toHaveBeenCalledWith({ type: "response.cancel", response_id: "first-reply" });
    expect(current.transport.sendEvent).toHaveBeenCalledWith({ type: "output_audio_buffer.clear" });
    expect(useRealtimeInterviewStore.getState().error).toBeTruthy();
    await hook.stop();
  });
  it("never treats a cleared closing buffer as successful completion", async () => {
    const hook = useRealtimeInterview(); const finish = vi.fn();
    await hook.start({ onTimeLimit: finish });
    created("opening"); playback("opening", "started"); completed("opening"); playback("opening", "stopped");
    for (let index = 1; index <= 8; index += 1) {
      answer(`guest-${index}`); created(`reply-${index}`); playback(`reply-${index}`, "started"); completed(`reply-${index}`);
      if (index < 8) playback(`reply-${index}`, "stopped");
    }
    playback("reply-8", "cleared");
    await Promise.resolve();
    expect(finish).not.toHaveBeenCalled(); expect(useRealtimeInterviewStore.getState().error).toBeTruthy();
    hook.resume(); created("closing-retry"); playback("closing-retry", "started"); completed("closing-retry"); playback("closing-retry", "stopped");
    await Promise.resolve();
    expect(finish).toHaveBeenCalledOnce();
    expect(useRealtimeInterviewStore.getState().answerCount).toBe(8);
    await hook.stop();
  });
});
