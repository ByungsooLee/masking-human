# コンテンツ生成仕様（Phase 3 以降）

データ型の正本: `src/lib/interview/content-artifacts.ts`

## 保持するもの

| 項目 | 説明 |
|------|------|
| 発言原文 | `UtteranceOriginal.textOriginal` + `language`（`mixed` 可） |
| 原語の要約 | `summaryOriginal` |
| 英語要約 | `summaryEnglish`（翻訳またはバイリンガルセッション由来を明示） |
| Instagram 英語キャプション | 直接引用と AI 文案を区別（`containsNonQuotedCopy`） |
| 原語字幕 | SRT + 言語タグ |
| 英語字幕 | SRT |
| 原文↔英訳 | `TranslationPair`（`utteranceId` 単位） |

## 本人確認フロー（必須）

- 引用の翻訳は `reviewStatus`: `draft` → `participant_confirmed` | `participant_edited`
- 本人が確認していない仮説・訳文を **確定引用** として公開しない
- インタビュー中の `accumulator`（facts / hypotheses / confirmed_insights）と `utteranceId` を Phase 3 で接続

## セッション言語との関係

- `LanguageSettings.interviewLanguage` … 対話言語
- `LanguageSettings.publishingLanguage` … 公開キャプションの主言語（英語 IG 用に `en` も可）
- 各 `TurnRecord.language` … ターン時点のインタビュー言語（言語切替後も履歴保持）

## 音声（Phase 2）

- `VoiceLanguageProfile`（`languages.ts`）で STT/TTS の BCP-47 を保持
- 実機テスト: ja / ko / zh-CN で認識・読み上げを別途検証
