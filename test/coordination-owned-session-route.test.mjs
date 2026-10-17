import test from 'node:test';
import assert from 'node:assert/strict';
import {planOwnedSessionRoute,sendToExistingOwner,verifyOwnerSessionAck,comparableSessionId} from '../scripts/coordination-owned-session-route.mjs';
const now='2026-10-17T17:00:00Z', session='session_01TestOwnerABC12', sha='a'.repeat(40);
const owner={id:'claim-1',assignment_mode:'WRITE',from_actor:'CLAUDE',to_actor:'ZURIEL',archived:false,
  superseded_by_id:null,released:false,github_paths:['src/components/experience2029/**'],session_id:session,
  account_id:'verified-account-1',expected_head_sha:sha,current_head_sha:sha,
  dispatch_state:'CLAIMED',dispatch_lease_expires_at:'2026-10-17T17:10:00Z'};
const auth={explicit:true,allowExistingSessionMessage:true,targetClaimId:owner.id,targetSessionId:session,
  taskKey:'OWNER_ROUTING_TEST',approvedAt:'2026-10-17T16:59:45Z'};
const input={lawVersion:17,userAuthorization:auth,senderAccountId:owner.account_id,targetActor:'CLAUDE',
  targetClaimId:owner.id,targetSessionId:session,requestedPaths:['src/components/experience2029/SystemFrame2029.jsx'],
  taskKey:auth.taskKey,testId:'one-test',sourceAssignmentId:'source-assignment-uuid',
  candidateClaims:[owner],ownerSnapshotAt:'2026-10-17T16:59:48Z',now};
const plan=(overrides={})=>planOwnedSessionRoute({...input,...overrides});
const stopped=(p,reason)=>{assert.equal(p.action,'HOLD');assert.equal(p.reason,reason);assert.equal(p.mustNotSpawn,true);assert.equal(p.autoRetry,false);};
test('one exact verified active owner is eligible with no fallback',()=>{let p=plan();assert.equal(p.action,'SEND_TO_EXISTING_CLAUDE_SESSION');assert.equal(p.targetSessionId,session);assert.equal(p.autoRetry,false);assert.match(p.message,/SOURCE_ASSIGNMENT_ID=/);});
test('unverified cse_/session_ aliases NEVER compare equal',()=>{assert.notEqual(comparableSessionId('cse_01TestOwnerABC12'),comparableSessionId('session_01TestOwnerABC12'));stopped(plan({targetSessionId:'cse_01TestOwnerABC12',userAuthorization:{...auth,targetSessionId:'cse_01TestOwnerABC12'}}),'EXACT_OWNER_SESSION_ID_NOT_VERIFIED');});
test('v17 blocks GPT-directed wake even with approval',()=>stopped(plan({targetActor:'GPT'}),'V17_GPT_DELIVERY_DISABLED'));
test('v16 is not silently accepted',()=>stopped(plan({lawVersion:16}),'LAW_VERSION_NOT_VERIFIED'));
test('unscoped approval is insufficient',()=>stopped(plan({userAuthorization:{...auth,targetClaimId:'wrong'}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED'));
test('stale approval is insufficient',()=>stopped(plan({userAuthorization:{...auth,approvedAt:'2026-10-17T16:20:00Z'}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED'));
test('missing correlation id stops',()=>stopped(plan({sourceAssignmentId:null}),'CORRELATION_ID_REQUIRED'));
test('duplicate send blocked',()=>stopped(plan({alreadyDispatched:true}),'ALREADY_SENT_NO_DUPLICATE'));
test('outdated or missing owner scan stops',()=>stopped(plan({ownerSnapshotAt:'2026-10-17T16:50:00Z'}),'FRESH_EXHAUSTIVE_OWNER_SCAN_REQUIRED'));
test('owner session cannot be inferred from branch alone',()=>stopped(plan({candidateClaims:[{...owner,session_id:null}]}),'EXACT_OWNER_SESSION_ID_NOT_VERIFIED'));
test('released owner cannot receive a new ownership instruction',()=>stopped(plan({candidateClaims:[{...owner,released:true}]}),'NO_VERIFIED_OWNER_FOR_PATHS'));
test('stale lease without heartbeat is not current ownership',()=>stopped(plan({candidateClaims:[{...owner,dispatch_lease_expires_at:'2026-10-17T16:00:00Z'}]}),'OWNER_SESSION_ACTIVITY_UNVERIFIED'));
test('manual WRITE without heartbeat cannot be assumed active',()=>stopped(plan({candidateClaims:[{...owner,dispatch_state:null,dispatch_lease_expires_at:null}]}),'OWNER_SESSION_ACTIVITY_UNVERIFIED'));
test('manual owner with attested fresh heartbeat is routable',()=>assert.equal(plan({candidateClaims:[{...owner,dispatch_state:null,dispatch_lease_expires_at:null,session_live_attested:true,last_heartbeat_at:'2026-10-17T16:59:30Z'}]}).action,'SEND_TO_EXISTING_CLAUDE_SESSION'));
test('manually attested but stale heartbeat is blocked',()=>stopped(plan({candidateClaims:[{...owner,dispatch_state:null,dispatch_lease_expires_at:null,session_live_attested:true,last_heartbeat_at:'2026-10-17T16:30:00Z'}]}),'OWNER_SESSION_ACTIVITY_UNVERIFIED'));
test('cannot cross from a different Claude account',()=>stopped(plan({senderAccountId:'other-account'}),'SAME_ACCOUNT_UNVERIFIED'));
test('overlapping claims of two owners block',()=>stopped(plan({candidateClaims:[owner,{...owner,id:'claim-2'}]}),'CONFLICTING_OWNER_CLAIMS'));
test('cannot address a different claim',()=>stopped(plan({targetClaimId:'claim-other',userAuthorization:{...auth,targetClaimId:'claim-other'}}),'OWNER_CLAIM_MISMATCH'));
test('cannot address file outside owned scope',()=>stopped(plan({requestedPaths:[input.requestedPaths[0],'src/lib/supabase.js']}),'REQUESTED_PATH_OUTSIDE_OWNER'));
test('malformed or traversal path is rejected',()=>stopped(plan({requestedPaths:['src/components/../secrets.js']}),'UNSAFE_REQUESTED_PATH'));
test('unreconciled claim with unknown paths blocks even when other claims match',()=>stopped(plan({candidateClaims:[owner,{...owner,id:'legacy',github_paths:null}]}),'UNRECONCILED_OWNER_PATHS'));
test('git branch head drift blocks even with valid scope',()=>stopped(plan({candidateClaims:[{...owner,current_head_sha:'b'.repeat(40)}]}),'GIT_HEAD_NOT_VERIFIED'));
test('missing provider executor never auto starts Routine',async()=>{assert.equal((await sendToExistingOwner(plan(),null)).state,'BLOCKED');});
test('JSON transport receipt does not prove owner read it',async()=>{const p=plan();let calls=0;const result=await sendToExistingOwner(p,async a=>{calls++;assert.deepEqual(a.slice(-4),['--cloud',session,'--output-format','json']);return JSON.stringify({ok:true,session_id:session});});assert.equal(calls,1);assert.equal(result.state,'SENT_AWAITING_OWNER_ACK');assert.equal(verifyOwnerSessionAck(null,p),false);});
test('permission denial stops with no retry, no alternative route',async()=>{let calls=0;const r=await sendToExistingOwner(plan(),async()=>{calls++;throw Error('Interfere With Workloads');});assert.equal(calls,1);assert.equal(r.state,'BLOCKED');assert.equal(r.autoRetry,false);});
test('unknown response is not treated as safe to retry',async()=>{const r=await sendToExistingOwner(plan(),async()=>'{"type":"result"}');assert.equal(r.state,'UNKNOWN_DELIVERY');assert.equal(r.autoRetry,false);});
test('provider receipt for different session remains unknown delivery',async()=>{const r=await sendToExistingOwner(plan(),async()=>JSON.stringify({ok:true,session_id:'cse_01TestOwnerABC12'}));assert.equal(r.state,'UNKNOWN_DELIVERY');});
test('only a fully correlated passive ledger receipt qualifies',()=>{const p=plan();const row={task_key:p.taskKey,parent_assignment_id:p.sourceAssignmentId,from_actor:'CLAUDE',to_actor:'ZURIEL',status:'OWNER_SESSION_RECEIVED_PASS',dispatch_kind:null,dispatch_state:null,dispatch_context:{test_id:p.testId,owner_claim_id:p.ownerClaimId,source_assignment_id:p.sourceAssignmentId,owner_session_id:p.targetSessionId,expected_head_sha:p.expectedHeadSha,no_product_changes:true}};assert.equal(verifyOwnerSessionAck(row,p),true);assert.equal(verifyOwnerSessionAck({...row,parent_assignment_id:'wrong'},p),false);assert.equal(verifyOwnerSessionAck({...row,dispatch_context:{...row.dispatch_context,owner_session_id:'cse_01TestOwnerABC12'}},p),false);assert.equal(verifyOwnerSessionAck({...row,to_actor:'GPT'},p),false);});
test('dot-prefixed GitHub folder is allowed as an exact path',()=>{const c={...owner,github_paths:['.github/workflows/**']};const r=plan({candidateClaims:[c],requestedPaths:['.github/workflows/a.yml']});assert.equal(r.action,'SEND_TO_EXISTING_CLAUDE_SESSION');});
