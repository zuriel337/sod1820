import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {RECON_READ_ONLY,EXECUTE_BOUNDED} from './codex-workflow-modes.mjs';
const script='scripts/isolated-codex-executor-prototype.mjs';
const now='2026-10-10T16:00:00Z',sha='a'.repeat(40),owner='inter_agent_coordination_law v13';
const make=(mode=RECON_READ_ONLY)=>({
 workflow_mode:mode,actor:'GPT',task_key:'SOD1820_CODEX_MODE_FIXTURE',scope:'README.md only',prompt:'Inspect the README only',
 risk:'low',production_write_requested:false,now,
 source:{origin:'PRIVILEGED_CANONICAL_READ',verified_owner:true,main_sha:sha,observed_at:now},
 assignment:{
   id:'2156e3ad-c661-438f-ab6b-ae623cfa734b',task_key:'SOD1820_CODEX_MODE_FIXTURE',
   to_actor:'GPT',dispatch_kind:'ASSIGNMENT',dispatch_state:'QUEUED',
   primary_owner:owner,assignment_scope:'README.md only',
   assignment_mode:mode===RECON_READ_ONLY?'READ_ONLY':'WRITE',
   release_authorization_state:'BRANCH_ONLY_NO_MERGE_NO_DEPLOY',
   dispatch_context:{
     codex_workflow_mode:mode,codex_intent_tags:mode===RECON_READ_ONLY?['ARCHITECTURE']:['BOUNDED'],
     codex_no_write:mode===RECON_READ_ONLY,codex_no_production_write:true,
     codex_allowed_write_paths:mode===RECON_READ_ONLY?[]:['README.md'],
     github_paths:mode===RECON_READ_ONLY?[]:['README.md']
   }
 },
 plan:{owner_decision:owner,branch:'codex/golden-readme-smoke',allowed_paths:['README.md'],
   dependencies:[],stop_condition:'stop on drift',verification:'README fixture test'}
});
function run(job,args=[],env={}){
 const res=spawnSync(process.execPath,[script,...args],{
  input:JSON.stringify(job),encoding:'utf8',env:{...process.env,...env},timeout:3000
 });
 assert.equal(res.error,undefined);
 const rows=res.stdout.trim().split('\n').map(x=>JSON.parse(x));
 return {exit:res.status,last:rows.at(-1),stderr:res.stderr};
}
assert.equal(run(make()).last.status,'DRY_RUN_ONLY');
assert.equal(run(make()).last.workflow_mode,RECON_READ_ONLY);
assert.equal(run(make()).last.read_only,true);
assert.deepEqual(run(make()).last.allowed_write_paths,[]);
assert.equal(run(make(EXECUTE_BOUNDED)).last.policyStatus,'EXECUTE_BOUNDED_POLICY_READY_NO_EXECUTION');
assert.equal(run({...make(),workflow_mode:'AUTO'}).last.reason,'EXPLICIT_CODEX_WORKFLOW_MODE_REQUIRED');
assert.equal(run({...make(),actor:'CLAUDE'}).last.reason,'UNKNOWN_COORDINATOR');
assert.equal(run({...make(),scope:'all source'}).last.reason,'ASSIGNMENT_PROMPT_OR_SCOPE_MISMATCH');
assert.equal(run({...make(),production_write_requested:true}).last.reason,'PRODUCTION_WRITE_FORBIDDEN');
const claimed=make();claimed.assignment.dispatch_state='CLAIMED';
assert.equal(run(claimed).last.reason,'ASSIGNMENT_NOT_CURRENT_OR_AVAILABLE');
const scoped=make(EXECUTE_BOUNDED);scoped.assignment.dispatch_context.codex_discovered_risks=['NEW_CONSUMER'];
assert.equal(run(scoped).last.reason,'STOP_AND_RECON_NEW_BLAST_RADIUS');
const forged=make(EXECUTE_BOUNDED);
forged.approval_token='forged';forged.provider_hard_limit_verified=true;forged.paid_run_approved=true;
const result=run(forged,['--live'],{
 SOD_EXECUTOR_TRUSTED_GATEWAY:'VERIFIED_AND_DEPLOYED',
 OPENAI_API_KEY:'INVALID_TEST_VALUE_ONLY',SOD_ISOLATED_CHECKOUT:'/tmp',SOD_RUN_APPROVAL_TOKEN:'forged'
});
assert.equal(result.last.reason,'PAID_TRANSPORT_NOT_DEPLOYED');
assert.equal(result.last.executed,false);assert.equal(result.last.paidRequest,false);
console.log('SOD1820_CODEX_EXECUTOR_MODE_GATES_PASS_NO_PAID_CALL');
