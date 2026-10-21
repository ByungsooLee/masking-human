import type { InterviewLanguage } from "./languages";
import type { InterviewStage } from "./types";

type StageFallbacks = Record<InterviewStage, string>;

const FALLBACKS: Record<InterviewLanguage, StageFallbacks> = {
  en: {
    observation:
      "Could you walk me through what you actually do in a typical day related to beauty or skincare—only what feels comfortable to share?",
    motivation: "What matters to you about that habit, in your own words?",
    perspective_shift:
      "If a friend described the same routine, what alternative explanation might they offer—and would any of that fit you, or not really?",
    reflection:
      "Listening back to what you've said, what stands out to you—not what you think I want to hear?",
    closing:
      "Is there one sentence you'd like future viewers to remember, phrased exactly how you'd say it?",
  },
  ja: {
    observation:
      "美容やスキンケアについて、普段実際にしていることを、話しやすい範囲で教えてもらえますか？",
    motivation: "その習慣で、あなたにとって大切なことは何ですか？自分の言葉で聞かせてください。",
    perspective_shift:
      "友だちが同じ習慣をしていたとしたら、別の説明があり得ると思いますか？あなたには当てはまりますか？",
    reflection:
      "これまでのお話の中で、自分でも「これは」と思うところはどこですか？",
    closing:
      "将来見る人に残したい一文があれば、あなたの言葉のまま教えてください。",
  },
  ko: {
    observation:
      "뷰티나 스킨케어와 관련해 평소에 실제로 하는 일을 편한 만큼만 이야기해 주실 수 있을까요?",
    motivation: "그 습관에서 당신에게 중요한 점은 무엇인가요? 당신만의 말로 들려주세요.",
    perspective_shift:
      "친구가 같은 루틴을 가졌다면, 다른 설명도 가능할까요? 당신에게도 해당되나요?",
    reflection:
      "지금까지 이야기 중에, 스스로도 ‘이 부분은’ 싶은 지점이 있나요?",
    closing:
      "나중에 이 영상을 볼 사람에게 남기고 싶은 한 문장이 있다면, 있는 그대로 말해 주세요.",
  },
  "zh-CN": {
    observation:
      "关于美容或护肤，你平时实际会做什么？只分享你方便说的就好。",
    motivation: "这个习惯对你来说，重要的是什么？请用你自己的话。",
    perspective_shift:
      "如果朋友有同样的习惯，会不会还有别的解释？对你来说合适吗？",
    reflection:
      "回顾刚才说的，有没有哪一点是你自己也特别在意的？",
    closing:
      "如果有一句话想留给以后看到的人，请完全按你的说法告诉我。",
  },
};

export function getFallbackQuestion(
  stage: InterviewStage,
  language: InterviewLanguage,
): string {
  return FALLBACKS[language][stage];
}
