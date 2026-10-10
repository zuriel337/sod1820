/** Real PostgreSQL, disposable local Docker only. No production URL/credentials. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const image='postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94';
const container=`sod-codex-claim-${randomUUID()}`;
const env={...process.env};
for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
function docker(args,input=''){
 return new Promise((resolve,reject)=>{
  const p=spawn('docker',['--host=unix:///var/run/docker.sock',...args],{env,stdio:['pipe','pipe','pipe']});
  let out='',err='';
  p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);
  p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(new Error(`local Docker exit ${code}: ${err}`)));
  p.stdin.on('error',()=>{});p.stdin.end(input);
 });
}
// TCP loopback excludes the entrypoint's temporary Unix-socket-only init server.
const sql=q=>docker(['exec','-i',container,'psql','-h','127.0.0.1','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],q);
const context={created_via:'work_log_assign_agent_v1',codex_workflow_mode:'EXECUTE_BOUNDED',
 codex_execution_mode:'offline_golden',idempotency_key:'SOD1820_E2E_README_FIXTURE_V1'};
async function seed({task='REMOTE_CODEX_EXECUTOR_BRIDGE_V1',actor='GPT',kind='ASSIGNMENT',ctx=null,state='QUEUED'}={}){
 const id=randomUUID();
 // Unique default per assignment: the new uniqueness check must not conflate
 // separate valid test jobs. Shared-key cases explicitly supply matching ctx.
 const scopedCtx=ctx??{...context,idempotency_key:'SOD1820_E2E_'+id.replaceAll('-','')};
 await sql(`insert into public.work_log(id,task_key,to_actor,assignment_mode,dispatch_kind,dispatch_state,dispatch_context)
 values('${id}','${task}','${actor}','WRITE','${kind}','${state}','${JSON.stringify(scopedCtx)}');`);
 return id;
}
const claim=(id,worker='CODEX_RUNNER:test',lease='120')=>`select public.agent_dispatch_claim('${id}','${worker}',${lease}) is not null;`;

test('canonical work_log one-shot claim on isolated PostgreSQL 17.6', {timeout:120000},async t=>{
 try{
  await docker(['run','--detach','--rm','--network','none','--name',container,
   '-e','POSTGRES_HOST_AUTH_METHOD=trust',image]);
  let ready=false;
  for(let i=0;i<40;i++){
   try{await sql('select 1;');ready=true;break;}catch{await new Promise(r=>setTimeout(r,250));}
  }
  assert.ok(ready,'isolated Postgres must start');
  await sql(await readFile(new URL('../tests/sql/codex-work-log-claim-baseline.sql',import.meta.url),'utf8'));

  await t.test('reproduces the live replay gap: requeue resets attempts and old claim accepts again',async()=>{
   const id=await seed();
   assert.equal(await sql(claim(id)),'t');
   await sql(`update work_log set dispatch_lease_expires_at=now()-interval '1 second' where id='${id}';`);
   assert.equal(await sql(`select agent_dispatch_requeue('${id}');`),'t');
   assert.equal(await sql(claim(id)),'t');
  });

  await sql(await readFile(new URL('../supabase/migrations/20261010172910_codex_work_log_one_shot_claim.sql',import.meta.url),'utf8'));

  await t.test('two real concurrent connections obtain exactly one claim/consumption',async()=>{
   const id=await seed();
   const results=await Promise.all([
    sql(`begin; ${claim(id,'CODEX_RUNNER:first')} select pg_sleep(0.4); commit;`),
    sql(claim(id,'CODEX_RUNNER:second')),
   ]);
   assert.deepEqual(results.sort(),['f','t']);
   assert.equal(await sql(`select dispatch_attempts=1 and dispatch_context->'codex_consumption'->>'lease_owner'=dispatch_lease_owner
    and dispatch_context->'codex_consumption'->>'idempotency_key'=dispatch_context->>'idempotency_key'
    and dispatch_lease_expires_at between now()+interval '118 seconds' and now()+interval '120 seconds'
    from work_log where id='${id}';`),'t');
  });

  await t.test('expired lease, lost response and actual requeue cannot consume approval twice',async()=>{
   const id=await seed();
   assert.equal(await sql(claim(id,'CODEX_RUNNER:original')),'t');
   await sql(`update work_log set dispatch_lease_expires_at=now()-interval '1 second' where id='${id}';`);
   assert.equal(await sql(claim(id,'CODEX_RUNNER:retry')),'f');
   assert.equal(await sql(`select agent_dispatch_requeue('${id}');`),'t');
   assert.equal(await sql(`select dispatch_attempts from work_log where id='${id}';`),'0');
   assert.equal(await sql(claim(id,'CODEX_RUNNER:requeue')),'f');
   assert.equal(await sql(`select dispatch_context->'codex_consumption'->>'lease_owner' from work_log where id='${id}';`),'CODEX_RUNNER:original');
  });

  await t.test('same one-shot key cannot be consumed by two distinct work_log assignment IDs',async()=>{
    const shared={...context,idempotency_key:'SOD1820_E2E_CROSSROW_SAMEKEY_001'};
    const a=await seed({ctx:shared}),b=await seed({ctx:shared});
    assert.equal(await sql(claim(a,'CODEX_RUNNER:first')),'t');
    assert.equal(await sql(claim(b,'CODEX_RUNNER:replay')),'f');
    assert.equal(await sql(`select count(*) from work_log
      where dispatch_context#>>'{codex_consumption,idempotency_key}'='${shared.idempotency_key}';`),'1');
    assert.equal(await sql(`select dispatch_state from work_log where id='${b}';`),'QUEUED');
  });

  await t.test('two concurrent distinct IDs with the same key cannot both claim',async()=>{
    const shared={...context,idempotency_key:'SOD1820_E2E_CROSSROW_RACEKEY_002'};
    const a=await seed({ctx:shared}),b=await seed({ctx:shared});
    const out=await Promise.allSettled([
      sql(claim(a,'CODEX_RUNNER:race-a')),
      sql(claim(b,'CODEX_RUNNER:race-b'))
    ]);
    assert.equal(out.filter(x=>x.status==='fulfilled'&&x.value==='t').length,1);
    for(const item of out){
      if(item.status==='fulfilled')assert.ok(['t','f'].includes(item.value));
      else assert.match(String(item.reason),/duplicate key|unique constraint|work_log_codex_consumed_idempotency_ux/);
    }
    assert.equal(await sql(`select count(*) from work_log
      where dispatch_context#>>'{codex_consumption,idempotency_key}'='${shared.idempotency_key}';`),'1');
  });

  await t.test('default lease, paid mode, missing context, prior attempt, backoff and null marker fail closed',async()=>{
   const id=await seed();
   assert.equal(await sql(claim(id,'CODEX_RUNNER:test','null')),'f');
   assert.equal(await sql(`select agent_dispatch_claim('${id}','CODEX_RUNNER:test') is not null;`),'f');
   for(const ctx of [{},{...context,codex_execution_mode:'paid'},{...context,codex_consumption:null}]){
    assert.equal(await sql(claim(await seed({ctx}))),'f');
   }
   await sql(`update work_log set dispatch_attempts=1 where id='${id}';`);
   assert.equal(await sql(claim(id)),'f');
   await sql(`update work_log set dispatch_attempts=0,dispatch_next_attempt_at=now()+interval '1 hour' where id='${id}';`);
   assert.equal(await sql(claim(id)),'f');
  });

  await t.test('existing Claude, generic GPT and RESULT_WAKE semantics are preserved',async()=>{
   for(const spec of [{task:'EXISTING_CLAUDE_TASK',actor:'CLAUDE',state:'FIRE_REQUESTED'},
    {actor:'CLAUDE'},{task:'EXISTING_GPT_TASK',state:'SESSION_STARTED'},{kind:'RESULT_WAKE'}]){
    const id=await seed(spec);
    assert.equal(await sql(claim(id,'EXISTING_WORKER','900')),'t');
    assert.equal(await sql(`select not(dispatch_context ? 'codex_consumption') from work_log where id='${id}';`),'t');
    await sql(`update work_log set dispatch_lease_expires_at=now()-interval '1 second' where id='${id}';`);
    assert.equal(await sql(claim(id,'EXISTING_RETRY','900')),'t');
   }
  });

  await t.test('consumed expired Codex lease terminalizes through ONE canonical AFTER and never loops',async()=>{
    const id=await seed();
    await sql(`update work_log set from_actor='GPT',assignment_scope='README-only fixture',
      primary_owner='inter_agent_coordination_law v13',release_authorization_state='BRANCH_ONLY_NO_MERGE_NO_DEPLOY'
      where id='${id}';`);
    assert.equal(await sql(claim(id,'CODEX_RUNNER:expired')),'t');
    await sql(`update work_log set dispatch_lease_expires_at=now()-interval '1 second' where id='${id}';`);
    await sql('select public.agent_dispatch_recover();');
    assert.equal(await sql(`select dispatch_state from work_log where id='${id}';`),'FAILED');
    assert.equal(await sql(`select dispatch_last_error from work_log where id='${id}';`),'codex_consumed_lease_expired');
    assert.equal(await sql(`select count(*) from work_log
      where parent_assignment_id='${id}' and status='AFTER_CODEX_ONE_SHOT_LEASE_EXPIRED';`),'1');
    assert.equal(await sql(`select count(*) from work_log
      where parent_assignment_id='${id}' and dispatch_kind='RESULT_WAKE';`),'0',
      'expired OFFLINE Golden must not automatically trigger potentially billed GPT wake');
    await sql('select public.agent_dispatch_recover();');
    assert.equal(await sql(`select count(*) from work_log
      where parent_assignment_id='${id}';`),'1');
    assert.equal(await sql(claim(id,'CODEX_RUNNER:no-retry')),'f');
    assert.equal(await sql(`select dispatch_context ? 'codex_consumption' from work_log where id='${id}';`),'t');
  });

  await t.test('expired normal Claude lease still returns to existing RETRY_WAIT flow',async()=>{
    const id=await seed({task:'EXISTING_CLAUDE_GENERAL',actor:'CLAUDE'});
    assert.equal(await sql(claim(id,'CLAUDE_RUNNER:original','900')),'t');
    await sql(`update work_log set dispatch_lease_expires_at=now()-interval '1 second' where id='${id}';`);
    await sql('select public.agent_dispatch_recover();');
    assert.equal(await sql(`select dispatch_state from work_log where id='${id}';`),'RETRY_WAIT');
    assert.equal(await sql(`select dispatch_last_error from work_log where id='${id}';`),'stale_lease_recovered');
  });

  await t.test('ordinary Claude finish still queues the canonical GPT result wake',async()=>{
    const id=await seed({task:'EXISTING_CLAUDE_FINISH',actor:'CLAUDE'});
    await sql(`update work_log set from_actor='GPT',assignment_scope='bounded Claude result' where id='${id}';`);
    assert.equal(await sql(claim(id,'CLAUDE_RUNNER:normal','900')),'t');
    assert.equal(await sql(`select agent_dispatch_finish('${id}','CLAUDE_RUNNER:normal',
      'COMPLETED','CLAUDE_COMPLETE','normal result',null,false,null)->>'state';`),'COMPLETED');
    assert.equal(await sql(`select count(*) from work_log
      where parent_assignment_id='${id}' and dispatch_kind='RESULT_WAKE' and to_actor='GPT';`),'1');
  });

  await t.test('one poisoned Codex recovery defers only itself; ordinary Claude still recovers',async()=>{
    await sql(`alter table work_log add constraint codex_recovery_poison_fixture
      check (not (status='AFTER_CODEX_ONE_SHOT_LEASE_EXPIRED' and assignment_scope='POISON_SCOPE'));`);
    const bad=await seed(),other=await seed({task:'EXISTING_CLAUDE_AFTER_POISON',actor:'CLAUDE'});
    await sql(`update work_log set assignment_scope='POISON_SCOPE',from_actor='GPT' where id='${bad}';`);
    assert.equal(await sql(claim(bad,'CODEX_RUNNER:poison')),'t');
    assert.equal(await sql(claim(other,'CLAUDE_RUNNER:normal','900')),'t');
    await sql(`update work_log set dispatch_lease_expires_at=now()-interval '1 second'
      where id in ('${bad}','${other}');`);
    await sql('select agent_dispatch_recover();');
    assert.equal(await sql(`select dispatch_state from work_log where id='${bad}';`),'DEFERRED');
    assert.equal(await sql(`select dispatch_last_error from work_log where id='${bad}';`),
      'codex_one_shot_recovery_terminalization_failed');
    assert.equal(await sql(`select dispatch_context ? 'codex_consumption' from work_log where id='${bad}';`),'t');
    assert.equal(await sql(`select count(*) from work_log where parent_assignment_id='${bad}';`),'0');
    assert.equal(await sql(claim(bad,'CODEX_RUNNER:retry')),'f');
    assert.equal(await sql(`select dispatch_state from work_log where id='${other}';`),'RETRY_WAIT');
  });

  await t.test('claim stays service-role-only with fixed search_path and SECURITY DEFINER',async()=>{
   assert.equal(await sql(`select has_function_privilege('anon','public.agent_dispatch_claim(uuid,text,integer)','EXECUTE'),
    has_function_privilege('authenticated','public.agent_dispatch_claim(uuid,text,integer)','EXECUTE'),
    has_function_privilege('service_role','public.agent_dispatch_claim(uuid,text,integer)','EXECUTE');`),'f|f|t');
   assert.equal(await sql(`select prosecdef and proconfig=array['search_path=public']
    from pg_proc where oid='public.agent_dispatch_claim(uuid,text,integer)'::regprocedure;`),'t');
  });
 }finally{
  await docker(['rm','--force',container]);
 }
});
