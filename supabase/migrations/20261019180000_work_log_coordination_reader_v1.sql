-- Bounded read-only coordination reader over public.work_log_current.
-- Owner: existing work_log authority (20260829054800_work_log_authority_foundation_current_projection).
-- Extends the existing work_log_current projection; adds no table, log, queue, role or contract.
-- Purpose: let a non-admin agent (GPT/Codex/Work/Claude Code) verify active writers and
-- scope/path overlap under inter_agent_coordination_law v17 without a write-capable credential.
--
-- Identity model (no shared secret, no service_role, no custom DB login):
--   * The agent signs in through Supabase Auth as a dedicated Auth user (OAuth 2.1 / MCP flow).
--   * An administrator sets app_metadata.sod1820_coordination_reader = true on that user.
--     app_metadata is server-side only: a user cannot edit it. Removing the flag or banning the
--     user revokes access; the access token expires on its own (default 1h).
--   * This function re-checks the flag on every call and FAILS CLOSED (42501) otherwise.
--
-- NOT APPLIED to production by this file's commit; apply only after explicit ZURIEL approval.

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
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_terms text[];
begin
  if auth.uid() is null
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'sod1820_coordination_reader', '') <> 'true' then
    raise exception 'coordination reader not authorized' using errcode = '42501';
  end if;

  if p_scope_terms is not null then
    if cardinality(p_scope_terms) > 10 then
      raise exception 'too many scope terms (max 10)' using errcode = '22023';
    end if;
    select array_agg(lower(t)) into v_terms
    from unnest(p_scope_terms) t
    where t is not null and length(t) between 3 and 120;
  end if;

  -- Unfiltered history reads are refused: a task key or scope terms are required
  -- unless the caller asks for the active-writer view only.
  if not coalesce(p_active_only, true) and p_task_key is null and v_terms is null then
    raise exception 'filter required when p_active_only is false' using errcode = '22023';
  end if;

  return query
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
    and (v_terms is null
         or exists (
              select 1 from unnest(v_terms) t
              where position(t in lower(coalesce(w.assignment_scope, ''))) > 0
                 or position(t in lower(coalesce(w.task_key, ''))) > 0
                 or position(t in lower(coalesce(w.topic, ''))) > 0))
  order by w.created_at desc, w.id
  limit greatest(1, least(coalesce(p_limit, 25), 50));
end;
$$;

comment on function public.coordination_read_current(text, text[], boolean, integer) is
  'Read-only, column-limited, row-capped (<=50) view of public.work_log_current for v17 overlap checks. Requires Auth user with app_metadata.sod1820_coordination_reader=true; fails closed. Excludes what_we_did and all dispatch_* internals. No writes.';

revoke all on function public.coordination_read_current(text, text[], boolean, integer) from public, anon;
grant execute on function public.coordination_read_current(text, text[], boolean, integer) to authenticated;

-- Post-apply ACL self-test: aborts the migration transaction if anon/PUBLIC could execute.
do $$
begin
  if has_function_privilege('anon', 'public.coordination_read_current(text,text[],boolean,integer)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = 'public.coordination_read_current(text,text[],boolean,integer)'::regprocedure
                  and a.grantee = 0) then
    raise exception 'ACL leak: anon/PUBLIC can execute coordination_read_current';
  end if;
end $$;
