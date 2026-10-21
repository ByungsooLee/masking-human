# テスト方針

## 自動テスト（Vitest）

```bash
npm test
```

Phase 1 原始シナリオ 21 件 + Phase 1.1 追加（closing 境界、ステージ決定、公開 DTO、冪等性）で **43 件**。

### カバーするシナリオ

- コスメ不使用 / 短答 / 矛盾 / 話題変更・スキップ / 気づきなし / 外見不安
- 誘導的 AI 出力 → フォールバック
- API 失敗時（質問数・ステージ不変）
- `command: end` の即時終了（LLM 非呼び出し）
- closing 回答後の `completed`
- 最大 8 問境界

## 20 シナリオ再生評価

`eval/dialogue-scenarios.json` に 20 件定義。

```bash
# mock（既定）
npm run eval:dialogues

# 実 LLM でインタビュー再生
INTERVIEW_PROVIDER=openai OPENAI_API_KEY=... npm run eval:dialogues

# 同上 + AI 採点（人間レビュー欄は null のまま）
EVAL_USE_AI_JUDGE=1 INTERVIEW_PROVIDER=openai OPENAI_API_KEY=... npm run eval:dialogues
```

出力: `eval/results/run-<timestamp>.json`

- **ai_evaluation**: モデル採点（`EVAL_USE_AI_JUDGE=1` 時）
- **human_evaluation**: 手動記入用（初期 null）
- **flagged_for_human_review**: AI 採点が低い場合 true（未採点時は true）

評価軸: 文脈理解 / 自然さ / 深掘りの適切さ / 非誘導性 / 本人の価値観の尊重

## 手動チェック（Web / CLI）

1. `INTERVIEW_PROVIDER=openai` を **明示**（未設定は mock）
2. `npm run dev` または `npm run interview:cli A`
3. 公開 API レスポンスに accumulator が含まれないことを DevTools で確認

## 将来

- Playwright E2E
- Phase 3 ゴールデンファイル（SNS 原稿）
