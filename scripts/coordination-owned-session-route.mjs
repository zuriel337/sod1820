// SOD1820 coordination-only proposal. NOT connected to live Dispatch.
// Decisions are only as trustworthy as the supplied *fresh, authorized* ledger/provider reads.
// v17 stays active: GPT-addressed wake/ACK and automatic agent activation are forbidden.

const SESSION_RE = /^(?:session|cse)_[A-Za-z0-9]+$/;
const SHA_RE = /^[a-fA-F0-9]{40}$/;
const MAX_HEARTBEAT_AGE_MS = 5 * 60_000;
const MAX_SNAPSHOT_AGE_MS = 60_000;
const MAX_APPROVAL_AGE_MS = 5 * 60_000;

const hold = reason => Object.freeze({action:'HOLD',reason,mustNotSpawn:true,autoRetry:false});

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

/**
 * PLAN ONLY. The production caller must independently authenticate the user
 * approval, verify the git branch/head against the provider, and obtain an
 * exhaustive scoped owner scan from work_log; JSON booleans aren't proof.
 */
export function planOwnedSessionRoute({
  lawVersion, userAuthorization, senderAccountId, targetActor='CLAUDE',
  targetClaimId,targetSessionId,requestedPaths,taskKey,testId,sourceAssignmentId,
  candidateClaims,ownerSnapshotAt,alreadyDispatched=false,now=new Date(),
}) {
  const clock=new Date(now).getTime();
  if (!Number.isFinite(clock)) return hold('CLOCK_INVALID');
  if (lawVersion!==17) return hold('LAW_VERSION_NOT_VERIFIED');
  if (targetActor==='GPT') return hold('V17_GPT_DELIVERY_DISABLED');
  if (targetActor!=='CLAUDE') return hold('TARGET_RUNTIME_NOT_SUPPORTED');
  if (userAuthorization?.explicit!==true || userAuthorization?.allowExistingSessionMessage!==true
      || userAuthorization?.targetClaimId!==targetClaimId
      || userAuthorization?.targetSessionId!==targetSessionId
      || userAuthorization?.taskKey!==taskKey
      || !isFresh(userAuthorization?.approvedAt,MAX_APPROVAL_AGE_MS,clock)) return hold('EXPLICIT_SCOPED_USER_APPROVAL_REQUIRED');
  if (!sourceAssignmentId || !targetClaimId || !taskKey || !testId) return hold('CORRELATION_ID_REQUIRED');
  if (!comparableSessionId(targetSessionId)) return hold('PROVIDER_SESSION_ID_REQUIRED');
  if (!senderAccountId) return hold('SENDER_ACCOUNT_UNVERIFIED');
  if (alreadyDispatched) return hold('ALREADY_SENT_NO_DUPLICATE');
  if (!Array.isArray(requestedPaths)||requestedPaths.length<1||requestedPaths.length>40) return hold('REQUESTED_PATHS_MISSING');
  const wanted=requestedPaths.map(x=>safePath(x));
  if(wanted.some(x=>!x)) return hold('UNSAFE_REQUESTED_PATH');
  if (!Array.isArray(candidateClaims) || !isFresh(ownerSnapshotAt,MAX_SNAPSHOT_AGE_MS,clock)) return hold('FRESH_EXHAUSTIVE_OWNER_SCAN_REQUIRED');

  const overlapping=[];
  for(const c of candidateClaims) {
    if (c.assignment_mode!=='WRITE'||c.archived||c.superseded_by_id||c.released) continue;
    const owned=Array.isArray(c.github_paths)?c.github_paths.map(x=>safePath(x,{directoryAllowed:true})):[];
    // If historical claims have no paths, we cannot prove absence of overlap.
    if(!owned.length || owned.some(x=>!x)) return hold('UNRECONCILED_OWNER_PATHS');
    if(owned.some(x=>wanted.some(y=>covers(x,y)||covers(y,x)))) overlapping.push({claim:c,paths:owned});
  }
  if (!overlapping.length) return hold('NO_VERIFIED_OWNER_FOR_PATHS');
  if (overlapping.length!==1) return hold('CONFLICTING_OWNER_CLAIMS');
  const {claim,paths}=overlapping[0];
  if (claim.id!==targetClaimId || (claim.to_actor!==targetActor && claim.from_actor!==targetActor)) return hold('OWNER_CLAIM_MISMATCH');
  if (!wanted.every(x=>paths.some(y=>covers(y,x)))) return hold('REQUESTED_PATH_OUTSIDE_OWNER');
  if (!comparableSessionId(claim.session_id)||claim.session_id!==targetSessionId) return hold('EXACT_OWNER_SESSION_ID_NOT_VERIFIED');
  if (!claim.account_id || claim.account_id!==senderAccountId) return hold('SAME_ACCOUNT_UNVERIFIED');
  if (!SHA_RE.test(claim.expected_head_sha||'') || claim.current_head_sha!==claim.expected_head_sha) return hold('GIT_HEAD_NOT_VERIFIED');
  const lease=Date.parse(claim.dispatch_lease_expires_at||'');
  const activeLease=claim.dispatch_state==='CLAIMED' && Number.isFinite(lease) && lease>clock;
  const heartbeat=claim.session_live_attested===true && isFresh(claim.last_heartbeat_at,MAX_HEARTBEAT_AGE_MS,clock);
  if (!activeLease && !heartbeat) return hold('OWNER_SESSION_ACTIVITY_UNVERIFIED');

  const message=[
    'SOD1820 existing-owner-session ROUTING PROBE — READ_ONLY ONLY.',
    'TEST_ID='+testId,'TASK_KEY='+taskKey,'SOURCE_ASSIGNMENT_ID='+sourceAssignmentId,
    'OWNER_CLAIM_ID='+targetClaimId,'EXPECTED_HEAD='+claim.expected_head_sha,
    'Verify recipient identity, scope and current head again BEFORE recording an ACK.',
    'Do not modify files, transfer ownership, start another session, merge, deploy, or change DB.',
    'A provider send receipt is not owner acceptance. Record ONE correlated passive ACK to ZURIEL only if actually received.',
  ].join('\n');
  return Object.freeze({action:'SEND_TO_EXISTING_CLAUDE_SESSION',targetSessionId:claim.session_id,
    ownerClaimId:claim.id,sourceAssignmentId,expectedHeadSha:claim.expected_head_sha,
    taskKey,testId,message,mustNotSpawn:true,autoRetry:false});
}

// Uses only a caller-provided sanctioned, authenticated Claude CLI executor.
// The caller must NOT try an alternate path after denial/unknown result.
export async function sendToExistingOwner(plan,execCli){
  if(plan?.action!=='SEND_TO_EXISTING_CLAUDE_SESSION') return {state:'BLOCKED',reason:plan?.reason||'INVALID_PLAN',autoRetry:false};
  if(typeof execCli!=='function') return {state:'BLOCKED',reason:'SANCTIONED_AUTHENTICATED_EXECUTOR_REQUIRED',autoRetry:false};
  try {
    const stdout=await execCli(['-p',plan.message,'--cloud',plan.targetSessionId,'--output-format','json']);
    let result;
    try {result=JSON.parse(stdout);}catch{return {state:'UNKNOWN_DELIVERY',reason:'NON_JSON_PROVIDER_RESPONSE',autoRetry:false};}
    if(result?.ok===false) return {state:'BLOCKED',reason:'PROVIDER_DENIED',autoRetry:false};
    if(result?.ok!==true || !comparableSessionId(result?.session_id)) return {state:'UNKNOWN_DELIVERY',reason:'UNRECOGNIZED_PROVIDER_RECEIPT',autoRetry:false};
    if(result.session_id!==plan.targetSessionId) return {state:'UNKNOWN_DELIVERY',reason:'PROVIDER_SESSION_ID_UNVERIFIED',autoRetry:false};
    return {state:'SENT_AWAITING_OWNER_ACK',sessionId:plan.targetSessionId,taskKey:plan.taskKey,testId:plan.testId,autoRetry:false};
  }catch(e){return {state:'BLOCKED',reason:String(e?.message||e).slice(0,240),autoRetry:false};}
}

/** Correlation of a passive work_log record; NOT cryptographic proof of actor. */
export function verifyOwnerSessionAck(receipt,plan){
  if(plan?.action!=='SEND_TO_EXISTING_CLAUDE_SESSION'||!receipt)return false;
  const c=receipt.dispatch_context||{};
  return receipt.task_key===plan.taskKey && receipt.parent_assignment_id===plan.sourceAssignmentId
    && receipt.from_actor==='CLAUDE' && receipt.to_actor==='ZURIEL'
    && receipt.status==='OWNER_SESSION_RECEIVED_PASS'
    && receipt.dispatch_kind==null && receipt.dispatch_state==null
    && c.test_id===plan.testId && c.owner_claim_id===plan.ownerClaimId
    && c.source_assignment_id===plan.sourceAssignmentId
    && c.owner_session_id===plan.targetSessionId
    && c.expected_head_sha===plan.expectedHeadSha && c.no_product_changes===true;
}
