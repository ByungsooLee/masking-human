# 手入れの記憶

コスメと肌の手入れを入口に、AI 聞き手が音声でインタビューする Web アプリです。

## 起動

```bash
npm install
npm run dev
```

- 音声インタビュー: http://localhost:3000/live
- 利用状況: http://localhost:3000/usage
- UI モック（API 不要）: http://localhost:3000/live?mock=1
- 聞き手の年代・ジェンダー表現と聞き方を準備画面で選択。AIから質問を始め、約10分で振り返りまで進みます。
- 語の頻度・時間への言及・選択やつながりの表現を可視化。誌面は3構成と3配色から選べます。
- 自己分析マップはコスメから紐解く自分の軸を5分類で表示。ゲストの原文の語句を重複なく配置し、明示された理由だけを因果の候補として根拠付きで表示します。不明な因果や最重要の軸は未確認とし、追加のAI呼び出しなしでSVGとテキストツリーを保存できます。
- 字幕の個別時刻調整、音声先頭／同期音基準のSRT・編集CSVに対応。[収録と編集の詳細](docs/interview-production.md)。
- `/live` は **準備 → 同期合図 → 会話（収録）→ 発言の除外確認 → 分析候補の確認 → 最終分析・掲載署名**。動画編集・SNS素材の保存操作は[履歴](/live/archive)にまとめています。[編集素材出力の詳細](docs/video-production-template.md)。

環境移行・ブラウザ版Codexへの引き継ぎは [開発引き継ぎ](docs/development-handoff.md) を参照してください。デモはAPIキー不要です。本番用の環境変数は必要に応じて `.env.local` に設定します（Git管理対象外）。

2台のMacで使うモック専用環境は [共通プレビューの手順](docs/mock-preview.md) を参照してください。`npm run dev:demo` では全API・実収録・同意保存を無効にします。`?mock=1` だけの指定は、サーバーAPIを無効にする設定ではありません。

## 環境変数

利用料アラートはUTCの今月累計が **$1を超えたとき** に全画面の上部に表示します。アプリを開いている間、約30秒ごとに確認します。通知のみで会話は停止しません。`OPENAI_ADMIN_KEY` が使える場合は組織全体の今月実績と、サーバー起動後に記録した今月のRealtime推定額の大きい方で判定し、重複加算しません。実績には反映遅延があります。管理者キー未設定・取得失敗時は推定額だけの判定です。推定には文字起こし・雑誌生成などを含まず、再起動で消えるため、すべての請求を監視する保証にはなりません。利用料画面で判定額と集計範囲を確認できます。

| 変数 | 用途 |
|------|------|
| `OPENAI_API_KEY` | Realtime セッション（サーバーのみ） |
| `OPENAI_REALTIME_MODEL` | Realtime モデル（未設定時 `gpt-realtime-2.1`、試験時は mini 系を指定） |
| `OPENAI_LIVE_COPY_MODEL` | 雑誌用タイトル・抜粋提案（未設定時 `OPENAI_MODEL`） |
| `OPENAI_ADMIN_KEY` | 今月の実績（Costs API）。未設定でも推定表示は動作 |
| `MONTHLY_BUDGET_USD` | 月間予算。80% で警告、100% で新規開始不可 |
| `NEXT_PUBLIC_LIVE_MOCK=1` | `/live` にモック開始ボタン |
| `NEXT_PUBLIC_HIDE_COST_FROM_RECORDING=1` | 録画向けに隅の推定費用を非表示 |

**料金単価**は [config/pricing.ts](config/pricing.ts) にモデル別で設定してください（初期値 0 のため、填入前は推定 $0 です）。

## 聞き手プロンプト

[prompts/interviewer.md](prompts/interviewer.md) を編集するとサーバー経由の Realtime instructions が変わります。

## テーマの追加

1. [src/themes/](src/themes/) に `Layout`, `UtteranceList`, `SpeakCue`, `Controls` を実装
2. [src/themes/index.ts](src/themes/index.ts) の `ThemeId` と `themes` に登録
3. [styles/tokens.css](styles/tokens.css) に `[data-theme="yourTheme"]` の色を追加
4. [src/lib/i18n/live-ui.ts](src/lib/i18n/live-ui.ts) に切替ラベルを追加

デザイン規約: [.cursor/rules/design.mdc](.cursor/rules/design.mdc)、トークン: [styles/tokens.css](styles/tokens.css)

## テスト

```bash
npm test
```

## レガシー

インタビューの入口は `/live` に統一。旧URL `/` と `/voice` は `/live` にリダイレクトします。旧テキスト・STT/TTSコンポーネントおよびAPIは互換性のため残していますが、メニューには表示しません。詳細は [docs/](docs/)。
