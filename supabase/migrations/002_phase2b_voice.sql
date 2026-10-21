-- Phase 2B: voice assets & utterance metadata (no fabricated timestamps)

create table if not exists audio_assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  kind text not null check (kind in ('participant_recording', 'assistant_tts')),
  storage_path text not null,
  mime_type text not null default 'audio/webm',
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_audio_assets_session on audio_assets (session_id);

create table if not exists utterance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  turn_id uuid,
  speaker text not null check (speaker in ('participant', 'assistant')),
  text_original text not null,
  text_display text not null,
  language text not null,
  sequence_num int not null,
  audio_asset_id uuid references audio_assets (id),
  start_ms int,
  end_ms int,
  is_public boolean not null default false,
  participant_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_utterance_session_seq on utterance_records (session_id, sequence_num);

alter table audio_assets enable row level security;
alter table utterance_records enable row level security;

create policy audio_participant on audio_assets
  for select using (
    session_id in (
      select id from interview_sessions
      where participant_id in (select id from participants where auth_user_id = auth.uid())
    )
  );

create policy utterance_participant on utterance_records
  for select using (
    session_id in (
      select id from interview_sessions
      where participant_id in (select id from participants where auth_user_id = auth.uid())
    )
  );

-- Public utterances only when explicitly marked (Phase 3 publishing gate in app layer)
create policy utterance_public on utterance_records
  for select using (is_public = true and participant_confirmed = true);
