import type { InterviewSession } from "./types";
import type { InterviewLanguage } from "./languages";
import { getFallbackQuestion } from "./fallback-questions";

const LEADING_EN: RegExp[] = [
  /\byou must feel\b/i,
  /\bthat means you\b/i,
  /\bso you'?re insecure\b/i,
  /\bdeep down you\b/i,
  /\bthe real reason is\b/i,
  /\byou clearly\b/i,
  /\bdon'?t you think\b/i,
];

const LEADING_JA: RegExp[] = [
  /本当は.*でしょう/,
  /つまりあなたは.*に違いない/,
  /誰もが.*思う/,
  /深層心理/,
];

const LEADING_KO: RegExp[] = [
  /분명 .* 느끼/,
  /결국 당신은/,
  /진짜 이유는/,
];

const LEADING_ZH: RegExp[] = [
  /你一定/,
  /这说明你/,
  /真正的原因是/,
];

const DIAGNOSIS_EN: RegExp[] = [
  /\byou have (anxiety|depression|trauma|bpd|adhd)\b/i,
  /\byou are (narcissistic|insecure|codependent)\b/i,
  /\bdiagnos/i,
];

const DIAGNOSIS_JA: RegExp[] = [/不安症|うつ病|診断/, /あなたは.*人格/];
const DIAGNOSIS_KO: RegExp[] = [/불안장애|우울증|진단/, /당신은 .* 성격/];
const DIAGNOSIS_ZH: RegExp[] = [/焦虑症|抑郁症|诊断/, /你是.*人格/];

const FABRICATION_EN: RegExp[] = [
  /\byou said you feel\b/i,
  /\byou told me you\b/i,
];

const FABRICATION_JA: RegExp[] = [/あなたは.*と言った/, /さっき.*感じたと/];
const FABRICATION_KO: RegExp[] = [/당신은 .*라고 했/, /아까 .* 느꼈다/];
const FABRICATION_ZH: RegExp[] = [/你说过你.*感觉/, /刚才你说/];

function patternsForLanguage(lang: InterviewLanguage): {
  leading: RegExp[];
  diagnosis: RegExp[];
  fabrication: RegExp[];
} {
  switch (lang) {
    case "ja":
      return { leading: [...LEADING_EN, ...LEADING_JA], diagnosis: [...DIAGNOSIS_EN, ...DIAGNOSIS_JA], fabrication: [...FABRICATION_EN, ...FABRICATION_JA] };
    case "ko":
      return { leading: [...LEADING_EN, ...LEADING_KO], diagnosis: [...DIAGNOSIS_EN, ...DIAGNOSIS_KO], fabrication: [...FABRICATION_EN, ...FABRICATION_KO] };
    case "zh-CN":
      return { leading: [...LEADING_EN, ...LEADING_ZH], diagnosis: [...DIAGNOSIS_EN, ...DIAGNOSIS_ZH], fabrication: [...FABRICATION_EN, ...FABRICATION_ZH] };
    default:
      return { leading: LEADING_EN, diagnosis: DIAGNOSIS_EN, fabrication: FABRICATION_EN };
  }
}

export interface SafetyValidationResult {
  ok: boolean;
  issues: string[];
}

export function validateQuestionText(
  text: string,
  language: InterviewLanguage,
): SafetyValidationResult {
  const issues: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) issues.push("empty_question");

  const { leading, diagnosis, fabrication } = patternsForLanguage(language);
  for (const pattern of leading) {
    if (pattern.test(trimmed)) issues.push(`leading_language:${pattern.source}`);
  }
  for (const pattern of diagnosis) {
    if (pattern.test(trimmed)) issues.push(`diagnostic_language:${pattern.source}`);
  }
  for (const pattern of fabrication) {
    if (pattern.test(trimmed)) issues.push(`fabricated_reference:${pattern.source}`);
  }
  return { ok: issues.length === 0, issues };
}

export function validateAgainstDeclinedTopics(
  session: InterviewSession,
  questionText: string,
): SafetyValidationResult {
  const issues: string[] = [];
  const lower = questionText.toLowerCase();
  for (const topic of session.declinedTopics) {
    const t = topic.toLowerCase();
    if (t.length > 2 && lower.includes(t)) {
      issues.push(`declined_topic:${topic}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function mergeSafetyChecks(
  session: InterviewSession,
  outputFlags: {
    avoids_diagnosis: boolean;
    avoids_fabrication: boolean;
    non_leading: boolean;
  },
  questionText: string,
): SafetyValidationResult {
  const heuristic = validateQuestionText(
    questionText,
    session.language.interviewLanguage,
  );
  const declined = validateAgainstDeclinedTopics(session, questionText);
  const issues = [...heuristic.issues, ...declined.issues];
  if (!outputFlags.non_leading) issues.push("model_flagged_leading");
  if (!outputFlags.avoids_diagnosis) issues.push("model_flagged_diagnosis");
  if (!outputFlags.avoids_fabrication) issues.push("model_flagged_fabrication");
  return { ok: issues.length === 0, issues };
}

/** @deprecated use getFallbackQuestion(stage, lang) */
export const SAFE_FALLBACK_QUESTIONS = {
  observation: getFallbackQuestion("observation", "en"),
  motivation: getFallbackQuestion("motivation", "en"),
  perspective_shift: getFallbackQuestion("perspective_shift", "en"),
  reflection: getFallbackQuestion("reflection", "en"),
  closing: getFallbackQuestion("closing", "en"),
};

export function detectDeclinedTopicInUserMessage(
  text: string,
  _language: InterviewLanguage,
): string | null {
  const patterns: RegExp[] = [
    /don'?t want to talk about (.+)/i,
    /stop asking about (.+)/i,
    /prefer not to discuss (.+)/i,
    /(.+)について(?:は)?(?:話|聞)(?:き|さ)たくない/,
    /(.+)은?\s?(?:말|얘기)\s?(?:하고\s?)?싶지\s?않/,
    /不想(?:谈|聊|说)(.+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    const topic = m?.[1]?.trim();
    if (topic) return topic.slice(0, 120);
  }
  return null;
}
