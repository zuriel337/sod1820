// All positive paths use a SYNTHETIC stub adapter set. Synthetic results are never
// real provider acceptance (providerProven is always false); the real route is NOT_PROVEN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {planOwnedSessionRoute,sendToExistingOwner,verifyOwnerSessionAck,comparableSessionId,
  wireTrustedAdapters,wireSyntheticAdaptersForTests} from '../scripts/coordination-owned-session-route.mjs';

const now='2026-10-17T17:00:00Z', session='session_01TestOwnerABC12', sha='a'.repeat(40), acct='verified-account-1';
const ownerRow={id:'claim-1',assignment_mode:'WRITE',from_actor:'CLAUDE',to_actor:'ZURIEL',archived:false,superseded_by_id:null,
  status:'BEFORE_CLAIMED_WRITE_BRANCH_ONLY_PASSIVE',dispatch_state:'CLAIMED',dispatch_lease_expires_at:'2026-10-17T17:10:00Z',
  dispatch_context:{owner_protocol_version:1,owner_state:'CLAIMED',owner_session_id:session,owner_account_id:acct,
    github_paths:['src/components/experience2029/**'],branch:'claude/assigned-task',expected_head_sha:sha}};
const approval={id:'appr-1',explicit:true,allowExistingSessionMessage:true,targetClaimId:'claim-1',targetSessionId:session,
  taskKey:'OWNER_ROUTING_TEST',approvedAt:'2026-10-17T16:59:45Z'};
const request={targetActor:'CLAUDE',targetClaimId:'claim-1',targetSessionId:session,
  requestedPaths:['src/components/experience2029/SystemFrame2029.jsx'],taskKey:'OWNER_ROUTING_TEST',
  testId:'one-test',sourceAssignmentId:'source-assignment-uuid'};

// SYNTHETIC adapters; `o` overrides pieces. Stub idempotency/ack stores are in-memory (test-only).
function adapters(o={}) {
  const used=new Set(), consumed=new Set();
  return wireSyntheticAdaptersForTests({
    ledger:{lawVersion:async()=>17,
      scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:59:48Z',rows:[ownerRow]}),...o.ledger},
    provider:{senderAccountId:async()=>acct,
      sessionState:async()=>({session_id:session,owner_claim_id:'claim-1',account_id:acct,is_active:true,checked_at:'2026-10-17T16:59:50Z'}),...o.provider},
    git:{remoteHead:async b=>({branch:b,head_sha:sha,checked_at:'2026-10-17T16:59:51Z'}),...o.git},
    approvals:{lookup:async()=>approval,...o.approvals},
    idempotency:{take:async k=>{if(used.has(k))return {taken:false};used.add(k);return {taken:true,durable:false,atomic:true};},...o.idempotency},
    ack:{authenticate:async()=>({authenticated:true,actor:'CLAUDE',receipt_id:'r1',session_id:session,received_at:'2026-10-17T17:01:00Z'}),
      consume:async(n,id)=>{const k=n+id;if(consumed.has(k))return {consumed:false};consumed.add(k);return {consumed:true};},...o.ack},
  });
}
const plan=(o={},req={},n=now)=>planOwnedSessionRoute({adapters:adapters(o),request:{...request,...req},now:n});
const stopped=(p,reason)=>{assert.equal(p.action,'HOLD');assert.equal(p.reason,reason);assert.equal(p.mustNotSpawn,true);assert.equal(p.autoRetry,false);};
const okExec=async()=>JSON.stringify({ok:true,session_id:session});
const ackRow=p=>({task_key:p.taskKey,parent_assignment_id:p.sourceAssignmentId,from_actor:'CLAUDE',to_actor:'ZURIEL',
  status:'OWNER_SESSION_RECEIVED_PASS',dispatch_kind:null,dispatch_state:null,
  dispatch_context:{test_id:p.testId,owner_claim_id:p.ownerClaimId,source_assignment_id:p.sourceAssignmentId,
    owner_session_id:p.targetSessionId,expected_head_sha:p.expectedHeadSha,no_product_changes:true,ack_nonce:p.nonce}});

// ---- trust boundary: NOT_WIRED / forged inputs
test('real trusted wiring is HOLD / NOT_WIRED in this branch',()=>stopped(wireTrustedAdapters({}),'NOT_WIRED_NO_AUTHENTICATED_PROVIDER_ADAPTER'));
test('hand-built adapter object (not wired) is rejected',async()=>{
  const fake={ledger:{},provider:{},git:{},approvals:{},idempotency:{},ack:{},synthetic:false,providerProven:true};
  stopped(await planOwnedSessionRoute({adapters:fake,request,now}),'ADAPTERS_NOT_TRUSTED_OR_NOT_WIRED');});
test('malformed synthetic adapter shape is HOLD',()=>stopped(wireSyntheticAdaptersForTests({ledger:{}}),'ADAPTER_SHAPE_INVALID'));
test('raw candidateClaims / evidence / booleans in the request are ignored',async()=>{
  const forged={...ownerRow,id:'claim-evil',dispatch_context:{...ownerRow.dispatch_context,owner_session_id:'session_01Evil'}};
  const p=await plan({},{candidateClaims:[forged],userAuthorization:{explicit:true},alreadyDispatched:false,providerEvidence:{verified_source:'CLAUDE_SESSION_PROVIDER',is_active:true},gitEvidence:{verified_source:'GITHUB_REMOTE'},lawVersion:17});
  assert.equal(p.action,'SEND_TO_EXISTING_CLAUDE_SESSION');assert.equal(p.ownerClaimId,'claim-1');assert.equal(p.targetSessionId,session);});
test('forged provider object with matching labels but live provider says inactive => HOLD',async()=>
  stopped(await plan({provider:{sessionState:async()=>({session_id:session,owner_claim_id:'claim-1',account_id:acct,is_active:false,checked_at:'2026-10-17T16:59:50Z'})}},
    {providerEvidence:{verified_source:'CLAUDE_SESSION_PROVIDER',owner_claim_id:'claim-1',session_id:session,account_id:acct,is_active:true,checked_at:now}}),'LEDGER_LEASE_NOT_PROVIDER_PROVEN_LIVE'));
test('forged git object cannot override remote head read by adapter',async()=>
  stopped(await plan({git:{remoteHead:async b=>({branch:b,head_sha:'b'.repeat(40),checked_at:'2026-10-17T16:59:51Z'})}},
    {gitEvidence:{verified_source:'GITHUB_REMOTE',branch:'claude/assigned-task',head_sha:sha,checked_at:now}}),'GIT_HEAD_NOT_VERIFIED'));
test('plain-object plan cannot be sent',async()=>{
  const p=await plan();const clone={...p};
  assert.equal((await sendToExistingOwner(clone,{adapters:adapters(),execCli:okExec,now})).state,'BLOCKED');});
test('plan from HOLD / null / missing executor never sends',async()=>{
  assert.equal((await sendToExistingOwner(await plan({},{targetActor:'GPT'}),{adapters:adapters(),execCli:okExec,now})).state,'BLOCKED');
  assert.equal((await sendToExistingOwner(await plan(),{adapters:adapters(),execCli:null,now})).reason,'SANCTIONED_AUTHENTICATED_EXECUTOR_REQUIRED');});

// ---- positive (SYNTHETIC only)
test('SYNTHETIC: one exact verified provider-live owner is eligible, never providerProven',async()=>{
  const p=await plan();assert.equal(p.action,'SEND_TO_EXISTING_CLAUDE_SESSION');assert.equal(p.synthetic,true);assert.equal(p.providerProven,false);
  assert.equal(p.autoRetry,false);assert.match(p.message,/ACK_NONCE=/);assert.match(p.message,/SOURCE_ASSIGNMENT_ID=/);});

// ---- lease-only liveness, approval, snapshot
test('ledger lease alone is not provider-proven liveness',async()=>
  stopped(await plan({provider:{sessionState:async()=>null}}),'PROVIDER_SESSION_STATE_REQUIRED'));
test('provider state for a different session/claim is rejected',async()=>{
  stopped(await plan({provider:{sessionState:async()=>({session_id:'session_01Other',owner_claim_id:'claim-1',account_id:acct,is_active:true,checked_at:'2026-10-17T16:59:50Z'})}}),'PROVIDER_SESSION_STATE_REQUIRED');
  stopped(await plan({provider:{sessionState:async()=>({session_id:session,owner_claim_id:'other',account_id:acct,is_active:true,checked_at:'2026-10-17T16:59:50Z'})}}),'PROVIDER_SESSION_STATE_REQUIRED');});
test('stale provider state is rejected',async()=>
  stopped(await plan({provider:{sessionState:async()=>({session_id:session,owner_claim_id:'claim-1',account_id:acct,is_active:true,checked_at:'2026-10-17T16:40:00Z'})}}),'PROVIDER_SESSION_STATE_REQUIRED'));
test('provider exception fails closed',async()=>
  stopped(await plan({provider:{sessionState:async()=>{throw Error('boom SECRET');}}}),'PROVIDER_SESSION_STATE_REQUIRED'));
test('approval spoof: missing / wrong scope / not explicit / stale / no id',async()=>{
  stopped(await plan({approvals:{lookup:async()=>null}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');
  stopped(await plan({approvals:{lookup:async()=>({...approval,targetClaimId:'wrong'})}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');
  stopped(await plan({approvals:{lookup:async()=>({...approval,explicit:'true'})}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');
  stopped(await plan({approvals:{lookup:async()=>({...approval,approvedAt:'2026-10-17T16:20:00Z'})}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');
  stopped(await plan({approvals:{lookup:async()=>({...approval,id:undefined})}}),'EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');});
test('stale / non-exhaustive / missing owner snapshot stops',async()=>{
  const rows=[ownerRow];
  stopped(await plan({ledger:{scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:50:00Z',rows})}}),'FRESH_EXHAUSTIVE_OWNER_SCAN_REQUIRED');
  stopped(await plan({ledger:{scanOwners:async()=>({exhaustive:false,snapshotAt:'2026-10-17T16:59:48Z',rows})}}),'FRESH_EXHAUSTIVE_OWNER_SCAN_REQUIRED');
  stopped(await plan({ledger:{scanOwners:async()=>null}}),'FRESH_EXHAUSTIVE_OWNER_SCAN_REQUIRED');});
test('v16 / unknown law version not accepted',async()=>stopped(await plan({ledger:{lawVersion:async()=>16}}),'LAW_VERSION_NOT_VERIFIED'));
test('v17 blocks GPT-directed wake',async()=>stopped(await plan({},{targetActor:'GPT'}),'V17_GPT_DELIVERY_DISABLED'));
test('missing correlation id stops',async()=>stopped(await plan({},{sourceAssignmentId:null}),'CORRELATION_ID_REQUIRED'));

// ---- ids / accounts / scope / owners
test('cse_/session_ aliases never compare equal',async()=>{
  assert.notEqual(comparableSessionId('cse_01TestOwnerABC12'),comparableSessionId(session));
  stopped(await plan({approvals:{lookup:async()=>({...approval,targetSessionId:'cse_01TestOwnerABC12'})}},{targetSessionId:'cse_01TestOwnerABC12'}),'EXACT_OWNER_SESSION_ID_NOT_VERIFIED');});
test('cross-account: sender differs from owner account',async()=>stopped(await plan({provider:{senderAccountId:async()=>'other'}}),'SAME_ACCOUNT_UNVERIFIED'));
test('cross-account: provider reports a different account for the session',async()=>
  stopped(await plan({provider:{sessionState:async()=>({session_id:session,owner_claim_id:'claim-1',account_id:'other',is_active:true,checked_at:'2026-10-17T16:59:50Z'})}}),'SAME_ACCOUNT_UNVERIFIED'));
test('legacy row without structured registration fails closed',async()=>
  stopped(await plan({ledger:{scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:59:48Z',rows:[{...ownerRow,dispatch_context:{}}]})}}),'UNRECONCILED_OWNER_PATHS'));
test('unreconciled legacy claim blocks even when another claim matches',async()=>
  stopped(await plan({ledger:{scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:59:48Z',rows:[ownerRow,{...ownerRow,id:'legacy',dispatch_context:{}}]})}}),'UNRECONCILED_OWNER_PATHS'));
test('released / archived / superseded owner is not an owner',async()=>{
  for (const r of [{status:'AFTER_OWN_SCOPE_RELEASED'},{archived:true},{superseded_by_id:'x'},{dispatch_state:'COMPLETED'}])
    stopped(await plan({ledger:{scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:59:48Z',rows:[{...ownerRow,...r}]})}}),'NO_VERIFIED_OWNER_FOR_PATHS');});
test('two overlapping owners block',async()=>
  stopped(await plan({ledger:{scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:59:48Z',rows:[ownerRow,{...ownerRow,id:'claim-2'}]})}}),'CONFLICTING_OWNER_CLAIMS'));
test('cannot address a different claim',async()=>
  stopped(await plan({approvals:{lookup:async()=>({...approval,targetClaimId:'claim-other'})}},{targetClaimId:'claim-other'}),'OWNER_CLAIM_MISMATCH'));
test('path outside owner scope / traversal rejected',async()=>{
  stopped(await plan({},{requestedPaths:[request.requestedPaths[0],'src/lib/supabase.js']}),'REQUESTED_PATH_OUTSIDE_OWNER');
  stopped(await plan({},{requestedPaths:['src/components/../secrets.js']}),'UNSAFE_REQUESTED_PATH');});
test('dot-prefixed GitHub folder allowed as exact path',async()=>{
  const row={...ownerRow,dispatch_context:{...ownerRow.dispatch_context,github_paths:['.github/workflows/**']}};
  const p=await plan({ledger:{scanOwners:async()=>({exhaustive:true,snapshotAt:'2026-10-17T16:59:48Z',rows:[row]})}},{requestedPaths:['.github/workflows/a.yml']});
  assert.equal(p.action,'SEND_TO_EXISTING_CLAUDE_SESSION');});

// ---- send: recheck, race, receipts, errors
test('send rechecks head drift between plan and send',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  const drift=adapters({git:{remoteHead:async b=>({branch:b,head_sha:'c'.repeat(40),checked_at:'2026-10-17T16:59:55Z'})}});
  let calls=0;const r=await sendToExistingOwner(p,{adapters:drift,execCli:async()=>{calls++;return '{}';},now});
  assert.equal(r.reason,'RECHECK_FAILED_GIT_HEAD_NOT_VERIFIED');assert.equal(calls,0);});
test('send rechecks provider liveness lost after plan',async()=>{
  const p=await plan();
  const dead=adapters({provider:{sessionState:async()=>({session_id:session,owner_claim_id:'claim-1',account_id:acct,is_active:false,checked_at:'2026-10-17T16:59:55Z'})}});
  assert.equal((await sendToExistingOwner(p,{adapters:dead,execCli:okExec,now})).reason,'RECHECK_FAILED_LEDGER_LEASE_NOT_PROVIDER_PROVEN_LIVE');});
test('expired plan is not sent',async()=>{
  const p=await plan();
  assert.equal((await sendToExistingOwner(p,{adapters:adapters(),execCli:okExec,now:'2026-10-17T17:30:00Z'})).reason,'PLAN_EXPIRED');});
test('race / double send: concurrent sends of one plan execute exactly once',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});let calls=0;
  const exec=async()=>{calls++;return JSON.stringify({ok:true,session_id:session});};
  const rs=await Promise.all([sendToExistingOwner(p,{adapters:a,execCli:exec,now}),sendToExistingOwner(p,{adapters:a,execCli:exec,now})]);
  assert.equal(calls,1);assert.deepEqual(rs.map(r=>r.state).sort(),['BLOCKED','SENT_AWAITING_OWNER_ACK']);
  assert.equal(rs.find(r=>r.state==='BLOCKED').reason,'DUPLICATE_OR_UNCONFIRMED_SEND_BLOCKED');});
test('a second plan for the same approval/claim/head hits the same idempotency key',async()=>{
  const a=adapters();const p1=await planOwnedSessionRoute({adapters:a,request,now});const p2=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal(p1.idempotencyKey,p2.idempotencyKey);assert.notEqual(p1.nonce,p2.nonce);
  assert.equal((await sendToExistingOwner(p1,{adapters:a,execCli:okExec,now})).state,'SENT_AWAITING_OWNER_ACK');
  assert.equal((await sendToExistingOwner(p2,{adapters:a,execCli:okExec,now})).state,'BLOCKED');});
test('idempotency store failure fails closed (no send)',async()=>{
  const a=adapters({idempotency:{take:async()=>{throw Error('db down');}}});const p=await planOwnedSessionRoute({adapters:a,request,now});let calls=0;
  const r=await sendToExistingOwner(p,{adapters:a,execCli:async()=>{calls++;return '{}';},now});
  assert.equal(r.state,'BLOCKED');assert.equal(calls,0);});
test('JSON transport receipt is awaiting ACK, not owner acceptance; synthetic is flagged',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  const r=await sendToExistingOwner(p,{adapters:a,execCli:async args=>{assert.deepEqual(args.slice(-4),['--cloud',session,'--output-format','json']);return okExec();},now});
  assert.equal(r.state,'SENT_AWAITING_OWNER_ACK');assert.equal(r.synthetic,true);assert.equal(r.providerProven,false);});
test('provider denial (Interfere With Workloads): one call, no retry, no leak',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});let calls=0;
  const r=await sendToExistingOwner(p,{adapters:a,execCli:async()=>{calls++;throw Error('Interfere With Workloads SENSITIVE_MARKER_ABC');},now});
  assert.equal(calls,1);assert.equal(r.reason,'PROVIDER_PERMISSION_DENIED');assert.equal(r.autoRetry,false);assert.equal(JSON.stringify(r).includes('SENSITIVE_MARKER_ABC'),false);});
test('other provider exceptions do not leak details',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  const r=await sendToExistingOwner(p,{adapters:a,execCli:async()=>{throw Error('credential rejected DEBUG_PAYLOAD_123');},now});
  assert.equal(r.reason,'PROVIDER_AUTH_OR_PERMISSION_FAILURE');assert.equal(JSON.stringify(r).includes('DEBUG_PAYLOAD_123'),false);});
test('unknown / other-session / non-JSON provider responses are UNKNOWN_DELIVERY, no retry',async()=>{
  for (const out of ['{"type":"result"}',JSON.stringify({ok:true,session_id:'cse_01TestOwnerABC12'}),'not json']) {
    const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
    const r=await sendToExistingOwner(p,{adapters:a,execCli:async()=>out,now});
    assert.equal(r.state,'UNKNOWN_DELIVERY');assert.equal(r.autoRetry,false);}});

// ---- ACK
test('SYNTHETIC: authenticated, nonce-correlated, in-window ACK passes once, never providerProven',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  const r=await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now:'2026-10-17T17:02:00Z'});
  assert.equal(r.ok,true);assert.equal(r.synthetic,true);assert.equal(r.providerProven,false);});
test('forged ACK: matching work_log fields but unauthenticated',async()=>{
  const a=adapters({ack:{authenticate:async()=>null}});const p=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now})).reason,'ACK_NOT_AUTHENTICATED');
  const b=adapters({ack:{authenticate:async()=>({authenticated:true,actor:'GPT',receipt_id:'r',session_id:session,received_at:'2026-10-17T17:01:00Z'})}});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:b,now})).reason,'ACK_NOT_AUTHENTICATED');});
test('forged ACK: wrong or missing nonce / wrong fields',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});const row=ackRow(p);
  for (const bad of [{...row,dispatch_context:{...row.dispatch_context,ack_nonce:'guess'}},
    {...row,dispatch_context:{...row.dispatch_context,ack_nonce:undefined}},
    {...row,parent_assignment_id:'wrong'},{...row,to_actor:'GPT'},
    {...row,dispatch_context:{...row.dispatch_context,owner_session_id:'cse_01TestOwnerABC12'}}])
    assert.equal((await verifyOwnerSessionAck(bad,p,{adapters:a,now})).ok,false);
  assert.equal((await verifyOwnerSessionAck(null,p,{adapters:a,now})).ok,false);});
test('replayed ACK is rejected on second consume',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now})).ok,true);
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now})).reason,'ACK_REPLAY_REJECTED');});
test('ACK outside nonce window (expired or before send) is rejected',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now:'2026-10-17T17:30:00Z'})).reason,'ACK_EXPIRED_OR_OUT_OF_WINDOW');
  const early=adapters({ack:{authenticate:async()=>({authenticated:true,actor:'CLAUDE',receipt_id:'r9',session_id:session,received_at:'2026-10-17T16:00:00Z'})}});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:early,now})).reason,'ACK_EXPIRED_OR_OUT_OF_WINDOW');});
test('ACK for a different session in authenticated receipt is rejected',async()=>{
  const a=adapters({ack:{authenticate:async()=>({authenticated:true,actor:'CLAUDE',receipt_id:'r8',session_id:'session_01Other',received_at:'2026-10-17T17:01:00Z'})}});
  const p=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now})).reason,'ACK_NOT_AUTHENTICATED');});
test('no consume store => ACK fails closed',async()=>{
  const a=adapters({ack:{consume:async()=>null}});const p=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:a,now})).reason,'ACK_CONSUME_STORE_NOT_WIRED');});
test('ACK verification rejects plain-object plan and untrusted adapters',async()=>{
  const a=adapters();const p=await planOwnedSessionRoute({adapters:a,request,now});
  assert.equal((await verifyOwnerSessionAck(ackRow(p),{...p},{adapters:a,now})).reason,'INVALID_OR_UNTRUSTED_PLAN');
  assert.equal((await verifyOwnerSessionAck(ackRow(p),p,{adapters:{...a},now})).reason,'ADAPTERS_NOT_TRUSTED_OR_NOT_WIRED');});
