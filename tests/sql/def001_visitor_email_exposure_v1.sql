-- DEF-001 regression: no client role may obtain an e-mail address through resolve_visitor_email or through the guest
-- notification-preference RPCs. Runs on a DISPOSABLE PostgreSQL only (scripts/run-def001-sql-test.sh).
-- Every identifier and address below is synthetic (example.invalid).
\set ON_ERROR_STOP on
\set QUIET on

-- ---- fixture: roles, auth stub and the pre-fix shape of the production objects ----
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create table public.users (id uuid primary key, email text, role text default 'user');
create table public.notification_prefs (
  visitor_id text unique, user_id uuid, email text, topics text[] default '{}', channels text[] default '{}',
  intensity text default 'normal', muted_until timestamptz, updated_at timestamptz default now());
alter table public.users enable row level security;
alter table public.notification_prefs enable row level security;

-- pre-fix resolve_visitor_email: SECURITY DEFINER, no caller check, default PUBLIC execute
create function public.resolve_visitor_email(p_visitor text, p_uid text) returns text
language sql security definer set search_path = public as $$
  select coalesce(
    (select u.email from public.users u where p_uid ~ '^[0-9a-fA-F-]{36}$' and u.id = p_uid::uuid limit 1),
    (select np.email from public.notification_prefs np where np.visitor_id = p_visitor and coalesce(np.email,'') <> '' limit 1));
$$;
-- pre-fix guest RPCs (signature as in production; they echo the stored e-mail)
create function public.notification_prefs_guest_get_v1(p_visitor text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_vis text := lower(btrim(coalesce(p_visitor, ''))); v_out jsonb;
begin
  if auth.uid() is not null then raise exception 'guest endpoint'; end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'bad visitor identity'; end if;
  select jsonb_build_object('topics', np.topics, 'channels', np.channels, 'email', np.email, 'intensity', np.intensity, 'muted_until', np.muted_until)
    into v_out from public.notification_prefs np where np.user_id is null and np.visitor_id = v_vis;
  return v_out;
end $$;
create function public.notification_prefs_guest_save_v1(
  p_visitor text, p_topics text[] default '{}'::text[], p_channels text[] default '{}'::text[], p_email text default null::text,
  p_intensity text default null::text, p_set_intensity boolean default false,
  p_muted_until timestamp with time zone default null::timestamp with time zone, p_set_muted_until boolean default false
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_vis text := lower(btrim(coalesce(p_visitor, ''))); v_out jsonb;
begin
  if auth.uid() is not null then raise exception 'guest endpoint'; end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'bad visitor identity'; end if;
  insert into public.notification_prefs(user_id, visitor_id, topics, channels, email, intensity, muted_until)
    values (null, v_vis, coalesce(p_topics,'{}'), coalesce(p_channels,'{}'), nullif(btrim(coalesce(p_email,'')),''),
            case when p_set_intensity then p_intensity else 'normal' end, case when p_set_muted_until then p_muted_until end)
  on conflict (visitor_id) do update set topics = excluded.topics, channels = excluded.channels, email = excluded.email, updated_at = now()
    where public.notification_prefs.user_id is null
  returning jsonb_build_object('topics', topics, 'channels', channels, 'email', email, 'intensity', intensity, 'muted_until', muted_until) into v_out;
  return v_out;
end $$;
grant execute on function public.notification_prefs_guest_get_v1(text) to anon;
grant execute on function public.notification_prefs_guest_save_v1(text, text[], text[], text, text, boolean, timestamptz, boolean) to anon;
-- the only known SQL dependent of resolve_visitor_email: an admin-guarded SECURITY DEFINER function
create function public.els_analytics_stub(p_days integer) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') then raise exception 'forbidden'; end if;
  return public.resolve_visitor_email('00000000-0000-4000-8000-0000000000aa', null);
end $$;
revoke all on function public.els_analytics_stub(integer) from public;
grant execute on function public.els_analytics_stub(integer) to authenticated;

insert into public.users values
  ('11111111-1111-4111-8111-111111111111', 'victim@example.invalid', 'user'),
  ('22222222-2222-4222-8222-222222222222', 'admin@example.invalid', 'admin');
insert into public.notification_prefs (visitor_id, user_id, email, topics, channels)
  values ('00000000-0000-4000-8000-0000000000aa', null, 'guest@example.invalid', array['t1'], array['email']);
grant select on public.users, public.notification_prefs to service_role;

create function pg_temp.expect_denied(p_role text, p_sql text) returns void language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    reset role;
    raise exception 'EXPECTED DENIED but succeeded for role % : %', p_role, p_sql;
  exception when insufficient_privilege then
    reset role;  -- expected
  end;
end $$;

-- ---- baseline: the fixture reproduces both exposure paths ----
begin;
  set local role anon;
  do $$ begin
    if public.resolve_visitor_email(null, '11111111-1111-4111-8111-111111111111') is distinct from 'victim@example.invalid'
      then raise exception 'BASELINE: anon must resolve an e-mail by uid before the fix'; end if;
    if public.resolve_visitor_email('00000000-0000-4000-8000-0000000000aa', null) is distinct from 'guest@example.invalid'
      then raise exception 'BASELINE: anon must resolve an e-mail by visitor id before the fix'; end if;
    if public.notification_prefs_guest_get_v1('00000000-0000-4000-8000-0000000000aa') ->> 'email' is distinct from 'guest@example.invalid'
      then raise exception 'BASELINE: guest get must echo the e-mail before the fix'; end if;
  end $$;
rollback;

-- ---- the real migration under test ----
\i supabase/proposed/20261106120000_def001_revoke_resolve_visitor_email.sql

-- ---- after the fix ----
-- 1. privilege shape
do $$ begin
  if has_function_privilege('anon', 'public.resolve_visitor_email(text,text)', 'EXECUTE') then raise exception 'anon can still execute'; end if;
  if has_function_privilege('authenticated', 'public.resolve_visitor_email(text,text)', 'EXECUTE') then raise exception 'authenticated can still execute'; end if;
  if not has_function_privilege('service_role', 'public.resolve_visitor_email(text,text)', 'EXECUTE') then raise exception 'service_role lost execute'; end if;
  if not has_function_privilege('anon', 'public.notification_prefs_guest_get_v1(text)', 'EXECUTE') then raise exception 'guest get lost anon execute (UI needs it)'; end if;
  if not has_function_privilege('anon', 'public.notification_prefs_guest_save_v1(text,text[],text[],text,text,boolean,timestamptz,boolean)', 'EXECUTE')
    then raise exception 'guest save lost anon execute (UI needs it)'; end if;
end $$;

-- 2. anon and authenticated are rejected on both call styles
begin;
  select pg_temp.expect_denied('anon', $q$select public.resolve_visitor_email(null, '11111111-1111-4111-8111-111111111111')$q$);
  select pg_temp.expect_denied('anon', $q$select public.resolve_visitor_email('00000000-0000-4000-8000-0000000000aa', null)$q$);
  select pg_temp.expect_denied('authenticated', $q$select public.resolve_visitor_email(null, '11111111-1111-4111-8111-111111111111')$q$);
  select pg_temp.expect_denied('authenticated', $q$select public.resolve_visitor_email('00000000-0000-4000-8000-0000000000aa', null)$q$);
rollback;

-- 3. service_role (server side) still resolves
begin;
  set local role service_role;
  do $$ begin
    if public.resolve_visitor_email(null, '11111111-1111-4111-8111-111111111111') is distinct from 'victim@example.invalid'
      then raise exception 'service_role must still resolve by uid'; end if;
    if public.resolve_visitor_email('00000000-0000-4000-8000-0000000000aa', null) is distinct from 'guest@example.invalid'
      then raise exception 'service_role must still resolve by visitor id'; end if;
  end $$;
rollback;

-- 4. authorized user: the admin-guarded SECURITY DEFINER dependent keeps working; a non-admin stays rejected
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  do $$ begin
    if public.els_analytics_stub(7) is distinct from 'guest@example.invalid' then raise exception 'admin dependent broke after revoke'; end if;
  end $$;
  select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  do $$ begin
    begin perform public.els_analytics_stub(7); raise exception 'non-admin must be rejected';
    exception when raise_exception then if sqlerrm <> 'forbidden' then raise; end if; end;
  end $$;
rollback;

-- 5. guest RPCs: the UI contract (topics, channels, intensity) is kept, the e-mail is never echoed
begin;
  set local role anon;
  do $$
  declare g jsonb; s jsonb;
  begin
    g := public.notification_prefs_guest_get_v1('00000000-0000-4000-8000-0000000000aa');
    if g -> 'topics' is distinct from '["t1"]'::jsonb then raise exception 'guest get lost topics'; end if;
    if g -> 'channels' is distinct from '["email"]'::jsonb then raise exception 'guest get lost channels'; end if;
    if g ->> 'intensity' is null then raise exception 'guest get lost intensity'; end if;
    if g -> 'email' is distinct from 'null'::jsonb then raise exception 'guest get still echoes the e-mail: %', g -> 'email'; end if;
    if (g ->> 'has_email')::boolean is not true then raise exception 'guest get must report has_email'; end if;
    if g::text like '%example.invalid%' then raise exception 'guest get payload leaks an address'; end if;

    s := public.notification_prefs_guest_save_v1('00000000-0000-4000-8000-0000000000bb', array['t2'], array['push'], 'new@example.invalid');
    if s::text like '%example.invalid%' then raise exception 'guest save payload leaks an address'; end if;
    if (s ->> 'has_email')::boolean is not true then raise exception 'guest save must report has_email'; end if;
    if s -> 'topics' is distinct from '["t2"]'::jsonb then raise exception 'guest save lost topics'; end if;
    if public.notification_prefs_guest_get_v1('00000000-0000-4000-8000-0000000000cc') is not null
      then raise exception 'unknown visitor must still return null'; end if;
  end $$;
rollback;
-- the address is still stored for the mailing side (service_role)
begin;
  set local role service_role;
  do $$ begin
    if (select email from public.notification_prefs where visitor_id = '00000000-0000-4000-8000-0000000000aa') is distinct from 'guest@example.invalid'
      then raise exception 'stored address must be untouched'; end if;
  end $$;
rollback;
-- invalid identities are still rejected
begin;
  select pg_temp.expect_denied('anon', $q$select 1$q$) where false;
  set local role anon;
  do $$ begin
    begin perform public.notification_prefs_guest_get_v1('not-a-uuid'); raise exception 'bad identity accepted';
    exception when raise_exception then if sqlerrm <> 'bad visitor identity' then raise; end if; end;
  end $$;
rollback;

-- 6. repository audit query (scripts/sql/audit_email_exposure_v1.sql): nothing in this fixture is client-executable
--    and e-mail-reading without a caller check
create temp table _audit as select * from (
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef
    and (p.prosrc ~* '\m(email|phone)\M' or p.prosrc ~* 'auth\.users')
    and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    and not (p.prosrc ~* '(auth\.uid\(\)|rd_is_admin|is_admin\(|admin only|forbidden|not authorized|service_role)')
    and p.prorettype <> 'trigger'::regtype) a;
do $$ begin if exists (select 1 from _audit) then raise exception 'audit: client-executable e-mail reader without caller check: %', (select string_agg(proname, ',') from _audit); end if; end $$;

-- 7. the documented rollback restores the pre-change behaviour (and only then)
\i supabase/proposed/ROLLBACK_20261106120000_def001.sql
begin;
  set local role anon;
  do $$ begin
    if public.resolve_visitor_email(null, '11111111-1111-4111-8111-111111111111') is distinct from 'victim@example.invalid' then raise exception 'rollback did not restore resolve_visitor_email'; end if;
    if public.notification_prefs_guest_get_v1('00000000-0000-4000-8000-0000000000aa') ->> 'email' is distinct from 'guest@example.invalid' then raise exception 'rollback did not restore the guest get payload'; end if;
  end $$;
rollback;

\echo DEF-001 SQL regression: PASS
