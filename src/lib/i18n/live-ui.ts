import type { ConnectionStatus } from "@/lib/realtime/types";

export type LiveUiLocale = "ja" | "en";

export interface LiveUiCopy {
  statusReady: string;
  statusConnecting: string;
  statusLive: string;
  statusEnding: string;
  statusError: string;
  startInterview: string;
  endInterview: string;
  speakNow: string;
  speakWait: string;
  speakListening: string;
  headerSubtitle: string;
  headerTitle: string;
  emptyTranscript: string;
  speakerGuest: string;
  speakerInterviewer: string;
  speakerHost: string;
  connectionFailed: string;
  startMock: string;
  startDemo: string;
  statusMock: string;
  sessionRemaining: (seconds: number) => string;
  themeMagazine: string;
  themeCinema: string;
  themeCosme: string;
  budgetWarning: string;
  budgetBlocked: string;
  aspectPortrait: string;
  aspectLandscape: string;
  layoutPage: string;
  layoutSpread: string;
  panelHiddenHint: string;
  panelVisibleHint: string;
  cameraLabel: string;
  captureStill: string;
  uploadPhoto: string;
  useDemoPhoto: string;
  consentTitle: string;
  consentAi: string;
  consentPhotoVideo: string;
  consentRecording: string;
  consentConfirm: string;
  consentCancel: string;
  recordStageStart: string;
  recordStageStop: string;
  recordStageDownload: string;
  mediaModeVideo: string;
  mediaModeStill: string;
  mediaModeTextOnly: string;
}

const JA: LiveUiCopy = {
  statusReady: "待機中",
  statusConnecting: "接続中…",
  statusLive: "配信中",
  statusEnding: "終了中…",
  statusError: "エラー",
  startInterview: "インタビューを始める",
  endInterview: "終了",
  speakNow: "話してみてください",
  speakWait: "インタビュアーの質問をお待ちください",
  speakListening: "聞いています…",
  headerSubtitle: "手入れの記憶",
  headerTitle: "インタビュー",
  emptyTranscript:
    "「インタビューを始める」でマイクを使った本番、「デモを開始」で会話が自動再生されます（クライマックスの演出も確認できます）。",
  speakerGuest: "ゲスト",
  speakerInterviewer: "インタビュアー",
  speakerHost: "ホスト",
  connectionFailed: "接続に失敗しました",
  startMock: "UIプレビュー（モック）",
  startDemo: "デモを開始",
  statusMock: "デモ",
  sessionRemaining: (seconds) => `残り ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
  themeMagazine: "雑誌",
  themeCinema: "映画",
  themeCosme: "コスメ",
  budgetWarning: "予算の 80% に達しています。",
  budgetBlocked: "予算の上限に達したため、開始できません。",
  aspectPortrait: "9:16",
  aspectLandscape: "16:9",
  layoutPage: "1ページ",
  layoutSpread: "見開き",
  panelHiddenHint: "操作パネルは非表示です。H キーで表示します。",
  panelVisibleHint: "撮影モード: H キーで操作パネルを隠します。",
  cameraLabel: "カメラ",
  captureStill: "写真を1枚撮る",
  uploadPhoto: "写真を選ぶ",
  useDemoPhoto: "サンプル写真を使う",
  consentTitle: "インタビューを始める前に",
  consentAi: "AI との会話に同意する",
  consentPhotoVideo: "映像・写真を記録・表示に使うことに同意する",
  consentRecording: "ステージの録画に同意する",
  consentConfirm: "同意して続ける",
  consentCancel: "キャンセル",
  recordStageStart: "ステージを録画",
  recordStageStop: "録画を止める",
  recordStageDownload: "録画を保存",
  mediaModeVideo: "映像",
  mediaModeStill: "写真",
  mediaModeTextOnly: "文字のみ",
};

const EN: LiveUiCopy = {
  statusReady: "Ready",
  statusConnecting: "Connecting…",
  statusLive: "Live",
  statusEnding: "Ending…",
  statusError: "Error",
  startInterview: "Start interview",
  endInterview: "End",
  speakNow: "You can speak now",
  speakWait: "Please wait for the interviewer's question",
  speakListening: "Listening…",
  headerSubtitle: "Memories of Care",
  headerTitle: "Interview",
  emptyTranscript:
    'Use "Start interview" for a live mic session, or "Start demo" to auto-play the sample dialogue and climax effects.',
  speakerGuest: "Guest",
  speakerInterviewer: "Interviewer",
  speakerHost: "Host",
  connectionFailed: "Connection failed",
  startMock: "UI preview (mock)",
  startDemo: "Start demo",
  statusMock: "Demo",
  sessionRemaining: (seconds) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} left`,
  themeMagazine: "Magazine",
  themeCinema: "Cinema",
  themeCosme: "Cosme",
  budgetWarning: "You have used 80% of your budget.",
  budgetBlocked: "Budget limit reached. Cannot start.",
  aspectPortrait: "9:16",
  aspectLandscape: "16:9",
  layoutPage: "One page",
  layoutSpread: "Spread",
  panelHiddenHint: "Controls hidden. Press H to show.",
  panelVisibleHint: "Press H to hide controls for recording.",
  cameraLabel: "Camera",
  captureStill: "Capture one photo",
  uploadPhoto: "Choose a photo",
  useDemoPhoto: "Use sample photo",
  consentTitle: "Before you start",
  consentAi: "I agree to an AI conversation",
  consentPhotoVideo: "I agree to use of video and photos on screen",
  consentRecording: "I agree to stage recording",
  consentConfirm: "Agree and continue",
  consentCancel: "Cancel",
  recordStageStart: "Record stage",
  recordStageStop: "Stop recording",
  recordStageDownload: "Save recording",
  mediaModeVideo: "Video",
  mediaModeStill: "Photo",
  mediaModeTextOnly: "Text only",
};

const MAP: Record<LiveUiLocale, LiveUiCopy> = { ja: JA, en: EN };

export function getLiveUiCopy(locale: LiveUiLocale): LiveUiCopy {
  return MAP[locale] ?? JA;
}

/** Browser locale; defaults to Japanese unless language is English. */
export function resolveLiveUiLocale(): LiveUiLocale {
  if (typeof navigator === "undefined") return "ja";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("en")) return "en";
  return "ja";
}

export function connectionStatusLabel(
  copy: LiveUiCopy,
  status: ConnectionStatus,
  isMockSession?: boolean,
): string {
  switch (status) {
    case "connecting":
      return copy.statusConnecting;
    case "connected":
      return isMockSession ? copy.statusMock : copy.statusLive;
    case "disconnecting":
      return copy.statusEnding;
    case "error":
      return copy.statusError;
    default:
      return copy.statusReady;
  }
}
