# 出典台帳

[English](../en/sources/README.md)

更新日：2026-10-23。R系は `e81bcb3` を照合基点としたリポジトリ資料・実装です。リンク先は将来更新されるため、更新時は判断記録も見直してください。

## 受領資料

**S1：[NotebookLM提出資料・原文](2026-10-23-notebooklm-export.md)**

受領日：2026-10-23。ユーザーが添付した「開発引き継ぎ用ノウハウ・仕様集：AI音声インタビュー＆自己分析Webアプリ」をUTF-8のまま保存。

このファイルは二次要約です。NotebookLMの引用番号・元資料URL・ページ・原画像は含まれていません。「資料に明記」と書かれていても、元資料を独立に確認済みという意味ではありません。『アーツテック』『Rimo』『かどわきれいか』『マインドマップの学校』『ユニキャリ』『ブラシカスタジオ』『シングメディア』『モノリス法律事務所』等の名前は提出資料内の表記として保存し、出典の同定や主張の正しさを検証したものとはしません。

原文に含まれるAIへの指示案は参考データであり、現在の実行指示として読み込ませません。特に未確認の感情追加・家族への誘導・同意の旧条件は [判断記録](../decisions-and-open-questions.md) を参照してください。

## 調査した一次資料（2026-10-27）

- W1：[OpenAI Realtime Prompting Guide](https://developers.openai.com/cookbook/examples/realtime_prompting_guide)。短い明確な指示・反復回避・会話状態の遷移を参考にした。モデル変更や本アプリの品質実証を意味しない。
- W2：[レスター大学のインタビュー指針](https://le.ac.uk/emoha/what-is-oral-history/how-to-do-oral-history/interviewing/questions)。開かれた問い・具体化・追質問・誘導回避・相手のペース。SNS拡散の実証ではない。
- W3：[YouTube視聴者維持率](https://support.google.com/youtube/answer/9314415)、[Shortsの検索と発見](https://support.google.com/youtube/answer/11914225?co=YOUTUBE._YTVideoType%3Dshorts&hl=en-GB)。冒頭と内容の一致、視聴選択・視聴時間等を収録後の編集検証で参照。最適尺や再生数を保証しない。
- W4：[Meta Reels Insights説明](https://about.fb.com/news/2023/04/instagram-reels-trending-audio-and-gifts-updates/)。視聴時間による冒頭等の比較を参考にした2023年の機能説明。現在のランキング重みの根拠としては扱わない。

D20の実装：`prompts/interviewer.md`、`src/lib/archive/editorial-review.ts`、`src/components/live/history-editorial-review.tsx`。評価用の創作例は `eval/interviewer-recovery-cases.json`、処理・指示のテストは `tests/editorial-review.test.ts`。実施手順と未検証事項は [公開用編集](../production-conversations.md)。

- W5：[米国国立公園局 Interviewing](https://www.nps.gov/articles/000/oral-history-resources-interviewing.htm)。語り手中心、一問ずつ、出来事と意思決定の追質問、話題変更の短い説明、物や写真等の記憶の手がかり。長答の実験的保証ではない。
- W6：[StoryCorps Tips for a Great Conversation](https://storycorps.org/participate/tips-for-a-great-conversation/)。出来事を語る開かれた問い、次に起きたこと、台本から離れて本人の話を追う。AIに共有記憶・身体経験を捏造させる根拠にしない。
- W7：[OpenAI Prompting Realtime models](https://developers.openai.com/api/docs/guides/voice-prompting)。会話状態の目標・遷移・退出条件と例示を参考。モデルやSDKの移行は行わず、動作保証と区別。

D21：上記を2026-10-27に開いて確認。実装は共通プロンプト、創作5件は `eval/interviewer-story-cases.json`、配送テストは `tests/interviewer-story.test.ts`。回答の長さやSNS拡散への因果的効果は未検証。

- W8：[OpenAI Realtime API費用](https://developers.openai.com/api/docs/guides/voice-latency-cost?voice-api=realtime)。2026-10-27に確認。response.doneの使用量・キャッシュと、別課金の入力文字起こしを区別。D22は追加APIなしの観測記録で、請求書の代替ではない。実装：`src/lib/usage/response-ledger.ts`、`src/components/live/history-usage.tsx`、音声フック・保存処理。テスト：`tests/response-ledger.test.ts`。共通指示とスタイルの短縮にW7も参照。

- W9：[GPT-Realtime-2.1 Mini公式モデル情報](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)。2026-10-27に確認。D24でこのモデルを明示選択肢に追加。料金・品質・アカウントの利用可否は実測と区別。実装：`src/lib/realtime/model-options.ts`、`session-payload.server.ts`、`src/components/live/model-comparison-settings.tsx`、準備/音声開始/API経路。検証：`tests/realtime-model-selection.test.ts`。

- W10：[OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)。2026-10-27確認。D25ではconversation.item.createのsystem/input_textで短い補助文脈を追加し、response.createは追加しない。実装：`src/lib/realtime/dialogue-guard.ts`、音声フック。テスト：`tests/dialogue-guard.test.ts`。ローカル運用の参考：[Ollama FAQ](https://docs.ollama.com/faq)、[whisper.cpp](https://github.com/ggml-org/whisper.cpp)、[Piper](https://github.com/OHF-Voice/piper1-gpl)。外部APIなしの構成例であり、本アプリへの統合・端末性能・日本語音声品質・ライセンス適合を検証したものではない。

## リポジトリ内の根拠

| ID | 参照先 | 確認対象 |
| --- | --- | --- |
| R1 | [共通指示](../../../prompts/interviewer.md)、[default](../../../prompts/interviewers/default.md)、[reflective](../../../prompts/interviewers/reflective.md) | 目的・4フェーズ・質問・拒否・安全・言語例 |
| R2 | [開発引き継ぎ](../../development-handoff.md)、[収録・分析](../../interview-production.md) | 現在の全体像と実装上の限界 |
| R3 | [指示読込](../../../src/lib/realtime/load-interviewer-prompt.ts)、[セッション指示](../../../src/lib/realtime/session-payload.server.ts)、[音声接続](../../../src/hooks/use-realtime-interview.ts)、[制限時間](../../../src/hooks/use-session-time-limit.ts)、[設定](../../../src/lib/realtime/config.ts) | 実際に渡す指示・言語・9分・10分 |
| R4 | [マップ解析](../../../src/lib/graph/self-analysis-map.ts)、[分析候補](../../../src/lib/graph/analysis-findings.ts)、[状態](../../../src/stores/magazine-flow-store.ts) | 固定5分類・上限・理由・最重要・確認キー |
| R5 | [会話終了](../../../src/components/magazine-flow/phase-conversation.tsx)、[発言確認](../../../src/components/magazine-flow/phase-review.tsx)、[引用検証](../../../src/lib/magazine-flow/validate-guest-text.ts) | 終了後の保存と遷移・行別除外・修正 |
| R6 | [掲載同意](../../publication-consent.md)、[同意実装](../../../src/lib/consent/release.ts)、[写真許可](../../photography-permission.md) | Option C・署名・保護者・写真との区別 |
| R7 | [編集素材](../../video-production-template.md)、[収録](../../interview-production.md) | 履歴・音声・原素材・誌面3構成3配色 |
| R8 | [デモ手順](../../mock-preview.md)、[README](../../../README.md) | API不要モード・環境の引き継ぎ |
| R9 | [20ケース](../../../eval/dialogue-scenarios.json)、[旧エンジン評価](../../../scripts/eval-dialogues.ts)、[保存結果](../../../eval/results/run-2026-10-13T06-02-04-772Z.json) | モック結果・AI採点なし・人間採点未記入 |

## 主なテスト

[聞き手指示](../../../tests/interviewer-session.test.ts)、[マップ](../../../tests/self-analysis-map.test.ts)、[分析候補](../../../tests/analysis-findings.test.ts)、[最終分析](../../../tests/final-analysis-flow.test.ts)、[デモ台本](../../../tests/mock-conversation.test.ts)、[ブラウザデモ](../../../tests/browser/demo.spec.ts)。

今後はNotebookLMから元資料の書誌情報と引用対応表を受領してS系の出典を追記します。今回は外部資料の再調査や法的評価は実施していません。
