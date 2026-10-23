import type { LiveUiLocale } from "./live-ui";

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
  consentPhotoStreet: string;
  slateRecordingFailed: string;
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
  consentPhotoStreet:
    "この端末のカメラで映像も録画し、編集素材として保存されることに同意する",
  slateRecordingFailed: "録音を始められませんでした。マイクとカメラの許可を確認して、もう一度準備から始めてください",
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
  buildingPage: "分析結果を整理しています",
  buildPageFailed: "分析結果を整理できませんでした。文字起こしを確認してください",
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
  saveDraft: "分析結果を確認する",
  magazineHeading: "分析結果を確認する",
  aspect45: "4:5",
  aspect916: "9:16",
  aspect169: "16:9",
  publishHeading: "保存",
  downloadPng: "PNG を保存",
  downloadJson: "会話ログ（JSON）",
  downloadSrt: "字幕（SRT）",
  downloadAudio: "収録ファイル（音声・映像）",
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
  exportEditHint: "編集に使う音声・映像に合わせて字幕の時間基準を選べます",
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

const EN: MagazineFlowUi = {
  prepareHeading: "Prepare your interview", guestName: "Name (optional)", place: "Location", language: "Language", languageJa: "Japanese", languageEn: "English",
  agent: "Listening style", agentDefault: "Warm and gentle", agentReflective: "Thoughtful and reflective",
  consentAi: "I agree to an AI conversation", consentPhoto: "I agree to use photos and video in the article", consentRecording: "I agree to recording and transcript storage", consentPublish: "I understand the interview may be published",
  consentAiStreet: "I agree to speak with an AI interviewer and have the conversation recorded as text and audio.",
  consentRecordingStreet: "I agree to record the interview on this device and save it for editing.",
  consentPublishStreet: "I understand and accept that the interview may be posted on YouTube, Instagram, or similar services.",
  consentPhotoStreet: "I agree to record video with this device's camera and save it for editing.",
  slateRecordingFailed: "Recording could not start. Check microphone and camera permissions, then return to preparation and try again.",
  includeCamera: "Record video with this device's camera", micLevel: "Microphone", startDemo: "Try the demo conversation", demoHint: "Try the complete experience with a scripted conversation. No AI API calls are made.", demoPlace: "Demo",
  micHearing: "Your microphone is picking up sound", micQuiet: "No sound detected. Speak and check whether the level meter responds.", micDenied: "Microphone access is blocked. Allow it in your browser's address bar.", sessionFailed: "Could not start the session",
  startConversation: "Start after the sync cue", slateRunning: "Playing the sync cue", conversationHeading: "Conversation", aiNow: "Current question", guestNow: "Your words", endConversation: "End conversation and review",
  buildingPage: "Organizing your findings", buildPageFailed: "Could not organize the findings. Please check the transcript.", demoWaitForClimax: "Waiting for the demo conversation to finish", recordingOn: "Recording", recordingOff: "Standby", reviewHeading: "Review your conversation", noRecording: "No recording available (the demo may contain silent audio)", excludeLine: "Exclude this statement from the report", continue: "Continue", back: "Back",
  titleLabel: "Title", leadLabel: "Introduction", heroLabel: "Featured quote", saveDraft: "Review analysis results", magazineHeading: "Review analysis results", aspect45: "4:5", aspect916: "9:16", aspect169: "16:9", publishHeading: "Save and export", downloadPng: "Save PNG", downloadJson: "Conversation (JSON)", downloadSrt: "Subtitles (SRT)", downloadAudio: "Recording (audio/video)", exportEditBundle: "For video editing", exportInstagram: "Instagram", exportYoutube: "YouTube", downloadCarousel: "Save carousel PNGs", downloadYoutubeThumb: "Thumbnail PNG (16:9)", downloadYoutubeText: "Video description", publishConfirm: "I confirm this content can be published", finish: "Finish and save to history", validationFailed: "Quotes must come from the guest's recorded words", noGuestYet: "No guest speech yet", archiveLink: "History", archiveHeading: "Interview history", archiveEmpty: "No saved interviews yet", archiveDelete: "Delete", backToLive: "Back to interview", appName: "Memories of Care", usageLink: "Usage", waitingFirstQuestion: "Waiting for the first question", playFrom: (time) => `Play from ${time}`, toPublish: "Continue to save and export", exportEditHint: "Choose a subtitle time origin that matches your editing footage.", carouselHint: (count) => `Save ${count} images in 4:5 and one story image.`, exportFailed: "Export failed. Reload the page and try again.", savedToArchive: "Saved to history",
  stateConnecting: "Connecting", stateThinking: "Thinking", stateSpeaking: "Speaking", stateListening: "Listening", linkedWords: (count) => `${count} connected words`, endingConversation: "Finishing recording", bootLineVoice: "Connecting your interviewer", bootLineMic: "Microphone connected", bootLineSlate: "Playing the sync cue", systemReady: "Speak when you are ready", depthRings: ["Habits", "Reasons", "Memories & people"], depthHeading: "Conversation depth", openWordsLabel: "Topics to explore", facetPerson: "People", facetFeeling: "Feelings", facetWord: "Words", mapHeading: "Word connections", mapHint: "Select a word or node to highlight its source statements", answersWithWord: (word) => `Answers mentioning “${word}”`, wordsInAnswer: "Words in this answer", clearFocus: "Clear selection", archiveMapHint: "Interviews connect through shared people, feelings, and words. Select a node to explore.", sessionsWithWord: (word) => `Interviews mentioning “${word}”`, archiveListHeading: "List", showOnMap: "Explore connections",
};

export function getMagazineFlowUi(locale: LiveUiLocale = "ja"): MagazineFlowUi {
  return locale === "en" ? EN : JA;
}
