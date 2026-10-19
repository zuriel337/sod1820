insert into auth.users(id, raw_app_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1', '{"sod1820_coordination_reader": true}'),   -- ChatGPT reader
 ('00000000-0000-0000-0000-0000000000a2', '{}'),                                       -- unflagged
 ('00000000-0000-0000-0000-0000000000a3', '{"sod1820_coordination_reader": "false"}'), -- wrong value
 ('00000000-0000-0000-0000-0000000000a4', '{"sod1820_coordination_reader": true}'),   -- ban/delete/revoke (SQL test)
 ('00000000-0000-0000-0000-0000000000a5', '{"sod1820_coordination_reader": true}');   -- revoke (e2e test)

create or replace function pg_temp.w(p_key text, p_status text, p_mode text, p_scope text, p_age interval, p_topic text default 'synthetic')
returns void language sql as $$
  insert into public.work_log(task_key, status, assignment_mode, assignment_scope, topic, from_actor, to_actor, what_we_did, dispatch_session_url, created_at)
  values (p_key, p_status, p_mode, p_scope, p_topic, 'GPT', 'ZURIEL', 'SECRET-BODY', 'https://x/secret', now() - p_age) $$;

-- ACTIVE writers (latest lifecycle row is OPEN)
select pg_temp.w('T_ACTIVE_APP', 'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'WRITE', 'Exclusive: src/App2029.jsx; src/components/MaintenanceLock.jsx', interval '1 hour');
select pg_temp.w('T_ACTIVE_NUM', 'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'WRITE', 'Number2029Page opening', interval '70 minutes');
select pg_temp.w('T_ACK', 'ACK_CLAIMED_WRITE_SHARED_FRAME_HOME_WORLD_BRANCH_ONLY', 'WRITE', 'src/components/SystemFrame2029.jsx; home/world', interval '30 minutes');
select pg_temp.w('T_CLAIMED', 'CLAIMED_WRITE', 'WRITE', 'docs/claimedzone', interval '3 hours');
select pg_temp.w('T_ASSIGNED', 'ASSIGNED_WRITE', 'WRITE', 'assignedzone/file', interval '3 hours');
select pg_temp.w('T_LEGACY', 'CLAIMED_CLAUDE_EVENT_DRIVEN_RUNTIME', 'WRITE', 'legacyzone/file', interval '3 hours');
-- several work cycles on one key: BEFORE -> AFTER -> BEFORE  (active again, second scope only)
select pg_temp.w('T_CYCLE', 'BEFORE_BRANCH_ONLY_PASSIVE', 'WRITE', 'cyclezone/first', interval '10 hours');
select pg_temp.w('T_CYCLE', 'AFTER_BRANCH_ONLY_IMPLEMENTED_TESTED_PUSHED_SCOPE_RELEASED_PASSIVE', 'WRITE', 'cyclezone/first', interval '9 hours');
select pg_temp.w('T_CYCLE', 'BEFORE_BRANCH_ONLY_PASSIVE', 'WRITE', 'cyclezone/second', interval '2 hours');
-- null task_key, ACTIVE_WRITER-only status branch
insert into public.work_log(task_key, status, assignment_scope, topic, created_at) values (null, 'PASSIVE_ACTIVE_WRITER_NOTE', 'nullkeyzone/file', 'nullkey', now() - interval '2 hours');

-- exact same-instant BEFORE and AFTER: ambiguity resolves toward ACTIVE (conservative)
insert into public.work_log(task_key, status, assignment_scope, topic, created_at) values
 ('T_TIE', 'BEFORE_X', 'tiezone', 'tie', now() - interval '6 hours'),
 ('T_TIE', 'AFTER_X', 'tiezone', 'tie', now() - interval '6 hours');

-- RELEASED / closed (must NOT block)
select pg_temp.w('T_RELEASED', 'BEFORE_BRANCH_ONLY_ACTIVE_WRITER_PASSIVE', 'WRITE', 'src/App2029.jsx; releasedzone', interval '5 hours');
select pg_temp.w('T_RELEASED', 'AFTER_BRANCH_ONLY_IMPLEMENTED_TESTED_MEASURED_PUSHED_SCOPE_RELEASED_PASSIVE', 'WRITE', 'src/App2029.jsx; releasedzone', interval '4 hours');
select pg_temp.w('T_CANCELLED', 'BEFORE_X', 'WRITE', 'cancelledzone', interval '5 hours');
select pg_temp.w('T_CANCELLED', 'CANCELLED_BY_ZURIEL', 'WRITE', 'cancelledzone', interval '4 hours');
select pg_temp.w('T_RELEASED2', 'BEFORE_X', 'WRITE', 'released2zone', interval '5 hours');
select pg_temp.w('T_RELEASED2', 'AFTER_BLOCKED_RELEASED', 'WRITE', 'released2zone', interval '4 hours');
select pg_temp.w('T_CLOSED', 'CLAIMED_WRITE', 'WRITE', 'closedzone', interval '5 hours');
select pg_temp.w('T_CLOSED', 'CLOSED_MANUAL_CLAIM_BY_ZURIEL_20261017', 'WRITE', 'closedzone', interval '4 hours');
-- scope derived from topic "task=" : BEFORE has no task_key, its AFTER carries the key
insert into public.work_log(task_key, status, assignment_scope, topic, created_at) values
 (null, 'BEFORE_X', 'topickeyzone', 'task=T_TOPIC rest of title', now() - interval '5 hours'),
 ('T_TOPIC', 'AFTER_X', 'topickeyzone', 'x', now() - interval '4 hours');

-- NOT writers
select pg_temp.w('T_READONLY', 'CLAIMED_CLAUDE_EVENT_DRIVEN_RUNTIME', 'READ_ONLY', 'readonlyzone', interval '1 hour');
select pg_temp.w('T_RELAUTH', 'EXPLICIT_RELEASE_AUTHORIZED', 'WRITE', 'relauthzone SystemFrame2029 css', interval '1 hour');
select pg_temp.w('T_BLOCKED', 'BLOCKED_NEEDS_MORE_CONTEXT', 'READ_ONLY', 'blockedzone', interval '1 hour');
select pg_temp.w('T_PASS', 'PASS', 'READ_ONLY', 'passzone', interval '1 hour');
-- archived / superseded / ancient (>30d) BEFORE rows never count
insert into public.work_log(task_key, status, assignment_scope, topic, archived) values ('T_ARCHIVED', 'BEFORE_X', 'archzone', 'arch', true);
insert into public.work_log(task_key, status, assignment_scope, topic, superseded_by_id) values ('T_SUPERSEDED', 'BEFORE_X', 'supzone', 'sup', gen_random_uuid());
select pg_temp.w('T_ANCIENT', 'BEFORE_X', 'WRITE', 'ancientzone', interval '40 days');

-- Old still-open BEFORE that FALLS OUT of work_log_current's 100-newest window
select pg_temp.w('T_OLD_OPEN', 'BEFORE_BRANCH_ONLY_PASSIVE', 'WRITE', 'oldopenzone/file', interval '3 days');
insert into public.work_log(status, topic, created_at) select 'sensor_stale', 'telemetry ' || g, now() - interval '2 days' + g * interval '1 minute' from generate_series(1, 150) g;

-- 80 bulk writers on bulkzone; the first 10 are released -> 70 active (> 50 cap)
insert into public.work_log(task_key, status, assignment_scope, topic, created_at)
 select 'T_BULK_' || g, 'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'bulkzone/file' || g, 'bulk', now() - interval '20 minutes' from generate_series(1, 80) g;
insert into public.work_log(task_key, status, assignment_scope, topic, created_at)
 select 'T_BULK_' || g, 'AFTER_BRANCH_ONLY_SCOPE_RELEASED_PASSIVE', 'bulkzone/file' || g, 'bulk', now() - interval '10 minutes' from generate_series(1, 10) g;
