import type { InterviewTheme } from "@/themes/types";
import { CinemaLayout } from "./layout";
import { CinemaUtteranceList } from "./utterance-list";
import { CinemaSpeakCue } from "./speak-cue";
import { CinemaControls } from "./controls";

export const cinemaTheme: InterviewTheme = {
  Layout: CinemaLayout,
  UtteranceList: CinemaUtteranceList,
  SpeakCue: CinemaSpeakCue,
  Controls: CinemaControls,
};
