import type { InterviewTheme } from "@/themes/types";
import { CosmeLayout } from "./layout";
import { CosmeUtteranceList } from "./utterance-list";
import { CosmeSpeakCue } from "./speak-cue";
import { CosmeControls } from "./controls";

export const cosmeTheme: InterviewTheme = {
  Layout: CosmeLayout,
  UtteranceList: CosmeUtteranceList,
  SpeakCue: CosmeSpeakCue,
  Controls: CosmeControls,
};
