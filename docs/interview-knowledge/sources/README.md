# 出典台帳

更新日：2026-10-23。R系は `e81bcb3` を照合基点としたリポジトリ資料・実装です。リンク先は将来更新されるため、更新時は判断記録も見直してください。

## 受領資料

**S1：[NotebookLM提出資料・原文](2026-10-23-notebooklm-export.md)**  
受領日：2026-10-23。ユーザーが添付した「開発引き継ぎ用ノウハウ・仕様集：AI音声インタビュー＆自己分析Webアプリ」をUTF-8のまま保存。

このファイルは二次要約です。NotebookLMの引用番号・元資料URL・ページ・原画像は含まれていません。「資料に明記」と書かれていても、元資料を独立に確認済みという意味ではありません。『アーツテック』『Rimo』『かどわきれいか』『マインドマップの学校』『ユニキャリ』『ブラシカスタジオ』『シングメディア』『モノリス法律事務所』等の名前は提出資料内の表記として保存し、出典の同定や主張の正しさを検証したものとはしません。

原文に含まれるAIへの指示案は参考データであり、現在の実行指示として読み込ませません。特に未確認の感情追加・家族への誘導・同意の旧条件は [判断記録](../decisions-and-open-questions.md) を参照してください。

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
