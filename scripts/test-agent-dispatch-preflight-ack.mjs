// Executes production SQL in isolated PostgreSQL WASM. net.http_post is a local stub only.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE SCHEMA vault; CREATE SCHEMA net;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
CREATE FUNCTION public.rd_is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text,created_at timestamptz DEFAULT now());
INSERT INTO vault.decrypted_secrets VALUES('CLAUDE_CODE_ROUTINE_FIRE_URL','https://api.anthropic.com/v1/claude_code/routines/isolated-fixture/fire',now()),('CLAUDE_CODE_ROUTINE_TOKEN','isolated-placeholder-not-a-real-secret',now());
CREATE TABLE net.test_requests(id bigint GENERATED ALWAYS AS IDENTITY,body jsonb);
CREATE FUNCTION net.http_post(url text,body jsonb,params jsonb,headers jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE plpgsql AS $$ DECLARE result bigint; BEGIN INSERT INTO net.test_requests(body) VALUES(body) RETURNING id INTO result; RETURN result; END $$;
CREATE TABLE public.work_log(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),topic text,status text,what_we_did text,open_threads text,
 task_key text,from_actor text,to_actor text,assignment_mode text,assignment_scope text,primary_owner text,release_authorization_state text,
 parent_assignment_id uuid,dispatch_kind text,dispatch_state text,dispatch_next_attempt_at timestamptz,dispatch_context jsonb DEFAULT '{}',dispatch_attempts integer DEFAULT 0,
 dispatch_lease_owner text,dispatch_lease_expires_at timestamptz,dispatch_last_error text,dispatch_completed_at timestamptz,superseded_by_id uuid,archived boolean DEFAULT false,
 dispatch_last_emitted_at timestamptz,dispatch_last_request_id bigint,dispatch_session_id text);
CREATE UNIQUE INDEX work_log_assignment_idempotency_uidx ON work_log(task_key,to_actor,dispatch_kind) WHERE dispatch_kind='ASSIGNMENT';
CREATE UNIQUE INDEX work_log_one_active_writer_scope_uidx ON work_log(lower(assignment_scope)) WHERE assignment_mode='WRITE' AND dispatch_kind='ASSIGNMENT' AND archived=false AND superseded_by_id IS NULL AND coalesce(dispatch_state,'QUEUED') NOT IN ('FAILED','CANCELLED','COMPLETED');
`);
const root=new URL('../supabase/migrations/',import.meta.url);
const legacy=readFileSync(new URL('20260915165200_g3_dispatch_legacy_insert_only_hardening.sql',root),'utf8');
const prepare=legacy.slice(legacy.indexOf('create or replace function'),legacy.indexOf('comment on function'));
await db.exec(prepare);
await db.exec(`CREATE TRIGGER trg_work_log_dispatch_prepare BEFORE INSERT OR UPDATE ON public.work_log FOR EACH ROW EXECUTE FUNCTION work_log_dispatch_prepare();`);
const v16=readFileSync(new URL('20261011172200_agent_dispatch_one_directional_results_v16.sql',root),'utf8');
await db.exec(v16);
const migration=readdirSync(root).find(n=>n.endsWith('_agent_dispatch_preflight_ack_v16.sql'));
await assert.rejects(db.exec(readFileSync(new URL(migration,root),'utf8')),/ACK-before-claim instructions/);
await db.exec("INSERT INTO work_log(task_key,from_actor,status,dispatch_context) VALUES('SESSION_COORDINATION_ACK_PROTOCOL_ROLLOUT_V16','GPT','ACK_PROTOCOL_ROLLOUT_VERIFIED','{\"receiver_protocol\":\"ACK_BEFORE_CLAIM_V16\",\"tested\":true}')");
const legacyClaim=(await db.query("INSERT INTO work_log(assignment_mode,status,assignment_scope) VALUES('WRITE','CLAIMED_WRITE_LEGACY','legacy') RETURNING id")).rows[0].id;
await assert.rejects(db.exec(readFileSync(new URL(migration,root),'utf8')),/reconcile legacy WRITE owners/);
await db.query('DELETE FROM work_log WHERE id=$1',[legacyClaim]); // isolated fixture setup only
await db.exec(readFileSync(new URL(migration,root),'utf8'));
await db.exec(`CREATE FUNCTION public.work_log_dispatch_after_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF new.dispatch_state IN ('QUEUED','RETRY_WAIT') THEN PERFORM agent_dispatch_emit(new.id); END IF; RETURN NULL; END $$;
CREATE TRIGGER trg_work_log_dispatch_event AFTER INSERT OR UPDATE OF dispatch_state,dispatch_next_attempt_at ON work_log FOR EACH ROW EXECUTE FUNCTION work_log_dispatch_after_write();`);
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const row=async id=>(await query('SELECT * FROM work_log WHERE id=$1',[id]))[0];
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
const sha='a'.repeat(40);
const governance={base_sha:sha,expected_head_sha:sha,branch:'claude/coordination-fixture',authorization_ref:'isolated-user-decision',dependency_ids:[]};
async function assign(key,mode='READ_ONLY',g=governance,paths=['test/coordination-fixture.txt']){
 return (await query('SELECT work_log_assign_agent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) id',
 ['GPT','CLAUDE',key,'inter_agent_coordination_law',mode,key,'isolated objective',[],['no release'],'isolated verification','stop on mismatch','passive AFTER','BRANCH_ONLY_NO_MERGE_NO_DEPLOY',paths,g]))[0].id;
}
async function ack(id,worker='receiver-one'){return (await query('SELECT agent_dispatch_ack($1,$2,$3,$4,$5) receipt',[id,worker,'session-fixture',sha,sha]))[0].receipt;}
async function claim(id,worker='receiver-one'){return (await query('SELECT agent_dispatch_claim($1,$2,900) receipt',[id,worker]))[0].receipt;}
await check('invalid WRITE is persisted BLOCKED before any transport call',async()=>{
 const before=(await query('SELECT count(*)::int n FROM net.test_requests'))[0].n;
 const id=await assign('INVALID_WRITE','WRITE',{...governance,authorization_ref:null});
 assert.equal((await row(id)).dispatch_state,'DEFERRED');assert.equal((await row(id)).dispatch_last_error,'write_authorization_reference_missing');
 assert.equal((await query('SELECT count(*)::int n FROM net.test_requests'))[0].n,before);assert.equal(await claim(id),null);
});
await check('both reported governance failures are rejected before sending',async()=>{
 for(const [key,release,expected] of [['SYSTEMFRAME_BAD','NOT_AUTHORIZED','write_autostart_requires_branch_only'],['SEQUENCE_BAD',null,'write_governance_envelope_incomplete']]){
  const id=(await query("INSERT INTO work_log(task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,release_authorization_state,dispatch_kind,dispatch_state) VALUES($1,'GPT','CLAUDE','WRITE',$1,'owner',$2,'ASSIGNMENT','QUEUED') RETURNING id",[key,release]))[0].id;
  assert.equal((await row(id)).dispatch_last_error,expected);assert.equal((await row(id)).dispatch_last_request_id,null);
 }
});
let readId;
await check('fire and delivery response do not fabricate ACK',async()=>{
 readId=await assign('READ_RECEIPT');assert.equal((await row(readId)).dispatch_state,'FIRE_REQUESTED');
 assert.equal((await row(readId)).dispatch_context.receipt,undefined);assert.equal(await claim(readId),null);
});
await check('real receiver ACK is persistent and idempotent; another receiver cannot steal it',async()=>{
 await query("UPDATE work_log SET dispatch_session_id='session-fixture' WHERE id=$1",[readId]);
 await assert.rejects(query("SELECT agent_dispatch_ack($1,'receiver-one','wrong-session',$2,$2)",[readId,sha]),/transport session mismatch/);
 const receipt=await ack(readId);assert.ok(receipt.ack_at);assert.deepEqual(await ack(readId),receipt);
 await assert.rejects(ack(readId,'receiver-two'),/receipt conflict/);assert.ok(await claim(readId));assert.equal(await claim(readId,'receiver-two'),null);
});
await check('READ_ONLY AFTER is discoverable and never wakes GPT',async()=>{
 await query("SELECT agent_dispatch_progress($1,'receiver-one','WORKING','{}')",[readId]);
 const r=(await query("SELECT agent_dispatch_finish($1,'receiver-one','COMPLETED','AFTER_ACCEPTANCE','read evidence','none',false,null) result",[readId]))[0].result;
 assert.equal(r.result_wake_queued,false);
 const after=(await query('SELECT * FROM work_log WHERE parent_assignment_id=$1',[readId]))[0];assert.equal(after.to_actor,'GPT');assert.equal(after.dispatch_kind,null);assert.equal(after.dispatch_context.lifecycle,'AFTER');assert.ok(after.dispatch_context.receipt.ack_at);
});
let writeId;
await check('WRITE verifies exact base/head and receives sole file ownership',async()=>{
 writeId=await assign('WRITE_OWNER','WRITE');
 await assert.rejects(query("SELECT agent_dispatch_ack($1,'receiver-one','session-fixture',$2,$3)",[writeId,sha,'b'.repeat(40)]),/head\/base mismatch/);
 await ack(writeId);assert.ok(await claim(writeId));
 const conflict=await assign('DIFFERENT_SCOPE_SAME_FILE','WRITE');assert.equal((await row(conflict)).dispatch_state,'DEFERRED');assert.match((await row(conflict)).dispatch_last_error,/file_conflict/);
 const prefix=await assign('DIRECTORY_CONFLICT','WRITE',governance,['test/**']);assert.match((await row(prefix)).dispatch_last_error,/file_conflict/);
 for(const [key,path,reason] of [['WILDCARD','test/*/**','write_path_invalid'],['DOT','test/./coordination-fixture.txt','write_path_invalid'],['CASE','TEST/coordination-fixture.txt','file_conflict'],['BARE_DIR','test','file_conflict'],['REPEATED_GLOB','test/**/**','write_path_invalid']]){
  const candidate=await assign('PATH_'+key,'WRITE',governance,[path]);assert.match((await row(candidate)).dispatch_last_error,new RegExp(reason));
 }
});
await check('tested evidence required; successful WRITE operates only on authorized fixture branch',async()=>{
 await assert.rejects(query("SELECT agent_dispatch_finish($1,'receiver-one','COMPLETED','AFTER','x','none',false,null)",[writeId]),/tested evidence required/);
 await query("SELECT agent_dispatch_progress($1,'receiver-one','WORKING','{}')",[writeId]);
 const shortened=new Date(Date.now()+60000);await query('UPDATE work_log SET dispatch_lease_expires_at=$2 WHERE id=$1',[writeId,shortened]);
 await query("SELECT agent_dispatch_progress($1,'receiver-one','WORKING','{}')",[writeId]);assert.ok(new Date((await row(writeId)).dispatch_lease_expires_at)>shortened);
 const directory=mkdtempSync(join(tmpdir(),'coordination-write-fixture-'));
 try {
  const git=(...args)=>execFileSync('git',args,{cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b',governance.branch);git('config','user.name','Isolated fixture');git('config','user.email','fixture@example.invalid');
  mkdirSync(join(directory,'test'));writeFileSync(join(directory,'test/coordination-fixture.txt'),'isolated accepted write\n');git('add','test/coordination-fixture.txt');git('commit','-m','isolated acceptance fixture');
  assert.equal(git('branch','--show-current'),governance.branch);assert.equal(git('show','--pretty=','--name-only','HEAD'),'test/coordination-fixture.txt');
 } finally {rmSync(directory,{recursive:true,force:true});}
 await query("SELECT agent_dispatch_progress($1,'receiver-one','TESTED',$2)",[writeId,{tests:['fixture write confined to test/coordination-fixture.txt'],branch:governance.branch,commit:sha}]);
 const r=(await query("SELECT agent_dispatch_finish($1,'receiver-one','COMPLETED','AFTER_TESTED','isolated fixture only','none',false,null) result",[writeId]))[0].result;
 assert.equal(r.result_wake_queued,false);assert.equal((await row(r.after_id)).dispatch_context.tests.length,1);
});
await check('lost sender response retries same ID; conflicting payload is rejected',async()=>{
 const id=await assign('IDEMPOTENT_READ');assert.equal(await assign('IDEMPOTENT_READ'),id);
 assert.equal((await query("SELECT count(*)::int n FROM work_log WHERE task_key='IDEMPOTENT_READ'"))[0].n,1);
 await assert.rejects(assign('IDEMPOTENT_READ','WRITE'),/payload_conflict/);
});
await check('unknown delivery timeout cannot create a second wake',async()=>{
 const id=await assign('TIMEOUT_READ');await query("UPDATE work_log SET dispatch_last_emitted_at=now()-interval '11 minutes' WHERE id=$1",[id]);
 const before=(await query('SELECT count(*)::int n FROM net.test_requests'))[0].n;await query('SELECT agent_dispatch_recover()');
 assert.equal((await row(id)).dispatch_last_error,'delivery_ack_timeout_unknown_outcome');assert.equal((await query('SELECT count(*)::int n FROM net.test_requests'))[0].n,before);
 assert.equal((await query('SELECT agent_dispatch_requeue($1) value',[id]))[0].value,false);
});
await check('expired WRITE lease requires reconciliation, not another writer',async()=>{
 const id=await assign('EXPIRED_WRITE','WRITE');await ack(id);await claim(id);await query("UPDATE work_log SET dispatch_lease_expires_at=now()-interval '1 second' WHERE id=$1",[id]);
 await query('SELECT agent_dispatch_recover()');assert.equal((await row(id)).dispatch_last_error,'write_lease_expired_requires_owner_reconciliation');assert.equal(await claim(id,'new-worker'),null);
 const other=await assign('CANNOT_REPLACE_EXPIRED_OWNER','WRITE');assert.match((await row(other)).dispatch_last_error,/file_conflict/);
});
await check('exhausted READ_ONLY lease produces passive AFTER in recovery',async()=>{
 const id=await assign('EXHAUSTED_READ');await ack(id);await claim(id);await query("UPDATE work_log SET dispatch_attempts=3,dispatch_lease_expires_at=now()-interval '1 second' WHERE id=$1",[id]);
 await query('SELECT agent_dispatch_recover()');const after=(await query('SELECT * FROM work_log WHERE parent_assignment_id=$1',[id]))[0];assert.equal(after.dispatch_kind,null);assert.equal(after.to_actor,'GPT');
});
await check('dependencies must be completed, no implicit approval from a name',async()=>{
 const pending=await assign('DEPENDENCY_PENDING');const id=await assign('DEPENDENT_WRITE','WRITE',{...governance,dependency_ids:[pending]});assert.match((await row(id)).dispatch_last_error,/dependency_not_accepted/);
 const blocked=await assign('COMPLETED_BUT_BLOCKED');await ack(blocked);await claim(blocked);
 const result=(await query("SELECT agent_dispatch_finish($1,'receiver-one','COMPLETED','AFTER_BLOCKER','cannot proceed','needs fix',false,null) result",[blocked]))[0].result;
 const dependent=await assign('DEPENDENCY_BLOCKER_REJECTED','WRITE',{...governance,dependency_ids:[result.after_id]});assert.match((await row(dependent)).dispatch_last_error,/dependency_not_accepted/);
});
await check('invalid governance cannot be released by requeue or changing status alone',async()=>{
 const id=await assign('UNAPPROVED_REQUEUE','WRITE',{...governance,authorization_ref:null});
 assert.equal((await query('SELECT agent_dispatch_requeue($1) value',[id]))[0].value,false);
 await query("UPDATE work_log SET dispatch_state='QUEUED',status='ASSIGNED' WHERE id=$1",[id]);
 assert.equal((await row(id)).dispatch_state,'DEFERRED');assert.equal((await row(id)).dispatch_last_request_id,null);
});
await check('v16 does not activate GPT or forward a user decision as an implicit WRITE grant',async()=>{
 const id=(await query("INSERT INTO work_log(task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,dispatch_kind,dispatch_state) VALUES('USER_DECISION','CLAUDE','GPT','READ_ONLY','decision','owner','ASSIGNMENT','QUEUED') RETURNING id"))[0].id;
 assert.equal((await row(id)).dispatch_state,'DEFERRED');assert.equal((await row(id)).dispatch_last_error,'activation_direction_unsupported_v16');
});
await check('one user decision reaches two owner scopes with separate real receiver receipts',async()=>{
 for(const owner of ['frame','icons']){
  const id=await assign('DECISION_123_OWNER_'+owner);await ack(id,owner+'-receiver');await claim(id,owner+'-receiver');
  assert.equal((await row(id)).dispatch_context.receipt.worker,owner+'-receiver');assert.equal((await row(id)).assignment_mode,'READ_ONLY');
 }
});
await db.close();console.log(JSON.stringify({passed,failed:0,liveDatabase:false,externalNetworkCalls:0}));
