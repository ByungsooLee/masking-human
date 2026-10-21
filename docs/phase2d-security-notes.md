# Phase 2D セキュリティメモ

## sessionStorage の参加者トークン

- **リスク**: 同一タブ内の XSS により `hm_voice_session` が読まれる可能性。
- **緩和**: localStorage から sessionStorage に変更（タブ終了で消える）。httpOnly Cookie との併用を Phase 3 で検討。
- **本番**: CSP、`SameSite` Cookie、短寿命トークン rotation を推奨。

## ログ

- API エラーは `safe-log.ts` でトークン類を redact。
- 本番では `session_json` 全文・transcript 全文をログに出さない。

## service_role

- サーバー API のみ。クライアント bundle に含めない。
- RLS は anon/authenticated テストで別途検証（`tests/supabase-e2e-live.test.ts`）。
