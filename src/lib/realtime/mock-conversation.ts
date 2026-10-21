import type { ListeningPhase, Utterance } from "./types";

type MockStep =
  | { kind: "phase"; phase: ListeningPhase; delayMs: number }
  | { kind: "append"; utterance: Omit<Utterance, "startedAt" | "endedAt">; delayMs: number };

/** Guest line that triggers theme climax effects in the demo script. */
export const MOCK_CLIMAX_UTTERANCE_ID = "mock-guest-2";

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
      text: "お風呂上がりに、いつも何か塗りますか？",
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
      text: "いい記憶ですね。今日はここまでにしましょう。",
    },
  },
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
