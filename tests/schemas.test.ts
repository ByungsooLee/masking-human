import { describe, expect, it } from "vitest";
import {
  InterviewRequestSchema,
  InterviewTurnOutputSchema,
} from "@/lib/interview/schemas";

describe("Zod schemas", () => {
  it("parses start request", () => {
    const r = InterviewRequestSchema.safeParse({ action: "start", themeId: "A" });
    expect(r.success).toBe(true);
  });

  it("parses message request", () => {
    const r = InterviewRequestSchema.safeParse({
      action: "message",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      text: "hello",
      command: "skip",
    });
    expect(r.success).toBe(true);
  });

  it("validates structured interview turn output shape", () => {
    const r = InterviewTurnOutputSchema.safeParse({
      internal_analysis: {
        facts_from_participant: ["Uses SPF"],
        participant_stated_values: [],
        proposed_hypotheses: [],
        areas_to_clarify: [],
        technique: "concretize",
        deepen_ok: true,
        participant_declined_topic: false,
        declined_topic_label: null,
      },
      stage_navigation: {
        recommendation: "stay",
        reason: "Need weekday detail",
      },
      assistant_message: {
        question_text: "What does that look like on a weekday?",
        is_hypothesis: false,
        hypothesis_invitation: null,
      },
      safety: {
        avoids_diagnosis: true,
        avoids_fabrication: true,
        non_leading: true,
        flagged_issue: null,
      },
      participant_summary_in_their_words: null,
    });
    expect(r.success).toBe(true);
  });
});
