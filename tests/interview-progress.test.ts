import { describe, expect, it, vi } from "vitest";
import { countGuestAnswers, createOpeningGate, interviewTurnGuidance } from "@/lib/realtime/interview-progress";
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
  it("counts actual guest turns, not empty text, AI chunks or duplicate IDs", () => {
    expect(countGuestAnswers([
      { id: "a", speaker: "ai", text: "Opening" },
      { id: "b", speaker: "guest", text: " " },
      { id: "c", speaker: "guest", text: "An answer" },
      { id: "c", speaker: "guest", text: "A longer answer" },
    ])).toBe(1);
  });
  it.each([true, false])("waits for both completed generation and audio drain, regardless of event order (%s)", (audioFirst) => {
    const release = vi.fn();
    const gate = createOpeningGate(release);
    if (audioFirst) gate.audioStopped(); else gate.responseCompleted();
    expect(gate.ready).toBe(false); expect(release).not.toHaveBeenCalled();
    if (audioFirst) gate.responseCompleted(); else gate.audioStopped();
    gate.audioStopped(); gate.responseCompleted();
    expect(gate.ready).toBe(true); expect(release).toHaveBeenCalledOnce();
  });
  it("disables automatic response creation in both client and server configurations", () => {
    expect(buildRealtimeSessionConfig().audio.input.turnDetection).toMatchObject({ createResponse: false, interruptResponse: true });
    expect(buildRealtimeClientSecretSession().audio.input.turn_detection).toMatchObject({ create_response: false, interrupt_response: true });
  });
  it("provides bilingual synthetic review cases without claiming generated-model quality", () => {
    expect(cases.provenance).toContain("not participant transcripts");
    expect(new Set(cases.cases.map((scenario) => scenario.language))).toEqual(new Set(["ja", "en"]));
    expect(cases.cases).toHaveLength(4);
    for (const scenario of cases.cases) expect(scenario.prefer).not.toBe(scenario.avoid);
  });
});
