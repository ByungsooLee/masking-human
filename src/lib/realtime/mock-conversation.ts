import type { ListeningPhase, Utterance } from "./types";
import { englishMockText } from "./mock-conversation-en";
import { INTERVIEW_OPENING } from "./interview-opening";

type MockStep =
  | { kind: "phase"; phase: ListeningPhase; delayMs: number }
  | { kind: "append"; utterance: Omit<Utterance, "startedAt" | "endedAt">; delayMs: number };

/** Guest line that triggers theme climax effects in the demo script. */
export const MOCK_CLIMAX_UTTERANCE_ID = "mock-guest-2";

const EXTENDED_DIALOGUE: readonly [string, string][] = [
  ["家族との時間が大切なんですね。普段はどんな時間に話すことが多いですか？", "夕食のあと、急がずに一日のことを話します。"],
  ["急がず話せる時間なんですね。そんな時間を大切にするようになったきっかけは何でしたか？", "昔、母が学校の話を聞いてくれたことです。"],
  ["学校の話を聞いてくれたんですね。印象に残っている場面は何ですか？", "中学生の頃、友人とけんかした日に話しました。"],
  ["聞いてもらえたとき、どう感じましたか？", "話せたことで安心感がありました。"],
  ["安心できたのは、どんなところからでしょうか？", "母が急かさなかったので気持ちを話せました。"],
  ["急かされなかったことが大きいんですね。今はどんなふうに人の話を聞いていますか？", "娘の話が終わるまで、答えを急がずに待ちます。"],
  ["答えを急がず待つんですね。家庭以外では、どんな場面にその姿勢が表れますか？", "仕事でも、困った同僚の話を最後まで聞きます。"],
  ["仕事でも聞く時間を取るんですね。今の仕事を選んだきっかけは何でしたか？", "相談に来た人の役に立てた経験がきっかけです。"],
  ["人の役に立てた経験があったんですね。最近、手応えを感じた出来事は何ですか？", "新人が悩みを話して、少し笑顔になったことです。"],
  ["少し笑顔になったことが残っているんですね。以前の自分と比べて変わったことは何ですか？", "正解を急いで教えるより、話を聞くようになりました。"],
  ["聞くことを大切にするようになったんですね。これから増やしたい時間はどんな時間ですか？", "人の話も自分の気持ちも、ゆっくり聞く時間です。"],
  ["ひとことで言うと、今のあなたが大切にしたいことは何でしょうか？", "人と向き合う時間です。家族との時間も大切です。"],
];

function extendedSteps(): MockStep[] {
  return EXTENDED_DIALOGUE.flatMap(([question, answer], index): MockStep[] => [
    { kind: "phase", phase: "ai_speaking", delayMs: 700 },
    { kind: "append", delayMs: 2800, utterance: { id: `mock-ai-deep-${index + 1}`, speaker: "ai", text: question } },
    { kind: "phase", phase: "guest_may_speak", delayMs: 900 },
    { kind: "append", delayMs: 4800, utterance: { id: `mock-guest-deep-${index + 1}`, speaker: "guest", text: answer } },
    { kind: "phase", phase: "guest_may_speak", delayMs: 1800 },
  ]);
}

/** Sample dialogue for auto-play demo (no Realtime API). */
const MOCK_STEPS: MockStep[] = [
  { kind: "phase", phase: "waiting_ai", delayMs: 600 },
  { kind: "phase", phase: "ai_speaking", delayMs: 400 },
  {
    kind: "append",
    delayMs: 1200,
    utterance: {
      id: "mock-ai-1",
      speaker: "ai",
      text: INTERVIEW_OPENING.ja,
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 800 },
  {
    kind: "append",
    delayMs: 3500,
    utterance: {
      id: "mock-guest-1",
      speaker: "guest",
      text: "肌が乾燥しやすいので、化粧水と乳液をいつも使っています。",
    },
  },
  { kind: "phase", phase: "ai_speaking", delayMs: 600 },
  {
    kind: "append",
    delayMs: 1200,
    utterance: {
      id: "mock-ai-backchannel",
      speaker: "ai",
      text: "化粧水と乳液、毎日なんですね。",
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 900 },
  { kind: "phase", phase: "ai_speaking", delayMs: 600 },
  {
    kind: "append",
    delayMs: 1400,
    utterance: {
      id: "mock-ai-2",
      speaker: "ai",
      text: "その習慣は、誰から教わったんですか？",
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 700 },
  {
    kind: "append",
    delayMs: 4000,
    utterance: {
      id: MOCK_CLIMAX_UTTERANCE_ID,
      speaker: "guest",
      text: "母ですね。中学生のころ、鏡の前で一緒に塗るところを見せてくれました。",
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 5500 },
  { kind: "phase", phase: "ai_speaking", delayMs: 700 },
  {
    kind: "append",
    delayMs: 1300,
    utterance: {
      id: "mock-ai-3",
      speaker: "ai",
      text: "鏡の前のお母さん。そのとき、どんな気持ちでしたか？",
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 700 },
  {
    kind: "append",
    delayMs: 4000,
    utterance: {
      id: "mock-guest-3",
      speaker: "guest",
      text: "大人になれた気がして嬉しかった。今は娘と同じ乳液を塗っています。",
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 2500 },
  { kind: "phase", phase: "ai_speaking", delayMs: 700 },
  {
    kind: "append",
    delayMs: 1200,
    utterance: {
      id: "mock-ai-4",
      speaker: "ai",
      text: "今は娘さんと。その時間があると、何が違いますか？",
    },
  },
  { kind: "phase", phase: "guest_may_speak", delayMs: 700 },
  { kind: "append", delayMs: 3500, utterance: { id: "mock-guest-4", speaker: "guest", text: "家族との時間が大切。乳液を塗ると安心して、母を思い出します。" } },
  { kind: "phase", phase: "ai_speaking", delayMs: 500 },
  { kind: "append", delayMs: 1200, utterance: { id: "mock-ai-5", speaker: "ai", text: "乳液を塗る時間には、どんな意味がありますか？" } },
  { kind: "phase", phase: "guest_may_speak", delayMs: 700 },
  { kind: "append", delayMs: 3500, utterance: { id: "mock-guest-5", speaker: "guest", text: "乳液を塗ることで安心感があります。" } },
  { kind: "phase", phase: "ai_speaking", delayMs: 500 },
  { kind: "append", delayMs: 1200, utterance: { id: "mock-ai-6", speaker: "ai", text: "これから娘さんと、どんな時間を過ごしたいですか？" } },
  { kind: "phase", phase: "guest_may_speak", delayMs: 700 },
  { kind: "append", delayMs: 3500, utterance: { id: "mock-guest-6", speaker: "guest", text: "娘と同じ乳液を使い続けたい。家族との時間が一番大切です。" } },
  ...extendedSteps(),
  { kind: "phase", phase: "ai_speaking", delayMs: 500 },
  { kind: "append", delayMs: 1200, utterance: { id: "mock-ai-close", speaker: "ai", text: "人と向き合う時間が、家族との暮らしや仕事にもつながっているのですね。今日はありがとうございました。" } },
  { kind: "phase", phase: "guest_may_speak", delayMs: 4000 },
];

export function getMockConversationDurationMs(): number {
  return MOCK_STEPS.reduce((sum, step) => sum + step.delayMs, 0);
}

export type MockTimelineHandlers = {
  onPhase: (phase: ListeningPhase) => void;
  onUtterances: (utterances: Utterance[]) => void;
  onComplete?: () => void;
};

export function scheduleMockConversation(
  handlers: MockTimelineHandlers,
  initialUtterances: Utterance[] = [],
  sessionOffsetMs = 0,
  language: "ja" | "en" = "ja",
): () => void {
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let utterances = [...initialUtterances];
  let elapsed = 0;

  for (const step of MOCK_STEPS) {
    elapsed += step.delayMs;
    const at = elapsed;
    const stepDelay = step.delayMs;
    timeouts.push(
      setTimeout(() => {
        if (step.kind === "phase") {
          handlers.onPhase(step.phase);
          return;
        }
        const endMs = sessionOffsetMs + at;
        const startMs = sessionOffsetMs + at - stepDelay;
        utterances = [
          ...utterances,
          {
            ...step.utterance,
            text: language === "en" ? englishMockText(step.utterance.id) ?? step.utterance.text : step.utterance.text,
            startedAt: Math.max(sessionOffsetMs, startMs),
            endedAt: endMs,
          },
        ];
        handlers.onUtterances(utterances);
      }, at),
    );
  }

  const completeAt = elapsed;
  if (handlers.onComplete) {
    timeouts.push(setTimeout(() => handlers.onComplete!(), completeAt));
  }

  return () => {
    for (const id of timeouts) clearTimeout(id);
  };
}
