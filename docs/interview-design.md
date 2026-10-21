# インタビュー設計

## 五段階（固定フローではない）

1. **Observation** — 普段のコスメ・美容習慣（最大 2 問）
2. **Motivation** — 理由（最大 2 問）
3. **Perspective shift** — 別視点・仮説（訂正可能、最大 2 問）
4. **Reflection** — 本人の言葉で振り返り（最大 2 問）
5. **Closing** — 残したい一文（1 問）

アプリが `currentStage` と `stageQuestionCount` を保持し、LLM にはそのステージ向けの **1 問** のみ生成させる。

## テーマ（入口）

| ID | 考察の入口 |
|----|------------|
| A | コスメを多く持つことと自信（因果は仮定しない） |
| B | 今の自分 vs 未来の自分 |
| C | 自分のため vs 見られるため |
| D | 日焼け止め・日傘で守っているもの |
| E | 美容習慣がなくなったら自分らしさ |

## 質問技法

`concretize` / `explore_reasons` / `compare_values` / `counterfactual` / `past_future_compare` / `reflect_back`

## 禁止・注意

- 心理診断、感動の強要、本人の未発言の創作
- テーマ文を事実として扱わない
- 引用は将来 Phase 3 で `utterance_id` に紐付け

## Structured Output フィールド

`internal_analysis`, `assistant_message`, `safety`, 任意で `participant_summary_in_their_words`

安全チェックに失敗した場合はステージ別の **SAFE_FALLBACK_QUESTIONS** を使用。
