-- Run against a Supabase BRANCH / isolated copy only, never production. Wrap in a transaction; rolls back.
begin;
-- helper: simulate a caller
create or replace function pg_temp.as_caller(p_uid uuid, p_flag text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated',
    'app_metadata', case when p_flag is null then '{}'::json else json_build_object('sod1820_coordination_reader', p_flag) end)::text, true);
end $$;

-- 1. ACL: anon and PUBLIC cannot execute; authenticated can (guard is inside the function).
do $$ begin
  assert not has_function_privilege('anon','public.coordination_read_current(text,text[],boolean,integer)','execute'), 'anon must not execute';
  assert has_function_privilege('authenticated','public.coordination_read_current(text,text[],boolean,integer)','execute'), 'authenticated grant missing';
end $$;

set local role authenticated;

-- 2. Unflagged authenticated user -> 42501 (fail closed)
select pg_temp.as_caller(gen_random_uuid(), null);
do $$ begin
  begin perform * from public.coordination_read_current(); raise exception 'FAIL: unflagged user read data';
  exception when insufficient_privilege then null; end;
end $$;

-- 3. Flag set to something other than 'true' -> denied
select pg_temp.as_caller(gen_random_uuid(), 'false');
do $$ begin
  begin perform * from public.coordination_read_current(); raise exception 'FAIL: flag=false read data';
  exception when insufficient_privilege then null; end;
end $$;

-- 4. Flagged reader: succeeds, row cap holds, no forbidden columns, filters enforced
select pg_temp.as_caller(gen_random_uuid(), 'true');
do $$ declare n int; begin
  select count(*) into n from public.coordination_read_current(p_limit => 100000); assert n <= 50, 'row cap broken';
  select count(*) into n from public.coordination_read_current(p_limit => -5); assert n <= 1, 'negative limit not clamped';
  begin perform * from public.coordination_read_current(p_active_only => false); raise exception 'FAIL: unfiltered history';
  exception when invalid_parameter_value then null; end;
  begin perform * from public.coordination_read_current(p_scope_terms => array_fill('abcd'::text, array[11])); raise exception 'FAIL: term cap';
  exception when invalid_parameter_value then null; end;
  assert not exists (select 1 from information_schema.routine_columns
    where routine_name='coordination_read_current' and column_name in ('what_we_did','dispatch_context','dispatch_session_url')), 'forbidden column exposed';
end $$;

-- 5. No write path: reader role cannot touch the tables or call the dispatcher
do $$ begin
  begin insert into public.work_log(topic) values ('x'); raise exception 'FAIL: insert allowed';
  exception when insufficient_privilege then null; end;
  begin perform * from public.work_log_current limit 1; raise exception 'FAIL: direct view read allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- 6. Anonymous (no uid) -> denied
set local role anon;
do $$ begin
  begin perform * from public.coordination_read_current(); raise exception 'FAIL: anon executed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
