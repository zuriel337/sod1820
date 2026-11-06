-- DEF-001b regression: guest visitor ids are not readable by clients; anonymous push subscribe/unsubscribe keeps working
-- through the RPCs. Runs on a DISPOSABLE PostgreSQL only (scripts/run-def001-sql-test.sh). Synthetic data only.
\set ON_ERROR_STOP on
\set QUIET on

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
grant select (id, role) on public.users to anon, authenticated;
create table public.feedback (id uuid primary key default gen_random_uuid(), context text, verdict text, visitor_id text, created_at timestamptz default now());
alter table public.feedback enable row level security;
grant select on public.feedback to anon, authenticated;
create policy feedback_public_read on public.feedback for select using (true);
create table public.els_records (id uuid primary key default gen_random_uuid(), title text, slug text, status text, visibility text, visitor_id text, positions jsonb);
alter table public.els_records enable row level security;
grant select on public.els_records to anon, authenticated;
create policy public_read_published_els on public.els_records for select using (status = 'published' and visibility = 'public');
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), endpoint text unique not null, p256dh text, auth text, user_id uuid, visitor_id text,
  topics text[], user_agent text, created_at timestamptz default now(), last_seen timestamptz);
alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;
create policy ps_anon_select on public.push_subscriptions for select to anon using (user_id is null);
create policy ps_anon_insert on public.push_subscriptions for insert to anon with check (user_id is null);
create policy ps_anon_update on public.push_subscriptions for update to anon using (user_id is null) with check (user_id is null);
create policy ps_anon_delete on public.push_subscriptions for delete to anon using (user_id is null);
create policy ps_auth_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
alter table public.users enable row level security;
create policy users_select_public on public.users for select using (true);

insert into public.users values ('22222222-2222-4222-8222-222222222222', null, 'admin'), ('11111111-1111-4111-8111-111111111111', null, 'user');
insert into public.feedback (context, verdict, visitor_id) values ('c', 'v', '00000000-0000-4000-8000-0000000000aa');
insert into public.els_records (title, slug, status, visibility, visitor_id) values ('t', 's', 'published', 'public', '00000000-0000-4000-8000-0000000000aa');
insert into public.push_subscriptions (endpoint, p256dh, auth, visitor_id, user_agent) values ('https://push.example.invalid/ep-anon', 'K', 'A', '00000000-0000-4000-8000-0000000000aa', 'UA');
insert into public.push_subscriptions (endpoint, p256dh, auth, user_id, user_agent) values ('https://push.example.invalid/ep-user', 'K', 'A', '11111111-1111-4111-8111-111111111111', 'UA');

create function pg_temp.expect_denied(p_role text, p_sql text) returns void language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  begin execute p_sql; reset role; raise exception 'EXPECTED DENIED but succeeded for role % : %', p_role, p_sql;
  exception when insufficient_privilege then reset role; end;
end $$;

-- baseline: the fixture reproduces the exposure
begin;
  set local role anon;
  do $$ begin
    if (select count(visitor_id) from public.feedback) = 0 then raise exception 'BASELINE feedback visitor ids must be readable'; end if;
    if (select count(visitor_id) from public.els_records) = 0 then raise exception 'BASELINE els_records visitor ids must be readable'; end if;
    if (select count(visitor_id) from public.push_subscriptions) = 0 then raise exception 'BASELINE push visitor ids must be readable'; end if;
  end $$;
rollback;

\i supabase/migrations/20261106121000_def001b_visitor_id_exposure_step1.sql

-- feedback: not readable by anon or a plain user; the administrator can read it
begin;
  select pg_temp.expect_denied('anon', 'select visitor_id from public.feedback');
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  do $$ begin if (select count(*) from public.feedback) <> 0 then raise exception 'non-admin must see no feedback rows'; end if; end $$;
  select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  do $$ begin if (select count(*) from public.feedback) <> 1 then raise exception 'admin must read feedback'; end if; end $$;
rollback;

-- els_records: public columns still readable under the row policy, visitor_id is not (anon and authenticated)
begin;
  select pg_temp.expect_denied('anon', 'select visitor_id from public.els_records');
  select pg_temp.expect_denied('anon', 'select * from public.els_records');
  select pg_temp.expect_denied('authenticated', 'select visitor_id from public.els_records');
  set local role anon;
  do $$ begin
    if (select count(*) from (select id, title, slug, status, visibility, positions from public.els_records) q) <> 1
      then raise exception 'public els columns must stay readable'; end if;
  end $$;
rollback;

-- RPC flow as anon, exactly the arguments src/lib/push.js sends
begin;
  set local role anon;
  do $$ begin
    perform public.push_subscription_upsert_v1('https://push.example.invalid/ep-new', 'K2', 'A2', array['x'], 'UA2', '00000000-0000-4000-8000-0000000000bb');
    perform public.push_subscription_upsert_v1('https://push.example.invalid/ep-new', 'K3', 'A3', array['y'], 'UA3', '00000000-0000-4000-8000-0000000000bb');
    begin perform public.push_subscription_upsert_v1('http://insecure.example.invalid/x', 'K', 'A', null, null, null); raise exception 'http endpoint accepted';
    exception when raise_exception then if sqlerrm <> 'invalid endpoint' then raise; end if; end;
    begin perform public.push_subscription_upsert_v1('https://push.example.invalid/x', 'K', 'A', null, null, 'not-a-uuid'); raise exception 'bad visitor accepted';
    exception when raise_exception then if sqlerrm <> 'bad visitor identity' then raise; end if; end;
    -- an anonymous caller must not take over an account-owned endpoint, nor delete it
    perform public.push_subscription_upsert_v1('https://push.example.invalid/ep-user', 'HIJACK', 'HIJACK', null, null, '00000000-0000-4000-8000-0000000000cc');
    perform public.push_subscription_delete_v1('https://push.example.invalid/ep-user');
  end $$;
  reset role;
  do $$ begin
    if (select p256dh from public.push_subscriptions where endpoint = 'https://push.example.invalid/ep-new') <> 'K3' then raise exception 'upsert did not update'; end if;
    if (select count(*) from public.push_subscriptions where endpoint = 'https://push.example.invalid/ep-new') <> 1 then raise exception 'upsert duplicated'; end if;
    if (select p256dh from public.push_subscriptions where endpoint = 'https://push.example.invalid/ep-user') <> 'K' then raise exception 'account-owned subscription was taken over'; end if;
  end $$;
  set local role anon;
  select public.push_subscription_delete_v1('https://push.example.invalid/ep-new');
  reset role;
  do $$ begin if exists (select 1 from public.push_subscriptions where endpoint = 'https://push.example.invalid/ep-new') then raise exception 'delete failed'; end if; end $$;
rollback;

-- an authenticated user subscribes and the row is bound to the session account, not to a caller-supplied id
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  select public.push_subscription_upsert_v1('https://push.example.invalid/ep-admin', 'K', 'A', null, 'UA', '00000000-0000-4000-8000-0000000000dd');
  reset role;
  do $$ begin
    if (select user_id from public.push_subscriptions where endpoint = 'https://push.example.invalid/ep-admin') <> '22222222-2222-4222-8222-222222222222' then raise exception 'row not bound to session user'; end if;
    if (select visitor_id from public.push_subscriptions where endpoint = 'https://push.example.invalid/ep-admin') is not null then raise exception 'visitor id stored for an account subscription'; end if;
  end $$;
rollback;

-- step 2 (proposed): direct table access disappears, the RPC flow still works
\i supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql
begin;
  select pg_temp.expect_denied('anon', 'select endpoint from public.push_subscriptions');
  select pg_temp.expect_denied('anon', 'select visitor_id from public.push_subscriptions');
  select pg_temp.expect_denied('anon', $q$delete from public.push_subscriptions where endpoint = 'x'$q$);
  set local role anon;
  select public.push_subscription_upsert_v1('https://push.example.invalid/ep-after', 'K', 'A', null, 'UA', '00000000-0000-4000-8000-0000000000ee');
  select public.push_subscription_delete_v1('https://push.example.invalid/ep-after');
rollback;

-- the documented rollback (step 2 and step 1) restores the pre-change access
\i supabase/proposed/ROLLBACK_20261106121000_def001b.sql
begin;
  set local role anon;
  do $$ begin
    if (select count(visitor_id) from public.feedback) = 0 then raise exception 'rollback: feedback not readable again'; end if;
    if (select count(visitor_id) from public.els_records) = 0 then raise exception 'rollback: els_records.visitor_id not readable again'; end if;
    if (select count(visitor_id) from public.push_subscriptions) = 0 then raise exception 'rollback: push_subscriptions not readable again'; end if;
  end $$;
rollback;
do $$ begin if exists (select 1 from pg_proc where proname like 'push_subscription_%_v1') then raise exception 'rollback left the RPCs behind'; end if; end $$;

\echo DEF-001b SQL regression: PASS
