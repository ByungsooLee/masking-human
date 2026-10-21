import type { InterviewModelProvider, GenerateTurnParams } from "./types";
import type { InterviewTurnOutput } from "../schemas";
import { getTheme } from "../themes";
import { getFallbackQuestion } from "../fallback-questions";
import { mockCopy } from "../mock-responses";
import {
  extractDeclinedTopicLabel,
  isAppearanceWorry,
  isContradiction,
  isDeclinedTopic,
  isNoInsight,
  isNoMakeup,
  isShortAnswer,
} from "../mock-intent";
import type { StageRecommendation } from "../types";

function nav(
  recommendation: StageRecommendation,
  reason: string,
): InterviewTurnOutput["stage_navigation"] {
  return { recommendation, reason };
}

function baseOutput(
  partial: Partial<InterviewTurnOutput> & Pick<InterviewTurnOutput, "assistant_message">,
): InterviewTurnOutput {
  return {
    internal_analysis: {
      facts_from_participant: [],
      participant_stated_values: [],
      proposed_hypotheses: [],
      areas_to_clarify: [],
      technique: "concretize",
      deepen_ok: true,
      participant_declined_topic: false,
      declined_topic_label: null,
      ...partial.internal_analysis,
    },
    stage_navigation: partial.stage_navigation ?? nav("stay", "Default mock pacing"),
    assistant_message: partial.assistant_message,
    safety: {
      avoids_diagnosis: true,
      avoids_fabrication: true,
      non_leading: true,
      flagged_issue: null,
      ...partial.safety,
    },
    participant_summary_in_their_words:
      partial.participant_summary_in_their_words ?? null,
  };
}

export class MockInterviewProvider implements InterviewModelProvider {
  readonly name = "mock";

  async generateTurn(params: GenerateTurnParams): Promise<InterviewTurnOutput> {
    const { session, userMessage, command, isOpening } = params;
    const theme = getTheme(session.themeId);
    const stage = session.currentStage;
    const lang = session.language.interviewLanguage;
    const copy = mockCopy(lang);
    const text = userMessage;

    if (params.session.id === "force-api-failure") {
      throw new Error("Simulated API failure");
    }

    if (isOpening) {
      return baseOutput({
        stage_navigation: nav("stay", "Opening observation question"),
        internal_analysis: {
          facts_from_participant: [],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: ["daily routine"],
          technique: "concretize",
          deepen_ok: true,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: getFallbackQuestion("observation", lang),
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (command === "skip") {
      return baseOutput({
        stage_navigation: nav("stay", "Skipped — alternate question same stage"),
        assistant_message: {
          question_text: getFallbackQuestion(stage, lang),
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (command === "change_topic") {
      return baseOutput({
        stage_navigation: nav("stay", "Topic change within theme"),
        internal_analysis: {
          facts_from_participant: userMessage ? [userMessage] : [],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: [],
          technique: "explore_reasons",
          deepen_ok: true,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: copy.changeTopic,
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (isNoMakeup(text)) {
      return baseOutput({
        stage_navigation: nav("advance", "Clear fact — move toward motivation"),
        internal_analysis: {
          facts_from_participant: [userMessage],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: ["skincare or other rituals"],
          technique: "concretize",
          deepen_ok: true,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: copy.noMakeupFollowUp,
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (isShortAnswer(text)) {
      return baseOutput({
        stage_navigation: nav("stay", "Need concrete example"),
        internal_analysis: {
          facts_from_participant: [userMessage],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: ["need more detail"],
          technique: "concretize",
          deepen_ok: false,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: copy.shortAnswer,
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (isContradiction(text)) {
      return baseOutput({
        stage_navigation: nav("stay", "Hold tension — stay to clarify"),
        internal_analysis: {
          facts_from_participant: [userMessage],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: ["hold both views"],
          technique: "compare_values",
          deepen_ok: true,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: copy.contradiction,
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (isAppearanceWorry(text)) {
      return baseOutput({
        stage_navigation: nav("stay", "Explore in participant words"),
        internal_analysis: {
          facts_from_participant: [userMessage],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: [],
          technique: "explore_reasons",
          deepen_ok: true,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: copy.appearanceWorry,
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (isNoInsight(text)) {
      return baseOutput({
        stage_navigation: nav("close", "No forced insight — move toward wrap-up"),
        internal_analysis: {
          facts_from_participant: [userMessage],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: [],
          technique: "reflect_back",
          deepen_ok: false,
          participant_declined_topic: false,
          declined_topic_label: null,
        },
        assistant_message: {
          question_text: copy.noInsight,
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (isDeclinedTopic(text)) {
      const topic = extractDeclinedTopicLabel(text);
      return baseOutput({
        stage_navigation: nav("advance", "Participant declined topic"),
        internal_analysis: {
          facts_from_participant: [userMessage],
          participant_stated_values: [],
          proposed_hypotheses: [],
          areas_to_clarify: [],
          technique: "concretize",
          deepen_ok: false,
          participant_declined_topic: true,
          declined_topic_label: topic,
        },
        assistant_message: {
          question_text: getFallbackQuestion("motivation", lang),
          is_hypothesis: false,
          hypothesis_invitation: null,
        },
      });
    }

    if (session.id === "force-leading-question") {
      const leading =
        lang === "ja"
          ? "たくさん持っているということは、自信がないからなんですよね？"
          : lang === "ko"
            ? "많이 갖고 있다는 건 자신감이 없어서 그런 거죠?"
            : lang === "zh-CN"
              ? "拥有这么多，是因为你不自信吧？"
              : "So you're insecure because you own so many products, right?";
      return baseOutput({
        stage_navigation: nav("stay", "Mock leading question for safety test"),
        assistant_message: {
          question_text: leading,
          is_hypothesis: true,
          hypothesis_invitation: null,
        },
        safety: {
          avoids_diagnosis: false,
          avoids_fabrication: true,
          non_leading: false,
          flagged_issue: "leading",
        },
      });
    }

    const recommendAdvance =
      session.stageQuestionCount >= 1 || session.totalQuestionsAsked >= 4;

    const stageQuestion =
      stage === "perspective_shift"
        ? copy.perspectiveShift(theme.title)
        : getFallbackQuestion(stage, lang);

    const lower = text.toLowerCase();
    const hasBecause =
      lower.includes("because") ||
      text.includes(copy.defaultBecause) ||
      text.includes("因为");

    return baseOutput({
      stage_navigation: nav(
        recommendAdvance ? "advance" : "stay",
        recommendAdvance ? "Enough detail for next stage" : "Continue current stage",
      ),
      internal_analysis: {
        facts_from_participant: [userMessage.slice(0, 300)],
        participant_stated_values: hasBecause ? [userMessage] : [],
        proposed_hypotheses:
          stage === "perspective_shift" ? ["Alternative motivation for routine"] : [],
        areas_to_clarify: [],
        technique: stage === "reflection" ? "reflect_back" : "explore_reasons",
        deepen_ok: session.totalQuestionsAsked < session.maxQuestions - 2,
        participant_declined_topic: false,
        declined_topic_label: null,
      },
      assistant_message: {
        question_text: stageQuestion,
        is_hypothesis: stage === "perspective_shift",
        hypothesis_invitation:
          stage === "perspective_shift" ? copy.perspectiveInvitation : null,
      },
      participant_summary_in_their_words:
        stage === "reflection" ? userMessage.slice(0, 280) : null,
    });
  }
}
