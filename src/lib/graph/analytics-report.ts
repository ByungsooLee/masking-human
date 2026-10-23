import type { Utterance } from "@/lib/realtime/types";
import { buildSelfAnalysisMap } from "./self-analysis-map";
import { translateInterfaceText } from "@/lib/i18n/interface-text";

const AXES = [
  { label: "伝統・継承", description: "伝統・継承への言及", requestedTrait: "伝統・継承度", pattern: /受け継|伝えたい|渡したい|教えたい|同じ乳液|伝統|tradition|pass on/iu },
  { label: "安心・安定", description: "安心・安定への言及", requestedTrait: "安心・安定度", pattern: /安心|安定|落ち着|穏やか|calm|peace/iu },
  { label: "他者との関わり", description: "他者との関わりへの言及", requestedTrait: "他者共感度", pattern: /家族|母|父|娘|友人|一緒|話を聞く|family|mother|daughter|together/iu },
  { label: "自己表現", description: "自己表現への言及", requestedTrait: "自己表現度", pattern: /なりたい|見せたい|自分らし|表現|個性|ideal|express/iu },
  { label: "変革・挑戦", description: "変革・挑戦への言及", requestedTrait: "変革・挑戦度", pattern: /挑戦|変えたい|新しい|試したい|challenge|change|try something new/iu },
] as const;

const MOTIVES = [
  { id: "pursuit", label: "ポジティブ追求表現", pattern: /憧れ|ワクワク|美し|楽しみ|挑戦|楽しさ|aspir|excit|beauty|challenge/iu },
  { id: "security", label: "リスク回避・安心表現", pattern: /不安解消|不安を解消|保護|守りたい|安定|安心|protect|reassur|security/iu },
] as const;

function shares(counts: number[]): (number | null)[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => null);
  const raw = counts.map((count) => count / total * 100);
  const result = raw.map(Math.floor);
  const order = raw.map((value, index) => ({ index, remainder: value - result[index] })).sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  const remaining = 100 - result.reduce((sum, value) => sum + value, 0);
  for (const item of order.slice(0, remaining)) result[item.index]++;
  return result;
}

export function buildAnalyticsReport(transcript: readonly (Utterance & { excluded?: boolean })[], analyzedAt: string | null = null, language: "ja" | "en" = "ja") {
  const en = language === "en";
  const t = (text: string) => translateInterfaceText(text, language);
  const map = buildSelfAnalysisMap(transcript);
  const densityShares = shares(map.categories.map((category) => category.nodes.length));
  const density = map.categories.map((category, index) => ({ id: category.id, label: t(category.label), count: category.nodes.length, percentage: densityShares[index] }));
  const matched = MOTIVES.map(({ pattern, ...motive }) => ({ ...motive, evidenceIds: map.guests.filter((row) => row.text.split(/[。！？.!?\n]+/u).some((sentence) => !/ない|なく|ません|not\b|never\b/iu.test(sentence) && pattern.test(sentence))).map((row) => row.id) }));
  const motiveShares = shares(matched.map((motive) => motive.evidenceIds.length));
  const motives = matched.map((motive, index) => ({ ...motive, label: t(motive.label), count: motive.evidenceIds.length, percentage: motiveShares[index] }));
  const classifiedIds = new Set(matched.flatMap((motive) => motive.evidenceIds));
  const highestCount = Math.max(0, ...density.map((category) => category.count));
  const leaders = density.filter((category) => category.count === highestCount && highestCount > 0);
  const topicProfile = {
    label: !map.nodes.length ? t("データ不足") : leaders.length === 1 ? (en ? `A conversation focused on ${leaders[0].label}` : `${leaders[0].label}に焦点がある会話`) : t("複数の話題に広がる会話"),
    basis: t("表示マップのカテゴリ別ノード数の最大値。同数なら単一タイプに分類しません。性格や強みの診断ではありません。"),
    observation: leaders.length === 1 ? (en ? `“${leaders[0].label}” has the most displayed keywords (${leaders[0].count}).` : `今回の図では「${leaders[0].label}」が${leaders[0].count}語で最多です。`) : t("単一カテゴリの優位は確認できません。"),
    caution: t("質問内容・発言の長さ・辞書・各枝4語の表示上限に左右されます。本人の関心全体や客観的な能力を示しません。"),
    nextQuestion: map.categories.find((category) => !category.nodes.length)?.label
      ? (en ? `If you would like, share one thought about “${t(map.categories.find((category) => !category.nodes.length)!.label)}”.` : `「${map.categories.find((category) => !category.nodes.length)!.label}」について、話したいことがあればひとつ挙げてみませんか？`)
      : t("最も自分らしい言葉をひとつ選び、その言葉が表れた別の場面を振り返ってみませんか？"),
  };
  const axes = AXES.map(({ pattern, ...axis }) => {
    const evidenceIds = map.guests.filter((row) => pattern.test(row.text)).map((row) => row.id);
    return { ...axis, label: t(axis.label), description: t(axis.description), requestedTrait: t(axis.requestedTrait), evidenceIds, count: evidenceIds.length, coverage: map.guests.length ? Math.round(evidenceIds.length / map.guests.length * 100) : null, psychologicalScore: null };
  });
  const flow = (["experience", "present", "future"] as const).map((id, index) => ({
    id, label: t(["過去・ルーツ", "現在・習慣", "未来・継承"][index]),
    nodes: map.categories.find((category) => category.id === id)!.nodes,
  }));
  const emotionalDrivers = map.relations.filter((relation) => {
    const target = map.nodes.find((node) => node.id === relation.target)!;
    return /安心|嬉し|喜び|楽しい|落ち着|calm|happy/iu.test(target.label);
  }).map((relation) => ({ ...relation, sourceLabel: map.nodes.find((node) => node.id === relation.source)!.label, targetLabel: map.nodes.find((node) => node.id === relation.target)!.label }));
  return {
    map: { ...map, categories: map.categories.map((category) => ({ ...category, label: en ? category.en : category.label })), storyLines: en ? Array.from({ length: 3 }, (_, index) => { const relation = map.relations[index]; return relation ? `Guest-stated reason: “${relation.quote}” [${relation.evidenceIds.join(", ")}]` : "Causality is unconfirmed. Ask the guest about their reasons."; }) : map.storyLines }, axes, flow, density, motives, topicProfile,
    motiveCoverage: { classifiedTurnCount: classifiedIds.size, unclassifiedTurnCount: map.guests.length - classifiedIds.size, bothTurnCount: map.guests.filter((row) => matched.every((motive) => motive.evidenceIds.includes(row.id))).length },
    kpis: {
      guestTurnCount: map.guests.length,
      explicitReasonCount: map.relations.length,
      coreValueTags: map.nodes.filter((node) => node.category === "value").map((node) => ({ label: node.label, evidenceIds: node.evidenceIds })),
      identityStability: { score: null, reason: en ? "No validated psychological stability measure is available from this conversation." : "会話ログから心理的な安定度を算出する妥当な尺度がありません。" },
      emotionalDrivers,
    },
    metadata: {
      schemaVersion: "2.0", analyzerVersion: "local-evidence-v2", analyzedAt,
      method: "ゲスト発言の正規表現・完全一致語句によるローカル抽出。心理測定ではありません。",
      coverageFormula: "該当表現を含むゲスト発言数 ÷ 除外されていない空でないゲスト発言数 × 100（四捨五入）",
      zeroMeaning: "0は該当表現なし。能力・性質がないことを意味しません。否定・引用・皮肉も言及として数える場合があります。",
      maxKeywordsPerBranch: 4, deduplication: "同一表記を全カテゴリで一意化",
      axisPatterns: AXES.map((axis) => ({ label: axis.label, pattern: axis.pattern.source, flags: axis.pattern.flags })),
      motivePatterns: MOTIVES.map((motive) => ({ label: motive.label, pattern: motive.pattern.source, flags: motive.pattern.flags })),
      densityFormula: "表示マップのカテゴリ内ノード数 ÷ 表示ノード総数 × 100。最大剰余法で整数の合計を100に調整。0ノードなら未算出。表示上限各枝4語の影響あり。",
      motiveFormula: "各方向の表現がある発言数 ÷ 両方向の該当発言数の合計 × 100。同じ発言が両方向に含まれる場合は各1件。未分類発言は分母から除き別記。否定語のある文は対象外。該当0件なら未算出。心理的動機の確定ではありません。",
      flowMeaning: "時間軸別の配置。列の順序は世代間の伝播や因果の証明ではありません。",
      promptComponents: ["身近なコスメから始める", "1回1問の5W1H", "本人の意思に沿った3〜6段階の深掘り", "本人の一言", "原文・重複排除・理由の根拠確認"],
      promptSources: ["prompts/interviewer.md", "prompts/interviewers/default.md", "prompts/interviewers/reflective.md"],
      sessionPromptSnapshot: null,
      promptNote: "上記は設計上の構成要素と参照先です。実際のセッションで送信したプロンプト全文・選択スタイルのスナップショットは未保存です。",
      extractionLlmCalls: 0, extractionTokenCount: null, tokenNote: "ローカル抽出のためLLMトークン数・temperature等は適用外。音声会話の利用量とは別です。",
      privacyNote: "出力JSONは発言本文を含みます。共有先を確認してください。",
      ...(en ? {
        method: "Local extraction using regular expressions and exact guest phrases. Not psychological measurement.",
        coverageFormula: "Matching guest turns / nonempty, nonexcluded guest turns × 100, rounded.",
        zeroMeaning: "Zero means no mentions, not absence of a trait. Negation, quotes and irony may still count as mentions.",
        deduplication: "Each exact keyword appears in only one category.",
        densityFormula: "Displayed category nodes / all displayed nodes × 100. Largest-remainder rounding totals 100. No nodes means unavailable. Four-keyword branch limit applies.",
        motiveFormula: "Matching turns in each direction / combined directional matches × 100. A turn matching both counts in both. Unclassified turns are excluded and reported separately. Sentences with negation are skipped. No matches means unavailable, not zero motivation.",
        axisPatterns: AXES.map((axis) => ({ label: t(axis.label), pattern: axis.pattern.source, flags: axis.pattern.flags })),
        motivePatterns: MOTIVES.map((motive) => ({ label: t(motive.label), pattern: motive.pattern.source, flags: motive.pattern.flags })),
        flowMeaning: "Temporal placement only; column order does not prove transmission or causation.",
        promptComponents: ["Start with everyday cosmetics", "One open-ended 5W1H question at a time", "Explore reasons in 3–6 steps with consent", "Ask for the guest's own keyword", "Use original phrases, deduplicate, and verify reasons"],
        promptNote: "Design components and source paths, not a saved snapshot of the actual session instructions or selected style.",
        tokenNote: "Local extraction has no LLM token count or temperature. Separate from voice conversation usage.",
        privacyNote: "JSON includes the transcript. Check who you share it with.",
      } : {}),
    },
  };
}
