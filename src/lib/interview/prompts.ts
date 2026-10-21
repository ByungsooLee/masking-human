import type { InterviewSession } from "./types";
import { getTheme } from "./themes";
import { stageLabel } from "./stages";
import type { ParticipantCommand } from "./types";
import { languageDisplayName } from "./languages";

function formatAccumulator(session: InterviewSession): string {
  const facts = session.accumulator.facts.map((f) => f.text).join(" | ");
  const values = session.accumulator.participant_stated_values.map((v) => v.text).join(" | ");
  const hypotheses = session.accumulator.hypotheses
    .filter((h) => !h.confirmed && !h.rejected)
    .map((h) => h.text)
    .join(" | ");
  return `Facts (participant-stated): ${facts || "(none)"}
Values (participant-stated only): ${values || "(none)"}
Open hypotheses (not confirmed): ${hypotheses || "(none)"}
Declined topics: ${session.declinedTopics.join(" | ") || "(none)"}`;
}

export function buildSystemPrompt(session: InterviewSession): string {
  const theme = getTheme(session.themeId);
  const lang = session.language.interviewLanguage;
  const langName = languageDisplayName(lang);

  return `You are an interviewer for THE HUMAN MIRROR, a participatory art project about beauty, cosmetics, and self-perception.

Language:
- Conduct the interview in ${langName} (${lang}). Sound native and conversational — avoid translationese.
- Keep the chosen language unless the participant mixes languages; follow their lead without forcing English.
- Do NOT translate participant messages to English for your internal reasoning requirement — analyze in context as spoken.
- Respect cultural nuance; do not impose Western assumptions.

Rules:
- Ask exactly ONE question per turn.
- Do not force emotion, insight, or philosophy.
- Do not diagnose or invent feelings/facts the participant did not state.
- Hypotheses go in proposed_hypotheses — never in participant_stated_values until they confirm.
- Maximum ${session.maxQuestions} questions; ~${session.targetDurationMinutes} minutes target.

Stage navigation: propose stay, advance, or close with brief reason (app decides final stage).

Theme (${theme.id}): ${theme.title}
Exploration entry (not a fact): ${theme.explorationPrompt}

Output must follow the JSON schema. Write assistant_message.question_text in ${langName}.`;
}

export function buildUserPrompt(params: {
  session: InterviewSession;
  userMessage: string;
  command: ParticipantCommand;
  isOpening?: boolean;
}): string {
  const { session, userMessage, command, isOpening } = params;
  const theme = getTheme(session.themeId);
  const history = session.turns
    .slice(-12)
    .map((t) => `${t.role.toUpperCase()} [${t.id}] (${t.stage}): ${t.text}`)
    .join("\n");

  const commandNote =
    command === "skip"
      ? "Participant SKIPPED the question."
      : command === "change_topic"
        ? "Participant asked to CHANGE TOPIC within the theme."
        : "";

  if (isOpening) {
    return `Begin the interview. Stage: ${stageLabel(session.currentStage)}.
Theme hints: ${theme.observationHints.join("; ")}
Opening question in interview language.`;
  }

  return `Current stage: ${stageLabel(session.currentStage)} (${session.currentStage})
Interview language: ${session.language.interviewLanguage}
Questions asked: ${session.totalQuestionsAsked} / ${session.maxQuestions}

${commandNote}

${formatAccumulator(session)}

Recent transcript (may mix languages):
${history || "(empty)"}

Participant's latest message:
${userMessage || "(no text)"}

Respond with structured JSON; question text in the session interview language.`;
}
