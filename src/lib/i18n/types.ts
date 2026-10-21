import type { InterviewLanguage } from "@/lib/interview/languages";

export type UiLocale = InterviewLanguage;

export interface UiDictionary {
  appTitle: string;
  appSubtitle: string;
  themeLabel: string;
  interviewLanguageLabel: string;
  publishingLanguageLabel: string;
  beginInterview: string;
  starting: string;
  stage: string;
  questions: string;
  status: string;
  yourAnswerPlaceholder: string;
  send: string;
  skipQuestion: string;
  changeTopic: string;
  endEarly: string;
  recording: string;
  changeLanguage: string;
  languageUpdated: string;
  errors: {
    startFailed: string;
    sendFailed: string;
    unsupportedLanguage: string;
  };
  themes: Record<"A" | "B" | "C" | "D" | "E", string>;
}
