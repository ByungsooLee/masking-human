import type { ComponentType } from "react";
import type { LiveUiCopy } from "@/lib/i18n/live-ui";
import type { ConnectionStatus, ListeningPhase, Utterance } from "@/lib/realtime/types";

export type { ConnectionStatus, ListeningPhase, Utterance } from "@/lib/realtime/types";

export type ThemeId = "magazine" | "cinema" | "cosme";

export type ThemeControlsProps = {
  copy: LiveUiCopy;
  connectionStatus: ConnectionStatus;
  error: string | null;
  onStart: () => void;
  onStartMock?: () => void;
  onStartDemo?: () => void;
  onStop: () => void;
  isLive: boolean;
  isMockSession: boolean;
  showMockStart: boolean;
  showDemoStart: boolean;
  mockOnly: boolean;
  sessionRemainingLabel: string | null;
  budgetBlocked?: boolean;
  budgetWarning?: boolean;
  budgetMessage?: string | null;
};

export type ThemeUtteranceListProps = {
  copy: LiveUiCopy;
  utterances: Utterance[];
  listeningPhase?: ListeningPhase;
  cameraStream?: MediaStream | null;
};

export type ThemeSpeakCueProps = {
  copy: LiveUiCopy;
  listeningPhase: ListeningPhase;
};

export type InterviewTheme = {
  Layout: ComponentType<{ children: React.ReactNode }>;
  UtteranceList: ComponentType<ThemeUtteranceListProps>;
  SpeakCue: ComponentType<ThemeSpeakCueProps>;
  Controls: ComponentType<ThemeControlsProps>;
};
