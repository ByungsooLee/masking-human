# 本番運用（計画）

## 現状（Phase 1.1）

- セッションは **単一 Node プロセス内の Map**（`session-store.ts`）に保存
  - サーバー再起動・デプロイで **全セッション消失**
  - 複数インスタンス間で **共有されない**（水平スケール不可）
  - 同一 `sessionId` への更新は `session-lock.ts` で直列化
- プロバイダー既定値は **mock**。OpenAI は `INTERVIEW_PROVIDER=openai` を明示した場合のみ

## Phase 2 以降の運用方針

| 項目 | 方針 |
|------|------|
| ホスティング | 個人 GitHub + 選択した Node ホスト（Vercel 等は Phase 4 で判断） |
| DB / ファイル | Supabase（PostgreSQL + Storage）、RLS 必須 |
| 秘密情報 | サーバー環境変数のみ、クライアントに OpenAI キーを出さない |
| バックアップ | DB 定期エクスポート、WAV は Storage + 現場 SSD |
| 同意 | 5 種別の個別同意、撤回で公開停止と削除キュー |
| 2026-12-20 | 会社契約 AI ツール非依存 — 個人 API キーとオープンソーススタック |

## オフライン音声

- DJI 送信機内部 WAV は撮影後 Mac へ転送 → 管理画面アップロード（Phase 3）
- Web アプリから内部録音の開始/停止は **制御しない**

## 監視

- Phase 4: API エラー率、STT 失敗、未承認公開ブロックのログ
