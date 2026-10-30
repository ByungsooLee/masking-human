create table public.pipeline_operator_attempts (
  scope text primary key,
  expires_at timestamptz not null,
  attempts integer not null check (attempts >= 0)
);
alter table public.pipeline_operator_attempts enable row level security;
revoke all on public.pipeline_operator_attempts from public, anon, authenticated;
grant all on public.pipeline_operator_attempts to service_role;

create or replace function public.pipeline_operator_attempt(p_scope text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_time timestamptz := clock_timestamp();
begin
  if p_scope !~ '^[a-f0-9]{64}$' then raise exception 'Invalid scope'; end if;
  perform pg_advisory_xact_lock(727104031);
  delete from public.pipeline_operator_attempts where expires_at <= attempt_time;
  insert into public.pipeline_operator_attempts(scope, expires_at, attempts)
    values ('global', attempt_time + interval '15 minutes', 0), (p_scope, attempt_time + interval '15 minutes', 0)
    on conflict (scope) do nothing;
  if exists (select 1 from public.pipeline_operator_attempts where (scope = 'global' and attempts >= 30) or (scope = p_scope and attempts >= 5)) then return false; end if;
  update public.pipeline_operator_attempts set attempts = attempts + 1 where scope in ('global', p_scope);
  return true;
end;
$$;
revoke all on function public.pipeline_operator_attempt(text) from public, anon, authenticated;
grant execute on function public.pipeline_operator_attempt(text) to service_role;
