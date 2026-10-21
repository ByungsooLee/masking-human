# Supabase 実接続検証手順（テストデータのみ）

## 前提

1. `001_phase2a.sql` と `002_phase2b_voice.sql` を適用
2. `.env` に以下を設定:

```bash
SESSION_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # サーバーのみ
SUPABASE_INTEGRATION_TEST=1
```

## 検証項目

| 項目 | 方法 |
|------|------|
| セッション CRUD | `npm test` の integration + 手動 `POST /api/interview` start/message |
| turns 整合性 | DB `interview_turns` 行数 = 公開 turns + session_json |
| 他参加者トークン | `X-Participant-Token` 不一致 → 403 |
| anon キー | クライアントに service_role を渡さない。anon は RLS 下で本人データのみ |
| authenticated | Supabase Auth 連携時 `participants.auth_user_id` を設定 |
| service_role | サーバー API のみ。アプリ層で `canParticipantAccessSession` を必須 |
| 同意撤回 | `POST /api/interview/consent` granted:false → STT 403 |
| 二重送信 | 同一 `clientMessageId` → キャッシュ応答 |
| 削除キュー | `deletion-queue.ts` — pending → processing → completed/failed（最大5回） |
| 公開 | `markPublicConfirmed` — 本人確認済みのみ `is_public` |

## ローカル（Supabase なし）

`SESSION_STORE=memory`（既定）で全 Vitest が通る。ライブ Supabase は **任意**。
