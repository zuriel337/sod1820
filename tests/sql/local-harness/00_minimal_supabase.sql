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

-- Minimal work_log_current (real one is a view over work_log; only the used columns are modelled).
create table public.work_log (id uuid primary key default gen_random_uuid(), topic text);
alter table public.work_log enable row level security;
grant select on public.work_log to authenticated;  -- as in prod; RLS (no policy) hides rows
create table public.work_log_current (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  topic text, what_we_did text, status text, open_threads text, archived boolean default false,
  superseded_by_id uuid, task_key text, from_actor text, to_actor text, assignment_mode text,
  assignment_scope text, primary_owner text, release_authorization_state text,
  dispatch_context jsonb, dispatch_session_url text);
grant all on public.work_log_current to service_role;   -- as in prod: no grant to anon/authenticated
