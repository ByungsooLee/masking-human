import type { InterviewThemeId } from "./types";
import { THEME_IDS } from "./types";

export interface InterviewTheme {
  id: InterviewThemeId;
  title: string;
  /** Entry for reflection — not a factual claim about participants. */
  explorationPrompt: string;
  observationHints: string[];
  perspectiveShiftHints: string[];
}

export const INTERVIEW_THEMES: Record<InterviewThemeId, InterviewTheme> = {
  A: {
    id: "A",
    title: "Collection and confidence",
    explorationPrompt:
      "Some people wonder whether having many cosmetic products relates to confidence in one's appearance — without assuming that it does.",
    observationHints: [
      "how many products they actually use vs. own",
      "what 'ready' looks like for them",
    ],
    perspectiveShiftHints: [
      "what confidence might mean besides appearance",
      "a time they felt comfortable with less",
    ],
  },
  B: {
    id: "B",
    title: "Present self vs. future self",
    explorationPrompt:
      "Cosmetics can be for the present moment, for a future version of oneself, or both — explore which resonates for this person.",
    observationHints: ["daily rituals", "products saved for 'later'"],
    perspectiveShiftHints: [
      "future self they imagine",
      "whether routines feel like care or investment",
    ],
  },
  C: {
    id: "C",
    title: "For self or for being seen",
    explorationPrompt:
      "Beauty routines may be primarily for oneself, for others' eyes, or a mix — ask without judging either direction.",
    observationHints: ["when they wear or skip makeup", "being alone vs. with others"],
    perspectiveShiftHints: [
      "who they imagine noticing",
      "moments beauty feels private",
    ],
  },
  D: {
    id: "D",
    title: "What sun protection guards",
    explorationPrompt:
      "Sunscreen, hats, and parasols might protect skin, identity, memory, or something else — discover their words, not ours.",
    observationHints: ["sun habits", "what they fear or avoid in sun exposure"],
    perspectiveShiftHints: [
      "what would change if those habits stopped",
      "cultural or family messages about sun",
    ],
  },
  E: {
    id: "E",
    title: "Self without the routine",
    explorationPrompt:
      "If familiar beauty habits disappeared, would 'who they are' shift? Hold this as a question, not a prediction.",
    observationHints: ["core vs. optional steps in their routine"],
    perspectiveShiftHints: [
      "identity beyond products",
      "a period when habits were different",
    ],
  },
};

export function getTheme(id: InterviewThemeId): InterviewTheme {
  return INTERVIEW_THEMES[id];
}

export function listThemes(): InterviewTheme[] {
  return THEME_IDS.map((id) => INTERVIEW_THEMES[id]);
}
