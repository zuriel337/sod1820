-- Bounded read-only coordination reader over the work_log ledger (inter_agent_coordination_law v17).
-- Owner: existing work_log authority (20260829054800_work_log_authority_foundation_current_projection).
-- Extends the existing ledger; adds no table, log, queue, role or contract.
-- Purpose: let a non-admin agent (GPT/Codex/Work/Claude Code) verify active writers and
-- scope/path overlap without a write-capable credential.
--
-- Identity model (no shared secret, no service_role, no custom DB login):
--   * The agent signs in through Supabase Auth as a dedicated Auth user (OAuth 2.1 / MCP flow).
--   * An administrator sets raw_app_meta_data.sod1820_coordination_reader = true on that user.
--   * Authorization is read LIVE from auth.users on every call, never from the JWT claim, so
--     removing the flag, banning or deleting the user revokes access immediately.
--   * Anything else fails closed (42501).
--
-- Active-writer definition is a TASK LIFECYCLE, not a status string match:
--   * rows are grouped by task scope (same derivation as work_log_current._task_scope);
--   * only lifecycle rows count: OPEN (BEFORE / ACK_* claims / CLAIMED_WRITE / ASSIGNED_WRITE /
--     WRITE_SCOPE_OPEN / WRITE_WINDOW_OPEN / *ACTIVE_WRITER* / legacy CLAIMED+mode WRITE) or CLOSE
--     (AFTER / CLOSED / CANCELLED / RELEASED / SCOPE_RELEASED / DECLINED / SUPERSEDED / FROZEN /
--     MERGED / COMPLETE(D) / DONE / DEPLOYED / IMPLEMENTED / BLOCKED ...); any other status
--     (progress notes, PLANNED, HANDOFF_READY, *_AUTHORIZED, telemetry) is NEUTRAL and cannot open or close;
--   * a task scope is an ACTIVE writer iff its LATEST lifecycle row is OPEN; so BEFORE→AFTER is released,
--     BEFORE→AFTER→BEFORE is active again, READ_ONLY claims never count, and release-AUTHORIZATION
--     statuses (EXPLICIT_RELEASE_AUTHORIZED, RELEASE_AUTHORIZED) are NOT writers.
--   * the ledger is read directly (non-archived, non-superseded, last 30 days) and NOT through
--     work_log_current, because that view keeps only the 100 newest rows and could drop an old,
--     still-open BEFORE.
--
-- Completeness: one jsonb document with total_matches / returned / truncated and the full list of
-- active writers' scopes (active_total / active_truncated).
--
-- NOT APPLIED to production by this file's commit; apply only after explicit ZURIEL approval.

-- Internal classifier (not callable by API roles).
create or replace function public.coordination_status_class(p_status text, p_mode text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    -- 1) terminal prefixes
    when p_status ~* '^(AFTER|CLOSED|CANCEL|RELEASED|DECLINED|SUPERSEDED|FROZEN|MERGED|COMPLETED|COMPLETE|DONE|DEPLOYED|LIVE_VERIFIED|IMPLEMENTED|BLOCKED)' then 'CLOSE'
    -- 2) write-claim states (fail toward overlap); never READ_ONLY; ACK_* counts except requests/read/declined/blocked
    when coalesce(p_mode, '') <> 'READ_ONLY' and coalesce(p_status, '') !~* 'READ_ONLY'
     and (p_status ~* '^(BEFORE|CLAIMED_WRITE|ASSIGNED_WRITE|WRITE_SCOPE_OPEN|WRITE_WINDOW_OPEN)'
          or (p_status ~* '^ACK_' and p_status !~* '^ACK_(REQUIRED|READ|DECLINED|BLOCKED)')
          or p_status ~* 'ACTIVE_WRITER'
          or (p_status ~* '^CLAIMED' and p_mode = 'WRITE')) then 'OPEN'
    -- 3) terminal markers elsewhere in the status (e.g. BRANCH_ONLY_COMPLETE_..., ..._SCOPE_RELEASED_...)
    when p_status ~* '(SCOPE_RELEASED|(^|_)RELEASED(_|$)|CANCELL?ED|DECLINED|CLOSED_BY|(^|_)COMPLETED?(_|$))' then 'CLOSE'
    else 'NEUTRAL'
  end
$$;
revoke all on function public.coordination_status_class(text, text) from public, anon, authenticated;

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
  v_act_total bigint;
  v_act   jsonb;
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

  if length(coalesce(p_task_key, '')) > 200 or length(coalesce(p_exclude_task_key, '')) > 200 then
    raise exception 'task key too long (max 200)' using errcode = '22023';
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

  with scoped as (
    select w.id, w.created_at, w.task_key, w.status, w.from_actor, w.to_actor, w.assignment_mode,
           w.primary_owner, w.release_authorization_state, w.assignment_scope, w.topic, w.open_threads,
           coalesce(w.task_key,
                    (regexp_match(coalesce(w.topic, ''), 'task=([^ ]+)'))[1],
                    nullif(split_part(coalesce(w.topic, ''), ' — ', 1), ''),
                    w.id::text) as scope_key,
           public.coordination_status_class(w.status, w.assignment_mode) as cls
    from public.work_log w
    where coalesce(w.archived, false) = false
      and w.superseded_by_id is null
      and w.created_at >= now() - interval '30 days'
  ), latest as (
    select distinct on (scope_key) *
    from scoped
    where cls in ('OPEN', 'CLOSE')
    order by scope_key, created_at desc, (cls = 'OPEN') desc, id
  ), act as (
    select * from latest
    where cls = 'OPEN'
      and (p_exclude_task_key is null
           or (task_key is distinct from p_exclude_task_key and scope_key <> p_exclude_task_key))
  ), pool as (
    select * from act where coalesce(p_active_only, true)
    union all
    select id, created_at, task_key, status, from_actor, to_actor, assignment_mode, primary_owner,
           release_authorization_state, assignment_scope, topic, open_threads, scope_key, cls
    from scoped
    where not coalesce(p_active_only, true)
      and (p_exclude_task_key is null
           or (task_key is distinct from p_exclude_task_key and scope_key <> p_exclude_task_key))
  ), m as (
    select * from pool p
    where (p_task_key is null or p.task_key = p_task_key or p.scope_key = p_task_key)
      and (v_terms is null
           or btrim(coalesce(p.assignment_scope, '')) = ''   -- no declared scope: fail toward overlap
           or exists (
                select 1 from unnest(v_terms) t
                where position(t in lower(coalesce(p.assignment_scope, ''))) > 0
                   or position(t in lower(coalesce(p.task_key, ''))) > 0
                   or position(t in lower(p.scope_key)) > 0
                   or position(t in lower(coalesce(p.topic, ''))) > 0))
  )
  select (select count(*) from m),
         coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id)
                   from (select id, created_at, task_key, scope_key, from_actor, to_actor, assignment_mode, status,
                                primary_owner, release_authorization_state,
                                round(extract(epoch from (now() - created_at)) / 3600)::int as age_hours,
                                left(assignment_scope, 800) as assignment_scope,
                                left(topic, 240) as topic, left(open_threads, 500) as open_threads
                         from m order by created_at desc, id limit v_limit) r), '[]'::jsonb),
         (select count(*) from act),
         coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id)
                   from (select id, created_at, task_key, scope_key, status,
                                round(extract(epoch from (now() - created_at)) / 3600)::int as age_hours,
                                left(assignment_scope, 300) as assignment_scope
                         from act order by created_at desc, id limit 50) r), '[]'::jsonb)
  into v_total, v_rows, v_act_total, v_act;

  return jsonb_build_object(
    'checked_at',    now(),
    'total_matches', v_total,
    'returned',      jsonb_array_length(v_rows),
    'limit',         v_limit,
    'truncated',     jsonb_array_length(v_rows) < v_total,
    'rows',          v_rows,
    'active_total',  v_act_total,
    'active_scopes', v_act,
    'active_truncated', jsonb_array_length(v_act) < v_act_total);
end;
$$;

comment on function public.coordination_read_current(text, text[], boolean, integer, text) is
  'Read-only coordination check for v17. Active writer = task scope whose latest lifecycle row (BEFORE/CLAIMED_WRITE/... vs AFTER/RELEASED/CANCELLED/...) is OPEN, read from work_log (30d). Live-authorizes against auth.users, fails closed. Returns jsonb with total_matches/truncated and active_scopes/active_truncated; any truncation must be treated as INCOMPLETE. Excludes what_we_did and dispatch_* internals. No writes.';

revoke all on function public.coordination_read_current(text, text[], boolean, integer, text) from public, anon;
grant execute on function public.coordination_read_current(text, text[], boolean, integer, text) to authenticated;

-- Post-apply ACL self-test: aborts the migration transaction if anon/PUBLIC/authenticated could execute
-- the internal classifier, or anon/PUBLIC could execute the reader.
do $$
begin
  if has_function_privilege('anon', 'public.coordination_read_current(text,text[],boolean,integer,text)', 'execute')
     or has_function_privilege('anon', 'public.coordination_status_class(text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.coordination_status_class(text,text)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid in ('public.coordination_read_current(text,text[],boolean,integer,text)'::regprocedure,
                                'public.coordination_status_class(text,text)'::regprocedure)
                  and a.grantee = 0) then
    raise exception 'ACL leak: coordination functions executable by anon/PUBLIC/authenticated';
  end if;
end $$;
