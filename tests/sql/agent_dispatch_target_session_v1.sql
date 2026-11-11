-- AGENT_DISPATCH_TARGET_SESSION_V1 — runs on a throwaway local PostgreSQL only (never a live project).
-- Run: bash scripts/run-agent-dispatch-target-session-sql-test.sh
-- The dispatch functions and triggers below are the LIVE ones, byte for byte: each fixture's md5(pg_get_functiondef)
-- is asserted against the value read from the canonical project on 11.11.2026 before anything else runs.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- 0. Supabase-like roles and default grants (new public functions become executable by anon/authenticated unless revoked),
--    plus the minimal vault/net surfaces the functions read. net.http_post records each call instead of sending it.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema vault;
create schema net;
create table vault.secrets(id uuid primary key default gen_random_uuid(), name text unique, secret text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, created_at, updated_at from vault.secrets;
create table net._http_response(id bigint, status_code integer, content_type text, headers jsonb, content text,
  timed_out boolean, error_msg text, created timestamptz not null default now());
create table net.calls(id bigserial primary key, url text, body jsonb, headers jsonb, at timestamptz default now());
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000) returns bigint
  language sql as $f$ insert into net.calls(url, body, headers) values (url, body, headers) returning id $f$;
create table public.work_log(id uuid not null default gen_random_uuid() primary key, session_date date default current_date,
  topic text not null, numbers int4[], what_we_did text, status text, open_threads text, created_at timestamptz default now(),
  archived boolean not null default false, superseded_by_id uuid, task_key text, from_actor text, to_actor text,
  assignment_mode text, assignment_scope text, primary_owner text, release_authorization_state text, parent_assignment_id uuid,
  dispatch_kind text, dispatch_state text, dispatch_context jsonb default '{}'::jsonb, dispatch_attempts integer default 0,
  dispatch_next_attempt_at timestamptz, dispatch_lease_owner text, dispatch_lease_expires_at timestamptz,
  dispatch_last_error text, dispatch_last_request_id bigint, dispatch_last_emitted_at timestamptz,
  dispatch_completed_at timestamptz, dispatch_session_id text, dispatch_session_url text, dispatch_response_at timestamptz);

-- 1. The live base and the live triggers. The GPT after-write path is stubbed: GPT delivery is not under test.
\ir fixtures/agent_dispatch_live_base_20261111/agent_dispatch_emit.sql
\ir fixtures/agent_dispatch_live_base_20261111/agent_dispatch_claim.sql
\ir fixtures/agent_dispatch_live_base_20261111/agent_dispatch_reconcile_routine_response.sql
\ir fixtures/agent_dispatch_live_base_20261111/agent_dispatch_finish.sql
\ir fixtures/agent_dispatch_live_base_20261111/work_log_dispatch_prepare.sql
\ir fixtures/agent_dispatch_live_base_20261111/work_log_dispatch_after_write.sql
\ir fixtures/agent_dispatch_live_base_20261111/work_log_gpt_delivery_stop_v17.sql
create function public.work_log_dispatch_gpt_after_write() returns trigger language plpgsql as $f$ begin return null; end $f$;
create trigger trg_work_log_dispatch_00_gpt_event after insert or update of dispatch_state, dispatch_next_attempt_at on public.work_log for each row execute function work_log_dispatch_gpt_after_write();
create trigger trg_work_log_dispatch_event after insert or update of dispatch_state, dispatch_next_attempt_at on public.work_log for each row execute function work_log_dispatch_after_write();
create trigger trg_work_log_dispatch_prepare before insert or update on public.work_log for each row execute function work_log_dispatch_prepare();
create trigger trg_work_log_zz_gpt_delivery_stop_v17 before insert or update on public.work_log for each row execute function work_log_gpt_delivery_stop_v17();
-- Live ACLs: the dispatch functions run for postgres and service_role only; trigger functions for postgres only.
revoke all on function public.agent_dispatch_emit(uuid), public.agent_dispatch_claim(uuid,text,integer),
  public.agent_dispatch_reconcile_routine_response(uuid), public.agent_dispatch_finish(uuid,text,text,text,text,text,boolean,text)
  from public, anon, authenticated;
grant execute on function public.agent_dispatch_emit(uuid), public.agent_dispatch_claim(uuid,text,integer),
  public.agent_dispatch_reconcile_routine_response(uuid), public.agent_dispatch_finish(uuid,text,text,text,text,text,boolean,text)
  to service_role;
revoke all on function public.work_log_dispatch_prepare(), public.work_log_dispatch_after_write(),
  public.work_log_gpt_delivery_stop_v17(), public.work_log_dispatch_gpt_after_write() from public, anon, authenticated, service_role;

do $t$ begin
  assert md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) = '3ef4d7595c00a8b7b488f8a6e7c54432', 'base emit is not the live text';
  assert md5(pg_get_functiondef('public.agent_dispatch_claim(uuid,text,integer)'::regprocedure)) = '869ce9c630871b43f340715566f6155e', 'base claim is not the live text';
  assert md5(pg_get_functiondef('public.agent_dispatch_reconcile_routine_response(uuid)'::regprocedure)) = '57584429f94080a5ad253b0b1db318f9', 'base reconcile is not the live text';
  assert md5(pg_get_functiondef('public.agent_dispatch_finish(uuid,text,text,text,text,text,boolean,text)'::regprocedure)) = '97261c43add785423024d959d39cd053', 'base finish is not the live text';
  assert md5(pg_get_functiondef('public.work_log_dispatch_prepare()'::regprocedure)) = 'bba6f47639772c33d2eb7d774b2562b5', 'base prepare is not the live text';
  assert md5(pg_get_functiondef('public.work_log_dispatch_after_write()'::regprocedure)) = 'dfac3f0c9cace0993c53ea8e967408ae', 'base after_write is not the live text';
  assert md5(pg_get_functiondef('public.work_log_gpt_delivery_stop_v17()'::regprocedure)) = '1492577ec06d4f38631d3ed70bede4a7', 'base v17 guard is not the live text';
end $t$;

-- Vault: the default Routine pair (today's single endpoint) and one registered target session.
insert into vault.secrets(name, secret) values
  ('CLAUDE_CODE_ROUTINE_FIRE_URL', 'https://api.anthropic.com/v1/claude_code/routines/trig_DEFAULTROUTINE0000000000/fire'),
  ('CLAUDE_CODE_ROUTINE_TOKEN', 'sk-ant-oat01-local-test-default-routine-token'),
  ('CLAUDE_CODE_SESSION_FIRE_URL__01TESTSESSIONAAAAAAAAAAAA', 'https://api.anthropic.com/v1/claude_code/routines/trig_TARGETSESSIONTASK000000/fire'),
  ('CLAUDE_CODE_SESSION_TOKEN__01TESTSESSIONAAAAAAAAAAAA', 'sk-ant-oat01-local-test-target-session-token');

create function pg_temp.assignment(p_key text, p_context jsonb, p_mode text default 'READ_ONLY',
  p_release text default 'BRANCH_ONLY_NO_MERGE_NO_DEPLOY', p_next timestamptz default null) returns uuid
language sql as $f$
  insert into public.work_log(topic, task_key, from_actor, to_actor, status, assignment_mode, assignment_scope, primary_owner,
    release_authorization_state, dispatch_context, dispatch_next_attempt_at)
  values ('local test ' || p_key, p_key, 'GPT', 'CLAUDE', 'QUEUED', p_mode, 'local test scope ' || p_key, 'CLAUDE',
    p_release, p_context, p_next)
  returning id
$f$;

-- 2. The gap today: the live base ignores target_session_id and fires the new-session Routine.
do $t$
declare v_id uuid; v_calls int := (select count(*) from net.calls); v_row public.work_log;
begin
  v_id := pg_temp.assignment('BASE_GAP', '{"target_session_id":"session_01TESTSESSIONAAAAAAAAAAAA"}');
  select * into v_row from public.work_log where id = v_id;
  assert (select count(*) from net.calls) = v_calls + 1, 'base: one fire expected';
  assert (select url from net.calls order by id desc limit 1) like '%trig_DEFAULTROUTINE%', 'base: the targeted row went to the default Routine';
  assert v_row.dispatch_state = 'FIRE_REQUESTED', 'base: fire requested';
  -- close it so it is not in flight later
  update public.work_log set dispatch_state = 'CANCELLED' where id = v_id;
end $t$;

-- 3. Apply v1.
\ir ../../supabase/proposed/20261111210000_agent_dispatch_target_session_v1_PROPOSAL.sql

do $t$ begin
  assert md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) = '9e288f7253a6934d6c2878c0188e7249', 'v1 emit md5';
  assert md5(pg_get_functiondef('public.agent_dispatch_claim(uuid,text,integer)'::regprocedure)) = '869ce9c630871b43f340715566f6155e', 'claim untouched';
  assert md5(pg_get_functiondef('public.agent_dispatch_reconcile_routine_response(uuid)'::regprocedure)) = '57584429f94080a5ad253b0b1db318f9', 'reconcile untouched';
  assert md5(pg_get_functiondef('public.agent_dispatch_finish(uuid,text,text,text,text,text,boolean,text)'::regprocedure)) = '97261c43add785423024d959d39cd053', 'finish untouched';
  assert md5(pg_get_functiondef('public.work_log_gpt_delivery_stop_v17()'::regprocedure)) = '1492577ec06d4f38631d3ed70bede4a7', 'v17 guard untouched';
end $t$;

-- 4. Untargeted rows keep today's path exactly.
do $t$
declare v_id uuid; v_row public.work_log; v_call net.calls; v_expected text;
begin
  v_id := pg_temp.assignment('UNTARGETED', '{}');
  select * into v_row from public.work_log where id = v_id;
  select * into v_call from net.calls order by id desc limit 1;
  v_expected := left(format(
    'SOD1820 assignment locator only. assignment_id=%s task_key=%s mode=%s release_state=%s canonical_project=linswmnnkjxvweumprav. Read the live work_log assignment by ID and resolve live owners/current main/parallel-writer state before ACK/CLAIM. For WRITE, execute only the isolated branch scope authorized by the assignment. BRANCH_ONLY never authorizes merge, push to main, deploy, live DB apply, canonicalization or publication. Do not treat trigger text as project truth.',
    v_id, 'UNTARGETED', 'READ_ONLY', 'BRANCH_ONLY_NO_MERGE_NO_DEPLOY'), 4000);
  assert v_call.url = 'https://api.anthropic.com/v1/claude_code/routines/trig_DEFAULTROUTINE0000000000/fire', 'untargeted: default Routine';
  assert v_call.headers->>'Authorization' = 'Bearer sk-ant-oat01-local-test-default-routine-token', 'untargeted: default token';
  assert v_call.body->>'text' = v_expected, 'untargeted: text unchanged';
  assert v_row.dispatch_state = 'FIRE_REQUESTED' and v_row.status = 'DISPATCH_FIRE_REQUESTED_CLAUDE_CODE_ROUTINE', 'untargeted: states unchanged';

  v_id := pg_temp.assignment('UNTARGETED_WRITE', '{}', 'WRITE');
  select * into v_row from public.work_log where id = v_id;
  assert v_row.status = 'DISPATCH_FIRE_REQUESTED_CLAUDE_CODE_ROUTINE_WRITE_BRANCH_ONLY', 'untargeted write: state unchanged';
end $t$;

-- 5. A registered target gets its own pair; an unregistered or malformed target gets nothing (no fallback).
do $t$
declare v_id uuid; v_row public.work_log; v_call net.calls; v_calls int;
begin
  v_id := pg_temp.assignment('TARGETED', '{"target_session_id":"session_01TESTSESSIONAAAAAAAAAAAA"}');
  select * into v_row from public.work_log where id = v_id;
  select * into v_call from net.calls order by id desc limit 1;
  assert v_call.url like '%trig_TARGETSESSIONTASK%', 'targeted: target pair URL';
  assert v_call.headers->>'Authorization' = 'Bearer sk-ant-oat01-local-test-target-session-token', 'targeted: target token';
  assert v_call.body->>'text' like '%target_session_id=session_01TESTSESSIONAAAAAAAAAAAA. Claim only if get_session%', 'targeted: text names the target';
  assert v_row.dispatch_state = 'FIRE_REQUESTED' and v_row.status = 'DISPATCH_FIRE_REQUESTED_TARGET_SESSION', 'targeted: states';

  v_calls := (select count(*) from net.calls);
  v_id := pg_temp.assignment('TARGET_UNREGISTERED', '{"target_session_id":"session_01OTHERSESSIONBBBBBBBBBBB"}');
  select * into v_row from public.work_log where id = v_id;
  assert (select count(*) from net.calls) = v_calls, 'unregistered: nothing sent, no fallback';
  assert v_row.dispatch_state = 'DEFERRED' and v_row.status = 'DEFERRED_TARGET_SESSION_NOT_REGISTERED'
     and v_row.dispatch_last_error = 'target_session_not_registered_no_fallback_v1', 'unregistered: deferred';

  v_id := pg_temp.assignment('TARGET_BRANCH_NAME', '{"target_session_id":"ccr-b2565041-d94syf"}');
  select * into v_row from public.work_log where id = v_id;
  assert (select count(*) from net.calls) = v_calls, 'branch name: nothing sent';
  assert v_row.status = 'DEFERRED_TARGET_SESSION_ID_INVALID', 'a branch name is not a session ID';
end $t$;

-- 6. Provider receipt: the reported session must be the target (session_ and cse_ name the same session).
do $t$
declare v_ok uuid; v_bad uuid; v_row public.work_log; v_calls int;
begin
  select id into v_ok from public.work_log where task_key = 'TARGETED';
  insert into net._http_response(id, status_code, content) select dispatch_last_request_id, 200,
    '{"type":"routine_fire","claude_code_session_id":"cse_01TESTSESSIONAAAAAAAAAAAA","claude_code_session_url":"https://claude.ai/code/cse_01TESTSESSIONAAAAAAAAAAAA"}'
    from public.work_log where id = v_ok;
  perform public.agent_dispatch_reconcile_routine_response(v_ok);
  select * into v_row from public.work_log where id = v_ok;
  assert v_row.dispatch_state = 'SESSION_STARTED' and (v_row.dispatch_context->>'target_session_verified')::boolean, 'receipt: same session verified';

  v_bad := pg_temp.assignment('TARGET_MISMATCH', '{"target_session_id":"session_01TESTSESSIONAAAAAAAAAAAA"}');
  update public.work_log set dispatch_last_emitted_at = now() - interval '1 minute' where id = v_bad;
  insert into net._http_response(id, status_code, content) select dispatch_last_request_id, 200,
    '{"type":"routine_fire","claude_code_session_id":"session_01NEWSESSIONCCCCCCCCCCCCC","claude_code_session_url":"https://claude.ai/code/session_01NEWSESSIONCCCCCCCCCCCCC"}'
    from public.work_log where id = v_bad;
  v_calls := (select count(*) from net.calls);
  perform public.agent_dispatch_reconcile_routine_response(v_bad);
  select * into v_row from public.work_log where id = v_bad;
  assert v_row.dispatch_state = 'DEFERRED' and v_row.status = 'DEFERRED_TARGET_SESSION_MISMATCH', 'mismatch: fails closed';
  assert v_row.dispatch_next_attempt_at is null and not (v_row.dispatch_context->>'target_session_verified')::boolean, 'mismatch: no retry';
  assert (select count(*) from net.calls) = v_calls, 'mismatch: nothing re-sent';
end $t$;

-- 7. Only the target session can claim; then it finishes, and the AFTER carries its ID (v17 still routes it to ZURIEL).
do $t$
declare v_id uuid; v_row public.work_log; v_after public.work_log; v_refused boolean; v_res jsonb;
begin
  select id into v_id from public.work_log where task_key = 'TARGETED';

  v_refused := false;
  begin perform public.agent_dispatch_claim(v_id, 'CLAUDE_CODE_ROUTINE:session_01NEWSESSIONCCCCCCCCCCCCC');
  exception when others then v_refused := sqlerrm like 'target_session_claim_refused_v1%'; end;
  assert v_refused, 'claim by another session refused';

  v_refused := false;
  begin perform public.agent_dispatch_claim(v_id, 'claude-agent-without-session');
  exception when others then v_refused := sqlerrm like 'target_session_claim_refused_v1%'; end;
  assert v_refused, 'claim without a session ID refused';
  select * into v_row from public.work_log where id = v_id;
  assert v_row.dispatch_state = 'SESSION_STARTED' and v_row.dispatch_lease_owner is null, 'refused claims left the row as it was';

  v_res := public.agent_dispatch_claim(v_id, 'session_01TESTSESSIONAAAAAAAAAAAA');
  assert v_res is not null and v_res->>'dispatch_state' = 'CLAIMED', 'target session claims';

  v_res := public.agent_dispatch_finish(v_id, 'session_01TESTSESSIONAAAAAAAAAAAA', 'COMPLETED', 'AFTER_LOCAL_TEST_PASS', 'local test result', null, false, null);
  select * into v_after from public.work_log where id = (v_res->>'after_id')::uuid;
  assert v_after.parent_assignment_id = v_id and v_after.dispatch_context->>'completed_by' = 'session_01TESTSESSIONAAAAAAAAAAAA', 'AFTER carries the session';
  assert v_after.to_actor = 'ZURIEL' and v_after.dispatch_kind is null and v_after.dispatch_context->>'original_to_actor' = 'GPT', 'v17 still applies to the AFTER';
  select * into v_row from public.work_log where id = v_id;
  assert v_row.dispatch_state = 'COMPLETED' and v_row.superseded_by_id = v_after.id, 'assignment closed';
end $t$;

-- 8. The binding is immutable; GPT-directed rows are unchanged by v1.
do $t$
declare v_refused boolean; v_id uuid; v_calls int := (select count(*) from net.calls); v_row public.work_log;
begin
  v_refused := false;
  begin update public.work_log set dispatch_context = dispatch_context - 'target_session_id' where task_key = 'TARGET_UNREGISTERED';
  exception when others then v_refused := sqlerrm like 'target_session_id_immutable_v1%'; end;
  assert v_refused, 'target cannot be removed';

  v_refused := false;
  begin update public.work_log set dispatch_context = dispatch_context || '{"target_session_id":"session_01TESTSESSIONAAAAAAAAAAAA"}' where task_key = 'UNTARGETED';
  exception when others then v_refused := sqlerrm like 'target_session_id_immutable_v1%'; end;
  assert v_refused, 'target cannot be added later';

  insert into public.work_log(topic, task_key, from_actor, to_actor, status) values ('local test to GPT', 'TO_GPT', 'CLAUDE', 'GPT', 'QUEUED')
  returning id into v_id;
  select * into v_row from public.work_log where id = v_id;
  assert v_row.to_actor = 'ZURIEL' and v_row.dispatch_kind is null and v_row.dispatch_state is null, 'v17: GPT delivery still disabled';
  assert (select count(*) from net.calls) = v_calls, 'v17: nothing sent';
end $t$;

-- 9. Client roles cannot run any dispatch function; service_role keeps emit.
do $t$ begin
  assert not has_function_privilege('anon', 'public.agent_dispatch_emit(uuid)', 'execute'), 'anon emit';
  assert not has_function_privilege('authenticated', 'public.agent_dispatch_emit(uuid)', 'execute'), 'authenticated emit';
  assert not has_function_privilege('anon', 'public.agent_dispatch_target_session_key(text)', 'execute'), 'anon key';
  assert not has_function_privilege('authenticated', 'public.agent_dispatch_target_session_key(text)', 'execute'), 'authenticated key';
  assert not has_function_privilege('anon', 'public.work_log_dispatch_target_session_guard_v1()', 'execute'), 'anon guard';
  assert has_function_privilege('service_role', 'public.agent_dispatch_emit(uuid)', 'execute'), 'service_role emit';
end $t$;

-- 10. A second apply refuses and changes nothing.
\set ON_ERROR_STOP 0
begin;
\ir ../../supabase/proposed/20261111210000_agent_dispatch_target_session_v1_PROPOSAL.sql
rollback;
\set ON_ERROR_STOP 1
do $t$ begin
  assert md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) = '9e288f7253a6934d6c2878c0188e7249', 're-apply changed nothing';
end $t$;

-- 11. The rollback refuses while a targeted row is in flight, then restores the exact base.
select pg_temp.assignment('IN_FLIGHT', '{"target_session_id":"session_01TESTSESSIONAAAAAAAAAAAA"}', 'READ_ONLY',
  'BRANCH_ONLY_NO_MERGE_NO_DEPLOY', now() + interval '1 day') as in_flight_id \gset
do $t$ begin
  assert (select dispatch_state from public.work_log where task_key = 'IN_FLIGHT') = 'QUEUED', 'in-flight row queued';
end $t$;
\set ON_ERROR_STOP 0
begin;
\ir ../../supabase/proposed/ROLLBACK_20261111210000_agent_dispatch_target_session_v1.sql
rollback;
\set ON_ERROR_STOP 1
do $t$ begin
  assert exists (select 1 from pg_trigger where tgname = 'trg_work_log_dispatch_target_session_guard_v1'), 'rollback refused while in flight';
  assert md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) = '9e288f7253a6934d6c2878c0188e7249', 'refused rollback changed nothing';
end $t$;
update public.work_log set dispatch_state = 'CANCELLED' where task_key = 'IN_FLIGHT';
\ir ../../supabase/proposed/ROLLBACK_20261111210000_agent_dispatch_target_session_v1.sql
do $t$ begin
  assert md5(pg_get_functiondef('public.agent_dispatch_emit(uuid)'::regprocedure)) = '3ef4d7595c00a8b7b488f8a6e7c54432', 'rollback restored the base';
  assert to_regprocedure('public.agent_dispatch_target_session_key(text)') is null, 'helper removed';
  assert not exists (select 1 from pg_trigger where tgname = 'trg_work_log_dispatch_target_session_guard_v1'), 'guard removed';
end $t$;

select 'PASS agent_dispatch_target_session_v1' as result;
