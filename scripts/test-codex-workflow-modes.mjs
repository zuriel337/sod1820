import test from 'node:test';
import assert from 'node:assert/strict';
import {RECON_READ_ONLY, EXECUTE_BOUNDED,routeCodexMode,needsImplementationRecon,assessCodexWorkflow,projectImplementationReality} from './codex-workflow-modes.mjs';
const NOW='2026-10-10T16:00:00Z', sha='a'.repeat(40), owner='inter_agent_coordination_law v13';
const source=()=>({origin:'PRIVILEGED_CANONICAL_READ',verified_owner:true,main_sha:sha,observed_at:NOW});
const base=(mode=RECON_READ_ONLY)=>({
 id:'b2355220-fc03-4d21-8670-04f41a25f962',task_key:'SOD1820_CODEX_RECON_TEST',
 from_actor:'GPT',to_actor:'GPT',dispatch_kind:'ASSIGNMENT',dispatch_state:'QUEUED',archived:false,
 superseded_by_id:null,dispatch_lease_owner:null,dispatch_lease_expires_at:null,
 assignment_mode:mode===RECON_READ_ONLY?'READ_ONLY':'WRITE',
 assignment_scope:'README.md research scoped example',primary_owner:owner,
 release_authorization_state:'BRANCH_ONLY_NO_MERGE_NO_DEPLOY',
 dispatch_context:{
  codex_workflow_mode:mode,codex_intent_tags:mode===RECON_READ_ONLY?['CROSS_SYSTEM']:['BOUNDED'],
  codex_no_write:mode===RECON_READ_ONLY,
  codex_no_production_write:true,codex_allowed_write_paths:mode===RECON_READ_ONLY?[]:['README.md'],
  github_paths:mode===RECON_READ_ONLY?[]:['README.md'],
  created_via:'work_log_assign_agent_v1',codex_discovered_risks:[]
 }
});
const plan=()=>({owner_decision:owner,branch:'codex/golden-readme-smoke',stop_condition:'stop if current main has drift',verification:'run static README test',dependencies:['canonical owner review'],allowed_paths:['README.md']});
const approvedRecon=()=>({status:'GPT_CHALLENGED_OWNER_ACCEPTED',owner,main_sha:sha,source_assignment_id:'bc3221b1-9911-4b59-a613-6e8794b90f0e',coverage:'covered current repo and relevant DB',gpt_challenge_ref:'work_log/a1',owner_decision_ref:'work_log/a2'});
const run=(a=base(),p,rec,s=source())=>assessCodexWorkflow({assignment:a,mode:a?.dispatch_context?.codex_workflow_mode,plan:p,recon:rec,source:s,now:NOW});
test('architectural, cleanup, cutover and ambiguous work route to RECON first',()=>{
 for(const risk of ['ARCHITECTURE','CLEANUP','CROSS_SYSTEM','AMBIGUOUS','LEGACY_CUTOVER','HIGH_BLAST_RADIUS','RETIREMENT']){
  assert.equal(routeCodexMode([risk]),RECON_READ_ONLY);
  assert.equal(needsImplementationRecon([risk]),true);
 }
 assert.equal(routeCodexMode(['BOUNDED']),EXECUTE_BOUNDED);
});
test('canonical RECON grant stays read-only and does not authorize an execution',()=>{
 const v=run(base());
 assert.equal(v.status,'RECON_READ_ONLY_POLICY_READY_NO_EXECUTION');
 assert.equal(v.executionStarted,false);assert.equal(v.paidRequest,false);
});
test('RECON rejects any claimed write capability, or a mismatched assignment mode',()=>{
 let a=base();a.assignment_mode='WRITE';
 assert.equal(run(a).reason,'RECON_MUST_BE_READ_ONLY');
 a=base();a.dispatch_context.codex_allowed_write_paths=['README.md'];
 assert.equal(run(a).reason,'RECON_MUST_BE_READ_ONLY');
 a=base();a.dispatch_context.codex_disposition='DELETE';
 assert.equal(run(a).reason,'RECON_CANNOT_AUTHORIZE_DISPOSITION');
});
test('every Codex assignment must state an explicit reconciled workflow mode',()=>{
 let a=base();delete a.dispatch_context.codex_workflow_mode;
 assert.equal(run(a).reason,'EXPLICIT_CODEX_WORKFLOW_MODE_REQUIRED');
 a=base();a.dispatch_context.codex_workflow_mode='AUTONOMOUS';
 assert.equal(run(a).reason,'EXPLICIT_CODEX_WORKFLOW_MODE_REQUIRED');
});
test('live main/owner, current assignment, and fresh evidence are required even for offline preflight',()=>{
 let a=base();a.dispatch_state='CLAIMED';
 assert.equal(run(a).reason,'ASSIGNMENT_NOT_CURRENT_OR_AVAILABLE');
 a=base();a.dispatch_lease_owner='worker';
 assert.equal(run(a).reason,'CANONICAL_LEASE_NOT_CLEAR');
 let s=source();s.observed_at='2026-10-10T15:00:00Z';
 assert.equal(run(base(),undefined,undefined,s).reason,'STALE_CANONICAL_SNAPSHOT');
 s=source();s.origin='USER_JSON';
 assert.equal(run(base(),undefined,undefined,s).reason,'LIVE_OWNER_AND_MAIN_VERIFICATION_REQUIRED');
});
test('bounded changes require an exact owner decision, stop condition and file allowlist',()=>{
 const a=base(EXECUTE_BOUNDED);
 assert.equal(run(a).reason,'BOUND_WRITE_PLAN_OR_PATHS_INCOMPLETE');
 assert.equal(run(a,{...plan(),allowed_paths:['src/main.ts']}).reason,'BOUND_WRITE_PLAN_OR_PATHS_INCOMPLETE');
 assert.equal(run(a,{...plan(),allowed_paths:['README.md','../index.ts']}).reason,'BOUND_WRITE_PLAN_OR_PATHS_INCOMPLETE');
 assert.equal(run(a,{...plan(),allowed_paths:['*']}).reason,'BOUND_WRITE_PLAN_OR_PATHS_INCOMPLETE');
 assert.equal(run(a,{...plan(),stop_condition:''}).reason,'BOUND_WRITE_PLAN_OR_PATHS_INCOMPLETE');
 assert.equal(run(a,{...plan(),branch:'main'}).reason,'UNSAFE_ISOLATED_BRANCH');
});
test('ordinary bounded work can pass an offline-only policy assessment',()=>{
 const a=base(EXECUTE_BOUNDED);const v=run(a,plan());
 assert.equal(v.status,'EXECUTE_BOUNDED_POLICY_READY_NO_EXECUTION');
 assert.equal(v.executionStarted,false);assert.equal(v.paidRequest,false);
 assert.deepEqual(v.write_paths,['README.md']);
});
test('cross-system bounded execution requires the prior independent RECON and GPT synthesis',()=>{
 const a=base(EXECUTE_BOUNDED);a.dispatch_context.codex_intent_tags=['CROSS_SYSTEM'];
 assert.equal(run(a,plan()).reason,'RECON_AND_GPT_CHALLENGE_REQUIRED');
 const r=approvedRecon();r.main_sha='b'.repeat(40);
 assert.equal(run(a,plan(),r).reason,'RECON_AND_GPT_CHALLENGE_REQUIRED');
 assert.equal(run(a,plan(),approvedRecon()).status,'EXECUTE_BOUNDED_POLICY_READY_NO_EXECUTION');
});
test('new unexpected consumer, writer, system dependency or DRIFT forces a read-only stop',()=>{
 for(const risk of ['NEW_CONSUMER','UNEXPECTED_WRITER','CROSS_SYSTEM_DISCOVERY','LIVE_DRIFT','UNKNOWN_PROVENANCE','OUT_OF_SCOPE_CHANGE']){
   const a=base(EXECUTE_BOUNDED);a.dispatch_context.codex_discovered_risks=[risk];
   assert.equal(run(a,plan()).reason,'STOP_AND_RECON_NEW_BLAST_RADIUS');
 }
});
test('destructive work requires negative consumer/runtime/provenance proof plus Human Gate',()=>{
 const a=base(EXECUTE_BOUNDED);a.dispatch_context.codex_intent_tags=['RETIREMENT'];a.dispatch_context.codex_disposition='DELETE';
 assert.equal(run(a,plan(),approvedRecon()).reason,'DESTRUCTIVE_HUMAN_GATE_AND_NEGATIVE_PROOF_REQUIRED');
 const p=plan();p.retirement_proof={no_live_consumers:true,no_active_writers:true,no_runtime_obligation:true,no_provenance_obligation:true,reversible_or_archived:true,dry_run_evidence:true,human_gate:'APPROVED',owner_disposition_ref:'work_log/ref'};
 assert.equal(run(a,p,approvedRecon()).status,'EXECUTE_BOUNDED_POLICY_READY_NO_EXECUTION');
 p.retirement_proof.no_provenance_obligation=false;
 assert.equal(run(a,p,approvedRecon()).reason,'DESTRUCTIVE_HUMAN_GATE_AND_NEGATIVE_PROOF_REQUIRED');
});
test('Implementation Reality Map does not convert absent evidence into no consumers or healthy',()=>{
 const m=projectImplementationReality({canonical_owner:owner,implementations:['src/x.js'],consumers:[],dependencies:null});
 assert.equal(m.status,'PARTIAL_EVIDENCE');
 assert.equal(m.consumers,'UNKNOWN');
 assert.equal(m.branch_release_live,'UNKNOWN');
 assert.ok(m.coverage_unknowns.includes('consumers'));
 assert.ok(m.coverage_unknowns.includes('sources'));
 assert.equal(m.may_authorize_write,false);
});
test('complete evidence still does not automatically establish Truth or authorize deletion',()=>{
 const e={sources:[{source:'origin/main SHA',observed_at:NOW}]};
 for(const f of ['canonical_owner','implementations','consumers','dependencies','legacy_duplicates','active_writers','branch_release_live','drift','blast_radius','recommendation'])e[f]=['OBSERVED_NOT_ABSENT'];
 const m=projectImplementationReality(e);
 assert.equal(m.status,'EVIDENCE_COLLECTED_UNVERIFIED');
 assert.equal(m.may_authorize_write,false);
});
console.log('SOD1820_CODEX_TWO_MODES_OFFLINE_PASS');
