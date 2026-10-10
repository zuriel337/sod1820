import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {assessAutoWake,assessResultWake,verifyOperatorPermit} from './codex-auto-wake-contract.mjs';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pub=publicKey.export({format:'pem',type:'spki'});
const now='2026-10-10T16:00:00Z';
const id='f6055bb4-5958-40b9-a398-73c7d95848ec';
const scope='README.md only; isolated golden fixture; no production';
const base=()=>({
 id,task_key:'SOD1820_CODEX_GOLDEN_OFFLINE_V1',from_actor:'GPT',to_actor:'GPT',
 assignment_mode:'WRITE',assignment_scope:scope,
 release_authorization_state:'BRANCH_ONLY_NO_MERGE_NO_DEPLOY',
 primary_owner:'inter_agent_coordination_law v13',dispatch_kind:'ASSIGNMENT',
 dispatch_state:'QUEUED',dispatch_attempts:0,dispatch_next_attempt_at:null,
 dispatch_lease_owner:null,dispatch_lease_expires_at:null,archived:false,superseded_by_id:null,
 dispatch_context:{created_via:'work_log_assign_agent_v1',github_paths:['README.md'],codex_workflow_mode:'EXECUTE_BOUNDED'}
});
const grantPayload=()=>({
 version:1,issuer:'SOD1820_TRUSTED_OPERATOR',action:'CODEX_GOLDEN_ONCE',workflow_mode:'EXECUTE_BOUNDED',
 approval_id:'8289e9bf-41c0-443c-b187-43ce13fb8530',assignment_id:id,
 task_key:'SOD1820_CODEX_GOLDEN_OFFLINE_V1',scope,
 project_id:'linswmnnkjxvweumprav',branch:'codex/golden-readme-smoke',
 allowed_files:['README.md'],max_run_cents:25,issued_at:'2026-10-10T15:59:00Z',expires_at:'2026-10-10T16:10:00Z'
});
function signed(payload=grantPayload()){
 const payload_b64=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
 return {payload_b64,signature_b64:sign(null,Buffer.from(payload_b64,'utf8'),privateKey).toString('base64url')};
}
const provider=()=>({evidence_source:'TRUSTED_PROVIDER_ADAPTER',hard_cap_verified:true,remaining_cents:200,max_agent_turns:1,max_parallel_runs:1});
const run=(a=base(),p=signed(),proof=provider(),time=now)=>assessAutoWake({assignment:a,permit:p,publicKeyPem:pub,provider:proof,now:time});
test('signed golden fixture is OFFLINE eligible but NEVER executable',()=>{
 const result=run();
 assert.equal(result.status,'OFFLINE_POLICY_ELIGIBLE_NOT_EXECUTABLE');
 assert.equal(result.executed,false);assert.equal(result.paidRequest,false);
});
test('signature verification rejects tampered and wrong-key grants',()=>{
 const permit=signed();
 assert.equal(verifyOperatorPermit(permit,pub),true);
 const fake=structuredClone(permit);fake.payload_b64=Buffer.from(JSON.stringify({...grantPayload(),max_run_cents:1}),'utf8').toString('base64url');
 assert.equal(verifyOperatorPermit(fake,pub),false);
 assert.equal(run(base(),fake).reason,'PERMIT_SIGNATURE_UNVERIFIED');
 const other=generateKeyPairSync('ed25519').publicKey.export({format:'pem',type:'spki'});
 assert.equal(verifyOperatorPermit(permit,other),false);
});
const cases=[
 ['missing assignment',()=>null,'MISSING_CANONICAL_ASSIGNMENT'],
 ['wrong target',a=>({...a,to_actor:'CLAUDE'}),'NOT_GPT_ASSIGNMENT'],
 ['nonassignment',a=>({...a,dispatch_kind:'RESULT_WAKE'}),'NOT_GPT_ASSIGNMENT'],
 ['archived',a=>({...a,archived:true}),'STALE_ASSIGNMENT'],
 ['duplicate claim',a=>({...a,dispatch_state:'CLAIMED'}),'NOT_CLAIMABLE'],
 ['already finished',a=>({...a,dispatch_state:'COMPLETED'}),'NOT_CLAIMABLE'],
 ['retry cap',a=>({...a,dispatch_attempts:3}),'RETRY_EXHAUSTED'],
 ['backoff',a=>({...a,dispatch_next_attempt_at:'2026-10-10T16:02:00Z'}),'BACKOFF_ACTIVE'],
 ['active lease',a=>({...a,dispatch_lease_owner:'other'}),'ACTIVE_OR_STALE_LEASE_REQUIRES_CANONICAL_RECOVERY'],
 ['privileged release',a=>({...a,release_authorization_state:'PRODUCTION'}),'RELEASE_ENVELOPE_INSUFFICIENT'],
 ['unsigned assignment origin',a=>({...a,dispatch_context:{github_paths:['README.md']}}),'ASSIGNMENT_ORIGIN_UNVERIFIED'],
 ['unsafe file expansion',a=>({...a,dispatch_context:{created_via:'work_log_assign_agent_v1',github_paths:['README.md','supabase/functions/ai-analyze/index.ts'],codex_workflow_mode:'EXECUTE_BOUNDED'}}),'GOLDEN_FILE_SCOPE_MISMATCH']
];
for(const [name,mutate,reason] of cases)test('reject '+name,()=>{
 const a=base();assert.equal(run(mutate(a)).reason,reason);
});
test('Golden cannot execute a recon assignment or a permit with mismatched mode',()=>{
 const a=base();a.dispatch_context.codex_workflow_mode='RECON_READ_ONLY';
 assert.equal(run(a).reason,'GOLDEN_EXECUTION_REQUIRES_BOUNDED_MODE');
 const p=grantPayload();p.workflow_mode='RECON_READ_ONLY';
 assert.equal(run(base(),signed(p)).reason,'PERMIT_WORKFLOW_MODE_MISMATCH');
});
test('permit must use raw signed bytes and reject unsafe clock behavior',()=>{
  const reversed=Object.fromEntries(Object.entries(grantPayload()).reverse());
  assert.equal(verifyOperatorPermit(signed(reversed),pub),true);
  const malformed=signed();
  malformed.payload_b64=malformed.payload_b64+'A';
  assert.equal(verifyOperatorPermit(malformed,pub),false);
  const future={...grantPayload(),issued_at:'2026-10-10T16:05:00Z',expires_at:'2026-10-10T16:10:00Z'};
  assert.equal(run(base(),signed(future)).reason,'PERMIT_EXPIRED_OR_TOO_LONG');
  assert.equal(assessAutoWake({assignment:base(),permit:signed(),publicKeyPem:pub,provider:provider()}).reason,'INVALID_CLOCK');
  const missingIssue=grantPayload();delete missingIssue.issued_at;
  assert.equal(run(base(),signed(missingIssue)).reason,'PERMIT_EXPIRED_OR_TOO_LONG');
});
test('permit binds assignment, owner scope, repo branch, and fixed file list',()=>{
 const p=grantPayload();p.scope='all of repo';
 assert.equal(run(base(),signed(p)).reason,'PERMIT_ASSIGNMENT_MISMATCH');
 const p2=grantPayload();p2.branch='main';
 assert.equal(run(base(),signed(p2)).reason,'UNSAFE_TARGET_BRANCH');
 const p3=grantPayload();p3.allowed_files=['README.md','src/main.ts'];
 assert.equal(run(base(),signed(p3)).reason,'PERMIT_FILE_SCOPE_MISMATCH');
});
test('expired/oversized operator authorization blocked',()=>{
 assert.equal(run(base(),signed(),provider(),'2026-10-10T16:21:00Z').reason,'PERMIT_EXPIRED_OR_TOO_LONG');
 const p=grantPayload();p.expires_at='2026-10-10T18:00:00Z';
 assert.equal(run(base(),signed(p)).reason,'PERMIT_EXPIRED_OR_TOO_LONG');
});
test('provider evidence, max-cost, one-turn/one-worker guard fail closed',()=>{
 const p=provider();p.hard_cap_verified=false;
 assert.equal(run(base(),signed(),p).reason,'PROVIDER_HARD_BUDGET_UNVERIFIED');
 const p2=provider();p2.remaining_cents=3;
 assert.equal(run(base(),signed(),p2).reason,'PROVIDER_HARD_BUDGET_UNVERIFIED');
 const p3=provider();p3.max_agent_turns=3;
 assert.equal(run(base(),signed(),p3).reason,'UNBOUNDED_EXECUTION');
 const grant=grantPayload();grant.max_run_cents=101;
 assert.equal(run(base(),signed(grant)).reason,'INVALID_MAX_PAID_BUDGET');
});
test('claim and retry/idempotency are canonical RPC responsibilities, never local permission',()=>{
 const a=base();
 assert.equal(run(a).status,'OFFLINE_POLICY_ELIGIBLE_NOT_EXECUTABLE');
 a.dispatch_state='CLAIMED';a.dispatch_lease_owner='existing-worker';
 assert.equal(run(a).reason,'NOT_CLAIMABLE');
 a.dispatch_state='RETRY_WAIT';a.dispatch_lease_owner=null;a.dispatch_attempts=1;
 a.dispatch_next_attempt_at='2026-10-10T16:05:00Z';
 assert.equal(run(a).reason,'BACKOFF_ACTIVE');
 assert.equal(run(a,signed(),provider(),'2026-10-10T16:06:00Z').status,'OFFLINE_POLICY_ELIGIBLE_NOT_EXECUTABLE');
 a.dispatch_attempts=3;
 assert.equal(run(a,signed(),provider(),'2026-10-10T16:06:00Z').reason,'RETRY_EXHAUSTED');
});
test('existing AFTER creates a queued request, not proof of GPT wake',()=>{
 const a=base();
 const after={parent_assignment_id:a.id,task_key:a.task_key,to_actor:'GPT',dispatch_kind:'RESULT_WAKE',dispatch_state:'QUEUED'};
 assert.equal(assessResultWake({original:a,after}).status,'RESULT_WAKE_QUEUED_TRANSPORT_UNVERIFIED');
 after.dispatch_state='DEFERRED';
 assert.equal(assessResultWake({original:a,after}).reason,'RESULT_WAKE_NOT_IN_CANONICAL_LEDGER');
});
console.log('SOD1820_OFFLINE_AUTO_WAKE_FIXTURE_PASS_NO_PAID_CALL');
