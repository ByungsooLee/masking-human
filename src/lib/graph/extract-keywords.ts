const JA_STOP = new Set(["一緒", "今日", "時間", "自分", "本当", "感じ", "最近", "毎回", "何か"]);
const EN_STOP = new Set(["about", "there", "their", "which", "would", "really", "because", "every", "think", "always", "after", "before", "never", "often", "maybe", "things"]);

/** Kanji / katakana runs (2+ chars) and longer English words; used as graph tags linking utterances. */
export function extractKeywords(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/[\p{Script=Han}々]{2,}|[\p{Script=Katakana}ー]{2,}/gu)) {
    const word = m[0];
    if (word.length <= 6 && !JA_STOP.has(word)) found.add(word);
  }
  for (const m of text.toLowerCase().matchAll(/[a-z]{5,}/g)) {
    if (!EN_STOP.has(m[0])) found.add(m[0]);
  }
  return [...found];
}
