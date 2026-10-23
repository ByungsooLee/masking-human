import type { Utterance } from "@/lib/realtime/types";

export const MAP_CATEGORIES = [
  { id: "trigger", label: "きっかけ・悩み", en: "Triggers & concerns" },
  { id: "experience", label: "原体験・記憶", en: "Experiences & memories" },
  { id: "present", label: "現在の習慣・感情", en: "Habits & feelings" },
  { id: "future", label: "未来・継承", en: "Future & passing on" },
  { id: "value", label: "コアな価値観", en: "Core values" },
] as const;

export type MapCategoryId = typeof MAP_CATEGORIES[number]["id"];
export type AnalysisNode = {
  id: string;
  category: MapCategoryId;
  label: string;
  evidenceIds: string[];
  important: boolean;
  kind: "expression";
};

const MEMORY = /昔|以前|子ども|子供|幼少|学生|中学|高校|大学|頃|ころ|思い出|記憶|初めて|childhood|remember|when i was/iu;
const TRIGGER = /乾燥|肌荒れ|悩み|困っ|きっかけ|敏感肌|ニキビ|concern|dryness|irritation/iu;
const VALUE = /大切|大事|譲れ|欠かせ|守りたい|価値|important|matters|value/iu;
const FUTURE = /未来|これから|いつか|将来|なりたい|したい|続けたい|渡したい|伝えたい|受け継|future|hope|want to|someday/iu;
const NEGATION = /ない|なく|ません|違う|限ら|not\b|never\b|unrelated/iu;
const STOP = new Set(["得意", "不得意", "苦手", "自信", "大切", "大事", "価値", "習慣", "普段", "過去", "未来", "将来", "当時", "以前", "思い出", "記憶", "自分", "一番", "最重要", "最も", "important", "remember", "because", "myself", "would", "there", "really", "think", "things", "always", "about", "which", "their", "these", "those"]);
const PHRASES = /家族との時間|娘との時間|母との時間|母の記憶|母との思い出|家族の絆|肌の乾燥|鏡の前|安心感|大人になれた感覚|自分らしさ|温かい記憶|同じ乳液|中学生の頃|中学生時代|話を聞く/gu;

function keywords(text: string) {
  const phrases = [...text.matchAll(PHRASES)].map((match) => match[0]);
  const content = text.replace(/一番|最も|最重要|大切|大事|得意|苦手/gu, " ");
  const terms = [...content.matchAll(/[\p{Script=Han}々]{2,}|[\p{Script=Katakana}ー]{2,}|[a-zA-Z]{5,}|母|父|娘|肌|鏡/gu)]
    .map((match) => match[0]).filter((word) => word.length <= 16 && !STOP.has(word.toLowerCase()));
  return [...new Set([...phrases, ...terms])].filter((word, _index, all) => !all.some((other) => other !== word && other.includes(word)));
}

function classify(text: string, memoryContext: boolean): MapCategoryId {
  if (VALUE.test(text) && !NEGATION.test(text)) return "value";
  if (FUTURE.test(text)) return "future";
  if (MEMORY.test(text)) return "experience";
  if (TRIGGER.test(text)) return "trigger";
  return memoryContext ? "experience" : "present";
}

function causalParts(text: string): [string, string] | null {
  if (NEGATION.test(text)) return null;
  const forward = text.match(/^(.+?)(?:ので|だから|おかげで|ことで)[、,\s]*(.+)$/u);
  if (forward) return [forward[1], forward[2]];
  const backward = text.match(/^(.+?)(?:のは|理由は)[、,\s]*(.+?)(?:からです|ためです)$/u);
  return backward ? [backward[2], backward[1]] : null;
}

export function buildSelfAnalysisMap(transcript: readonly (Utterance & { excluded?: boolean })[]) {
  const guests = transcript.filter((row) => row.speaker === "guest" && !row.excluded && row.text.trim());
  const found = new Map<string, AnalysisNode>();
  const votes = new Map<string, Map<MapCategoryId, number>>();
  const causes: { parts: [string, string]; evidenceId: string; quote: string }[] = [];
  const coreCandidates = new Set<string>();
  for (const row of guests) {
    for (const sentence of row.text.split(/[。！？.!?\n]+/u).filter(Boolean)) {
      const parts = causalParts(sentence);
      if (parts) causes.push({ parts, evidenceId: row.id, quote: sentence.trim() });
      for (const fragment of parts ?? [sentence]) {
        const category = classify(fragment, MEMORY.test(row.text) && !/今|現在|毎日|now|today/iu.test(sentence));
        const terms = keywords(fragment);
        const core = category === "value" && /一番|最も|最重要|most important/iu.test(fragment);
        if (core && terms.length === 1) coreCandidates.add(terms[0]);
        for (const label of terms) {
          const node = found.get(label) ?? { id: `word:${label}`, category, label, evidenceIds: [], important: false, kind: "expression" as const };
          if (!node.evidenceIds.includes(row.id)) node.evidenceIds.push(row.id);
          node.important ||= category === "value";
          found.set(label, node);
          const counts = votes.get(label) ?? new Map<MapCategoryId, number>();
          counts.set(category, (counts.get(category) ?? 0) + 1);
          votes.set(label, counts);
        }
      }
    }
  }
  const priority: MapCategoryId[] = ["value", "future", "experience", "trigger", "present"];
  for (const [label, node] of found) {
    const counts = votes.get(label)!;
    node.category = [...counts.keys()].sort((left, right) => counts.get(right)! - counts.get(left)! || priority.indexOf(left) - priority.indexOf(right))[0];
    node.important = node.category === "value" && node.important;
  }
  const categories = MAP_CATEGORIES.map((category) => ({ ...category, nodes: [...found.values()]
    .filter((node) => node.category === category.id)
    .sort((left, right) => Number(coreCandidates.has(right.label)) - Number(coreCandidates.has(left.label)) || right.evidenceIds.length - left.evidenceIds.length || left.label.localeCompare(right.label))
    .slice(0, 4) }));
  const nodes = categories.flatMap((category) => category.nodes);
  const relations: { source: string; target: string; evidenceIds: string[]; quote: string }[] = [];
  for (const cause of causes) {
    const candidates = cause.parts.map((part) => nodes.filter((node) => node.evidenceIds.includes(cause.evidenceId) && part.includes(node.label)));
    if (candidates[0].length !== 1 || candidates[1].length !== 1) continue;
    const [source, target] = [candidates[0][0], candidates[1][0]];
    if (source.id === target.id) continue;
    const existing = relations.find((relation) => relation.source === source.id && relation.target === target.id);
    if (existing) {
      if (!existing.evidenceIds.includes(cause.evidenceId)) existing.evidenceIds.push(cause.evidenceId);
    } else relations.push({ source: source.id, target: target.id, evidenceIds: [cause.evidenceId], quote: cause.quote });
  }
  const coreNodes = nodes.filter((node) => node.category === "value" && coreCandidates.has(node.label));
  const coreNodeId = coreNodes.length === 1 ? coreNodes[0].id : null;
  const confirmedRelations = relations.slice(0, 8);
  const storyLines = Array.from({ length: 3 }, (_, index) => {
    const relation = confirmedRelations[index];
    return relation ? `本人が語った理由：「${relation.quote}」 [${relation.evidenceIds.join(", ")}]` : "因果関係は未確認です。会話で理由を確認してください。";
  });
  return { categories, nodes, relations: confirmedRelations, storyLines, coreNodeId, guests };
}

export type SelfAnalysisMapData = ReturnType<typeof buildSelfAnalysisMap>;

export function buildMindMapText(map: SelfAnalysisMapData, name = "自分", language: "ja" | "en" = "ja") {
  if (language === "en") {
    const lines = [`Discovering ${name === "Self" || name === "自分" ? "my" : name + "'s"} values through cosmetics`];
    for (const category of map.categories) {
      lines.push(`  ${category.en}`);
      for (const node of category.nodes) lines.push(`    ${node.id === map.coreNodeId ? "[CORE] " : node.important ? "★ " : ""}${node.label} [${node.evidenceIds.join(", ")}]`);
      if (!category.nodes.length) lines.push("    Not yet discussed");
    }
    for (const relation of map.relations) lines.push(`[Reason: ${map.nodes.find((node) => node.id === relation.source)!.label} ➔ ${map.nodes.find((node) => node.id === relation.target)!.label}] “${relation.quote}” [${relation.evidenceIds.join(", ")}]`);
    lines.push("", "Story connections (three lines)");
    for (let index = 0; index < 3; index++) {
      const relation = map.relations[index];
      lines.push(relation ? `Guest-stated reason: “${relation.quote}” [${relation.evidenceIds.join(", ")}]` : "Causality is unconfirmed. Ask the guest about their reasons.");
    }
    if (!map.coreNodeId) lines.push("Most important core value: unconfirmed");
    lines.push("", "Guest source statements", ...map.guests.map((row) => `[${row.id}] ${row.text}`));
    return lines.join("\n");
  }
  const lines = [`【${name === "自分" ? "コスメ" : name}から紐解く自分の軸】`];
  for (const [index, category] of map.categories.entries()) {
    lines.push(`${index === map.categories.length - 1 ? "└" : "├"}── ${category.label}`);
    for (const node of category.nodes) lines.push(`│   └── ${node.id === map.coreNodeId ? "☁️【重要：コア軸】 " : node.important ? "★ " : ""}${node.label} [${node.evidenceIds.join(", ")}]`);
    if (!category.nodes.length) lines.push("│   └── まだ語られていません");
  }
  for (const relation of map.relations) {
    const source = map.nodes.find((node) => node.id === relation.source)!;
    const target = map.nodes.find((node) => node.id === relation.target)!;
    lines.push(`[因果：${source.label} ➔ ${target.label}] 本人が語った理由 [${relation.evidenceIds.join(", ")}]`);
  }
  lines.push("", "ストーリーの繋がり（3行要約）", ...map.storyLines);
  if (!map.coreNodeId) lines.push("最も重要なコア軸：未確認");
  lines.push("", "根拠となるゲストの発言");
  for (const row of map.guests) lines.push(`[${row.id}] ${row.text}`);
  return lines.join("\n");
}
