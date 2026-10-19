-- Bounded read-only coordination reader over public.work_log_current.
-- Owner: existing work_log authority (20260829054800_work_log_authority_foundation_current_projection).
-- Extends the existing work_log_current projection; adds no table, log, queue, role or contract.
-- Purpose: let a non-admin agent (GPT/Codex/Work/Claude Code) verify active writers and
-- scope/path overlap under inter_agent_coordination_law v17 without a write-capable credential.
--
-- Identity model (no shared secret, no service_role, no custom DB login):
--   * The agent signs in through Supabase Auth as a dedicated Auth user (OAuth 2.1 / MCP flow).
--   * An administrator sets raw_app_meta_data.sod1820_coordination_reader = true on that user
--     (server-side only; a user cannot edit it).
--   * Authorization is read LIVE from auth.users on every call, never from the JWT claim, so
--     removing the flag, banning or deleting the user revokes access immediately even while an
--     old access token is still unexpired.
--   * Anything else fails closed (42501).
--
-- Completeness: the function returns ONE jsonb document with total_matches / returned / truncated
-- so a caller can never mistake a capped page for "no overlap".
--
-- NOT APPLIED to production by this file's commit; apply only after explicit ZURIEL approval.

create or replace function public.coordination_read_current(
  p_task_key         text    default null,
  p_scope_terms      text[]  default null,
  p_active_only      boolean default true,
  p_limit            integer default 25,
  p_exclude_task_key text    default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_terms text[];
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 50));
  v_total bigint;
  v_rows  jsonb;
begin
  if auth.uid() is null
     or coalesce(auth.role(), '') <> 'authenticated'
     or not exists (
          select 1 from auth.users u
          where u.id = auth.uid()
            and u.deleted_at is null
            and (u.banned_until is null or u.banned_until <= now())
            and coalesce(u.raw_app_meta_data ->> 'sod1820_coordination_reader', '') = 'true') then
    raise exception 'coordination reader not authorized' using errcode = '42501';
  end if;

  if p_scope_terms is not null then
    if cardinality(p_scope_terms) > 10 then
      raise exception 'too many scope terms (max 10)' using errcode = '22023';
    end if;
    if exists (select 1 from unnest(p_scope_terms) t where t is null or length(t) not between 3 and 120) then
      raise exception 'scope terms must be 3..120 chars' using errcode = '22023';
    end if;
    select array_agg(lower(t)) into v_terms from unnest(p_scope_terms) t;
  end if;

  if not coalesce(p_active_only, true) and p_task_key is null and v_terms is null then
    raise exception 'filter required when p_active_only is false' using errcode = '22023';
  end if;

  with m as (
    select w.*
    from public.work_log_current w
    where coalesce(w.archived, false) = false
      and w.superseded_by_id is null
      and (p_task_key is null or w.task_key = p_task_key)
      and (p_exclude_task_key is null or w.task_key is distinct from p_exclude_task_key)
      and (not coalesce(p_active_only, true)
           or w.status ~* '^(BEFORE|EXPLICIT_RELEASE)'
           or w.status ~* 'ACTIVE_WRITER')
      and (v_terms is null
           or exists (
                select 1 from unnest(v_terms) t
                where position(t in lower(coalesce(w.assignment_scope, ''))) > 0
                   or position(t in lower(coalesce(w.task_key, ''))) > 0
                   or position(t in lower(coalesce(w.topic, ''))) > 0)))
  select (select count(*) from m),
         coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id)
                   from (select id, created_at, task_key, from_actor, to_actor, assignment_mode, status,
                                primary_owner, release_authorization_state,
                                left(assignment_scope, 800) as assignment_scope,
                                left(topic, 240) as topic, left(open_threads, 500) as open_threads
                         from m order by created_at desc, id limit v_limit) r), '[]'::jsonb)
  into v_total, v_rows;

  return jsonb_build_object(
    'checked_at',    now(),
    'total_matches', v_total,
    'returned',      jsonb_array_length(v_rows),
    'limit',         v_limit,
    'truncated',     jsonb_array_length(v_rows) < v_total,
    'rows',          v_rows);
end;
$$;

comment on function public.coordination_read_current(text, text[], boolean, integer, text) is
  'Read-only, column-limited coordination check over work_log_current for v17. Live-authorizes against auth.users (flag sod1820_coordination_reader), fails closed. Returns jsonb {total_matches, returned, truncated, rows<=50}; truncated=true must be treated as INCOMPLETE. Excludes what_we_did and dispatch_* internals. No writes.';

revoke all on function public.coordination_read_current(text, text[], boolean, integer, text) from public, anon;
grant execute on function public.coordination_read_current(text, text[], boolean, integer, text) to authenticated;

-- Post-apply ACL self-test: aborts the migration transaction if anon/PUBLIC could execute.
do $$
begin
  if has_function_privilege('anon', 'public.coordination_read_current(text,text[],boolean,integer,text)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = 'public.coordination_read_current(text,text[],boolean,integer,text)'::regprocedure
                  and a.grantee = 0) then
    raise exception 'ACL leak: anon/PUBLIC can execute coordination_read_current';
  end if;
end $$;
