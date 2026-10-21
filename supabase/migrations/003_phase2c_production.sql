-- Phase 2C: production voice persistence, transcript confirmation, deletion jobs, atomic session save

-- audio_assets: distinguish browser vs external WAV vs TTS
alter table audio_assets
  add column if not exists source_type text not null default 'browser_recording'
    check (source_type in ('browser_recording', 'assistant_tts', 'external_wav')),
  add column if not exists byte_size bigint,
  add column if not exists upload_status text not null default 'ready'
    check (upload_status in ('pending', 'ready', 'failed')),
  add column if not exists storage_bucket text not null default 'interview-audio-private';

create index if not exists idx_audio_assets_upload_pending
  on audio_assets (session_id) where upload_status = 'pending';

-- utterance_records: explicit transcript fields (Phase 2C)
alter table utterance_records
  add column if not exists original_transcript text,
  add column if not exists confirmed_transcript text,
  add column if not exists transcript_language text,
  add column if not exists source_audio_asset_id uuid references audio_assets (id),
  add column if not exists interview_turn_id uuid references interview_turns (id);

update utterance_records
set
  original_transcript = coalesce(original_transcript, text_original),
  confirmed_transcript = coalesce(confirmed_transcript, text_display),
  transcript_language = coalesce(transcript_language, language),
  source_audio_asset_id = coalesce(source_audio_asset_id, audio_asset_id)
where original_transcript is null;

-- deletion_requests: retry + idempotent processing
alter table deletion_requests
  add column if not exists attempts int not null default 0,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_deletion_requests_pending
  on deletion_requests (status, requested_at)
  where status in ('pending', 'failed');

-- Storage bucket (private). Run once; ignore error if exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-audio-private',
  'interview-audio-private',
  false,
  15728640,
  array['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Canonical rule: interview_sessions.session_json is source of truth for engine state;
-- interview_turns is normalized mirror written in the same transaction as session_json.

create or replace function save_interview_session_atomic(
  p_session jsonb,
  p_turns jsonb,
  p_consents jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid := (p_session->>'id')::uuid;
begin
  insert into participants (id)
  values ((p_session->>'participantId')::uuid)
  on conflict (id) do nothing;

  insert into interview_sessions (
    id, participant_id, participant_token_hash, theme_id,
    interview_language, publishing_language, status, publish_status,
    current_stage, stage_question_count, total_questions_asked, max_questions,
    started_at, ended_at, deleted_at, deletion_requested_at, session_json, updated_at
  ) values (
    v_session_id,
    (p_session->>'participantId')::uuid,
    p_session->>'participantTokenHash',
    p_session->>'themeId',
    p_session->'language'->>'interviewLanguage',
    p_session->'language'->>'publishingLanguage',
    p_session->>'status',
    coalesce(p_session->>'publishStatus', 'private'),
    p_session->>'currentStage',
    (p_session->>'stageQuestionCount')::int,
    (p_session->>'totalQuestionsAsked')::int,
    coalesce((p_session->>'maxQuestions')::int, 8),
    (p_session->>'startedAt')::timestamptz,
    nullif(p_session->>'endedAt', '')::timestamptz,
    nullif(p_session->>'deletedAt', '')::timestamptz,
    nullif(p_session->>'deletionRequestedAt', '')::timestamptz,
    p_session,
    now()
  )
  on conflict (id) do update set
    participant_token_hash = excluded.participant_token_hash,
    interview_language = excluded.interview_language,
    publishing_language = excluded.publishing_language,
    status = excluded.status,
    publish_status = excluded.publish_status,
    current_stage = excluded.current_stage,
    stage_question_count = excluded.stage_question_count,
    total_questions_asked = excluded.total_questions_asked,
    ended_at = excluded.ended_at,
    deleted_at = excluded.deleted_at,
    deletion_requested_at = excluded.deletion_requested_at,
    session_json = excluded.session_json,
    updated_at = now();

  insert into interview_turns (
    id, session_id, role, text, stage, question_number, technique, language, created_at
  )
  select
    (t->>'id')::uuid,
    v_session_id,
    t->>'role',
    t->>'text',
    t->>'stage',
    nullif(t->>'questionNumber', '')::int,
    nullif(t->>'technique', ''),
    nullif(t->>'language', ''),
    (t->>'timestamp')::timestamptz
  from jsonb_array_elements(p_turns) as t
  on conflict (id) do update set
    text = excluded.text,
    stage = excluded.stage,
    question_number = excluded.question_number,
    technique = excluded.technique,
    language = excluded.language;

  insert into session_consents (
    session_id, consent_type, granted, recorded_at, revoked_at, source
  )
  select
    v_session_id,
    c->>'consent_type',
    (c->>'granted')::boolean,
    (c->>'recorded_at')::timestamptz,
    nullif(c->>'revoked_at', '')::timestamptz,
    coalesce(c->>'source', 'participant')
  from jsonb_array_elements(p_consents) as c
  on conflict (session_id, consent_type) do update set
    granted = excluded.granted,
    recorded_at = excluded.recorded_at,
    revoked_at = excluded.revoked_at,
    source = excluded.source;
end;
$$;

-- Idempotent message insert (race-safe)
create or replace function claim_message_idempotency(
  p_session_id uuid,
  p_client_message_id uuid,
  p_response jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing jsonb;
begin
  select response_json into existing
  from message_idempotency
  where session_id = p_session_id and client_message_id = p_client_message_id;

  if existing is not null then
    return existing;
  end if;

  insert into message_idempotency (session_id, client_message_id, response_json)
  values (p_session_id, p_client_message_id, p_response)
  on conflict (session_id, client_message_id) do nothing;

  select response_json into existing
  from message_idempotency
  where session_id = p_session_id and client_message_id = p_client_message_id;

  return existing;
end;
$$;
