# 手入れの記憶

コスメと肌の手入れを入口に、AI 聞き手が音声でインタビューする Web アプリです。

## 起動

```bash
cp .env.example .env.local
npm install
npm run dev
```

- 音声インタビュー: http://localhost:3000/live
- 利用状況: http://localhost:3000/usage
- UI モック（API 不要）: http://localhost:3000/live?mock=1
- `/live` は **準備 → 同期合図 → 会話（収録）→ 確認 → 雑誌ページ → 保存**。同期合図（音と光）で別カメラ映像と合わせられます。保存では収録音声・SRT（同期合図基準）・JSON、Instagram カルーセル、YouTube サムネ・概要欄テキストを書き出せます。[履歴](/live/archive) にメタデータを残せます。

## 環境変数

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

テキスト面接 `/`、STT/TTS `/voice` は引き続き利用可能。詳細は [docs/](docs/)。
