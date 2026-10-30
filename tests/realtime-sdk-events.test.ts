import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIRealtimeWebRTC, RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { WebRtcInterviewControl } from "@/lib/realtime/web-rtc-interview-control";

afterEach(() => vi.unstubAllGlobals());

describe("installed SDK WebRTC event semantics without connecting or billing", () => {
  it("does not mistake SDK audio_stopped for playback drain and needs no audio_start event", async () => {
    vi.stubGlobal("RTCPeerConnection", class { constructor() { throw new Error("Test must never connect"); } });
    const transport = new OpenAIRealtimeWebRTC();
    const session = new RealtimeSession(new RealtimeAgent({ name: "Test" }), { transport });
    vi.spyOn(transport, "connect").mockResolvedValue(undefined);
    await session.connect({ apiKey: "mock-no-network" });
    const generatedStop = vi.fn(); const genericStart = vi.fn(); const mute = vi.fn();
    const control = new WebRtcInterviewControl({ mute, request: vi.fn(), phase: vi.fn(), count: vi.fn(), error: vi.fn(), finish: vi.fn(), deleteItem: vi.fn(), audioStart: vi.fn(), audioStop: vi.fn() });
    session.on("audio_start", genericStart);
    session.on("audio_stopped", generatedStop);
    session.on("transport_event", (event) => control.handle(event as Parameters<typeof control.handle>[0]));
    const deliver = (event: unknown) => (transport as unknown as { _onMessage: (event: { data: string }) => void })._onMessage({ data: JSON.stringify(event) });
    try {
      control.start();
      deliver({ type: "response.created", event_id: "created", response: { id: "intro" } });
      deliver({ type: "output_audio_buffer.started", event_id: "start", response_id: "intro" });
      deliver({ type: "response.output_audio.done", event_id: "audio-generated", response_id: "intro", item_id: "intro-item", output_index: 0, content_index: 0 });
      expect(generatedStop).toHaveBeenCalledOnce();
      expect(genericStart).not.toHaveBeenCalled();
      expect(mute).toHaveBeenLastCalledWith(true);
      deliver({ type: "response.done", event_id: "done", response: { id: "intro", status: "completed", output: [] } });
      expect(mute).toHaveBeenLastCalledWith(true);
      deliver({ type: "output_audio_buffer.stopped", event_id: "drained", response_id: "intro" });
      expect(mute).toHaveBeenLastCalledWith(false);
    } finally { control.stop(); session.close(); }
  });
});
