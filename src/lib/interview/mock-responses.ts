import type { InterviewLanguage } from "./languages";

export interface MockResponseCopy {
  changeTopic: string;
  noMakeupFollowUp: string;
  shortAnswer: string;
  contradiction: string;
  appearanceWorry: string;
  noInsight: string;
  perspectiveShift: (themeTitle: string) => string;
  perspectiveInvitation: string;
  defaultBecause: string;
}

export const MOCK_RESPONSES: Record<InterviewLanguage, MockResponseCopy> = {
  en: {
    changeTopic:
      "We can shift angle—what part of your relationship with beauty feels most true to you right now?",
    noMakeupFollowUp:
      "Thanks for saying that. What do you still do—or skip—for skin or appearance that feels like 'you'?",
    shortAnswer:
      "Could you give one small example from a recent day—what happened and what you did?",
    contradiction: "Both sounds can coexist—when does each side feel more true for you?",
    appearanceWorry:
      "When that worry shows up, what do you usually do—and what would you call that in your own words?",
    noInsight:
      "That's okay. Is there a small habit you keep anyway—without needing it to mean something big?",
    perspectiveShift: (title) =>
      `I might be wrong, but some people see "${title}" differently. Does any alternative story fit you, or not really?`,
    perspectiveInvitation: "I might be wrong—please correct me.",
    defaultBecause: "because",
  },
  ja: {
    changeTopic:
      "角度を変えましょう。今のあなたにいちばんしっくりくる、美容との関係はどんなところですか？",
    noMakeupFollowUp:
      "教えてくれてありがとう。それでも「自分らしい」と感じる、肌や見た目のケアはありますか？",
    shortAnswer:
      "最近の一日を一つだけ例に、何があってどうしたか教えてもらえますか？",
    contradiction:
      "両方の気持ちが同居することもあると思います。それぞれがより当てはまるのはどんなときですか？",
    appearanceWorry:
      "その不安が出てきたとき、普段どうしますか？自分の言葉では何と呼びますか？",
    noInsight:
      "大丈夫です。大きな意味がなくても、続けている小さな習慣はありますか？",
    perspectiveShift: (title) =>
      `私の想像かもしれませんが、「${title}」について別の見方もあると思います。当てはまる部分はありますか？`,
    perspectiveInvitation: "違っていたら訂正してください。",
    defaultBecause: "から",
  },
  ko: {
    changeTopic:
      "관점을 바꿔 볼게요. 지금 당신에게 가장 와닿는 뷰티와의 관계는 어떤 부분인가요?",
    noMakeupFollowUp:
      "말해 주셔서 고마워요. 그래도 ‘나답다’고 느끼는 피부·외모 관리는 무엇인가요?",
    shortAnswer:
      "최근 하루를 하나만 예로 들어, 무슨 일이 있었고 무엇을 하셨는지 말해 주실 수 있을까요?",
    contradiction:
      "두 가지 마음이 공존할 수도 있어요. 각각이 더 맞는 순간은 언제인가요?",
    appearanceWorry:
      "그 걱정이 생길 때 보통 무엇을 하시나요? 스스로는 어떻게 부르시나요?",
    noInsight:
      "괜찮아요. 크게 의미를 두지 않아도 계속하는 작은 습관이 있나요?",
    perspectiveShift: (title) =>
      `제가 틀릴 수도 있지만, "${title}"에 대해 다른 설명도 가능할 것 같아요. 해당되는 부분이 있나요?`,
    perspectiveInvitation: "틀렸다면 바로잡아 주세요.",
    defaultBecause: "때문",
  },
  "zh-CN": {
    changeTopic:
      "我们可以换个角度——此刻对你来说，和美容最贴切的关系是什么？",
    noMakeupFollowUp:
      "谢谢你说这些。那在护肤或外表上，有什么仍让你觉得“像自己”的做法吗？",
    shortAnswer:
      "能举一个最近的日子，说说发生了什么、你做了什么吗？",
    contradiction:
      "两种感受也可能并存——分别在什么时候更贴切？",
    appearanceWorry:
      "当这种担心出现时，你通常会怎么做？用你自己的话会怎么称呼它？",
    noInsight:
      "没关系。有没有不需要特别意义、但你仍会坚持的小习惯？",
    perspectiveShift: (title) =>
      `也许我想错了，关于「${title}」也可能有别的解释。对你来说有贴切的部分吗？`,
    perspectiveInvitation: "如果我理解错了，请纠正我。",
    defaultBecause: "因为",
  },
};

export function mockCopy(lang: InterviewLanguage): MockResponseCopy {
  return MOCK_RESPONSES[lang];
}
