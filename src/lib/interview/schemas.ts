import { z } from "zod";
import {
  INTERVIEW_STAGES,
  QUESTION_TECHNIQUES,
  STAGE_RECOMMENDATIONS,
} from "./types";
import { SUPPORTED_INTERVIEW_LANGUAGES } from "./languages";

export const InterviewLanguageSchema = z.enum(SUPPORTED_INTERVIEW_LANGUAGES);

export const InternalAnalysisSchema = z.object({
  facts_from_participant: z.array(z.string()),
  participant_stated_values: z.array(z.string()),
  proposed_hypotheses: z.array(z.string()),
  areas_to_clarify: z.array(z.string()),
  technique: z.enum(QUESTION_TECHNIQUES),
  deepen_ok: z.boolean(),
  participant_declined_topic: z.boolean(),
  declined_topic_label: z.string().nullable(),
});

export const StageNavigationSchema = z.object({
  recommendation: z.enum(STAGE_RECOMMENDATIONS),
  reason: z.string(),
});

export const AssistantMessageSchema = z.object({
  question_text: z.string(),
  is_hypothesis: z.boolean(),
  hypothesis_invitation: z.string().nullable(),
});

export const SafetyCheckSchema = z.object({
  avoids_diagnosis: z.boolean(),
  avoids_fabrication: z.boolean(),
  non_leading: z.boolean(),
  flagged_issue: z.string().nullable(),
});

export const InterviewTurnOutputSchema = z.object({
  internal_analysis: InternalAnalysisSchema,
  stage_navigation: StageNavigationSchema,
  assistant_message: AssistantMessageSchema,
  safety: SafetyCheckSchema,
  participant_summary_in_their_words: z.string().nullable(),
});

export type InterviewTurnOutput = z.infer<typeof InterviewTurnOutputSchema>;

export const StartSessionRequestSchema = z.object({
  action: z.literal("start"),
  themeId: z.enum(["A", "B", "C", "D", "E"]),
  interviewLanguage: InterviewLanguageSchema.default("en"),
  publishingLanguage: InterviewLanguageSchema.default("en"),
});

export const MessageRequestSchema = z.object({
  action: z.literal("message"),
  sessionId: z.string().uuid(),
  text: z.string().max(8000),
  command: z
    .enum(["none", "skip", "change_topic", "end", "change_language"])
    .default("none"),
  clientMessageId: z.string().uuid().optional(),
  utteranceId: z.string().uuid().optional(),
  interviewLanguage: InterviewLanguageSchema.optional(),
  publishingLanguage: InterviewLanguageSchema.optional(),
});

export const ResumeSessionRequestSchema = z.object({
  action: z.literal("resume"),
  sessionId: z.string().uuid(),
});

export const InterviewRequestSchema = z.discriminatedUnion("action", [
  StartSessionRequestSchema,
  MessageRequestSchema,
  ResumeSessionRequestSchema,
]);

export type InterviewRequest = z.infer<typeof InterviewRequestSchema>;

export const StageSchema = z.enum(INTERVIEW_STAGES);
