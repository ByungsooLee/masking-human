import { afterEach, describe, expect, it, vi } from "vitest";

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
  OpenAIRealtimeWebRTC: class {},
  RealtimeSession: class {
    handlers = new Map<string, (event?: unknown) => void>();
    transport = { sendEvent: vi.fn() };
    mute = vi.fn();
    close = vi.fn();
    constructor() { current = { handlers: this.handlers, transport: this.transport, mute: this.mute }; }
    on(name: string, callback: (event?: unknown) => void) { this.handlers.set(name, callback); }
    async connect() {}
  },
}));
import { useRealtimeInterview } from "@/hooks/use-realtime-interview";

let current: {
  handlers: Map<string, (event?: unknown) => void>;
  transport: { sendEvent: ReturnType<typeof vi.fn> };
  mute: ReturnType<typeof vi.fn>;
};
const emit = (event: unknown) => current.handlers.get("transport_event")!(event);
const audio = (name: string) => current.handlers.get(name)!();
const completed = () => emit({ type: "response.done", response: { status: "completed" } });
const answer = (id: string, transcript = "A real answer") => emit({ type: "conversation.item.input_audio_transcription.completed", item_id: id, transcript });

afterEach(() => { vi.unstubAllGlobals(); });

describe("Realtime manual turn orchestration with a mocked SDK, not a live voice evaluation", () => {
  it("does not respond to opening noise, duplicate transcription or empty text; closes after eight answers and audio drain", async () => {
    vi.stubGlobal("Audio", class { autoplay = false; });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ clientSecret: "test-secret", sessionId: "test-session", patchToken: "test-patch", instructions: "Test instructions", model: "test-model" }))));
    const finish = vi.fn();
    const hook = useRealtimeInterview();
    await hook.start({ onTimeLimit: finish, getElapsedMs: () => 0 });
    expect(current.mute).toHaveBeenLastCalledWith(true);
    emit({ type: "input_audio_buffer.speech_started", item_id: "delayed-opening-noise" });
    answer("noise-before-intro");
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(1);
    expect(current.transport.sendEvent).toHaveBeenCalledWith({ type: "conversation.item.delete", item_id: "noise-before-intro" });
    completed();
    expect(current.mute).toHaveBeenLastCalledWith(true);
    audio("audio_stopped");
    expect(current.mute).toHaveBeenLastCalledWith(false);
    answer("delayed-opening-noise");
    expect(current.transport.sendEvent).toHaveBeenCalledWith({ type: "conversation.item.delete", item_id: "delayed-opening-noise" });
    answer("empty", " ");
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(1);
    for (let index = 1; index <= 8; index += 1) {
      answer(`answer-${index}`); answer(`answer-${index}`);
      const requested = current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create");
      expect(requested).toHaveLength(index + 1);
      if (index === 6) expect(requested.at(-1)![0].response.instructions).toContain("Two questions remain");
      if (index === 7) expect(requested.at(-1)![0].response.instructions).toContain("final question only");
      if (index === 8) {
        expect(requested.at(-1)![0].response.instructions).toContain("Do not ask a question");
        expect(current.mute).toHaveBeenLastCalledWith(true);
        audio("audio_stopped");
        completed();
        expect(finish).not.toHaveBeenCalled();
        audio("audio_start");
        audio("audio_stopped");
      } else { audio("audio_start"); completed(); audio("audio_stopped"); }
    }
    await Promise.resolve();
    expect(finish).toHaveBeenCalledOnce();
    answer("extra-answer"); audio("audio_stopped");
    expect(finish).toHaveBeenCalledOnce();
    expect(current.transport.sendEvent.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(9);
    await hook.stop();
  });
});
