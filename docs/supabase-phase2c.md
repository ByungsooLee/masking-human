# Phase 2C — Supabase & Storage

## Migrations

Apply in order on a **verification project** (test data only):

1. `001_phase2a.sql`
2. `002_phase2b_voice.sql`
3. `003_phase2c_production.sql`

## Canonical data

| Store | Role |
|-------|------|
| `interview_sessions.session_json` | **Source of truth** for engine state (resume, locks) |
| `interview_turns` | Normalized mirror; written atomically via `save_interview_session_atomic` |
| `utterance_records` | Voice/transcript metadata (`original_transcript`, `confirmed_transcript`, `interview_turn_id`) |
| `audio_assets` + Storage bucket `interview-audio-private` | Binary audio (browser vs `external_wav`) |

## Environment

```bash
SESSION_STORE=supabase
AUDIO_STORE=supabase
UTTERANCE_STORE=supabase
DELETION_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # RLS tests from client tooling
```

## Live test

```bash
SUPABASE_INTEGRATION_TEST=1 SESSION_STORE=supabase npm test -- tests/supabase-live.test.ts
```

## Signed upload flow

1. `POST /api/voice/upload-url` (participant auth + recording consent)
2. Client `PUT` to `signedUrl`
3. `POST /api/voice/upload-complete`
4. `POST /api/voice/stt` with `audioAssetId`

## Deletion

`deletion_requests` rows are processed by `processNextDeletionJob()` (Storage + utterances + session soft-delete). Audit rows remain; participant content is purged.
