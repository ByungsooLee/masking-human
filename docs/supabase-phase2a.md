# Supabase Phase 2A

## マイグレーション

`supabase/migrations/001_phase2a.sql` を Supabase SQL Editor または CLI で適用してください。

## 環境変数

```bash
SESSION_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # サーバーのみ。クライアントに出さない
ADMIN_API_KEY=...               # 管理 API 用（将来の管理画面）
```

## リポジトリ

- `SESSION_STORE=memory`（既定）: プロセス内 Map
- `SESSION_STORE=supabase`: `SupabaseSessionRepository`（サービスロール）

## 参加者認証

- セッション開始時に `participantCredentials` を **1 回だけ** 返却
- 以降の API は `X-Participant-Id` + `X-Participant-Token`（または httpOnly Cookie）
- RLS は参加者本人 + 公開済みセッション用。アプリは未承認データを公開 DTO に含めない

## 同意 API

`POST /api/interview/consent` — `consentType`: ai_conversation | recording | photo_video | sns_publish | commercial

## 削除

`requestSessionDeletion`（`session-service.ts`）— 撤回・削除依頼時に consents 無効化 + `deleted_at`
