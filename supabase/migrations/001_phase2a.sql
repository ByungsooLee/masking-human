-- THE HUMAN MIRROR — Phase 2A persistence (run in Supabase SQL editor or CLI)

create extension if not exists "pgcrypto";

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists interview_sessions (
  id uuid primary key,
  participant_id uuid not null references participants (id) on delete cascade,
  participant_token_hash text not null,
  theme_id text not null,
  interview_language text not null,
  publishing_language text not null,
  status text not null,
  publish_status text not null default 'private',
  current_stage text not null,
  stage_question_count int not null,
  total_questions_asked int not null,
  max_questions int not null default 8,
  started_at timestamptz not null,
  ended_at timestamptz,
  deleted_at timestamptz,
  deletion_requested_at timestamptz,
  session_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interview_sessions_participant on interview_sessions (participant_id);

create table if not exists interview_turns (
  id uuid primary key,
  session_id uuid not null references interview_sessions (id) on delete cascade,
  role text not null,
  text text not null,
  stage text not null,
  question_number int,
  technique text,
  language text,
  created_at timestamptz not null
);

create index if not exists idx_interview_turns_session on interview_turns (session_id);

create table if not exists session_consents (
  session_id uuid not null references interview_sessions (id) on delete cascade,
  consent_type text not null check (
    consent_type in (
      'ai_conversation',
      'recording',
      'photo_video',
      'sns_publish',
      'commercial'
    )
  ),
  granted boolean not null,
  recorded_at timestamptz not null,
  revoked_at timestamptz,
  source text not null default 'participant',
  primary key (session_id, consent_type)
);

create table if not exists message_idempotency (
  session_id uuid not null references interview_sessions (id) on delete cascade,
  client_message_id uuid not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, client_message_id)
);

create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  reason text,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table interview_sessions enable row level security;
alter table interview_turns enable row level security;
alter table session_consents enable row level security;
alter table message_idempotency enable row level security;
alter table deletion_requests enable row level security;
alter table participants enable row level security;

-- Participants read/update self
create policy participants_self on participants
  for select using (auth.uid() = auth_user_id);

-- Sessions: owner participant via auth linkage
create policy sessions_participant_select on interview_sessions
  for select using (
    participant_id in (select id from participants where auth_user_id = auth.uid())
    and deleted_at is null
    and publish_status = 'private'
  );

-- Published sessions: public read of publish_status only (no private json in app layer)
create policy sessions_public_published on interview_sessions
  for select using (publish_status = 'published' and deleted_at is null);

-- Service role bypasses RLS; Next.js server uses service role only server-side.

create policy turns_participant_select on interview_turns
  for select using (
    session_id in (
      select id from interview_sessions
      where participant_id in (select id from participants where auth_user_id = auth.uid())
    )
  );

create policy consents_participant on session_consents
  for all using (
    session_id in (
      select id from interview_sessions
      where participant_id in (select id from participants where auth_user_id = auth.uid())
    )
  );
