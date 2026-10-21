import "server-only";

import { getRealtimeModel, DEFAULT_REALTIME_VOICE } from "./config";
import type { InterviewerAgentId, InterviewLanguage } from "@/lib/magazine-flow/types";
import { loadInterviewerPrompt } from "./load-interviewer-prompt";

/** Session object for POST /v1/realtime/client_secrets */
export function buildRealtimeClientSecretSession(options?: {
  agentId?: InterviewerAgentId;
  interviewLanguage?: InterviewLanguage;
}) {
  const model = getRealtimeModel();
  const lang = options?.interviewLanguage ?? "ja";
  const langNote =
    lang === "en"
      ? "Conduct the interview in English unless the guest switches language."
      : "Conduct the interview in Japanese unless the guest switches language.";

  return {
    type: "realtime" as const,
    model,
    instructions: `${loadInterviewerPrompt(options?.agentId ?? "default")}\n\n${langNote}`,
    audio: {
      input: {
        transcription: {
          model: "gpt-live-transcribe" as const,
          delay: "low" as const,
          languages: ["ja", "en"],
          prompt:
            "Interview about cosmetics, skin care, memories, and life values. Japanese and English.",
        },
      },
      output: {
        voice: DEFAULT_REALTIME_VOICE,
      },
    },
  };
}
