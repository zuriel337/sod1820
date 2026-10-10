import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {claimOfflineGoldenOnce,verifySignedAssignment,checkTrustedEvidence,goldenAcceptance} from './codex-unattended-golden-contract.mjs';

const now=Date.parse('2026-10-10T18:00:00Z');
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const publicKeyPem=publicKey.export({format:'pem',type:'spki'});
const job={contract:'REMOTE_CODEX_EXECUTOR_BRIDGE_V1',actor:'GPT',
 task_key:'REMOTE_CODEX_EXECUTOR_BRIDGE_V1',assignment_id:'d57cad12-2b5d-4a0f-8e33-48d1947bd133',
 idempotency_key:'SOD1820_E2E_README_FIXTURE_V1',mode:'offline_golden',workflow_mode:'EXECUTE_BOUNDED',
 production_write_requested:false,issued_at_ms:now-1000,expires_at_ms:now+300000,timeout_ms:90000,attempt:1};
const signed=(j=job)=>{
 const payload_b64=Buffer.from(JSON.stringify(j)).toString('base64url');
 return {payload_b64,signature_b64:sign(null,Buffer.from(payload_b64),privateKey).toString('base64url')};
};
const row=(args,at=now)=>({id:job.assignment_id,task_key:job.task_key,to_actor:'GPT',
 dispatch_kind:'ASSIGNMENT',assignment_mode:'WRITE',archived:false,superseded_by_id:null,
 dispatch_state:'CLAIMED',dispatch_attempts:1,dispatch_lease_owner:args.p_worker,
 dispatch_lease_expires_at:new Date(at+120000).toISOString(),
 dispatch_context:{created_via:'work_log_assign_agent_v1',codex_workflow_mode:'EXECUTE_BOUNDED',codex_execution_mode:'offline_golden',idempotency_key:job.idempotency_key,
  codex_consumption:{version:1,idempotency_key:job.idempotency_key,lease_owner:args.p_worker,consumed_at:new Date(at).toISOString()}}});
const invoke=(rpc,extra={})=>claimOfflineGoldenOnce({envelope:signed(),publicKeyPem,clock:()=>now,rpc,...extra});

test('requests the existing atomic RPC with explicit 120-second lease and unique worker token',async()=>{
 const calls=[];
 const rpc=async(name,args)=>{calls.push({name,args});return {data:row(args),error:null};};
 const a=await invoke(rpc),b=await invoke(rpc);
 assert.equal(a.status,'OFFLINE_CANONICAL_CLAIM_ACQUIRED');
 assert.equal(a.executed,false);
 assert.equal(a.paidRequest,false);
 assert.notEqual(a.lease_owner,b.lease_owner);
 assert.deepEqual(calls.map(({name,args})=>({name,id:args.p_assignment_id,seconds:args.p_lease_seconds})),
  Array(2).fill({name:'agent_dispatch_claim',id:job.assignment_id,seconds:120}));
 assert.equal(a.lease_valid_until_ms,now+120000);
});

// This is an RPC response fixture, not a PostgreSQL concurrency proof. The live
// atomic UPDATE/RETURNING and ACL were inspected read-only; no production claims.
test('concurrent delivery accepts only the one successful canonical first claim',async()=>{
 let claimed=false;
 const rpc=async(_name,args)=>{
  if(claimed)return {data:null,error:null};
  claimed=true;
  await Promise.resolve();
  return {data:row(args),error:null};
 };
 const results=await Promise.all(Array.from({length:10},()=>invoke(rpc)));
 assert.equal(results.filter(r=>r.status==='OFFLINE_CANONICAL_CLAIM_ACQUIRED').length,1);
 assert.equal(results.filter(r=>r.reason==='LEASE_NOT_ACQUIRED').length,9);
});

test('expired lease reclaim cannot authorize another execution of the assignment',async()=>{
 let attempts=0,time=now;
 const rpc=async(_name,args)=>({data:{...row(args,time),dispatch_attempts:++attempts}});
 assert.equal((await invoke(rpc,{clock:()=>time})).status,'OFFLINE_CANONICAL_CLAIM_ACQUIRED');
 time+=121000;
 assert.equal((await invoke(rpc,{clock:()=>time})).reason,'CANONICAL_ATTEMPT_ALREADY_CONSUMED');
});

test('lost claim response burns the first attempt and never retries the RPC automatically',async()=>{
 let attempts=0;
 const rpc=async(_name,args)=>{
  if(++attempts===1)throw new Error('SENSITIVE_TRANSPORT_DETAILS');
  return {data:{...row(args),dispatch_attempts:attempts}};
 };
 const first=await invoke(rpc);
 assert.equal(first.reason,'CANONICAL_CLAIM_UNAVAILABLE');
 assert.equal(attempts,1);
 assert.ok(!JSON.stringify(first).includes('SENSITIVE_TRANSPORT_DETAILS'));
 assert.equal((await invoke(rpc)).reason,'CANONICAL_ATTEMPT_ALREADY_CONSUMED');
});

test('paid jobs, signed retries and invalid signatures never reach the RPC',async()=>{
 let calls=0;
 const rpc=async()=>{calls++;throw Error('must not call');};
 assert.equal((await invoke(rpc,{envelope:signed({...job,mode:'paid'})})).reason,'GOLDEN_FIXTURE_REJECTS_PAID_MODE');
 assert.equal((await invoke(rpc,{envelope:signed({...job,attempt:2})})).reason,'ONE_SHOT_ATTEMPT_REQUIRED');
 assert.equal((await invoke(rpc,{envelope:{...signed(),payload_b64:signed({...job,attempt:2}).payload_b64}})).reason,'SIGNATURE_INVALID');
 assert.equal(calls,0);
});

test('legacy signed/evidence gates reject missing and non-finite clocks before any claim',async()=>{
 for(const invalid of [undefined,null,NaN,Infinity,-1,'1791655200000']){
  assert.equal(verifySignedAssignment(signed(),publicKeyPem,invalid).reason,'INVALID_CLOCK');
  assert.equal(checkTrustedEvidence(job,{},invalid).reason,'INVALID_CLOCK');
  let calls=0;
  assert.equal((await invoke(async()=>{calls++;},{clock:()=>invalid})).reason,'INVALID_CLOCK');
  assert.equal(calls,0);
 }
});

test('rechecks clock/expiry and remaining lease after delayed RPC response',async()=>{
 let time=now;
 const rpc=async(_name,args)=>{time+=40000;return {data:row(args)};};
 assert.equal((await invoke(rpc,{clock:()=>time})).reason,'CANONICAL_CLAIM_MISMATCH');
 time=now;
 assert.equal((await invoke(async(_name,args)=>{time+=301000;return {data:row(args)};},{clock:()=>time})).reason,'INVALID_SIGNED_ASSIGNMENT');
});

test('does not reverify a caller-mutated envelope after await',async()=>{
 const envelope=signed();
 let time=now;
 const result=await invoke(async(_name,args)=>{
  time+=301000;
  Object.assign(envelope,signed({...job,issued_at_ms:time,expires_at_ms:time+300000}));
  return {data:row(args,time)};
 },{envelope,clock:()=>time});
 assert.equal(result.reason,'INVALID_SIGNED_ASSIGNMENT');
});

test('rejects malformed/mismatched canonical receipts and default 900-second leases',async()=>{
 const mutations=[
  {id:'a'.repeat(36)},{task_key:'OTHER_TASK'},{to_actor:'CLAUDE'},
  {dispatch_kind:'RESULT_WAKE'},{assignment_mode:'READ_ONLY'},{archived:true},
  {superseded_by_id:'superseded'},{dispatch_state:'QUEUED'},{dispatch_lease_owner:'OTHER_WORKER'},
  {dispatch_lease_expires_at:new Date(now+900000).toISOString()},
  {dispatch_lease_expires_at:new Date(now+89999).toISOString()},
  {dispatch_lease_expires_at:'invalid'},
 ];
 for(const mutation of mutations){
  const result=await invoke(async(_name,args)=>({data:{...row(args),...mutation}}));
  assert.equal(result.reason,'CANONICAL_CLAIM_MISMATCH',JSON.stringify(mutation));
 }
 for(const attempts of [undefined,null,0,2,3,'1']){
  assert.equal((await invoke(async(_name,args)=>({data:{...row(args),dispatch_attempts:attempts}}))).reason,'CANONICAL_ATTEMPT_ALREADY_CONSUMED');
 }
});

test('unpatched live RPC and reset attempt counters cannot bypass durable consumption',async()=>{
 for(const mutate of [
  c=>{delete c.codex_consumption;},
  c=>{c.codex_consumption=null;},
  c=>{c.codex_consumption.lease_owner='PREVIOUS_CLAIM';},
  c=>{c.codex_consumption.idempotency_key='ANOTHER_APPROVAL';},
  c=>{c.codex_consumption.consumed_at='invalid';},
 ]){
  const result=await invoke(async(_name,args)=>{const a=row(args);mutate(a.dispatch_context);return {data:a};});
  assert.equal(result.reason,'CANONICAL_CONSUMPTION_UNVERIFIED');
 }
 for(const key of ['created_via','codex_workflow_mode','codex_execution_mode','idempotency_key']){
  const result=await invoke(async(_name,args)=>{const a=row(args);a.dispatch_context[key]='wrong';return {data:a};});
  assert.equal(result.reason,'CANONICAL_CLAIM_MISMATCH');
 }
});

test('RPC error metadata, raw rows and exception messages never escape',async()=>{
 const result=await invoke(async()=>({error:{message:'SENSITIVE_TRANSPORT_DETAILS'},data:{private:'SENSITIVE_ROW'}}));
 assert.deepEqual(result,{status:'BLOCKED',reason:'CANONICAL_CLAIM_UNAVAILABLE',executed:false});
 assert.equal((await claimOfflineGoldenOnce({})).reason,'TRUSTED_PORTS_MISSING');
});

test('existing mocked Golden consumes the canonical claim receipt and binds the reread lease',async()=>{
 let a=null,runs=0,finishes=0,wakes=0;
 const envelope=signed();
 const rpc=async(_name,args)=>{
  if(a)return {data:null};
  a=row(args);
  return {data:a};
 };
 const adapter={
  claim:()=>invoke(rpc,{envelope}),
  async readAuthoritativeEvidence(){return {identity:'trusted-work-log-adapter',workflow_mode:'EXECUTE_BOUNDED',
   assignment_mode:a.assignment_mode,assignment_id:a.id,one_active_writer_verified:true,owner_verified:true,
   lease_owner:a.dispatch_lease_owner,lease_valid_until_ms:Date.parse(a.dispatch_lease_expires_at),
   dispatch_attempts:a.dispatch_attempts,idempotency_key:a.dispatch_context.idempotency_key,checked_at_ms:now};},
  async finish(){finishes++;return 'COMMITTED_ONCE';},
  async wakeGPT(){wakes++;return 'ACK_ONCE';},
 };
 const executor={async runFixture(){runs++;return {tests_passed:true,commit_sha:'a'.repeat(40),production_changed:false,paid_model_calls:0};}};
 const input={envelope,publicKeyPem,atMs:now,adapter,executor};
 assert.equal((await goldenAcceptance(input)).status,'GOLDEN_SIMULATED_PASS');
 assert.equal((await goldenAcceptance(input)).reason,'LEASE_NOT_ACQUIRED');
 assert.deepEqual({runs,finishes,wakes},{runs:1,finishes:1,wakes:1});
 const evidence=await adapter.readAuthoritativeEvidence();
 const claim={status:'OFFLINE_CANONICAL_CLAIM_ACQUIRED',assignment_id:job.assignment_id,task_key:job.task_key,
  idempotency_key:job.idempotency_key,dispatch_attempts:1,lease_owner:a.dispatch_lease_owner,lease_valid_until_ms:now+120000};
 assert.equal(checkTrustedEvidence(job,{...evidence,lease_owner:'OTHER_WORKER'},now,claim).status,'BLOCKED');
 assert.equal(checkTrustedEvidence(job,{...evidence,dispatch_attempts:2},now,claim).reason,'CANONICAL_CLAIM_MISMATCH');
 assert.equal(checkTrustedEvidence(job,{...evidence,lease_valid_until_ms:now+119000},now,claim).reason,'CANONICAL_CLAIM_MISMATCH');
});
