/**
 * Laddering (means–end chain) depth of a guest answer:
 * 0 = what they do, 1 = why / how it feels, 2 = memory, people, what it means to them.
 */
export type Depth = 0 | 1 | 2;

const PEOPLE: [RegExp, string][] = [
  [/お母さん|(?<!祖)母|ママ|(?<!grand)mother|\bmom\b/i, "母"],
  [/お父さん|(?<!祖)父|パパ|(?<!grand)father|\bdad\b/i, "父"],
  [/おばあちゃん|祖母|grandma|grandmother/i, "祖母"],
  [/おじいちゃん|祖父|grandpa|grandfather/i, "祖父"],
  [/お姉ちゃん|姉|sister/i, "姉妹"],
  [/妹/, "姉妹"],
  [/お兄ちゃん|兄|弟|brother/i, "兄弟"],
  [/娘|daughter/i, "娘"],
  [/息子|\bson\b/i, "息子"],
  [/子ども|子供|\bkids?\b|children/i, "子ども"],
  [/(?<!丈)夫|旦那|husband/i, "夫"],
  [/妻|\bwife\b/i, "妻"],
  [/友達|友人|friend/i, "友人"],
  [/恋人|partner/i, "恋人"],
  [/家族|family/i, "家族"],
];

const FEELINGS: [RegExp, string][] = [
  [/懐かし|nostalg/i, "懐かしい"],
  [/嬉し|うれし|happy|glad/i, "嬉しい"],
  [/楽し|enjoy|\bfun\b/i, "楽しい"],
  [/安心|ほっと|落ち着|calm|relax/i, "安心"],
  [/気持ちい|心地|comfort/i, "心地よい"],
  [/好き|\blove\b/i, "好き"],
  [/幸せ|happiness/i, "幸せ"],
  [/大人にな|grown[- ]?up/i, "大人になった"],
  [/恥ずかし|embarrass/i, "恥ずかしい"],
  [/寂し|さみし|lonely|\bmiss/i, "寂しい"],
  [/不安|心配|worr/i, "不安"],
  [/面倒|めんどう|hassle/i, "面倒"],
];

const MEMORY = /思い出|記憶|昔|のころ|頃|教わ|教え|受け継|ずっと|今でも|大切|大事|中学|高校|小学|子どもの|remember|childhood|when i was|taught|always have|matters/i;
const REASON = /ので|から|ため|気が|気持ち|感じ|肌が|because|so that|feel|since/i;

function matchAll(text: string, table: [RegExp, string][]): string[] {
  const out = new Set<string>();
  for (const [re, label] of table) if (re.test(text)) out.add(label);
  return [...out];
}

export function findPeople(text: string): string[] {
  return matchAll(text, PEOPLE);
}

export function findFeelings(text: string): string[] {
  return matchAll(text, FEELINGS);
}

export function classifyDepth(text: string): Depth {
  if (findPeople(text).length > 0 || MEMORY.test(text)) return 2;
  if (findFeelings(text).length > 0 || REASON.test(text)) return 1;
  return 0;
}

/** Labels that already appear as people or feelings should not repeat as plain words. */
export function isLexiconWord(word: string): boolean {
  return [...PEOPLE, ...FEELINGS].some(([re, label]) => label.includes(word) || re.test(word));
}
