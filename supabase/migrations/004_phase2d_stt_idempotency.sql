-- Phase 2D: durable STT idempotency + failed upload tracking

create table if not exists stt_idempotency (
  session_id uuid not null references interview_sessions (id) on delete cascade,
  client_stt_id uuid not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, client_stt_id)
);

alter table stt_idempotency enable row level security;

create index if not exists idx_stt_idempotency_session on stt_idempotency (session_id);

-- Mark stale pending uploads for orphan sweeper (upload_status pending > 1h)
create index if not exists idx_audio_assets_stale_pending
  on audio_assets (created_at)
  where upload_status = 'pending';
