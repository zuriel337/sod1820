-- Runs under: psql -v ON_ERROR_STOP=1 -f this file, on the LOCAL minimal harness (tests/sql/local-harness/*)
-- or on an isolated Supabase branch. NEVER production. Any failed assertion aborts non-zero.
\set ON_ERROR_STOP 1
create or replace function pg_temp.claims(p_uid text, p_role text default 'authenticated') returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role,
     'app_metadata', json_build_object('sod1820_coordination_reader', true))::text, false) $$;  -- claim present but NOT trusted
create or replace function pg_temp.expect_denied(p_sql text) returns void language plpgsql as $$
begin
  begin execute p_sql; raise exception 'FAIL: expected denial: %', p_sql;
  exception when insufficient_privilege then null; end; end $$;
create temp table _n as select count(*) c from public.work_log;
grant select on _n to authenticated;

-- 0. harness fidelity: the REAL view really drops the old open BEFORE (why the RPC reads the ledger)
do $$ begin
  assert not exists (select 1 from public.work_log_current where task_key = 'T_OLD_OPEN'), 'harness view should drop T_OLD_OPEN';
  assert exists (select 1 from public.work_log where task_key = 'T_OLD_OPEN');
end $$;

-- 1. ACL / function properties
do $$ declare f oid := 'public.coordination_read_current(text,text[],boolean,integer,text)'::regprocedure; begin
  assert not has_function_privilege('anon', f, 'execute'), 'anon can execute';
  assert has_function_privilege('authenticated', f, 'execute');
  assert not has_function_privilege('authenticated', 'public.coordination_status_class(text,text)', 'execute'), 'classifier exposed';
  assert not has_function_privilege('anon', 'public.coordination_status_class(text,text)', 'execute');
  assert not has_table_privilege('authenticated','public.work_log_current','select'), 'authenticated can read view directly';
  assert (select prosecdef from pg_proc where oid = f), 'not security definer';
  assert (select proconfig from pg_proc where oid = f) @> array['search_path=pg_catalog, public, pg_temp'], 'search_path not pinned';
end $$;

-- 1b. classifier truth table (v17 lifecycle vocabulary, incl. live statuses)
do $$ declare r record; begin
  for r in select * from (values
    ('BEFORE_BRANCH_ONLY_ACTIVE_WRITER_PASSIVE','WRITE','OPEN'), ('BEFORE_PASSIVE',null,'OPEN'), ('before_write_authorized',null,'OPEN'),
    ('ACK_CLAIMED_WRITE_SHARED_FRAME_HOME_WORLD_BRANCH_ONLY','WRITE','OPEN'), ('CLAIMED_WRITE','WRITE','OPEN'), ('ASSIGNED_WRITE','WRITE','OPEN'),
    ('WRITE_SCOPE_OPEN_BRANCH_ONLY_NO_RELEASE',null,'OPEN'), ('WRITE_WINDOW_OPEN_CONTROLLED_CHECKPOINT',null,'OPEN'),
    ('ACK_CLAIMED_WRITE_X',null,'OPEN'), ('ACK_CLAIMED_IMPORT_BRANCH_ONLY',null,'OPEN'), ('ACK_SAME_WRITER_IMPLEMENTED_GATES_RUNNING','WRITE','OPEN'), ('ACK_SCOPE_EXTENDED_BRANCH_ONLY',null,'OPEN'), ('ACK_READ_DESIGN_ALIGNMENT',null,'NEUTRAL'), ('ACK_REQUIRED',null,'NEUTRAL'), ('ACK_DECLINED_STALE',null,'CLOSE'), ('BRANCH_ONLY_COMPLETE_GPT_CROSS_VERIFIED','WRITE','CLOSE'), ('BRANCH_ONLY_BUILD_GATE_GREEN_VISUAL_GATE_PENDING','WRITE','NEUTRAL'), ('BACKEND_APPLIED_CLIENT_GATE_RUNNING',null,'NEUTRAL'), ('HANDOFF_READY',null,'NEUTRAL'), ('PLANNED','WRITE','NEUTRAL'), ('DEFERRED_GPT_RUNTIME_ENDPOINT_NOT_CONFIGURED','WRITE','NEUTRAL'), ('EXPLICIT_RELEASE_AUTHORIZED_BY_ZURIEL','WRITE','NEUTRAL'), ('BEFORE_X_COMPLETE_Y',null,'OPEN'), ('CLAIMED_WRITE',null,'OPEN'), ('ASSIGNED_WRITE',null,'OPEN'), ('CLAIMED_CLAUDE_EVENT_DRIVEN_RUNTIME','WRITE','OPEN'), ('ACTIVE_WRITER_GPT_REVIEW_PENDING',null,'OPEN'),
    ('CLAIMED_CLAUDE_EVENT_DRIVEN_RUNTIME','READ_ONLY','NEUTRAL'), ('CLAIMED_READ_ONLY','WRITE','NEUTRAL'),
    ('EXPLICIT_RELEASE_AUTHORIZED','WRITE','NEUTRAL'), ('RELEASE_AUTHORIZED','WRITE','NEUTRAL'), ('PASS','READ_ONLY','NEUTRAL'),
    ('sensor_stale',null,'NEUTRAL'), ('in_progress',null,'NEUTRAL'), (null,null,'NEUTRAL'),
    ('AFTER_BRANCH_ONLY_IMPLEMENTED_TESTED_MEASURED_PUSHED_SCOPE_RELEASED_PASSIVE','WRITE','CLOSE'), ('AFTER_BLOCKED_RELEASED','WRITE','CLOSE'),
    ('AFTER_PREVIEW_VERIFIED_RELEASE_BLOCKED',null,'CLOSE'), ('CANCELLED_BY_ZURIEL','WRITE','CLOSE'), ('CANCELED',null,'CLOSE'),
    ('CLOSED_MANUAL_CLAIM_BY_ZURIEL_20261017','WRITE','CLOSE'), ('RELEASED','WRITE','CLOSE'), ('DECLINED_STALE',null,'CLOSE'),
    ('MERGED_DEPLOYED_LIVE_VERIFIED','WRITE','CLOSE'), ('BLOCKED_NEEDS_MORE_CONTEXT','READ_ONLY','CLOSE'),
    ('SUPERSEDED_BY_NEW_HEAD','READ_ONLY','CLOSE'), ('FROZEN_BRANCH_ONLY_SUPERSEDED_BY_CURRENT_MAIN_RECOVERY_NO_ACTIVE_WRITE','WRITE','CLOSE'),
    ('COMPLETED_PREVIEW_ONLY',null,'CLOSE'), ('IMPLEMENTED_BRANCH_ONLY_NOT_MERGED_NOT_DEPLOYED',null,'CLOSE')
  ) v(s, m, expect) loop
    assert public.coordination_status_class(r.s, r.m) = r.expect, format('classify(%s,%s) expected %s got %s', r.s, r.m, r.expect, public.coordination_status_class(r.s, r.m));
  end loop;
end $$;

select pg_temp.claims('00000000-0000-0000-0000-0000000000a1'); set role authenticated;

-- 2. active writers are found; released / cancelled / closed writers are NOT
do $$ declare r jsonb; rec record; begin
  r := public.coordination_read_current(p_scope_terms => array['App2029.jsx']);
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->>'task_key' = 'T_ACTIVE_APP', 'BEFORE->AFTER release not honoured / active missed: ' || (r->'rows')::text;
  assert (r->>'truncated')::boolean = false;
  assert r::text not like '%SECRET-BODY%' and r::text not like '%secret%' and r::text not like '%what_we_did%' and r::text not like '%dispatch_%', 'forbidden data exposed';
  -- shared-frame ACK_CLAIMED_WRITE and a release-AUTHORIZATION row on the same area: only the claim is a writer
  r := public.coordination_read_current(p_scope_terms => array['SystemFrame2029']);
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->>'task_key' = 'T_ACK', 'ACK_CLAIMED_WRITE / EXPLICIT_RELEASE handling: ' || (r->'rows')::text;
  for rec in select z, public.coordination_read_current(p_scope_terms => array[z]) x from unnest(array['tiezone','docs/claimedzone','assignedzone','legacyzone','nullkeyzone','oldopenzone','cyclezone/second']) z loop
    assert (rec.x->>'total_matches')::int = 1, 'active writer missed: ' || rec.z || ' ' || (rec.x->'rows')::text;
  end loop;
  for rec in select z, public.coordination_read_current(p_scope_terms => array[z]) x from unnest(array['releasedzone','cancelledzone','released2zone','closedzone','topickeyzone','cyclezone/first','readonlyzone','relauthzone','blockedzone','passzone','archzone','supzone','ancientzone','community/chat']) z loop
    assert (rec.x->>'total_matches')::int = 0 and (rec.x->>'truncated')::boolean = false, 'released/non-writer blocks: ' || rec.z || ' ' || (rec.x->'rows')::text;
  end loop;
  assert not exists (select 1 from jsonb_array_elements(public.coordination_read_current(p_scope_terms => array['App2029.jsx'])->'active_scopes') e where e->>'scope_key' in ('T_RELEASED','T_CANCELLED','T_RELEASED2','T_CLOSED','T_TOPIC','T_READONLY','T_RELAUTH','T_BLOCKED')), 'released/non-writer task in active_scopes';
end $$;

-- 3. >50 writers: truncation explicit at both levels, never an all-clear
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_scope_terms => array['bulkzone'], p_limit => 100000);
  assert (r->>'total_matches')::int = 70 and (r->>'returned')::int = 50 and (r->>'truncated')::boolean, 'match truncation: ' || (r - 'rows' - 'active_scopes')::text;
  assert (r->>'active_total')::int = 80 and jsonb_array_length(r->'active_scopes') = 50 and (r->>'active_truncated')::boolean, 'active truncation: ' || (r - 'rows' - 'active_scopes')::text;
  r := public.coordination_read_current(p_limit => -5, p_scope_terms => array['bulkzone']);
  assert (r->>'returned')::int = 1 and (r->>'truncated')::boolean, 'negative limit';
  -- even a clean scope reports active_truncated while >50 writers exist (caller cannot compare globs)
  r := public.coordination_read_current(p_scope_terms => array['community/chat']);
  assert (r->>'total_matches')::int = 0 and (r->>'active_truncated')::boolean, 'active_truncated must be visible on an empty match';
end $$;

-- 4. history by key shows both cycles; exclude by key and by scope key; null task_key survives exclude
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_task_key => 'T_RELEASED', p_active_only => false);
  assert (r->>'total_matches')::int = 2, 'history by key should return BEFORE and AFTER';
  r := public.coordination_read_current(p_task_key => 'T_CYCLE', p_active_only => false);
  assert (r->>'total_matches')::int = 3, 'cycle history';
  r := public.coordination_read_current(p_scope_terms => array['App2029.jsx'], p_exclude_task_key => 'T_ACTIVE_APP');
  assert (r->>'total_matches')::int = 0 and jsonb_typeof(r->'rows') = 'array', 'exclude failed';
  r := public.coordination_read_current(p_scope_terms => array['nullkeyzone'], p_exclude_task_key => 'T_ACTIVE_APP');
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->'task_key' = 'null'::jsonb, 'null task_key survives exclude';
  r := public.coordination_read_current(p_scope_terms => array['nullkeyzone'], p_exclude_task_key => 'nullkey');
  assert (r->>'total_matches')::int = 0, 'exclude by scope_key';
  r := public.coordination_read_current(p_task_key => 'T_ACTIVE_NUM');
  assert (r->>'total_matches')::int = 1, 'task_key filter (active)';
  r := public.coordination_read_current(p_scope_terms => array['SYSTEMFRAME2029']);
  assert r->'rows'->0->>'task_key' = 'T_ACK', 'case-insensitive';
  assert (r->'rows'->0->>'age_hours') is not null;
end $$;

-- 5. input validation (fail closed, no partial answer)
do $$ begin
  begin perform public.coordination_read_current(p_active_only => false); raise exception 'FAIL history'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array_fill('abcd'::text, array[11])); raise exception 'FAIL cap'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array['ab']); raise exception 'FAIL short'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array[null]::text[]); raise exception 'FAIL null'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array[repeat('a',121)]); raise exception 'FAIL 121'; exception when invalid_parameter_value then null; end;
  perform public.coordination_read_current(p_scope_terms => array[repeat('a',120)]);
  begin perform public.coordination_read_current(p_task_key => repeat('k',201)); raise exception 'FAIL key len'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_exclude_task_key => repeat('k',201)); raise exception 'FAIL excl len'; exception when invalid_parameter_value then null; end;
end $$;

-- 6. no write / direct-read path for the reader
do $$ begin
  perform pg_temp.expect_denied($q$insert into public.work_log(task_key) values ('x')$q$);
  perform pg_temp.expect_denied($q$select * from public.work_log_current$q$);
  perform pg_temp.expect_denied($q$update public.work_log set status='x'$q$);
  perform pg_temp.expect_denied($q$delete from public.work_log$q$);
  perform pg_temp.expect_denied($q$select * from auth.users$q$);
  perform pg_temp.expect_denied($q$select public.coordination_status_class('BEFORE', null)$q$);
  assert (select count(*) from public.work_log) = 0, 'RLS must hide the ledger from the reader role';
end $$;
reset role;

-- 7. missing authorization
select pg_temp.claims('00000000-0000-0000-0000-0000000000a2'); set role authenticated;
select pg_temp.expect_denied($q$select public.coordination_read_current()$q$);   -- unflagged (claim says true, DB says no)
reset role;
select pg_temp.claims('00000000-0000-0000-0000-0000000000a3'); set role authenticated;
select pg_temp.expect_denied($q$select public.coordination_read_current()$q$);   -- flag != true
reset role;
select pg_temp.claims('00000000-0000-0000-0000-0000000000ff'); set role authenticated;
select pg_temp.expect_denied($q$select public.coordination_read_current()$q$);   -- unknown user
reset role;
select set_config('request.jwt.claims', '{}', false); set role anon;
select pg_temp.expect_denied($q$select public.coordination_read_current()$q$);   -- anon: no execute / no uid
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"service_role"}', false); set role authenticated;
select pg_temp.expect_denied($q$select public.coordination_read_current()$q$);   -- role claim not authenticated
reset role;

-- 8. IMMEDIATE revocation with an OLD, still-"valid" token (same claims object throughout)
select pg_temp.claims('00000000-0000-0000-0000-0000000000a4'); set role authenticated;
do $$ begin assert (public.coordination_read_current()->>'active_total')::int >= 1, 'a4 should read'; end $$;
reset role;
update auth.users set raw_app_meta_data = '{}' where id = '00000000-0000-0000-0000-0000000000a4';
set role authenticated; select pg_temp.expect_denied($q$select public.coordination_read_current()$q$); reset role;
update auth.users set raw_app_meta_data = '{"sod1820_coordination_reader": true}' where id = '00000000-0000-0000-0000-0000000000a4';
set role authenticated; do $$ begin perform public.coordination_read_current(); end $$; reset role;       -- re-grant restores
update auth.users set banned_until = now() + interval '1 hour' where id = '00000000-0000-0000-0000-0000000000a4';
set role authenticated; select pg_temp.expect_denied($q$select public.coordination_read_current()$q$); reset role;
update auth.users set banned_until = now() - interval '1 second' where id = '00000000-0000-0000-0000-0000000000a4';
set role authenticated; do $$ begin perform public.coordination_read_current(); end $$; reset role;
update auth.users set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000a4';
set role authenticated; select pg_temp.expect_denied($q$select public.coordination_read_current()$q$); reset role;

-- 9. empty declared scope fails toward overlap; then a SMALL world proves a complete all-clear is possible
insert into public.work_log(task_key, status, assignment_scope, topic) values ('T_EMPTYSCOPE', 'BEFORE_X', '   ', 'empty');
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1'); set role authenticated;
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_scope_terms => array['community/chat'], p_exclude_task_key => 'zzz');
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->>'task_key' = 'T_EMPTYSCOPE', 'empty scope must match any term';
end $$;
reset role;
delete from public.work_log where task_key = 'T_EMPTYSCOPE';
delete from public.work_log where task_key like 'T_BULK_%' or topic like 'telemetry %';
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1'); set role authenticated;
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_scope_terms => array['community/chat']);
  assert (r->>'total_matches')::int = 0 and not (r->>'truncated')::boolean and not (r->>'active_truncated')::boolean and (r->>'active_total')::int = 10, 'small world all-clear: ' || (r - 'rows' - 'active_scopes')::text;
end $$;
reset role;

-- 10. the function performed no writes
do $$ begin assert (select count(*) from public.work_log) > 0; end $$;
select 'SQL_PASS' as result;
