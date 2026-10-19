-- Minimal stand-in for the Supabase pieces coordination_read_current depends on.
-- LOCAL TEST HARNESS ONLY. Never applied to Supabase. Does not load the site's migrations.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, raw_app_meta_data jsonb not null default '{}', banned_until timestamptz, deleted_at timestamptz);
-- Same definitions Supabase Auth ships (claims come from request.jwt.claims):
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt() ->> 'role' $$;
grant execute on all functions in schema auth to anon, authenticated, service_role;
-- Supabase default privileges: new public functions are executable by anon/authenticated/service_role.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Base ledger with the REAL column set, and the REAL public.work_log_current view definition
-- (copied from production pg_get_viewdef on 2026-10-19): 100 newest rows + latest "active-pattern" row per scope.
create table public.work_log (
  id uuid primary key default gen_random_uuid(), session_date date default current_date, topic text not null, numbers integer[],
  what_we_did text, status text, open_threads text, created_at timestamptz default now(),
  archived boolean not null default false, superseded_by_id uuid, task_key text, from_actor text, to_actor text,
  assignment_mode text, assignment_scope text, primary_owner text, release_authorization_state text,
  parent_assignment_id uuid, dispatch_kind text, dispatch_state text, dispatch_context jsonb, dispatch_attempts integer,
  dispatch_next_attempt_at timestamptz, dispatch_lease_owner text, dispatch_lease_expires_at timestamptz,
  dispatch_last_error text, dispatch_last_request_id bigint, dispatch_last_emitted_at timestamptz,
  dispatch_completed_at timestamptz, dispatch_session_id text, dispatch_session_url text, dispatch_response_at timestamptz);
alter table public.work_log enable row level security;
grant select on public.work_log to authenticated;  -- as in prod; RLS with no policy hides rows

create view public.work_log_current as
 WITH base AS (
  SELECT w.*, COALESCE(w.task_key, (regexp_match(COALESCE(w.topic, ''::text), 'task=([^ ]+)'::text))[1], split_part(COALESCE(w.topic, ''::text), ' — '::text, 1)) AS _task_scope
  FROM work_log w WHERE ((w.archived = false) AND (w.superseded_by_id IS NULL))
 ), recent AS (SELECT base.id FROM base ORDER BY base.created_at DESC LIMIT 100
 ), active_latest AS (
  SELECT DISTINCT ON (base._task_scope) base.id FROM base
  WHERE ((base.created_at >= (now() - '14 days'::interval)) AND ((COALESCE(base.status, ''::text) ~* '(CLAIMED_WRITE|WRITE_SCOPE_OPEN|BLOCKED|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'::text) OR (base.dispatch_state = ANY (ARRAY['QUEUED'::text, 'FIRE_REQUESTED'::text, 'SESSION_STARTED'::text, 'CLAIMED'::text, 'RETRY_WAIT'::text, 'DEFERRED'::text]))))
  ORDER BY base._task_scope, base.created_at DESC
 ), keep AS (SELECT recent.id FROM recent UNION SELECT active_latest.id FROM active_latest)
 SELECT b.id, b.session_date, b.topic, b.numbers, b.what_we_did, b.status, b.open_threads, b.created_at, b.archived,
  b.superseded_by_id, b.task_key, b.from_actor, b.to_actor, b.assignment_mode, b.assignment_scope, b.primary_owner,
  b.release_authorization_state, b.parent_assignment_id, b.dispatch_kind, b.dispatch_state, b.dispatch_context,
  b.dispatch_attempts, b.dispatch_next_attempt_at, b.dispatch_lease_owner, b.dispatch_lease_expires_at, b.dispatch_last_error,
  b.dispatch_last_request_id, b.dispatch_last_emitted_at, b.dispatch_completed_at, b.dispatch_session_id, b.dispatch_session_url, b.dispatch_response_at
 FROM (base b JOIN keep k USING (id)) ORDER BY b.created_at DESC;
grant all on public.work_log_current to service_role;   -- as in prod: no grant to anon/authenticated
grant all on public.work_log to service_role;
