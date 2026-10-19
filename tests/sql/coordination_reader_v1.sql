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

-- 1. ACL
do $$ begin
  assert not has_function_privilege('anon','public.coordination_read_current(text,text[],boolean,integer,text)','execute'), 'anon can execute';
  assert has_function_privilege('authenticated','public.coordination_read_current(text,text[],boolean,integer,text)','execute');
  assert not has_table_privilege('authenticated','public.work_log_current','select'), 'authenticated can read view directly';
end $$;

-- 2. valid reader: finds active writer + file overlap
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1'); set role authenticated;
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_scope_terms => array['App2029.jsx']);
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->>'task_key' = 'T_ACTIVE_APP', 'active writer / file overlap not found: ' || r::text;
  assert (r->>'truncated')::boolean = false;
  assert r::text not like '%SECRET-BODY%' and r::text not like '%secret%' and r::text not like '%what_we_did%' and r::text not like '%dispatch_%', 'forbidden data exposed';
  -- released / archived / superseded rows never count as active
  assert not (r::text like '%T_RELEASED%' or r::text like '%T_ARCHIVED%' or r::text like '%T_SUPERSEDED%'), 'stale rows leaked';
  -- own task excluded
  r := public.coordination_read_current(p_scope_terms => array['App2029.jsx'], p_exclude_task_key => 'T_ACTIVE_APP');
  assert (r->>'total_matches')::int = 0 and jsonb_typeof(r->'rows') = 'array', 'exclude failed';
  -- no overlap in an unrelated scope
  r := public.coordination_read_current(p_scope_terms => array['community/chat']);
  assert (r->>'total_matches')::int = 0 and (r->>'truncated')::boolean = false;
  -- case-insensitive term, two active writers on different scopes
  r := public.coordination_read_current(p_scope_terms => array['SYSTEMFRAME2029']);
  assert r->'rows'->0->>'task_key' = 'T_RELEASE_AUTH';
end $$;

-- 2b. task_key filter, null task_key, long text, config, term/key bounds
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_task_key => 'T_ACTIVE_NUM', p_active_only => false);
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->>'task_key' = 'T_ACTIVE_NUM', 'task_key filter';
  r := public.coordination_read_current(p_task_key => 'T_RELEASED', p_active_only => false);
  assert (r->>'total_matches')::int = 1, 'history by key';
  r := public.coordination_read_current(p_scope_terms => array['nullkeyzone'], p_exclude_task_key => 'T_ACTIVE_APP');
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->'task_key' = 'null'::jsonb, 'null task_key row must survive exclude / ACTIVE_WRITER branch';
  r := public.coordination_read_current(p_scope_terms => array['longzone']);
  assert length(r->'rows'->0->>'assignment_scope') = 800, 'scope not truncated to 800';
  assert jsonb_array_length(r->'active_scopes') >= 1 and length(r->'active_scopes'->0->>'assignment_scope') <= 300, 'active_scopes shape';
  r := public.coordination_read_current(p_scope_terms => array['community/chat']);
  assert (r->>'active_total')::int >= 80 and r ? 'active_truncated', 'active list missing';
  assert (select prosecdef from pg_proc where oid='public.coordination_read_current(text,text[],boolean,integer,text)'::regprocedure), 'not security definer';
  assert (select proconfig from pg_proc where oid='public.coordination_read_current(text,text[],boolean,integer,text)'::regprocedure) @> array['search_path=pg_catalog, public, pg_temp'], 'search_path not pinned';
  begin perform public.coordination_read_current(p_scope_terms => array[repeat('a',121)]); raise exception 'FAIL 121'; exception when invalid_parameter_value then null; end;
  perform public.coordination_read_current(p_scope_terms => array[repeat('a',120)]);
  begin perform public.coordination_read_current(p_task_key => repeat('k',201)); raise exception 'FAIL key len'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_exclude_task_key => repeat('k',201)); raise exception 'FAIL excl len'; exception when invalid_parameter_value then null; end;
end $$;

-- 3. truncation is explicit (80 bulk rows > 50 cap): never looks like "no overlap"
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_scope_terms => array['bulkzone'], p_limit => 100000);
  assert (r->>'total_matches')::int = 80 and (r->>'returned')::int = 50 and (r->>'truncated')::boolean = true, 'truncation not reported: ' || (r - 'rows')::text;
  r := public.coordination_read_current(p_limit => -5, p_scope_terms => array['bulkzone']);
  assert (r->>'returned')::int = 1 and (r->>'truncated')::boolean = true, 'negative limit';
end $$;

-- 4. input validation (fail closed, no partial answer)
do $$ begin
  begin perform public.coordination_read_current(p_active_only => false); raise exception 'FAIL history'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array_fill('abcd'::text, array[11])); raise exception 'FAIL cap'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array['ab']); raise exception 'FAIL short'; exception when invalid_parameter_value then null; end;
  begin perform public.coordination_read_current(p_scope_terms => array[null]::text[]); raise exception 'FAIL null'; exception when invalid_parameter_value then null; end;
end $$;

-- 5. no write / direct-read path for the reader
do $$ begin
  perform pg_temp.expect_denied($q$insert into public.work_log_current(task_key) values ('x')$q$);
  perform pg_temp.expect_denied($q$select * from public.work_log_current$q$);
  perform pg_temp.expect_denied($q$update public.work_log_current set status='x'$q$);
  perform pg_temp.expect_denied($q$select * from auth.users$q$);
end $$;
reset role;

-- 6. missing authorization
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

-- 7. IMMEDIATE revocation with an OLD, still-"valid" token (same claims object throughout)
select pg_temp.claims('00000000-0000-0000-0000-0000000000a4'); set role authenticated;
do $$ begin assert (public.coordination_read_current()->>'total_matches')::int >= 1, 'a4 should read'; end $$;
reset role;
update auth.users set raw_app_meta_data = '{}' where id = '00000000-0000-0000-0000-0000000000a4';       -- flag removed
set role authenticated; select pg_temp.expect_denied($q$select public.coordination_read_current()$q$); reset role;
update auth.users set raw_app_meta_data = '{"sod1820_coordination_reader": true}' where id = '00000000-0000-0000-0000-0000000000a4';
set role authenticated; do $$ begin perform public.coordination_read_current(); end $$; reset role;       -- re-grant restores
update auth.users set banned_until = now() + interval '1 hour' where id = '00000000-0000-0000-0000-0000000000a4';  -- banned
set role authenticated; select pg_temp.expect_denied($q$select public.coordination_read_current()$q$); reset role;
update auth.users set banned_until = now() - interval '1 second' where id = '00000000-0000-0000-0000-0000000000a4'; -- ban expired -> restored
set role authenticated; do $$ begin perform public.coordination_read_current(); end $$; reset role;
update auth.users set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000a4';             -- deleted
set role authenticated; select pg_temp.expect_denied($q$select public.coordination_read_current()$q$); reset role;

-- 8. the function performs no writes (stable) and left data untouched
do $$ begin assert (select count(*) from public.work_log_current) = 88, 'row count changed'; end $$;

-- 9. active row with empty declared scope fails toward overlap (superuser inserts, then removes)
insert into public.work_log_current(task_key, status, assignment_scope, topic) values ('T_EMPTYSCOPE', 'BEFORE_X', '   ', 'empty');
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1'); set role authenticated;
do $$ declare r jsonb; begin
  r := public.coordination_read_current(p_scope_terms => array['community/chat']);
  assert (r->>'total_matches')::int = 1 and r->'rows'->0->>'task_key' = 'T_EMPTYSCOPE', 'empty scope must match any term';
end $$;
reset role;
delete from public.work_log_current where task_key = 'T_EMPTYSCOPE';
select 'SQL_PASS' as result;
