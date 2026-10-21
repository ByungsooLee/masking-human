import type { InterviewLanguage } from "@/lib/interview/languages";
import type { UiDictionary, UiLocale } from "./types";
import en from "./locales/en";
import ja from "./locales/ja";
import ko from "./locales/ko";
import zhCN from "./locales/zh-CN";

const dictionaries: Record<UiLocale, UiDictionary> = {
  en,
  ja,
  ko,
  "zh-CN": zhCN,
};

export function getUiDictionary(locale: UiLocale): UiDictionary {
  return dictionaries[locale] ?? en;
}

export type { UiDictionary, UiLocale };

export function uiLocaleFromInterviewLanguage(lang: InterviewLanguage): UiLocale {
  return lang;
}
