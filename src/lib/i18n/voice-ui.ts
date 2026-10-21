import type { InterviewLanguage } from "@/lib/interview/languages";
import type { UiLocale } from "./types";

export interface VoiceUiCopy {
  voiceTitle: string;
  voiceSubtitle: string;
  aiVoiceDisclosure: string;
  currentLanguage: string;
  questionLabel: string;
  ttsPlaying: string;
  ttsStopped: string;
  replayQuestion: string;
  micStatus: string;
  micGranted: string;
  micDenied: string;
  selectInputDevice: string;
  holdToRecord: string;
  releaseToTranscribe: string;
  transcriptLabel: string;
  editTranscript: string;
  confirmSend: string;
  retryStt: string;
  typeInstead: string;
  skip: string;
  changeLanguage: string;
  end: string;
  consentRecording: string;
  consentAi: string;
  grantConsents: string;
  apiError: string;
  sttFailed: string;
  recordingBlockedDuringTts: string;
  recordingActive: string;
  textInterviewLink: string;
  cancelRecording: string;
  processing: string;
  historyLabel: string;
  resumeSession: string;
  consentStatus: string;
  consentRevoked: string;
  externalWavNote: string;
}

const EN: VoiceUiCopy = {
  voiceTitle: "Voice interview",
  voiceSubtitle: "Push-to-talk · external mic supported",
  aiVoiceDisclosure: "Questions are read by an AI voice (not a human).",
  currentLanguage: "Language",
  questionLabel: "AI question",
  ttsPlaying: "Playing question…",
  ttsStopped: "Tap replay to hear again",
  replayQuestion: "Replay",
  micStatus: "Microphone",
  micGranted: "Ready",
  micDenied: "Permission denied — use text input",
  selectInputDevice: "Input device",
  holdToRecord: "Hold to answer",
  releaseToTranscribe: "Release to transcribe",
  transcriptLabel: "Your words (edit before sending)",
  editTranscript: "Edit transcript",
  confirmSend: "Confirm & send",
  retryStt: "Retry recording",
  typeInstead: "Type instead",
  skip: "Skip",
  changeLanguage: "Change language",
  end: "End",
  consentRecording: "I consent to audio recording for this interview",
  consentAi: "I consent to AI conversation",
  grantConsents: "Save consents & start",
  apiError: "Connection error — try again",
  sttFailed: "Could not transcribe — retry or type",
  recordingBlockedDuringTts: "Wait until the question finishes playing",
  recordingActive: "Recording…",
  textInterviewLink: "Text-only interview",
  cancelRecording: "Cancel recording",
  processing: "Processing…",
  historyLabel: "Conversation",
  resumeSession: "Resume previous session",
  consentStatus: "Consents",
  consentRevoked: "Recording and AI are paused (consent withdrawn)",
  externalWavNote: "External WAV (e.g. DJI Mic) can be added later for editing sync",
};

const JA: VoiceUiCopy = {
  ...EN,
  voiceTitle: "音声インタビュー",
  voiceSubtitle: "プッシュ・トゥ・トーク · 外部マイク対応",
  aiVoiceDisclosure: "質問は AI の音声で読み上げられます（人間ではありません）。",
  currentLanguage: "言語",
  questionLabel: "AI の質問",
  ttsPlaying: "質問を再生中…",
  replayQuestion: "再生",
  micGranted: "準備完了",
  micDenied: "マイク拒否 — 手入力を利用",
  holdToRecord: "押している間録音",
  releaseToTranscribe: "離すと文字起こし",
  confirmSend: "確定して送信",
  grantConsents: "同意して開始",
  textInterviewLink: "テキストのみ",
  cancelRecording: "録音キャンセル",
  processing: "処理中…",
  historyLabel: "会話履歴",
  resumeSession: "前回のセッションを再開",
  consentStatus: "同意",
  consentRevoked: "同意撤回のため録音・AI送信は停止中",
  externalWavNote: "DJI Mic 等の WAV は編集同期用に後から追加できます",
};

const KO: VoiceUiCopy = {
  ...EN,
  voiceTitle: "음성 인터뷰",
  voiceSubtitle: "푸시 투 토크 · 외부 마이크",
  aiVoiceDisclosure: "질문은 AI 음성으로 재생됩니다(사람이 아닙니다).",
  currentLanguage: "언어",
  questionLabel: "AI 질문",
  ttsPlaying: "질문 재생 중…",
  holdToRecord: "누르고 답변",
  confirmSend: "확인 후 전송",
  textInterviewLink: "텍스트 인터뷰",
};

const ZH: VoiceUiCopy = {
  ...EN,
  voiceTitle: "语音访谈",
  voiceSubtitle: "按住说话 · 支持外接麦克风",
  aiVoiceDisclosure: "问题由 AI 语音朗读（非真人）。",
  currentLanguage: "语言",
  questionLabel: "AI 提问",
  ttsPlaying: "正在播放提问…",
  holdToRecord: "按住录音",
  confirmSend: "确认并发送",
  textInterviewLink: "纯文字访谈",
};

const MAP: Record<UiLocale, VoiceUiCopy> = { en: EN, ja: JA, ko: KO, "zh-CN": ZH };

export function getVoiceUiCopy(locale: InterviewLanguage): VoiceUiCopy {
  return MAP[locale] ?? EN;
}
