import type { InterviewLanguage } from "./languages";

export interface EngineMessages {
  farewell: string;
  endedEarly: string;
  alreadyEnded: string;
  emptyInput: string;
  complete: string;
  languageChanged: string;
  providerRetry: string;
}

const MESSAGES: Record<InterviewLanguage, EngineMessages> = {
  en: {
    farewell: "Thank you. We will treat your words as you shared them. You can close this page.",
    endedEarly: "Understood — we'll stop here. Thank you for what you shared.",
    alreadyEnded: "This session has already ended.",
    emptyInput: "Please share a response, or use skip / change topic / end.",
    complete: "Thank you for sharing. This interview is complete.",
    languageChanged:
      "Language updated. Your next question will continue in the new language.",
    providerRetry:
      "Something went wrong reaching the AI. Your answer was saved—please try sending again in a moment.",
  },
  ja: {
    farewell: "ありがとうございました。共有いただいた言葉をそのまま大切にします。このページを閉じてください。",
    endedEarly: "承知しました。ここで終了します。共有してくださりありがとうございました。",
    alreadyEnded: "このセッションはすでに終了しています。",
    emptyInput: "回答を入力するか、スキップ・話題変更・終了を選んでください。",
    complete: "共有ありがとうございました。インタビューは完了です。",
    languageChanged: "言語を更新しました。次の質問から新しい言語で続けます。",
    providerRetry:
      "AIへの接続で問題が発生しました。回答は保存されています。しばらくしてから再度お試しください。",
  },
  ko: {
    farewell:
      "감사합니다. 말씀해 주신 내용을 그대로 소중히 다루겠습니다. 이 페이지를 닫으셔도 됩니다.",
    endedEarly: "알겠습니다. 여기서 마치겠습니다. 나눠 주셔서 감사합니다.",
    alreadyEnded: "이 세션은 이미 종료되었습니다.",
    emptyInput: "답변을 입력하거나 건너뛰기·주제 변경·종료를 선택해 주세요.",
    complete: "나눠 주셔서 감사합니다. 인터뷰가 완료되었습니다.",
    languageChanged: "언어가 변경되었습니다. 다음 질문부터 새 언어로 이어집니다.",
    providerRetry:
      "AI 연결에 문제가 있습니다. 답변은 저장되었습니다. 잠시 후 다시 시도해 주세요.",
  },
  "zh-CN": {
    farewell: "谢谢。我们会如实保留你分享的话。你可以关闭此页面。",
    endedEarly: "好的，我们在这里结束。谢谢你的分享。",
    alreadyEnded: "此会话已结束。",
    emptyInput: "请输入回答，或选择跳过、换话题、结束。",
    complete: "谢谢你的分享。访谈已完成。",
    languageChanged: "语言已更新。下一题起将使用新语言。",
    providerRetry: "连接 AI 时出现问题。你的回答已保存，请稍后再试。",
  },
};

export function getEngineMessages(language: InterviewLanguage): EngineMessages {
  return MESSAGES[language];
}
