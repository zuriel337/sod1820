\set ON_ERROR_STOP on
-- Disposable local PostgreSQL only (see scripts/run-reading-activity-sql-test.sh). No live project, no live data.
-- Proves, on real Postgres semantics: the baseline hole -> server-side address ceilings, size bounds, schema, exactly-once,
-- a narrow forgery guard, least-privilege ACL and countable refusals.
create schema t;
create table t.results (name text primary key, r jsonb);
create table t.calllog (n bigserial primary key, status text, reason text);
create function t.props(p_id uuid default gen_random_uuid(), p_session uuid default '5b3c5d1e-7a41-4c3a-9b11-0d2e6f8a9c10',
  p_entry text default 'direct', p_bucket text default '4-8', p_surface text default 'calculator') returns jsonb language sql as $$
  select jsonb_build_object('schema', 1, 'activity_event_id', p_id, 'activity_session', p_session, 'length_bucket', p_bucket, 'entry', p_entry, 'surface_kind', p_surface) $$;
-- Calls the RPC the way PostgREST does: as role anon/authenticated, request headers + JWT claim set, one transaction, errors captured.
create function t.call_hdr(p_role text, p_headers jsonb, p_uid text, p_event text, p_path text, p_ctx text, p_props jsonb) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.headers', coalesce(p_headers, '{}'::jsonb)::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  execute format('set local role %I', p_role);
  begin
    v := public.ingest_reading_activity_v1(p_event, p_path, p_ctx, p_props);
  exception when others then v := jsonb_build_object('status', 'error', 'sqlstate', sqlstate);
  end;
  reset role;
  insert into t.calllog(status, reason) values (v->>'status', v->>'reason');
  return v;
end $f$;
create function t.call_as(p_role text, p_ip text, p_uid text, p_event text, p_path text, p_ctx text, p_props jsonb) returns jsonb language sql as $f$
  select t.call_hdr(p_role, case when p_ip is null then '{}'::jsonb else jsonb_build_object('cf-connecting-ip', p_ip) end, p_uid, p_event, p_path, p_ctx, p_props) $f$;
create function t.ok(p_ip text, p_id uuid default gen_random_uuid(), p_session uuid default '5b3c5d1e-7a41-4c3a-9b11-0d2e6f8a9c10') returns text language sql as $f$
  select (t.call_as('anon', p_ip, null, 'repeat_compute', '/gematria', 'chrome', t.props(p_id, p_session)))->>'status' $f$;
create function t.try_sql(p_role text, p_sql text) returns text language plpgsql as $f$
declare v text := 'ok';
begin
  execute format('set local role %I', p_role);
  begin execute p_sql; exception when others then v := sqlstate; end;
  reset role;
  return v;
end $f$;
-- Limiter buckets are aligned to the wall-clock minute: wait out a minute change, and start each limiter test from empty buckets.
create function t.fresh_minute() returns void language plpgsql as $f$
begin
  if extract(second from clock_timestamp()) > 40 then perform pg_sleep(61 - extract(second from clock_timestamp())); end if;
  delete from private.edge_rate_limit_buckets;
end $f$;

-- ───── PRE: the live hole and the exact live definition, before the proposal ─────
create table t.baseline as select pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure) as def,
  (select proacl::text from pg_proc where oid = 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure) as acl,
  (select proowner::regrole::text from pg_proc where oid = 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure) as owner;
do $$ begin execute replace((select def from t.baseline), 'public.ingest_event(', 't.ingest_event_old('); end $$;  -- the untouched function, kept for comparison
do $$ begin
  perform set_config('request.headers', '{"cf-connecting-ip":"198.51.100.250"}', true);
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
select t.fresh_minute();
insert into t.results select 'T1', t.call_as('anon', '198.51.100.1', null, 'first_compute', '/gematria', 'chrome', t.props('11111111-aaaa-4aaa-8aaa-000000000001'));
do $$ declare r jsonb := (select r from t.results where name = 'T1'); e record; begin
  assert r->>'status' = 'recorded', 'T1 status ' || r;
  select * into e from public.events where props->>'activity_event_id' = '11111111-aaaa-4aaa-8aaa-000000000001';
  assert e.surface = 'gematria' and e.event_type = 'first_compute' and e.path = '/gematria', 'T1 identity';
  assert e.sod_id is null and e.person_id is null and e.session_id is null and e.is_bot = false and e.ref_host is null and e.via is null and e.device is null, 'T1 carries no identity or network detail';
  assert e.props->>'actor_class' = 'unknown' and e.props->>'actor_basis' = 'anonymous_beacon_no_identity' and e.props->>'beacon' = 'v1', 'T1 server-set actor class';
  assert not (e.props::text ~ '198\.51\.100'), 'T1 the address is never stored on the event';
  assert (select count(*) from public.reading_activity_ids) = 1, 'T1 key row';
  assert not exists (select 1 from private.edge_rate_limit_buckets where key_hash::text like '%198%'), 'T1 the limiter stores only a hash';
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

-- ───── T4 schema: every deviation is rejected and writes neither an event nor a key ─────
select t.fresh_minute();
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

-- ───── T6 address ceiling: one address, 65 distinct valid ids -> exactly 60 recorded ─────
select t.fresh_minute();
create table t.rl (status text);
do $$ declare i int; before_out bigint := coalesce((select sum(n) from public.reading_activity_outcomes where outcome = 'rate_limited_address'), 0); begin
  for i in 1..65 loop insert into t.rl select t.ok('203.0.113.50'); end loop;
  assert (select count(*) from t.rl where status = 'recorded') = 60 and (select count(*) from t.rl where status = 'rate_limited') = 5, 'T6 ' || (select string_agg(status || '=' || c, ' ') from (select status, count(*) c from t.rl group by 1) x);
  assert (select sum(n) from public.reading_activity_outcomes where outcome = 'rate_limited_address') = before_out + 5, 'T6 the 5 refusals are counted as rate_limited_address';
end $$;

-- ───── T6b the address comes from cf-connecting-ip ONLY; a client-controllable header cannot select or evade a bucket ─────
select t.fresh_minute();
do $$ declare i int; s text; begin
  select (t.call_hdr('anon', '{"x-forwarded-for":"192.0.2.9"}', null, 'first_compute', '/gematria', 'chrome', t.props()))->>'reason' into s;
  assert s = 'no_address', 'T6b x-forwarded-for alone is not an address: ' || coalesce(s, 'null');
  select (t.call_hdr('anon', '{"x-real-ip":"192.0.2.9"}', null, 'first_compute', '/gematria', 'chrome', t.props()))->>'reason' into s;
  assert s = 'no_address', 'T6b x-real-ip alone is not an address';
  select (t.call_hdr('anon', '{}', null, 'first_compute', '/gematria', 'chrome', t.props()))->>'reason' into s;
  assert s = 'no_address', 'T6b no header fails closed';
  select (t.call_hdr('anon', '{"cf-connecting-ip":"not an address"}', null, 'first_compute', '/gematria', 'chrome', t.props()))->>'reason' into s;
  assert s = 'no_address', 'T6b a malformed address fails closed';
  -- rotating a spoofed x-forwarded-for while the trusted header stays the same does not give a fresh bucket
  for i in 1..65 loop
    insert into t.rl select (t.call_hdr('anon', jsonb_build_object('cf-connecting-ip', '203.0.113.77', 'x-forwarded-for', '10.9.' || i || '.1'), null, 'repeat_compute', '/gematria', 'chrome', t.props()))->>'status';
  end loop;
  assert (select count(*) from t.rl where status = 'recorded') = 60 + 60, 'T6b spoofed x-forwarded-for did not evade the ceiling';
end $$;

-- ───── T6c IPv6 is keyed by /64; IPv4-mapped IPv6 and IPv4 by the exact address ─────
select t.fresh_minute();
create table t.v6 (grp text, status text);
do $$ declare i int; begin
  for i in 1..70 loop insert into t.v6 select 'same64', t.ok(case when i % 2 = 0 then '2001:db8:aaaa:1::1' else '2001:db8:aaaa:1:ffff:ffff:ffff:ffff' end); end loop;
  assert (select count(*) from t.v6 where grp = 'same64' and status = 'recorded') = 60, 'T6c two addresses inside one /64 share a bucket';
  for i in 1..10 loop insert into t.v6 select 'other64', t.ok('2001:db8:aaaa:2::1'); end loop;
  assert (select count(*) from t.v6 where grp = 'other64' and status = 'recorded') = 10, 'T6c a different /64 has its own bucket';
  for i in 1..3 loop insert into t.v6 select 'mapped', t.ok('::ffff:192.0.2.' || i); end loop;
  assert (select count(*) from t.v6 where grp = 'mapped' and status = 'recorded') = 3, 'T6c IPv4-mapped addresses are not collapsed into one bucket';
end $$;

-- ───── T6d global ceiling: 130 different addresses, all well formed -> exactly 120 recorded; garbage cannot spend it ─────
select t.fresh_minute();
create table t.gl (status text, reason text);
do $$ declare i int; r jsonb; begin
  for i in 1..400 loop perform t.call_as('anon', '198.18.' || (i / 250) || '.' || (i % 250), null, 'compute', '/gematria', 'chrome', t.props()); end loop;  -- 400 malformed calls from 400 addresses
  for i in 1..130 loop r := t.call_as('anon', '198.19.' || (i / 250) || '.' || (i % 250), null, 'first_compute', '/gematria', 'chrome', t.props()); insert into t.gl values (r->>'status', r->>'reason'); end loop;
  assert (select count(*) from t.gl where status = 'recorded') = 120, 'T6d garbage did not spend the global budget; 120 well-formed calls recorded: ' || (select string_agg(status || '/' || coalesce(reason, '-') || '=' || c, ' ') from (select status, reason, count(*) c from t.gl group by 1, 2) x);
  assert (select count(*) from t.gl where reason = 'global_ceiling') = 10, 'T6d the other 10 hit the global ceiling';
end $$;

-- ───── T6e shared address (NAT): realistic and worst-case minutes, and what a co-located abuser can and cannot do ─────
-- Observed on the live site: site-wide maximum 22 compute events in one minute, at most 3 sessions in the same minute.
select t.fresh_minute();
create table t.nat (grp text, status text);
do $$ declare i int; s uuid[] := array['aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003']::uuid[]; begin
  for i in 1..22 loop insert into t.nat select 'worst_observed_minute', t.ok('203.0.113.200', gen_random_uuid(), s[1 + i % 3]); end loop;
  assert (select count(*) from t.nat where grp = 'worst_observed_minute' and status = 'recorded') = 22, 'T6e the busiest minute ever seen, all behind ONE address, loses nothing';
  perform t.fresh_minute();
  for i in 1..44 loop insert into t.nat select 'double_worst', t.ok('203.0.113.201', gen_random_uuid(), s[1 + i % 3]); end loop;
  assert (select count(*) from t.nat where grp = 'double_worst' and status = 'recorded') = 44, 'T6e twice that is still lossless';
  -- abuse: one party at the address spends the whole minute; another party at the SAME address is then refused (measurement only)
  perform t.fresh_minute();
  for i in 1..70 loop insert into t.nat select 'abuser', t.ok('203.0.113.202', gen_random_uuid(), s[1]); end loop;
  insert into t.nat select 'victim_same_address', t.ok('203.0.113.202', gen_random_uuid(), s[2]);
  insert into t.nat select 'victim_other_address', t.ok('203.0.113.203', gen_random_uuid(), s[2]);
  assert (select count(*) from t.nat where grp = 'abuser' and status = 'recorded') = 60, 'T6e the abuser is capped at the address ceiling';
  assert (select status from t.nat where grp = 'victim_same_address') = 'rate_limited', 'T6e KNOWN LIMIT: a co-located abuser can starve that address for the rest of the minute';
  assert (select status from t.nat where grp = 'victim_other_address') = 'recorded', 'T6e addresses are independent';
  -- the starvation is visible and bounded: it is a counted refusal, and the next minute is clean
  assert (select sum(n) from public.reading_activity_outcomes where outcome = 'rate_limited_address' and minute >= date_trunc('minute', now()) - interval '2 minutes') >= 11, 'T6e the refusals are in the metric';
  delete from private.edge_rate_limit_buckets;   -- = the next minute
  insert into t.nat select 'victim_next_minute', t.ok('203.0.113.202', gen_random_uuid(), s[2]);
  assert (select status from t.nat where grp = 'victim_next_minute') = 'recorded', 'T6e the victim is recorded again the next minute';
end $$;

-- ───── T8 privileges (least privilege) ─────
do $$ declare r text; begin
  assert t.try_sql('anon', 'select 1 from public.reading_activity_ids limit 1') = '42501', 'T8 anon cannot read keys';
  assert t.try_sql('authenticated', 'select 1 from public.reading_activity_outcomes limit 1') = '42501', 'T8 authenticated cannot read outcomes';
  assert t.try_sql('authenticated', 'insert into public.reading_activity_ids(activity_event_id) values (gen_random_uuid())') = '42501', 'T8 authenticated cannot write keys';
  assert t.try_sql('anon', $q$insert into public.reading_activity_outcomes(minute,outcome,n) values (now(),'duplicate',1)$q$) = '42501', 'T8 anon cannot write outcomes';
  assert t.try_sql('anon', 'select 1 from public.events limit 1') = '42501', 'T8 anon cannot read events';
  assert t.try_sql('anon', $q$insert into public.events(surface,event_type) values ('gematria','first_compute')$q$) = '42501', 'T8 anon cannot insert events directly';
  assert t.try_sql('anon', 'select public.fn_reading_activity_prune_v1()') = '42501', 'T8 prune is not callable by anon';
  assert t.try_sql('authenticated', 'select public.fn_reading_activity_prune_v1()') = '42501', 'T8 prune is not callable by authenticated';
  assert t.try_sql('anon', $q$select public.fn_reading_activity_count_v1('duplicate')$q$) = '42501', 'T8 the counter helper is not callable by anon';
  assert t.try_sql('service_role', $q$select public.fn_reading_activity_count_v1('duplicate')$q$) = '42501', 'T8 the counter helper is owner-only';
  assert t.try_sql('anon', $q$select public.edge_rate_limit_check(repeat('a',64),60,1)$q$) = '42501', 'T8 limiter is not callable by anon';
  assert t.try_sql('service_role', 'select count(*) from public.reading_activity_ids') = 'ok' and t.try_sql('service_role', 'select count(*) from public.reading_activity_outcomes') = 'ok', 'T8 service_role can read both tables (projections)';
  assert t.try_sql('service_role', 'delete from public.reading_activity_ids') = '42501' and t.try_sql('service_role', $q$update public.reading_activity_outcomes set n = 0$q$) = '42501', 'T8 service_role cannot modify them';
  assert has_function_privilege('anon', 'public.ingest_reading_activity_v1(text,text,text,jsonb)', 'execute') and has_function_privilege('authenticated', 'public.ingest_reading_activity_v1(text,text,text,jsonb)', 'execute')
     and has_function_privilege('service_role', 'public.ingest_reading_activity_v1(text,text,text,jsonb)', 'execute'), 'T8 the RPC is callable by the three API roles';
  assert (select proacl::text from pg_proc where proname = 'ingest_reading_activity_v1') !~ '[{,]=X', 'T8 the RPC is not executable by PUBLIC';
  assert (select relrowsecurity from pg_class where oid = 'public.reading_activity_ids'::regclass) and (select relrowsecurity from pg_class where oid = 'public.reading_activity_outcomes'::regclass), 'T8 RLS on both tables';
end $$;

-- ───── T9 atomicity: a failure after the key insert rolls the key back, so a retry is recorded ─────
create function t.boom() returns trigger language plpgsql as $f$ begin if new.props->>'activity_event_id' = '99999999-aaaa-4aaa-8aaa-000000000009' then raise exception 'simulated failure'; end if; return new; end $f$;
create trigger t_boom before insert on public.events_cur for each row execute function t.boom();
create trigger t_boom before insert on public.events_prev for each row execute function t.boom();
select t.fresh_minute();
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
select t.fresh_minute();
insert into t.results select 'T10', t.call_as('anon', '198.51.100.110', null, 'first_compute', '/gematria', 'chrome', t.props('11111111-aaaa-4aaa-8aaa-000000000001'));
do $$ begin
  assert (select r->>'status' from t.results where name = 'T10') = 'duplicate', 'T10 late replay is a duplicate';
  assert (select count(*) from public.events where props->>'activity_event_id' = '11111111-aaaa-4aaa-8aaa-000000000001') = 1, 'T10 still exactly one event';
end $$;

-- ───── T11 payload size: oversize input is refused cheaply, before any parsing of its content ─────
select t.fresh_minute();
do $$ declare t0 timestamptz; r jsonb; big jsonb := (select jsonb_build_object('schema', 1, 'activity_event_id', gen_random_uuid(), 'activity_session', gen_random_uuid(), 'length_bucket', '4-8', 'entry', 'direct', 'surface_kind', 'calculator', 'pad', repeat('x', 1000000))); k bigint := (select count(*) from public.reading_activity_ids); e bigint := (select count(*) from public.events); ms numeric; begin
  t0 := clock_timestamp(); r := t.call_as('anon', '198.51.100.120', null, 'first_compute', '/gematria', 'chrome', big); ms := extract(milliseconds from clock_timestamp() - t0);
  assert r->>'status' = 'rejected' and r->>'reason' = 'size', 'T11 a 1 MB props object is refused as size: ' || r;
  assert ms < 250, 'T11 refusal is fast (' || ms || ' ms)';
  r := t.call_as('anon', '198.51.100.121', null, repeat('a', 10000), '/gematria', 'chrome', t.props());
  assert r->>'reason' = 'size', 'T11 a 10 KB event type is refused as size';
  r := t.call_as('anon', '198.51.100.122', null, 'first_compute', repeat('/', 5000), 'chrome', t.props());
  assert r->>'reason' = 'size', 'T11 a 5 KB path is refused as size';
  assert (select count(*) from public.reading_activity_ids) = k and (select count(*) from public.events) = e, 'T11 nothing stored';
end $$;

-- ───── T13 every refusal is counted exactly once, and "recorded" equals the beacon rows: a drop can be told from suppression ─────
do $$ declare m record; begin
  for m in select * from (values ('duplicate', 'duplicate', null), ('rejected_size', 'rejected', 'size'), ('rejected_schema', 'rejected', 'schema'), ('rejected_account_id', 'rejected', 'account_id'),
        ('rate_limited_address', 'rate_limited', 'address_ceiling'), ('rate_limited_global', 'rate_limited', 'global_ceiling'), ('no_address', 'rate_limited', 'no_address')) as v(outcome, status, reason) loop
    assert coalesce((select sum(n) from public.reading_activity_outcomes where outcome = m.outcome and minute > now() - interval '1 day'), 0)
         = (select count(*) from t.calllog where status = m.status and reason is not distinct from m.reason),
      'T13 outcome ' || m.outcome || ': counter ' || coalesce((select sum(n) from public.reading_activity_outcomes where outcome = m.outcome and minute > now() - interval '1 day'), 0) || ' vs calls ' || (select count(*) from t.calllog where status = m.status and reason is not distinct from m.reason);
  end loop;
  assert (select count(*) from t.calllog where status = 'recorded') = (select count(*) from public.events where props->>'beacon' = 'v1'), 'T13 recorded calls = beacon rows (recorded is not double-counted in the outcome table)';
  assert (select count(*) from t.calllog where status = 'recorded') > 0 and (select count(*) from t.calllog where status in ('rate_limited', 'rejected', 'duplicate')) > 0;
  assert not exists (select 1 from public.reading_activity_outcomes where outcome = 'recorded'), 'T13 recorded is derived from events, not stored twice';
end $$;

-- ───── T12 prune: only keys and counters older than the retention window go ─────
update public.reading_activity_ids set first_seen_at = now() - interval '200 days' where activity_event_id = '22222222-aaaa-4aaa-8aaa-000000000005';
insert into public.reading_activity_outcomes(minute, outcome, n) values (now() - interval '200 days', 'duplicate', 5), (now() - interval '10 days', 'duplicate', 5) on conflict do nothing;
do $$ declare n int; begin
  n := public.fn_reading_activity_prune_v1(interval '1 day');   -- the floor of 121 days applies even if a smaller window is asked
  assert n = 2, 'T12 pruned the 200-day-old key and the 200-day-old counter, got ' || n;
  assert exists (select 1 from public.reading_activity_ids where activity_event_id = '11111111-aaaa-4aaa-8aaa-000000000001'), 'T12 the 40-day-old key stays';
  assert exists (select 1 from public.reading_activity_outcomes where minute > now() - interval '11 days' and minute < now() - interval '9 days'), 'T12 the 10-day-old counter stays';
end $$;

-- ───── T7 forgery guard is NARROW: only the three reserved compute types, nothing else changes ─────
do $$ declare before_n bigint := (select count(*) from public.events where surface = 'gematria'); begin
  perform set_config('request.headers', '{"cf-connecting-ip":"198.51.100.251"}', true);
  set local role anon;
  perform public.ingest_event(null, 'gematria', 'first_compute', '/gematria', null, null, 'chrome', null, null, null, null, null, '{"actor_class":"owner_admin"}'::jsonb, false);
  perform public.ingest_event(null, 'gematria', 'repeat_compute', '/gematria', null, null, 'chrome', null, null, null, null, null, null, false);
  perform public.ingest_event(null, 'gematria', 'recompute', '/gematria', null, null, 'chrome', null, null, null, null, null, null, false);
  reset role;
  assert (select count(*) from public.events where surface = 'gematria') = before_n, 'T7 the generic RPC no longer writes the three reserved compute rows';
end $$;
-- 7a: the function definition differs from the live one by exactly the GUARD line
do $$ begin
  assert regexp_replace(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure), E'\n[^\n]*-- GUARD', '', 'g')
       = (select def from t.baseline), 'T7a ingest_event differs from the live definition by exactly the GUARD line (signature, security definer, search_path, comments, statements)';
  assert (select count(*) from regexp_matches(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure), '-- GUARD', 'g')) = 1, 'T7a exactly one GUARD line';
  assert (select proacl::text from pg_proc where oid = 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure) is not distinct from (select acl from t.baseline), 'T7a ACL unchanged (still executable by PUBLIC, as today)';
  assert (select proowner::regrole::text from pg_proc where oid = 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure) = (select owner from t.baseline), 'T7a owner unchanged';
end $$;
-- 7b: behaviour regression over a surface x event x bot matrix: untouched function vs guarded function, row by row
create table t.matrix (surface text, event_type text, is_bot boolean, old_rows text[], new_rows text[]);
do $$ declare s text; e text; b boolean; o text[]; n text[]; cols constant text := 'sod_id, person_id, session_id, surface, event_type, path, ref_host, via, app_context, device, journey_id, depth_reached, utm::text, is_bot, props::text';
begin
  foreach s in array array['gematria','Gematria','gematria ','els','page','research','performance','calculator_2029','arrival','issue_report',''] loop
    foreach e in array array['compute','first_compute','repeat_compute','recompute','first_compute ','FIRST_COMPUTE','recompute_x','search','view','web_vital',''] loop
      foreach b in array array[false, true] loop
        truncate public.events;
        perform t.ingest_event_old('sod_1', s, e, '/gematria', 'ref.example', 'wa', 'chrome', 'mobile', 'sess', 'j1', 3::smallint, '{"a":1}'::jsonb, '{"slug":"x","value":7}'::jsonb, b);
        execute format('select coalesce(array_agg(row(%s)::text order by event_type), ''{}'') from public.events', cols) into o;
        truncate public.events;
        perform public.ingest_event('sod_1', s, e, '/gematria', 'ref.example', 'wa', 'chrome', 'mobile', 'sess', 'j1', 3::smallint, '{"a":1}'::jsonb, '{"slug":"x","value":7}'::jsonb, b);
        execute format('select coalesce(array_agg(row(%s)::text order by event_type), ''{}'') from public.events', cols) into n;
        insert into t.matrix values (s, e, b, o, n);
      end loop;
    end loop;
  end loop;
  assert (select count(*) from t.matrix) = 11 * 11 * 2, 'T7b matrix size';
  assert (select count(*) from t.matrix where old_rows is distinct from new_rows) = 3, 'T7b exactly the three reserved non-bot cases differ, got ' || (select string_agg(surface || '/' || event_type || '/' || is_bot, ' ; ') from t.matrix where old_rows is distinct from new_rows);
  assert not exists (select 1 from t.matrix where old_rows is distinct from new_rows and not (surface = 'gematria' and event_type in ('first_compute', 'repeat_compute', 'recompute') and is_bot = false and cardinality(new_rows) = 0 and cardinality(old_rows) = 1)), 'T7b the only differences are the non-bot reserved calls, which now write nothing';
  assert exists (select 1 from t.matrix where surface = 'gematria' and event_type = 'first_compute' and is_bot) , 'T7b (bot calls were never written, before or after)';
  assert (select count(*) from t.matrix where surface = 'gematria' and event_type = 'compute' and not is_bot and new_rows = old_rows and cardinality(new_rows) = 1) = 1, 'T7b the legacy compute type is untouched';
  assert (select count(*) from t.matrix where surface in ('Gematria', 'gematria ') and event_type in ('first_compute', 'repeat_compute', 'recompute') and not is_bot and new_rows = old_rows and cardinality(new_rows) = 1) = 6, 'T7b look-alike surfaces are untouched (they are not part of the metric, whose filter is the exact surface)';
end $$;
truncate public.events;
select 'T7 ok: guard blocks exactly 3 non-bot calls out of 242 combinations; every other result is identical' as t7;

select 'SQL CASES T1..T13 PASSED' as result;
