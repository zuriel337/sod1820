// SOD1820 coordination-only proposal. NOT connected to live Dispatch. NOT_WIRED.
// v17 stays active: GPT-addressed wake/ACK and automatic agent activation are forbidden.
//
// Trust model (v2, after review AFTER 52b5d376): this module NEVER accepts proof as
// caller-supplied data (booleans, JSON evidence, verified_source labels, raw claim rows,
// raw ACK rows, plan objects). Every fact is read by the module itself, through a
// *wired adapter set* it can recognise (module-private brand). In this branch no
// authenticated provider / GitHub / approval / durable-nonce adapter exists, so
// wireTrustedAdapters() returns HOLD and only a SYNTHETIC stub set can be wired.
// Synthetic results are test fixtures: providerProven is always false.
import {createHash,randomUUID} from 'node:crypto';

const SESSION_RE = /^(?:session|cse)_[A-Za-z0-9]+$/;
const SHA_RE = /^[a-f0-9]{40}$/;
const MAX_SNAPSHOT_AGE_MS = 60_000;
const MAX_APPROVAL_AGE_MS = 5 * 60_000;
const ACK_TTL_MS = 10 * 60_000;

const hold = reason => Object.freeze({action:'HOLD',reason,mustNotSpawn:true,autoRetry:false});
const ADAPTER_SETS = new WeakSet(); // sets produced by wire* below
const PLANS = new WeakSet();        // plans produced by planOwnedSessionRoute

// The provider has not proved that cse_* and session_* are aliases. NEVER strip prefixes.
export function comparableSessionId(value) {
  return typeof value === 'string' && SESSION_RE.test(value) ? value : null;
}

function safePath(value,{directoryAllowed=false}={}) {
  if (typeof value !== 'string' || !value || value !== value.trim()) return null;
  if (value.startsWith('/') || value.includes('\\') || value.includes('//') || /[\u0000-\u001f]/.test(value)) return null;
  const directory = directoryAllowed && (value.endsWith('/**') || value.endsWith('/'));
  if (!directoryAllowed && (value.endsWith('/**') || value.endsWith('/'))) return null;
  const path = value.endsWith('/**') ? value.slice(0,-3) : value.replace(/\/$/,'');
  if (!path || path.split('/').some(x=>!x || x==='.' || x==='..' || /[*?\[\]{}]/.test(x))) return null;
  return {path:path.toLowerCase(),directory};
}
function covers(a,b){return a.path===b.path || (a.directory && b.path.startsWith(a.path+'/'));}
const isFresh = (time,limitMs,nowMs) => {
  const ms=Date.parse(time||'');
  return Number.isFinite(ms) && ms<=nowMs && nowMs-ms<=limitMs;
};
const clockOf = now => new Date(typeof now==='function'?now():now).getTime();

const REQUIRED = {
  ledger:['lawVersion','scanOwners'],
  provider:['senderAccountId','sessionState'],
  git:['remoteHead'],
  approvals:['lookup'],
  idempotency:['take'],
  ack:['authenticate','consume'],
};
function shapeOk(impl){
  return impl && Object.entries(REQUIRED).every(([k,fns])=>impl[k] && fns.every(f=>typeof impl[k][f]==='function'));
}

/**
 * Real wiring. No authenticated Claude-session provider adapter, GitHub adapter,
 * approval adapter or durable atomic nonce/idempotency store exists in this branch,
 * so this ALWAYS returns HOLD / NOT_WIRED. It must stay closed until a reviewed
 * rollout (see docs, "Rollout HOLD") provides them. Do not fabricate a pass here.
 */
export function wireTrustedAdapters(_impl) {
  return hold('NOT_WIRED_NO_AUTHENTICATED_PROVIDER_ADAPTER');
}

/** SYNTHETIC test stub. Never counts as provider acceptance (providerProven=false). */
export function wireSyntheticAdaptersForTests(impl) {
  if (!shapeOk(impl)) return hold('ADAPTER_SHAPE_INVALID');
  const set=Object.freeze({...impl,synthetic:true,providerProven:false});
  ADAPTER_SETS.add(set);
  return set;
}

async function readOnce(fn){ try { return await fn(); } catch { return null; } }

// Parse a work_log row into a structured live owner claim, or a reason.
function parseOwnerRow(row) {
  if (!row || row.assignment_mode!=='WRITE' || row.archived===true || row.superseded_by_id!=null) return {skip:true};
  const status=String(row.status||'');
  if (['COMPLETED','FAILED','CANCELLED'].includes(row.dispatch_state)
    || /^(?:AFTER|RELEASED)/.test(status) || /RELEASED/.test(status)) return {skip:true};
  if (row.from_actor!=='CLAUDE' && row.to_actor!=='CLAUDE') return {skip:true};
  const c=row.dispatch_context||{};
  const paths=Array.isArray(c.github_paths)?c.github_paths.map(x=>safePath(x,{directoryAllowed:true})):[];
  if (c.owner_protocol_version!==1 || c.owner_state!=='CLAIMED' || !comparableSessionId(c.owner_session_id)
    || !c.owner_account_id || !paths.length || paths.some(x=>!x) || !c.branch || !SHA_RE.test(c.expected_head_sha||''))
    return {unreconciled:true};
  return {claim:{id:row.id,toActor:row.to_actor,fromActor:row.from_actor,sessionId:c.owner_session_id,
    accountId:c.owner_account_id,branch:c.branch,expectedHeadSha:c.expected_head_sha,paths}};
}

// All facts are read here, from adapters. Returns {ok:true,...} or {ok:false,reason}.
async function evaluate(adapters,request,clock) {
  const no=reason=>({ok:false,reason});
  if (!ADAPTER_SETS.has(adapters)) return no('ADAPTERS_NOT_TRUSTED_OR_NOT_WIRED');
  const {targetActor='CLAUDE',targetClaimId,targetSessionId,requestedPaths,taskKey,testId,sourceAssignmentId}=request||{};
  if (targetActor==='GPT') return no('V17_GPT_DELIVERY_DISABLED');
  if (targetActor!=='CLAUDE') return no('TARGET_RUNTIME_NOT_SUPPORTED');
  if (!sourceAssignmentId || !targetClaimId || !taskKey || !testId) return no('CORRELATION_ID_REQUIRED');
  if (!comparableSessionId(targetSessionId)) return no('PROVIDER_SESSION_ID_REQUIRED');
  if (!Array.isArray(requestedPaths)||requestedPaths.length<1||requestedPaths.length>40) return no('REQUESTED_PATHS_MISSING');
  const wanted=requestedPaths.map(x=>safePath(x));
  if (wanted.some(x=>!x)) return no('UNSAFE_REQUESTED_PATH');

  if (await readOnce(()=>adapters.ledger.lawVersion())!==17) return no('LAW_VERSION_NOT_VERIFIED');

  const approval=await readOnce(()=>adapters.approvals.lookup({targetClaimId,targetSessionId,taskKey}));
  if (!approval || !approval.id || approval.explicit!==true || approval.allowExistingSessionMessage!==true
    || approval.targetClaimId!==targetClaimId || approval.targetSessionId!==targetSessionId
    || approval.taskKey!==taskKey || !isFresh(approval.approvedAt,MAX_APPROVAL_AGE_MS,clock))
    return no('EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');

  const snap=await readOnce(()=>adapters.ledger.scanOwners());
  if (!snap || snap.exhaustive!==true || !Array.isArray(snap.rows) || !isFresh(snap.snapshotAt,MAX_SNAPSHOT_AGE_MS,clock))
    return no('FRESH_EXHAUSTIVE_OWNER_SCAN_REQUIRED');

  const overlapping=[];
  for (const row of snap.rows) {
    const p=parseOwnerRow(row);
    if (p.skip) continue;
    if (p.unreconciled) return no('UNRECONCILED_OWNER_PATHS');
    if (p.claim.paths.some(x=>wanted.some(y=>covers(x,y)||covers(y,x)))) overlapping.push(p.claim);
  }
  if (!overlapping.length) return no('NO_VERIFIED_OWNER_FOR_PATHS');
  if (overlapping.length!==1) return no('CONFLICTING_OWNER_CLAIMS');
  const claim=overlapping[0];
  if (claim.id!==targetClaimId || (claim.toActor!==targetActor && claim.fromActor!==targetActor)) return no('OWNER_CLAIM_MISMATCH');
  if (!wanted.every(x=>claim.paths.some(y=>covers(y,x)))) return no('REQUESTED_PATH_OUTSIDE_OWNER');
  if (claim.sessionId!==targetSessionId) return no('EXACT_OWNER_SESSION_ID_NOT_VERIFIED');

  // A ledger lease is only a ledger fact. Liveness must come from the provider.
  const sender=await readOnce(()=>adapters.provider.senderAccountId());
  const live=await readOnce(()=>adapters.provider.sessionState(targetSessionId));
  if (!live || live.session_id!==targetSessionId || live.owner_claim_id!==claim.id
    || !isFresh(live.checked_at,MAX_SNAPSHOT_AGE_MS,clock)) return no('PROVIDER_SESSION_STATE_REQUIRED');
  if (live.is_active!==true) return no('LEDGER_LEASE_NOT_PROVIDER_PROVEN_LIVE');
  if (!sender || sender!==claim.accountId || live.account_id!==claim.accountId) return no('SAME_ACCOUNT_UNVERIFIED');

  const git=await readOnce(()=>adapters.git.remoteHead(claim.branch));
  if (!git || git.branch!==claim.branch || git.head_sha!==claim.expectedHeadSha
    || !isFresh(git.checked_at,MAX_SNAPSHOT_AGE_MS,clock)) return no('GIT_HEAD_NOT_VERIFIED');

  const idempotencyKey=createHash('sha256')
    .update([claim.id,claim.sessionId,taskKey,approval.id,claim.expectedHeadSha].join('|')).digest('hex');
  return {ok:true,claim,approvalId:approval.id,idempotencyKey};
}

/**
 * PLAN ONLY. Reads every fact through the wired adapter set; accepts no claim rows,
 * booleans or evidence from the caller. Returns HOLD unless every check passes.
 */
export async function planOwnedSessionRoute({adapters,request,now=new Date()}) {
  const clock=clockOf(now);
  if (!Number.isFinite(clock)) return hold('CLOCK_INVALID');
  const r=await evaluate(adapters,request,clock);
  if (!r.ok) return hold(r.reason);
  const {claim}=r;
  const nonce=randomUUID();
  const expiresAt=new Date(clock+ACK_TTL_MS).toISOString();
  const {taskKey,testId,sourceAssignmentId}=request;
  const message=[
    'SOD1820 existing-owner-session ROUTING PROBE — READ_ONLY ONLY.',
    'TEST_ID='+testId,'TASK_KEY='+taskKey,'SOURCE_ASSIGNMENT_ID='+sourceAssignmentId,
    'OWNER_CLAIM_ID='+claim.id,'EXPECTED_HEAD='+claim.expectedHeadSha,'ACK_NONCE='+nonce,'ACK_EXPIRES_AT='+expiresAt,
    'Verify recipient identity, scope and current head again BEFORE recording an ACK.',
    'Do not modify files, transfer ownership, start another session, merge, deploy, or change DB.',
    'A provider send receipt is not owner acceptance. Record ONE correlated passive ACK to ZURIEL only if actually received.',
  ].join('\n');
  const plan=Object.freeze({action:'SEND_TO_EXISTING_CLAUDE_SESSION',targetSessionId:claim.sessionId,
    ownerClaimId:claim.id,sourceAssignmentId,expectedHeadSha:claim.expectedHeadSha,
    taskKey,testId,message,nonce,expiresAt,createdAt:new Date(clock).toISOString(),
    idempotencyKey:r.idempotencyKey,synthetic:adapters.synthetic===true,
    providerProven:false,// no authenticated provider proof exists in this branch
    request:Object.freeze({...request}),mustNotSpawn:true,autoRetry:false});
  PLANS.add(plan);
  return plan;
}

/**
 * Re-verifies identity/scope/session/head, atomically takes the persisted route
 * idempotency key, then sends once through a caller-supplied sanctioned executor.
 * Plain-object plans and untrusted adapter sets are rejected. Never retries.
 */
export async function sendToExistingOwner(plan,{adapters,execCli,now=new Date()}={}){
  const block=reason=>({state:'BLOCKED',reason,autoRetry:false});
  if (!PLANS.has(plan)) return block(plan?.reason||'INVALID_OR_UNTRUSTED_PLAN');
  if (typeof execCli!=='function') return block('SANCTIONED_AUTHENTICATED_EXECUTOR_REQUIRED');
  const clock=clockOf(now);
  if (!Number.isFinite(clock)) return block('CLOCK_INVALID');
  if (clock>Date.parse(plan.expiresAt)) return block('PLAN_EXPIRED');
  const again=await evaluate(adapters,plan.request,clock);
  if (!again.ok) return block('RECHECK_FAILED_'+again.reason);
  if (again.idempotencyKey!==plan.idempotencyKey) return block('RECHECK_FAILED_PLAN_DRIFT');
  const taken=await readOnce(()=>adapters.idempotency.take(plan.idempotencyKey));
  if (!taken || taken.taken!==true) return block('DUPLICATE_OR_UNCONFIRMED_SEND_BLOCKED');
  if (adapters.synthetic!==true && !(taken.durable===true && taken.atomic===true)) return block('DURABLE_ATOMIC_IDEMPOTENCY_REQUIRED');
  try {
    const stdout=await execCli(['-p',plan.message,'--cloud',plan.targetSessionId,'--output-format','json']);
    let result;
    try {result=JSON.parse(stdout);}catch{return {state:'UNKNOWN_DELIVERY',reason:'NON_JSON_PROVIDER_RESPONSE',autoRetry:false};}
    if(result?.ok===false) return block('PROVIDER_DENIED');
    if(result?.ok!==true || !comparableSessionId(result?.session_id)) return {state:'UNKNOWN_DELIVERY',reason:'UNRECOGNIZED_PROVIDER_RECEIPT',autoRetry:false};
    if(result.session_id!==plan.targetSessionId) return {state:'UNKNOWN_DELIVERY',reason:'PROVIDER_SESSION_ID_UNVERIFIED',autoRetry:false};
    return {state:'SENT_AWAITING_OWNER_ACK',sessionId:plan.targetSessionId,taskKey:plan.taskKey,testId:plan.testId,
      synthetic:plan.synthetic,providerProven:false,autoRetry:false};
  }catch(e){
    // Never echo provider exceptions: they can contain credentials or request metadata.
    const errorText=String(e?.message||e).toLowerCase();
    const reason=errorText.includes('interfere with workloads')
      ? 'PROVIDER_PERMISSION_DENIED'
      : /auth|login|credential|token|permission|forbidden|access.denied/.test(errorText)
        ? 'PROVIDER_AUTH_OR_PERMISSION_FAILURE'
        : 'PROVIDER_SEND_EXCEPTION';
    return block(reason);
  }
}

/**
 * Owner ACK verification. A matching work_log row alone is NOT proof: the receipt must be
 * authenticated by the adapter, carry the plan's unique nonce, arrive before expiry, and be
 * consumed exactly once in persisted storage (replay => rejected). Fails closed otherwise.
 */
export async function verifyOwnerSessionAck(receipt,plan,{adapters,now=new Date()}={}){
  const no=reason=>Object.freeze({ok:false,reason});
  if (!PLANS.has(plan)) return no('INVALID_OR_UNTRUSTED_PLAN');
  if (!ADAPTER_SETS.has(adapters)) return no('ADAPTERS_NOT_TRUSTED_OR_NOT_WIRED');
  if (!receipt) return no('ACK_MISSING');
  const clock=clockOf(now);
  if (!Number.isFinite(clock)) return no('CLOCK_INVALID');
  const c=receipt.dispatch_context||{};
  const matches=receipt.task_key===plan.taskKey && receipt.parent_assignment_id===plan.sourceAssignmentId
    && receipt.from_actor==='CLAUDE' && receipt.to_actor==='ZURIEL'
    && receipt.status==='OWNER_SESSION_RECEIVED_PASS'
    && receipt.dispatch_kind==null && receipt.dispatch_state==null
    && c.test_id===plan.testId && c.owner_claim_id===plan.ownerClaimId
    && c.source_assignment_id===plan.sourceAssignmentId
    && c.owner_session_id===plan.targetSessionId
    && c.expected_head_sha===plan.expectedHeadSha && c.no_product_changes===true
    && c.ack_nonce===plan.nonce;
  if (!matches) return no('ACK_FIELDS_OR_NONCE_MISMATCH');
  const auth=await readOnce(()=>adapters.ack.authenticate(receipt));
  if (!auth || auth.authenticated!==true || auth.actor!=='CLAUDE' || !auth.receipt_id
    || auth.session_id!==plan.targetSessionId) return no('ACK_NOT_AUTHENTICATED');
  const at=Date.parse(auth.received_at||'');
  if (!Number.isFinite(at) || at<Date.parse(plan.createdAt) || at>Date.parse(plan.expiresAt) || clock>Date.parse(plan.expiresAt))
    return no('ACK_EXPIRED_OR_OUT_OF_WINDOW');
  const used=await readOnce(()=>adapters.ack.consume(plan.nonce,auth.receipt_id));
  if (!used) return no('ACK_CONSUME_STORE_NOT_WIRED');
  if (used.consumed!==true) return no('ACK_REPLAY_REJECTED');
  if (adapters.synthetic!==true && !(used.durable===true && used.atomic===true)) return no('DURABLE_ATOMIC_CONSUME_REQUIRED');
  return Object.freeze({ok:true,synthetic:adapters.synthetic===true,providerProven:false});
}
