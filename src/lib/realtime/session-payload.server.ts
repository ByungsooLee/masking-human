import "server-only";

import { getRealtimeModel, DEFAULT_REALTIME_VOICE } from "./config";
import type { InterviewerAgentId, InterviewLanguage, InterviewerProfile } from "@/lib/magazine-flow/types";
import { loadInterviewerPrompt } from "./load-interviewer-prompt";
import { INTERVIEW_OPENING } from "./interview-opening";

/** Session object for POST /v1/realtime/client_secrets */
export function buildRealtimeClientSecretSession(options?: {
  agentId?: InterviewerAgentId;
  interviewLanguage?: InterviewLanguage;
  interviewerProfile?: InterviewerProfile;
  realtimeModel?: import("./model-options").SelectableRealtimeModel;
}) {
  const model = getRealtimeModel(options?.realtimeModel);
  const lang = options?.interviewLanguage ?? "ja";
  const opening = `OPENING (first turn only): Explain the project before asking about a product. Use this introduction and its one question, then wait. Do not add a greeting-only turn, another question, or a list of alternative habits. Do not repeat the introduction later.\n${INTERVIEW_OPENING[lang]}`;
  const langNote =
    lang === "en"
      ? "LANGUAGE POLICY (takes precedence over language examples above): Conduct the interview in English by default. Open warmly in English. At the beginning of the interview, if the guest's first substantive utterance is in another language, such as Korean or Chinese, immediately continue the interview in that language, including questions, acknowledgments and closing. A substantive utterance is a complete answer or request, not a greeting, name, accent, borrowed word or filler. If uncertain, ask briefly in English which language they prefer. Once established, keep that interview language unless the guest explicitly requests a change. Do not switch the interface language; it stays English. Never translate the guest's transcript into English instead of transcribing their own language."
      : "LANGUAGE POLICY (takes precedence over language examples above): Conduct the interview in Japanese. Do not automatically switch languages based on the guest's opening utterance. If they speak another language, briefly explain in Japanese that this mode is Japanese and suggest choosing English mode for multilingual interviews.";

  const profile = options?.interviewerProfile;
  const ageStyle = profile?.age === "young"
    ? "若い成人の聞き手として、軽やかで簡潔に。同世代と決めつけず敬意を保つ。"
    : profile?.age === "senior"
      ? "年配の聞き手として、ゆっくり落ち着いた間を取り、長い時間の変化を丁寧に聞く。説教しない。"
      : "成人の聞き手として、自然な敬語で、親しみと落ち着きを両立する。";
  const persona = `聞き手の演出: ${ageStyle} ジェンダー表現は ${profile?.gender ?? "neutral"}。これは話し方の演出であり、実在の経歴や身体経験を捏造しない。性別から性格や関心を決めつけない。`;
  return {
    type: "realtime" as const,
    model,
    instructions: `${loadInterviewerPrompt(options?.agentId ?? "default")}\n\n${persona}\n${langNote}\n${opening}`,
    audio: {
      input: {
        transcription: {
          model: "gpt-live-transcribe" as const,
          delay: "low" as const,
          ...(lang === "ja" ? { languages: ["ja"] } : {}),
          prompt:
            lang === "ja" ? "Japanese interview about cosmetics, skin care, memories, and life values." : "Multilingual interview about cosmetics, skin care, memories, and life values. Transcribe the original spoken language, including English, Korean, Chinese or Japanese; do not translate.",
        },
      },
      output: {
        voice: profile?.gender === "man" ? "cedar" : DEFAULT_REALTIME_VOICE,
      },
    },
  };
}
