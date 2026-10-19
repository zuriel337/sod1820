-- Bounded read-only coordination reader over public.work_log_current.
-- Owner: existing work_log authority (20260829054800_work_log_authority_foundation_current_projection).
-- Extends the existing work_log_current projection; adds no table, log, queue or contract.
-- Purpose: let a non-admin agent (GPT/Codex) verify active writers and scope/path overlap
-- under inter_agent_coordination_law v17 without a write-capable connection.
-- NOT APPLIED to production by this file's commit; apply only after explicit ZURIEL approval.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sod1820_coordination_reader') then
    create role sod1820_coordination_reader nologin noinherit nobypassrls;
  end if;
end $$;

create or replace function public.coordination_read_current(
  p_task_key    text    default null,
  p_scope_terms text[]  default null,
  p_active_only boolean default true,
  p_limit       integer default 25
)
returns table (
  id uuid,
  created_at timestamptz,
  task_key text,
  from_actor text,
  to_actor text,
  assignment_mode text,
  status text,
  primary_owner text,
  release_authorization_state text,
  assignment_scope text,
  topic text,
  open_threads text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select w.id, w.created_at, w.task_key, w.from_actor, w.to_actor, w.assignment_mode,
         w.status, w.primary_owner, w.release_authorization_state,
         left(w.assignment_scope, 800), left(w.topic, 240), left(w.open_threads, 500)
  from public.work_log_current w
  where coalesce(w.archived, false) = false
    and w.superseded_by_id is null
    and (p_task_key is null or w.task_key = p_task_key)
    and (not coalesce(p_active_only, true)
         or w.status ~* '^(BEFORE|EXPLICIT_RELEASE)'
         or w.status ~* 'ACTIVE_WRITER')
    and (p_scope_terms is null
         or exists (
              select 1 from unnest(p_scope_terms) t
              where length(t) between 3 and 120
                and (position(lower(t) in lower(coalesce(w.assignment_scope, ''))) > 0
                  or position(lower(t) in lower(coalesce(w.task_key, ''))) > 0
                  or position(lower(t) in lower(coalesce(w.topic, ''))) > 0)))
    and (p_task_key is not null or p_scope_terms is not null or coalesce(p_active_only, true))
  order by w.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 50));
$$;

comment on function public.coordination_read_current(text, text[], boolean, integer) is
  'Read-only, column-limited, row-capped (<=50) view of public.work_log_current for v17 overlap checks. Excludes what_we_did and all dispatch_* internals. No writes.';

revoke all on function public.coordination_read_current(text, text[], boolean, integer) from public, anon, authenticated;
grant execute on function public.coordination_read_current(text, text[], boolean, integer) to sod1820_coordination_reader, service_role;
