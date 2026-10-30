import { describe, expect, it, vi } from "vitest";
import { interviewTurnGuidance } from "@/lib/realtime/interview-progress";
import { WebRtcInterviewControl } from "@/lib/realtime/web-rtc-interview-control";
import { buildRealtimeSessionConfig } from "@/lib/realtime/session-payload";
import cases from "../eval/interviewer-bounded-cases.json";

vi.mock("server-only", () => ({}));
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";

describe("bounded interview and opening control", () => {
  it("announces the last two questions and closes without requesting another answer", () => {
    expect(interviewTurnGuidance(2)).toContain("not another product feature");
    expect(interviewTurnGuidance(6)).toContain("Two questions remain");
    expect(interviewTurnGuidance(7)).toContain("final question only");
    for (const count of [8, 9, 100]) {
      expect(interviewTurnGuidance(count)).toContain("Do not ask a question");
      expect(interviewTurnGuidance(count)).toContain("established interview language");
    }
  });
  it.each([true, false])("waits for both completed generation and audio drain, regardless of event order (%s)", (audioFirst) => {
    const mute = vi.fn();
    const control = new WebRtcInterviewControl({ mute, request: vi.fn(), phase: vi.fn(), count: vi.fn(), error: vi.fn(), finish: vi.fn(), deleteItem: vi.fn(), audioStart: vi.fn(), audioStop: vi.fn() });
    control.start();
    control.handle({ type: "response.created", response: { id: "intro" } });
    control.handle({ type: "output_audio_buffer.started", response_id: "intro" });
    const done = { type: "response.done", response: { id: "intro", status: "completed" } };
    const drained = { type: "output_audio_buffer.stopped", response_id: "intro" };
    control.handle(audioFirst ? drained : done);
    control.handle({ type: "response.output_audio.done", response_id: "intro" });
    expect(mute).toHaveBeenLastCalledWith(true);
    control.handle(audioFirst ? done : drained);
    expect(mute).toHaveBeenLastCalledWith(false);
    expect(mute.mock.calls.filter(([muted]) => muted === false)).toHaveLength(1);
    control.stop();
  });
  it("times out missing playback events safely without pretending the audio finished or automatically paying to retry", () => {
    vi.useFakeTimers();
    const request = vi.fn(); const error = vi.fn(); const finish = vi.fn(); const mute = vi.fn();
    const control = new WebRtcInterviewControl({ request, error, finish, mute, phase: vi.fn(), count: vi.fn(), deleteItem: vi.fn(), audioStart: vi.fn(), audioStop: vi.fn() });
    try {
      control.start(); control.handle({ type: "response.created", response: { id: "intro" } });
      control.handle({ type: "response.done", response: { id: "intro", status: "completed" } });
      vi.advanceTimersByTime(90_000);
      expect(error).toHaveBeenLastCalledWith("playback");
      expect(finish).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledOnce();
      expect(mute).toHaveBeenLastCalledWith(true);
      control.resume(); control.resume();
      expect(request).toHaveBeenCalledTimes(2);
    } finally { control.stop(); vi.useRealTimers(); }
  });
  it("gives stop, refusal and skip precedence even at the last-question boundary", () => {
    for (const answers of [0, 6, 7, 8]) {
      expect(interviewTurnGuidance(answers)).toContain("takes priority over every question count");
      expect(interviewTurnGuidance(answers)).toContain("does not imply consent or ending the entire interview");
    }
  });
  it("disables automatic response creation in both client and server configurations", () => {
    expect(buildRealtimeSessionConfig().audio.input.turnDetection).toMatchObject({ createResponse: false, interruptResponse: true });
    expect(buildRealtimeClientSecretSession().audio.input.turn_detection).toMatchObject({ create_response: false, interrupt_response: true });
  });
  it("provides bilingual synthetic review cases without claiming generated-model quality", () => {
    expect(cases.provenance).toContain("not participant transcripts");
    expect(new Set(cases.cases.map((scenario) => scenario.language))).toEqual(new Set(["ja", "en"]));
    expect(cases.cases).toHaveLength(5);
    for (const scenario of cases.cases) expect(scenario.prefer).not.toBe(scenario.avoid);
  });
});
