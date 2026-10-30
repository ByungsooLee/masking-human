create table if not exists public.interview_cost_months (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  revision bigint not null default 0,
  spent_usd numeric not null default 0,
  reserved_usd numeric not null default 0,
  unknown_count integer not null default 0
);
create table if not exists public.interview_cost_sessions (
  id uuid primary key,
  month text not null references public.interview_cost_months(month),
  payload jsonb not null
);
create index if not exists interview_cost_sessions_month on public.interview_cost_sessions(month);
alter table public.interview_cost_months enable row level security;
alter table public.interview_cost_sessions enable row level security;
revoke all on public.interview_cost_months, public.interview_cost_sessions from public, anon, authenticated;
grant select, insert, update on public.interview_cost_months, public.interview_cost_sessions to service_role;

create or replace function public.pipeline_session_totals(p_payload jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'usd', coalesce(sum((entry->>'usd')::numeric), 0),
    'reservedUsd', coalesce(sum(case when entry->>'usd' is null then (entry->>'reservedUsd')::numeric else 0 end), 0),
    'unknown', count(*) filter (where entry->>'status' = 'unknown')
  ) from jsonb_array_elements(coalesce(p_payload->'entries', '[]'::jsonb)) as entry;
$$;

create or replace function public.pipeline_read_costs(p_month text, p_session_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  insert into public.interview_cost_months(month) values (p_month) on conflict do nothing;
  select jsonb_build_object(
    'revision', monthly.revision,
    'payload', jsonb_build_object(
      'sessions', case when session.id is null then '{}'::jsonb else jsonb_build_object(p_session_id, session.payload) end,
      'other', jsonb_build_object(
        'usd', monthly.spent_usd - (totals.value->>'usd')::numeric,
        'reservedUsd', monthly.reserved_usd - (totals.value->>'reservedUsd')::numeric,
        'unknown', monthly.unknown_count - (totals.value->>'unknown')::integer
      )
    )
  ) into result
  from public.interview_cost_months monthly
  left join public.interview_cost_sessions session on session.month = monthly.month and session.id::text = p_session_id
  cross join lateral (select public.pipeline_session_totals(session.payload) as value) totals
  where monthly.month = p_month;
  return result;
end;
$$;

create or replace function public.pipeline_commit_costs(p_month text, p_session_id uuid, p_revision bigint, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_revision bigint; previous_payload jsonb; before_totals jsonb; after_totals jsonb;
begin
  select revision into current_revision from public.interview_cost_months where month = p_month for update;
  if current_revision is null or current_revision <> p_revision then return false; end if;
  if p_payload->>'id' is distinct from p_session_id::text then raise exception 'Invalid session'; end if;
  select payload into previous_payload from public.interview_cost_sessions where id = p_session_id and month = p_month for update;
  before_totals := public.pipeline_session_totals(previous_payload);
  after_totals := public.pipeline_session_totals(p_payload);
  insert into public.interview_cost_sessions(id, month, payload) values (p_session_id, p_month, p_payload)
    on conflict (id) do update set payload = excluded.payload;
  update public.interview_cost_months set
    revision = revision + 1,
    spent_usd = spent_usd + (after_totals->>'usd')::numeric - (before_totals->>'usd')::numeric,
    reserved_usd = reserved_usd + (after_totals->>'reservedUsd')::numeric - (before_totals->>'reservedUsd')::numeric,
    unknown_count = unknown_count + (after_totals->>'unknown')::integer - (before_totals->>'unknown')::integer
  where month = p_month;
  return true;
end;
$$;

revoke all on function public.pipeline_session_totals(jsonb) from public, anon, authenticated;
revoke all on function public.pipeline_read_costs(text, text) from public, anon, authenticated;
revoke all on function public.pipeline_commit_costs(text, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.pipeline_session_totals(jsonb) to service_role;
grant execute on function public.pipeline_read_costs(text, text) to service_role;
grant execute on function public.pipeline_commit_costs(text, uuid, bigint, jsonb) to service_role;
