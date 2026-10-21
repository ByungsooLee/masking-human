/** Language-aware intent detection for mock provider (not for production NLP). */

export function isNoMakeup(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("don't use") ||
    t.includes("do not use") ||
    t.includes("no makeup") ||
    text.includes("化粧") && (text.includes("しない") || text.includes("使わない")) ||
    text.includes("메이크업") && (text.includes("안 ") || text.includes("거의")) ||
    (text.includes("化妆") && (text.includes("不") || text.includes("几乎不")))
  );
}

export function isShortAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "yes" || trimmed === "no") return true;
  if (trimmed === "はい" || trimmed === "いいえ") return true;
  if (trimmed === "네" || trimmed === "아니요") return true;
  if (trimmed === "是" || trimmed === "不是") return true;
  return trimmed.length < 8;
}

export function isContradiction(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("contradict") ||
    (t.includes("but also") && t.includes("not")) ||
    (text.includes("でも") && text.includes("ない")) ||
    (text.includes("지만") && text.includes("아니")) ||
    (text.includes("但也") || (text.includes("但") && text.includes("不")))
  );
}

export function isAppearanceWorry(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("anxious") ||
    t.includes("insecure") ||
    t.includes("worry") ||
    text.includes("不安") ||
    text.includes("걱정") ||
    text.includes("焦虑")
  );
}

export function isNoInsight(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("no insight") ||
    t.includes("nothing special") ||
    text.includes("特にない") ||
    text.includes("별로") ||
    text.includes("没什么")
  );
}

export function isDeclinedTopic(text: string): boolean {
  return (
    /don'?t want to talk about/i.test(text) ||
    /について(?:は)?(?:話|聞)(?:き|さ)たくない/.test(text) ||
    /(?:말|얘기)\s?(?:하고\s?)?싶지\s?않/.test(text) ||
    /不想(?:谈|聊|说)/.test(text)
  );
}

export function extractDeclinedTopicLabel(text: string): string {
  const patterns: RegExp[] = [
    /don'?t want to talk about (.+)/i,
    /(.+)について(?:は)?(?:話|聞)(?:き|さ)たくない/,
    /(.+)은?\s?(?:말|얘기)\s?(?:하고\s?)?싶지\s?않/,
    /不想(?:谈|聊|说)(.+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().slice(0, 120);
  }
  return "prior topic";
}
