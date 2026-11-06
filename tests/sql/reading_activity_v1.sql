\set ON_ERROR_STOP on
-- Disposable local PostgreSQL only (see scripts/run-reading-activity-sql-test.sh). No live project, no live data.
-- Proves, on real Postgres semantics: baseline hole -> server-side schema, rate limit, exactly-once and forgery guard.
create schema t;
create table t.results (name text primary key, r jsonb);
create function t.props(p_id uuid default gen_random_uuid(), p_session uuid default '5b3c5d1e-7a41-4c3a-9b11-0d2e6f8a9c10',
  p_entry text default 'direct', p_bucket text default '4-8', p_surface text default 'calculator') returns jsonb language sql as $$
  select jsonb_build_object('schema', 1, 'activity_event_id', p_id, 'activity_session', p_session, 'length_bucket', p_bucket, 'entry', p_entry, 'surface_kind', p_surface) $$;
-- Calls the RPC the way PostgREST does: as role anon, request headers + JWT claim set, one transaction, errors captured.
create function t.call_as(p_role text, p_ip text, p_uid text, p_event text, p_path text, p_ctx text, p_props jsonb) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.headers', case when p_ip is null then '{}' else json_build_object('x-forwarded-for', p_ip)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  execute format('set local role %I', p_role);
  begin
    v := public.ingest_reading_activity_v1(p_event, p_path, p_ctx, p_props);
  exception when others then v := jsonb_build_object('status', 'error', 'sqlstate', sqlstate);
  end;
  reset role;
  return v;
end $f$;
create function t.try_sql(p_role text, p_sql text) returns text language plpgsql as $f$
declare v text := 'ok';
begin
  execute format('set local role %I', p_role);
  begin execute p_sql; exception when others then v := sqlstate; end;
  reset role;
  return v;
end $f$;
-- Keep the rate-limit bucket (wall-clock minute) from changing in the middle of a case.
create function t.wait_for_fresh_minute() returns void language plpgsql as $f$
begin if extract(second from clock_timestamp()) > 40 then perform pg_sleep(61 - extract(second from clock_timestamp())); end if; end $f$;

-- ───── PRE: the live hole, before the proposal ─────
do $$ begin
  perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.250"}', true);
  set local role anon;
  perform public.ingest_event(null, 'gematria', 'first_compute', '/gematria', null, null, 'chrome', null, null, null, null, null,
    '{"slug":"FORGED","value":1,"actor_class":"owner_admin"}'::jsonb, false);
  reset role;
  assert (select count(*) from public.events where surface = 'gematria' and event_type = 'first_compute') = 1,
    'PRE: baseline must show that anon can forge a compute row through the generic RPC';
end $$;
select 'PRE ok: on the live definition, anon can forge a compute row with arbitrary props (hole demonstrated)' as pre;
truncate public.events;

\i supabase/proposed/reading_activity_v1.sql

-- ───── T1 valid beacon ─────
select t.wait_for_fresh_minute();
insert into t.results select 'T1', t.call_as('anon', '198.51.100.1', null, 'first_compute', '/gematria', 'chrome', t.props('11111111-aaaa-4aaa-8aaa-000000000001'));
do $$ declare r jsonb := (select r from t.results where name = 'T1'); e record; begin
  assert r->>'status' = 'recorded', 'T1 status ' || r;
  select * into e from public.events where props->>'activity_event_id' = '11111111-aaaa-4aaa-8aaa-000000000001';
  assert e.surface = 'gematria' and e.event_type = 'first_compute' and e.path = '/gematria', 'T1 identity';
  assert e.sod_id is null and e.person_id is null and e.session_id is null and e.is_bot = false, 'T1 carries no identity';
  assert e.props->>'actor_class' = 'unknown' and e.props->>'actor_basis' = 'anonymous_beacon_no_identity' and e.props->>'beacon' = 'v1', 'T1 server-set actor class';
  assert (select count(*) from public.reading_activity_ids) = 1, 'T1 key row';
end $$;

-- ───── T2 replay and T3 replay with a different event type: exactly one event ─────
insert into t.results select 'T2', t.call_as('anon', '198.51.100.2', null, 'first_compute', '/gematria', 'chrome', t.props('11111111-aaaa-4aaa-8aaa-000000000001'));
insert into t.results select 'T3', t.call_as('anon', '198.51.100.3', null, 'recompute', '/community/calculator', 'safari', t.props('11111111-aaaa-4aaa-8aaa-000000000001', p_entry => 'share'));
do $$ begin
  assert (select r->>'status' from t.results where name = 'T2') = 'duplicate', 'T2 replay is a duplicate';
  assert (select r->>'status' from t.results where name = 'T3') = 'duplicate', 'T3 same id, other fields, is still a duplicate';
  assert (select count(*) from public.events where props->>'activity_event_id' = '11111111-aaaa-4aaa-8aaa-000000000001') = 1, 'T2/T3 exactly one event';
  assert (select count(*) from public.reading_activity_ids) = 1, 'T2/T3 one key';
end $$;

-- ───── T4 schema: every deviation is rejected and writes nothing ─────
select t.wait_for_fresh_minute();
create table t.bad (n int, ev text, path text, ctx text, props jsonb);
insert into t.bad values
 (1, 'compute', '/gematria', 'chrome', t.props()), (2, 'first_compute', '/number/1820', 'chrome', t.props()), (3, 'first_compute', '/gematria', 'curl', t.props()),
 (4, 'first_compute', '/gematria?q=x', 'chrome', t.props()), (5, 'first_compute', '/gematria', 'chrome', t.props() || '{"expression":"שלום"}'),
 (6, 'first_compute', '/gematria', 'chrome', t.props() || '{"actor_class":"owner_admin"}'), (7, 'first_compute', '/gematria', 'chrome', t.props() - 'entry'),
 (8, 'first_compute', '/gematria', 'chrome', t.props(p_entry => 'שלום')), (9, 'first_compute', '/gematria', 'chrome', t.props(p_bucket => '1')),
 (10, 'first_compute', '/gematria', 'chrome', t.props(p_surface => 'admin')), (11, 'first_compute', '/gematria', 'chrome', jsonb_set(t.props(), '{schema}', '2')),
 (12, 'first_compute', '/gematria', 'chrome', jsonb_set(t.props(), '{activity_event_id}', '"11111111-1111-1111-8111-111111111111"')),
 (13, 'first_compute', '/gematria', 'chrome', jsonb_set(t.props(), '{activity_session}', '"not-a-uuid"')),
 (14, 'first_compute', '/gematria', 'chrome', jsonb_set(t.props(), '{activity_session}', '123')), (15, 'first_compute', '/gematria', 'chrome', '[]'::jsonb),
 (16, 'first_compute', '/gematria', 'chrome', null), (17, null, '/gematria', 'chrome', t.props()), (18, 'first_compute', '/gematria', null, t.props()),
 (19, 'first_compute', '/gematria', 'chrome', t.props() || '{"value":376}'), (20, 'first_compute', '/gematria', 'chrome', t.props() || '{"sod_id":"x"}');
create table t.bad_out (n int, status text);
do $$ declare b record; n_before bigint := (select count(*) from public.events); k_before bigint := (select count(*) from public.reading_activity_ids); r jsonb; i int := 0; begin
  for b in select * from t.bad order by n loop
    r := t.call_as('anon', '198.51.100.' || (100 + (i % 8)), null, b.ev, b.path, b.ctx, b.props); i := i + 1;
    insert into t.bad_out values (b.n, r->>'status');
  end loop;
  assert (select count(*) from t.bad_out where status = 'rejected') = 20, 'T4 all 20 deviations rejected: ' || (select string_agg(n || ':' || status, ',') from t.bad_out where status <> 'rejected');
  assert (select count(*) from public.events) = n_before and (select count(*) from public.reading_activity_ids) = k_before, 'T4 nothing written';
end $$;

-- ───── T5 a signed-in account id used as a random id (caller skipped the worker) ─────
insert into t.results select 'T5a', t.call_as('authenticated', '198.51.100.20', '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f', 'first_compute', '/gematria', 'chrome', t.props('0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f'));
insert into t.results select 'T5b', t.call_as('authenticated', '198.51.100.21', '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f', 'first_compute', '/gematria', 'chrome', t.props(p_session => '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f'));
insert into t.results select 'T5c', t.call_as('authenticated', '198.51.100.22', '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f', 'first_compute', '/gematria', 'chrome', t.props('22222222-aaaa-4aaa-8aaa-000000000005'));
do $$ begin
  assert (select r->>'reason' from t.results where name = 'T5a') = 'account_id' and (select r->>'reason' from t.results where name = 'T5b') = 'account_id', 'T5 account-id lookalike rejected';
  assert (select r->>'status' from t.results where name = 'T5c') = 'recorded', 'T5 a signed-in caller with a proper random id is accepted (and stored as unknown, not as the account)';
  assert (select props->>'actor_class' from public.events where props->>'activity_event_id' = '22222222-aaaa-4aaa-8aaa-000000000005') = 'unknown', 'T5 a JWT never upgrades the class';
  assert not exists (select 1 from public.events where person_id is not null or sod_id is not null or session_id is not null), 'T5 no identity column is ever set';
end $$;

-- ───── T6 rate limit: one address, 35 distinct valid ids -> exactly 30 recorded ─────
select t.wait_for_fresh_minute();
create table t.rl (status text);
do $$ declare i int; begin
  for i in 1..35 loop insert into t.rl select (t.call_as('anon', '203.0.113.50', null, 'repeat_compute', '/gematria', 'chrome', t.props()))->>'status'; end loop;
  assert (select count(*) from t.rl where status = 'recorded') = 30 and (select count(*) from t.rl where status = 'rate_limited') = 5, 'T6 ' || (select string_agg(status || '=' || c, ' ') from (select status, count(*) c from t.rl group by 1) x);
  assert (select count(*) from public.reading_activity_ids) = (select count(*) from public.events where surface = 'gematria'), 'T6 keys and events stay 1:1';
end $$;
insert into t.results select 'T6b', t.call_as('anon', null, null, 'first_compute', '/gematria', 'chrome', t.props());
do $$ begin assert (select r->>'status' from t.results where name = 'T6b') = 'rate_limited', 'T6b no address fails closed'; end $$;

-- ───── T7 forgery path closed ─────
do $$ declare before_n bigint := (select count(*) from public.events where surface = 'gematria'); begin
  perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.251"}', true);
  set local role anon;
  perform public.ingest_event(null, 'gematria', 'first_compute', '/gematria', null, null, 'chrome', null, null, null, null, null, '{"actor_class":"owner_admin"}'::jsonb, false);
  perform public.ingest_event(null, 'gematria', 'repeat_compute', '/gematria', null, null, 'chrome', null, null, null, null, null, null, false);
  perform public.ingest_event(null, 'gematria', 'recompute', '/gematria', null, null, 'chrome', null, null, null, null, null, null, false);
  reset role;
  assert (select count(*) from public.events where surface = 'gematria') = before_n, 'T7 the generic RPC no longer writes reserved compute rows';
  -- unrelated families still work through the generic RPC
  set local role anon;
  perform public.ingest_event(null, 'performance', 'web_vital', '/', null, null, 'chrome', null, null, null, null, null, '{}'::jsonb, false);
  perform public.ingest_event(null, 'gematria', 'compute', '/gematria', null, null, 'chrome', null, null, null, null, null, '{"slug":"legacy"}'::jsonb, false);
  reset role;
  assert (select count(*) from public.events where surface = 'performance' and event_type = 'web_vital') = 1, 'T7 RUM unaffected';
  assert (select count(*) from public.events where surface = 'gematria' and event_type = 'compute') = 1, 'T7 the legacy compute series is a different event type and is unaffected';
end $$;

-- ───── T8 privileges ─────
do $$ begin
  assert t.try_sql('anon', 'select 1 from public.reading_activity_ids limit 1') = '42501', 'T8 anon cannot read keys';
  assert t.try_sql('authenticated', 'insert into public.reading_activity_ids(activity_event_id) values (gen_random_uuid())') = '42501', 'T8 authenticated cannot write keys';
  assert t.try_sql('anon', 'select 1 from public.events limit 1') = '42501', 'T8 anon cannot read events';
  assert t.try_sql('anon', $q$insert into public.events(surface,event_type) values ('gematria','first_compute')$q$) = '42501', 'T8 anon cannot insert events directly';
  assert t.try_sql('anon', 'select public.fn_reading_activity_ids_prune_v1()') = '42501', 'T8 prune is not callable by anon';
  assert t.try_sql('anon', $q$select public.edge_rate_limit_check(repeat('a',64),60,1)$q$) = '42501', 'T8 limiter is not callable by anon';
end $$;

-- ───── T9 atomicity: a failure after the key insert rolls the key back, so a retry is recorded ─────
create function t.boom() returns trigger language plpgsql as $f$ begin if new.props->>'activity_event_id' = '99999999-aaaa-4aaa-8aaa-000000000009' then raise exception 'simulated failure'; end if; return new; end $f$;
create trigger t_boom before insert on public.events_cur for each row execute function t.boom();
create trigger t_boom before insert on public.events_prev for each row execute function t.boom();
select t.wait_for_fresh_minute();
insert into t.results select 'T9a', t.call_as('anon', '198.51.100.90', null, 'first_compute', '/gematria', 'chrome', t.props('99999999-aaaa-4aaa-8aaa-000000000009'));
do $$ begin
  assert (select r->>'status' from t.results where name = 'T9a') = 'error', 'T9 the failing call errors';
  assert not exists (select 1 from public.reading_activity_ids where activity_event_id = '99999999-aaaa-4aaa-8aaa-000000000009'), 'T9 the key was rolled back with the event';
end $$;
drop trigger t_boom on public.events_cur; drop trigger t_boom on public.events_prev;
insert into t.results select 'T9b', t.call_as('anon', '198.51.100.91', null, 'first_compute', '/gematria', 'chrome', t.props('99999999-aaaa-4aaa-8aaa-000000000009'));
do $$ begin assert (select r->>'status' from t.results where name = 'T9b') = 'recorded', 'T9 the retry is recorded exactly once'; end $$;

-- ───── T10 the key outlives the event's partition: a replay a month later is still a duplicate ─────
update public.reading_activity_ids set first_seen_at = now() - interval '40 days' where activity_event_id = '11111111-aaaa-4aaa-8aaa-000000000001';
select t.wait_for_fresh_minute();
insert into t.results select 'T10', t.call_as('anon', '198.51.100.110', null, 'first_compute', '/gematria', 'chrome', t.props('11111111-aaaa-4aaa-8aaa-000000000001'));
do $$ begin
  assert (select r->>'status' from t.results where name = 'T10') = 'duplicate', 'T10 late replay is a duplicate';
  assert (select count(*) from public.events where props->>'activity_event_id' = '11111111-aaaa-4aaa-8aaa-000000000001') = 1, 'T10 still exactly one event';
end $$;

-- ───── T11 prune: only keys older than the retention window go ─────
update public.reading_activity_ids set first_seen_at = now() - interval '200 days' where activity_event_id = '22222222-aaaa-4aaa-8aaa-000000000005';
do $$ declare n int; begin
  n := public.fn_reading_activity_ids_prune_v1(interval '1 day');   -- the floor of 121 days applies even if a smaller window is asked
  assert n = 1, 'T11 pruned only the 200-day-old key, got ' || n;
  assert exists (select 1 from public.reading_activity_ids where activity_event_id = '11111111-aaaa-4aaa-8aaa-000000000001'), 'T11 the 40-day-old key stays';
end $$;
select 'SQL CASES T1..T11 PASSED' as result;
