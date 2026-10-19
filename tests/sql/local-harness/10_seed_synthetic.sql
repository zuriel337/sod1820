insert into auth.users(id, raw_app_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1', '{"sod1820_coordination_reader": true}'),   -- ChatGPT reader
 ('00000000-0000-0000-0000-0000000000a2', '{}'),                                       -- unflagged
 ('00000000-0000-0000-0000-0000000000a3', '{"sod1820_coordination_reader": "false"}'), -- wrong value
 ('00000000-0000-0000-0000-0000000000a4', '{"sod1820_coordination_reader": true}'),   -- ban/delete/revoke (SQL test)
 ('00000000-0000-0000-0000-0000000000a5', '{"sod1820_coordination_reader": true}');   -- revoke (e2e test)
insert into public.work_log_current(task_key, status, assignment_mode, from_actor, to_actor, assignment_scope, topic, what_we_did, dispatch_session_url, created_at) values
 ('T_ACTIVE_APP',   'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'WRITE', 'GPT', 'ZURIEL', 'Exclusive: src/App2029.jsx; src/components/MaintenanceLock.jsx', 'route start', 'SECRET-BODY', 'https://x/secret', now()),
 ('T_ACTIVE_NUM',   'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'WRITE', 'GPT', 'ZURIEL', 'Number2029Page opening', 'number ui', 'SECRET-BODY', null, now() - interval '1 minute'),
 ('T_RELEASED',     'AFTER_BRANCH_ONLY_IMPLEMENTED_TESTED_PUSHED_SCOPE_RELEASED_PASSIVE', 'WRITE', 'GPT', 'ZURIEL', 'src/App2029.jsx', 'old', 'x', null, now() - interval '2 days'),
 ('T_RELEASE_AUTH', 'EXPLICIT_RELEASE_AUTHORIZED', 'WRITE', 'CLAUDE', 'ZURIEL', 'SystemFrame2029 css', 'frame', 'x', null, now() - interval '3 minutes');
insert into public.work_log_current(task_key, status, assignment_scope, topic, archived) values ('T_ARCHIVED', 'BEFORE_X', 'src/App2029.jsx', 'arch', true);
insert into public.work_log_current(task_key, status, assignment_scope, topic, superseded_by_id) values ('T_SUPERSEDED', 'BEFORE_X', 'src/App2029.jsx', 'sup', gen_random_uuid());
-- 80 unrelated active rows to exercise truncation (all match term "bulkzone")
insert into public.work_log_current(task_key, status, assignment_scope, topic)
 select 'T_BULK_' || g, 'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'bulkzone/file' || g, 'bulk' from generate_series(1, 80) g;

-- null task_key + ACTIVE_WRITER-only status branch; long scope for truncation
insert into public.work_log_current(task_key, status, assignment_scope, topic) values
 (null, 'PASSIVE_ACTIVE_WRITER_NOTE', 'nullkeyzone/file', 'nullkey'),
 ('T_LONG', 'BEFORE_X', 'longzone/' || repeat('x', 2000), 'long');
