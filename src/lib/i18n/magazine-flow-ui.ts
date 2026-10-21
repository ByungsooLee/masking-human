import { resolveLiveUiLocale, type LiveUiLocale } from "./live-ui";

export type MagazineFlowUi = {
  prepareHeading: string;
  guestName: string;
  place: string;
  language: string;
  languageJa: string;
  languageEn: string;
  agent: string;
  agentDefault: string;
  agentReflective: string;
  consentAi: string;
  consentPhoto: string;
  consentRecording: string;
  consentPublish: string;
  consentAiStreet: string;
  consentRecordingStreet: string;
  consentPublishStreet: string;
  includeCamera: string;
  micLevel: string;
  startDemo: string;
  demoHint: string;
  demoPlace: string;
  micHearing: string;
  micQuiet: string;
  micDenied: string;
  sessionFailed: string;
  startConversation: string;
  slateRunning: string;
  conversationHeading: string;
  aiNow: string;
  guestNow: string;
  endConversation: string;
  buildingPage: string;
  buildPageFailed: string;
  demoWaitForClimax: string;
  recordingOn: string;
  recordingOff: string;
  reviewHeading: string;
  noRecording: string;
  excludeLine: string;
  continue: string;
  back: string;
  titleLabel: string;
  leadLabel: string;
  heroLabel: string;
  saveDraft: string;
  magazineHeading: string;
  aspect45: string;
  aspect916: string;
  aspect169: string;
  publishHeading: string;
  downloadPng: string;
  downloadJson: string;
  downloadSrt: string;
  downloadAudio: string;
  exportEditBundle: string;
  exportInstagram: string;
  exportYoutube: string;
  downloadCarousel: string;
  downloadYoutubeThumb: string;
  downloadYoutubeText: string;
  publishConfirm: string;
  finish: string;
  validationFailed: string;
  noGuestYet: string;
  archiveLink: string;
  archiveHeading: string;
  archiveEmpty: string;
  archiveDelete: string;
  backToLive: string;
  appName: string;
  usageLink: string;
  waitingFirstQuestion: string;
  playFrom: (time: string) => string;
  toPublish: string;
  exportEditHint: string;
  carouselHint: (count: number) => string;
  exportFailed: string;
  savedToArchive: string;
  stateConnecting: string;
  stateThinking: string;
  stateSpeaking: string;
  stateListening: string;
  linkedWords: (count: number) => string;
  endingConversation: string;
  bootLineVoice: string;
  bootLineMic: string;
  bootLineSlate: string;
  systemReady: string;
  depthRings: readonly [string, string, string];
  depthHeading: string;
  openWordsLabel: string;
  facetPerson: string;
  facetFeeling: string;
  facetWord: string;
  mapHeading: string;
  mapHint: string;
  answersWithWord: (word: string) => string;
  wordsInAnswer: string;
  clearFocus: string;
  archiveMapHint: string;
  sessionsWithWord: (word: string) => string;
  archiveListHeading: string;
  showOnMap: string;
};

const JA: MagazineFlowUi = {
  prepareHeading: "インタビューの準備",
  guestName: "お名前（任意）",
  place: "場所",
  language: "言語",
  languageJa: "日本語",
  languageEn: "English",
  agent: "聞き手",
  agentDefault: "やわらかく聞く",
  agentReflective: "少し深く聞く",
  consentAi: "AI との会話に同意する",
  consentPhoto: "写真・映像を記事に使うことに同意する",
  consentRecording: "録音・ログ保存に同意する",
  consentPublish: "公開の可能性について理解した",
  consentAiStreet:
    "街頭で AI 聞き手と会話し、内容が文字と音声として記録されることに同意する",
  consentRecordingStreet: "インタビューの音声が端末に録音され、編集素材として保存されることに同意する",
  consentPublishStreet:
    "YouTube や Instagram などへの投稿の可能性があることを説明を受け、問題ない",
  includeCamera: "この端末のカメラも一緒に録画する",
  micLevel: "マイク",
  startDemo: "デモの会話で試す",
  demoHint: "相手がいなくても、用意した会話で最後の雑誌ページまで試せます",
  demoPlace: "デモ",
  micHearing: "声が届いています",
  micQuiet: "音が聞こえません。話しかけてバーが伸びるか確かめてください",
  micDenied: "マイクを使えません。ブラウザのアドレス欄からマイクを許可してください",
  sessionFailed: "セッションを開始できませんでした",
  startConversation: "同期合図のあと会話を始める",
  slateRunning: "同期合図を出しています",
  conversationHeading: "会話",
  aiNow: "いまの質問",
  guestNow: "いまの言葉",
  endConversation: "会話を終えて確認へ",
  buildingPage: "ページを組み立てています",
  buildPageFailed: "ページを作れませんでした。ゲストの発言が足りないかもしれません",
  demoWaitForClimax: "デモの会話が最後まで流れるまで待っています",
  recordingOn: "収録中",
  recordingOff: "待機",
  reviewHeading: "会話を確認する",
  noRecording: "音声ファイルはありません（モックでは空の場合があります）",
  excludeLine: "この発言をページに使わない",
  continue: "次へ",
  back: "戻る",
  titleLabel: "タイトル",
  leadLabel: "リード",
  heroLabel: "一番いい言葉",
  saveDraft: "雑誌ページを作る",
  magazineHeading: "雑誌ページ",
  aspect45: "4:5",
  aspect916: "9:16",
  aspect169: "16:9",
  publishHeading: "保存",
  downloadPng: "PNG を保存",
  downloadJson: "会話ログ（JSON）",
  downloadSrt: "字幕（SRT）",
  downloadAudio: "収録音声",
  exportEditBundle: "動画編集用",
  exportInstagram: "Instagram",
  exportYoutube: "YouTube",
  downloadCarousel: "カルーセル PNG を保存",
  downloadYoutubeThumb: "サムネイル PNG（16:9）",
  downloadYoutubeText: "概要欄テキスト",
  publishConfirm: "公開してよい内容であることを確認した",
  finish: "完了して履歴に残す",
  validationFailed: "抜粋は相手が話した言葉の範囲で選んでください",
  noGuestYet: "まだゲストの発言がありません",
  archiveLink: "履歴",
  archiveHeading: "これまでのインタビュー",
  archiveEmpty: "まだ保存されたセッションはありません",
  archiveDelete: "削除",
  backToLive: "インタビューに戻る",
  appName: "手入れの記憶",
  usageLink: "利用料",
  waitingFirstQuestion: "最初の質問を待っています",
  playFrom: (time) => `${time} から聞く`,
  toPublish: "保存の画面へ進む",
  exportEditHint: "字幕の時刻は同期合図の音を 0 秒としています",
  carouselHint: (count) => `4:5 の画像 ${count} 枚とストーリー 1 枚を保存します`,
  exportFailed: "画像を書き出せませんでした。ページを再読み込みしてもう一度試してください",
  savedToArchive: "履歴に残しました",
  stateConnecting: "つないでいます",
  stateThinking: "考えています",
  stateSpeaking: "話しています",
  stateListening: "聞いています",
  linkedWords: (count) => `つながった言葉 ${count}`,
  endingConversation: "記録を閉じています",
  bootLineVoice: "聞き手を呼んでいます",
  bootLineMic: "マイクをつなぎました",
  bootLineSlate: "同期合図を出します",
  systemReady: "準備ができたら声をかけてください",
  depthRings: ["していること", "そのわけ", "思い出と人"],
  depthHeading: "話の深さ",
  openWordsLabel: "まだ深めていない言葉",
  facetPerson: "人",
  facetFeeling: "気持ち",
  facetWord: "言葉",
  mapHeading: "言葉のつながり",
  mapHint: "点か言葉を選ぶと、つながる発言だけが残ります",
  answersWithWord: (word) => `「${word}」が出た答え`,
  wordsInAnswer: "この答えにある言葉",
  clearFocus: "選択を外す",
  archiveMapHint: "インタビュー同士が、同じ人や気持ちや言葉でつながります。点を選ぶと内容が出ます",
  sessionsWithWord: (word) => `「${word}」が出たインタビュー`,
  archiveListHeading: "一覧",
  showOnMap: "地図でつながりを見る",
};

const EN: MagazineFlowUi = { ...JA, prepareHeading: "Prepare", startConversation: "Start after slate" };

export function getMagazineFlowUi(locale?: LiveUiLocale): MagazineFlowUi {
  return (locale ?? resolveLiveUiLocale()) === "en" ? EN : JA;
}
