// Isolated SQL fixtures only. PGlite has no network/live Postgres connection.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const file = name => readFileSync(new URL(name, import.meta.url), 'utf8');
let checked=0;
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE TABLE nodes(id uuid DEFAULT gen_random_uuid(), type text,rule_id text,rule_version int,label text,description text,depends_on text[],created_at timestamptz DEFAULT now(),is_active bool);
CREATE TABLE work_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_date date,topic text,numbers int[],what_we_did text,status text,open_threads text,created_at timestamptz DEFAULT now(),archived bool DEFAULT false,superseded_by_id uuid,task_key text,from_actor text,to_actor text,assignment_mode text,assignment_scope text,primary_owner text,release_authorization_state text,parent_assignment_id uuid,dispatch_kind text,dispatch_state text,dispatch_context jsonb,dispatch_attempts int,dispatch_next_attempt_at timestamptz,dispatch_lease_owner text,dispatch_lease_expires_at timestamptz,dispatch_last_error text,dispatch_last_request_id bigint,dispatch_last_emitted_at timestamptz,dispatch_completed_at timestamptz,dispatch_session_id text,dispatch_session_url text,dispatch_response_at timestamptz);
CREATE SCHEMA cron;
CREATE TABLE cron.job(jobid bigint PRIMARY KEY,jobname text,schedule text,command text,active bool);
-- Test double ONLY for pg_cron scheduler mutation. All PostgreSQL/view SQL is real.
CREATE FUNCTION cron.alter_job(job_id bigint,schedule text DEFAULT NULL,command text DEFAULT NULL,database text DEFAULT NULL,username text DEFAULT NULL,active bool DEFAULT NULL) RETURNS void LANGUAGE SQL AS $$ UPDATE cron.job SET active=alter_job.active WHERE jobid=job_id $$;
INSERT INTO nodes(type,rule_id,rule_version,is_active) VALUES ('rule','a',1,true),('rule','a',2,false),('rule','retired',1,false),('rule','inter_agent_coordination_law',17,true);
INSERT INTO work_log(id,topic,task_key,status,created_at) VALUES
 ('00000000-0000-0000-0000-000000000001','scope','same','BEFORE_CLAIMED_WRITE',now()-interval '1 hour'),
 ('00000000-0000-0000-0000-000000000002','parallel','same','BEFORE_CLAIMED_WRITE',now()-interval '55 minutes'),
 ('00000000-0000-0000-0000-000000000003','completion','same','AFTER_SCOPE_RELEASED',now()-interval '40 minutes'),
 ('00000000-0000-0000-0000-000000000004','unlinked','same','AFTER_COMPLETED',now()-interval '30 minutes');
UPDATE work_log SET parent_assignment_id='00000000-0000-0000-0000-000000000001' WHERE id='00000000-0000-0000-0000-000000000003';
INSERT INTO cron.job VALUES
 (125,'g3-agent-dispatch-recovery','* * * * *','select public.agent_dispatch_recover();',true),
 (126,'g3-agent-routine-response-reconcile','* * * * *','select public.agent_dispatch_reconcile_routine_responses();',true),
 (127,'g3-gpt-result-wake-recovery','* * * * *','select public.agent_dispatch_recover_gpt_wakes();',true),
 (102,'wa-channel-ingest','*/5 * * * *','kept_source_ingress',true);
`);
await db.exec(file('rollback-rules_active.sql')); await db.exec(file('rollback-work_log_current.sql'));
const colsBefore=(await db.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='work_log_current' ORDER BY ordinal_position")).rows;
const tableCount=(await db.query('SELECT count(*)::int n FROM work_log')).rows[0].n;
await db.exec(file('proposed-current-views.sql'));
assert.equal((await db.query('SELECT "גרסה" AS v FROM rules_active WHERE "מזהה_חוק"=\'a\'')).rows[0].v,1); checked++;
assert.equal((await db.query('SELECT * FROM rules_active WHERE "מזהה_חוק"=\'retired\'')).rows.length,0); checked++;
assert.equal((await db.query("SELECT * FROM work_log_current WHERE id='00000000-0000-0000-0000-000000000001'")).rows.length,0); checked++;
assert.equal((await db.query("SELECT * FROM work_log_current WHERE id='00000000-0000-0000-0000-000000000002'")).rows.length,1); checked++;
assert.equal((await db.query('SELECT count(*)::int n FROM work_log')).rows[0].n,tableCount); checked++;
assert.deepEqual((await db.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='work_log_current' ORDER BY ordinal_position")).rows,colsBefore); checked++;
assert.equal((await db.query("SELECT has_table_privilege('anon','work_log_current','SELECT') AS allowed")).rows[0].allowed,false); checked++;
await db.exec(file('proposed-current-views.sql')); checked++;
await db.exec(file('rollback-rules_active.sql')); await db.exec(file('rollback-work_log_current.sql'));
assert.equal((await db.query('SELECT count(*)::int n FROM work_log_current')).rows[0].n,4); checked++;
const pause=file('proposed-pause-obsolete-coordination.sql');
await db.exec(pause);
assert.deepEqual((await db.query('SELECT jobid,active FROM cron.job ORDER BY jobid')).rows,[{jobid:102,active:true},{jobid:125,active:false},{jobid:126,active:false},{jobid:127,active:false}]); checked++;
await db.exec(pause); checked++;
await db.exec('SELECT cron.alter_job(125,active:=true); SELECT cron.alter_job(126,active:=true); SELECT cron.alter_job(127,active:=true);');
assert.equal((await db.query('SELECT count(*)::int n FROM cron.job WHERE active')).rows[0].n,4); checked++;
await db.exec("UPDATE work_log SET dispatch_state='QUEUED' WHERE id='00000000-0000-0000-0000-000000000002'");
await assert.rejects(db.exec(pause),/active_dispatch_requires_review/); await db.exec('ROLLBACK'); checked++;
await db.exec("UPDATE work_log SET dispatch_state=NULL; UPDATE cron.job SET command='different' WHERE jobid=127");
await assert.rejects(db.exec(pause),/coordination_job_identity_drift/); await db.exec('ROLLBACK'); checked++;
await db.exec("UPDATE cron.job SET command='select public.agent_dispatch_recover_gpt_wakes();' WHERE jobid=127; UPDATE nodes SET is_active=false WHERE rule_id='inter_agent_coordination_law'");
await assert.rejects(db.exec(pause),/coordination_authority_drift/); await db.exec('ROLLBACK'); checked++;
assert.equal((await db.query('SELECT count(*)::int n FROM cron.job WHERE active')).rows[0].n,4); checked++;
await db.close();
console.log(JSON.stringify({passed:checked,failed:0,liveDatabase:false,models:0,mail:0,scheduler:'test-double-only',postgres:'PGlite 0.5.14'},null,2));
