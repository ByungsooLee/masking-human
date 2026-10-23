import type { Utterance } from "@/lib/realtime/types";
import { findFeelings } from "./lexicon";

const STOP = new Set(["自分", "今日", "時間", "本当", "最近", "感じ", "一緒", "何か", "今", "そう", "こと", "もの", "ため", "それ", "これ", "です", "ます", "私", "思う", "思っ", "ある", "ない", "about", "there", "their", "would", "really", "because", "think", "have", "that", "with", "this", "from", "when", "then", "just", "like", "what", "your", "they", "were", "been"]);

export const TIME_LENSES = [
  { id: "past", ja: "過去", en: "Past", pattern: /昔|以前|子ども|子供|頃|ころ|当時|記憶|思い出|初めて|祖母|祖父|childhood|remember|used to|when i was|years ago/iu },
  { id: "present", ja: "現在", en: "Present", pattern: /今|最近|毎日|普段|いつも|今日|now|today|these days|every day|usually/iu },
  { id: "future", ja: "未来", en: "Future", pattern: /未来|これから|いつか|将来|なりたい|したい|続けたい|明日|future|hope|want to|will|someday/iu },
] as const;

export const MOTIVATION_LENSES = [
  { id: "autonomy", ja: "自分で選ぶ", en: "Choosing for oneself", pattern: /自分で|自分らし|選ん|選ぶ|決め|自由|my choice|choose|decide|my own/iu },
  { id: "competence", ja: "できるようになる", en: "Growing capability", pattern: /できるよう|できた|上達|自信|練習|成長|learned|learnt|confident|improve|able to/iu },
  { id: "relatedness", ja: "人とつながる", en: "Connecting with others", pattern: /一緒|家族|母|父|娘|息子|友人|友達|支え|受け継|family|mother|father|daughter|son\b|friend|together|belong/iu },
] as const;

export function analyzeInterview(utterances: readonly Utterance[]) {
  const guests = utterances.filter((row) => row.speaker === "guest" && row.text.trim());
  const words = new Map<string, { word: string; count: number; utteranceIds: string[] }>();
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  for (const row of guests) {
    for (const token of segmenter.segment(row.text.normalize("NFKC").toLowerCase())) {
      const word = token.segment;
      if (!token.isWordLike || STOP.has(word)) continue;
      if (!/^[\p{Script=Han}\p{Script=Katakana}ー]{2,}$/u.test(word) && !/^[a-z]{4,}$/u.test(word)) continue;
      const item = words.get(word) ?? { word, count: 0, utteranceIds: [] };
      item.count++;
      if (!item.utteranceIds.includes(row.id)) item.utteranceIds.push(row.id);
      words.set(word, item);
    }
  }
  const feelings = new Map<string, string[]>();
  for (const row of guests) {
    for (const feeling of findFeelings(row.text)) {
      feelings.set(feeling, [...(feelings.get(feeling) ?? []), row.id]);
    }
  }
  return {
    words: [...words.values()].sort((left, right) => right.count - left.count || left.word.localeCompare(right.word)).slice(0, 24),
    timeLenses: TIME_LENSES.map((lens) => ({ ...lens, utteranceIds: guests.filter((row) => lens.pattern.test(row.text)).map((row) => row.id) })),
    motivationLenses: MOTIVATION_LENSES.map((lens) => ({ ...lens, utteranceIds: guests.filter((row) => lens.pattern.test(row.text)).map((row) => row.id) })),
    feelings: [...feelings].map(([label, utteranceIds]) => ({ label, utteranceIds })),
    guestTurns: guests.length,
    guestMs: guests.reduce((total, row) => total + Math.max(0, row.endedAt - row.startedAt), 0),
    aiMs: utterances.filter((row) => row.speaker === "ai").reduce((total, row) => total + Math.max(0, row.endedAt - row.startedAt), 0),
  };
}
