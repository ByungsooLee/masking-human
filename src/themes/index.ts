import type { InterviewTheme, ThemeId } from "./types";
import { magazineTheme } from "./magazine";
import { cinemaTheme } from "./cinema";
import { cosmeTheme } from "./cosme";

const themes: Record<ThemeId, InterviewTheme> = {
  magazine: magazineTheme,
  cinema: cinemaTheme,
  cosme: cosmeTheme,
};

export function getInterviewTheme(themeId: ThemeId): InterviewTheme {
  return themes[themeId] ?? magazineTheme;
}

export type { ThemeId, InterviewTheme } from "./types";
