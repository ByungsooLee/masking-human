import type { InterviewTheme } from "@/themes/types";
import { MagazineLayout } from "./layout";
import { MagazineUtteranceList } from "./utterance-list";
import { MagazineSpeakCue } from "./speak-cue";
import { MagazineControls } from "./controls";

export const magazineTheme: InterviewTheme = {
  Layout: MagazineLayout,
  UtteranceList: MagazineUtteranceList,
  SpeakCue: MagazineSpeakCue,
  Controls: MagazineControls,
};
