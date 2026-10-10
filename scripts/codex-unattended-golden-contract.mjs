/** SOD1820 Golden acceptance. No deployed transport; RPC port is offline-only. */
import {createPublicKey,verify,randomUUID} from 'node:crypto';
const deny=reason=>({status:'BLOCKED',reason,executed:false});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotency=/^[A-Za-z0-9_:-]{16,128}$/;
const money=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
// Public key must come from a trusted runner setting, NEVER from the caller payload.
export function verifySignedAssignment(e,key,now){
 if(!Number.isSafeInteger(now)||now<0)return deny('INVALID_CLOCK');
 if(!key||typeof key!=='string'||!e||typeof e.payload_b64!=='string'||typeof e.signature_b64!=='string'||e.payload_b64.length>16384||!/^[A-Za-z0-9_-]+$/.test(e.payload_b64)||!/^[A-Za-z0-9_-]+$/.test(e.signature_b64))return deny('UNTRUSTED_ENVELOPE');
 try{
  if(!verify(null,Buffer.from(e.payload_b64,'utf8'),createPublicKey(key),Buffer.from(e.signature_b64,'base64url')))return deny('SIGNATURE_INVALID');
  const j=JSON.parse(Buffer.from(e.payload_b64,'base64url').toString('utf8'));
  if(!j||Array.isArray(j)||j.contract!=='REMOTE_CODEX_EXECUTOR_BRIDGE_V1'||j.actor!=='GPT'||!uuid.test(j.assignment_id||'')||!idempotency.test(j.idempotency_key||'')||j.task_key!=='REMOTE_CODEX_EXECUTOR_BRIDGE_V1'||j.workflow_mode!=='EXECUTE_BOUNDED'||!['offline_golden','paid'].includes(j.mode)||j.production_write_requested!==false||!Number.isSafeInteger(j.issued_at_ms)||!Number.isSafeInteger(j.expires_at_ms)||j.expires_at_ms<=j.issued_at_ms||j.expires_at_ms-j.issued_at_ms>900000||now<j.issued_at_ms-30000||now>=j.expires_at_ms||!Number.isSafeInteger(j.timeout_ms)||j.timeout_ms<1000||j.timeout_ms>90000||!Number.isInteger(j.attempt)||j.attempt<1||j.attempt>2)return deny('INVALID_SIGNED_ASSIGNMENT');
  return {status:'SIGNED_ASSIGNMENT_VALID',job:j};
 }catch{return deny('SIGNATURE_OR_PAYLOAD_INVALID');}
}
// 'evidence' must be assembled SERVER-SIDE by an independently authenticated adapter
// reading canonical work_log and provider records. NEVER accept it from the job body.
export function checkTrustedEvidence(j,e,now,claim=null){
 if(!Number.isSafeInteger(now)||now<0)return deny('INVALID_CLOCK');
 if(claim&&(claim.status!=='OFFLINE_CANONICAL_CLAIM_ACQUIRED'||claim.assignment_id!==j.assignment_id||claim.task_key!==j.task_key||claim.idempotency_key!==j.idempotency_key||claim.dispatch_attempts!==1||e?.dispatch_attempts!==1||claim.lease_valid_until_ms!==e?.lease_valid_until_ms))return deny('CANONICAL_CLAIM_MISMATCH');
 if(!e||e.identity!=='trusted-work-log-adapter'||e.workflow_mode!=='EXECUTE_BOUNDED'||e.assignment_mode!=='WRITE'||e.assignment_id!==j.assignment_id||e.one_active_writer_verified!==true||e.owner_verified!==true||e.lease_owner!==(claim?.lease_owner||'CODEX_RUNNER')||!Number.isSafeInteger(e.lease_valid_until_ms)||e.lease_valid_until_ms<=now||e.lease_valid_until_ms-now>120000||e.lease_valid_until_ms<now+j.timeout_ms||e.idempotency_key!==j.idempotency_key||!Number.isSafeInteger(e.checked_at_ms)||Math.abs(now-e.checked_at_ms)>30000)return deny('TRUSTED_COORDINATION_EVIDENCE_MISSING');
 if(j.mode==='offline_golden')return {status:'OFFLINE_ACCEPTED_NO_PROVIDER',executed:false};
 const p=e.provider;
 // Quoted token cost is NOT a dollar-denominated hard stop. Fail if external cap unverified.
 if(!p||p.source!=='authenticated-provider-adapter'||p.hard_stop_enforced!==true||p.approved_this_exact_run!==true||p.secrets_present_server_side!==true||p.model_verified_supported!==true||!Number.isSafeInteger(p.checked_at_ms)||Math.abs(p.checked_at_ms-now)>60000||!money(p.approved_usd)||!money(p.provider_hard_remaining_usd)||!money(p.quoted_request_max_usd)||!money(p.monthly_remaining_usd)||p.quoted_request_max_usd<=0||p.quoted_request_max_usd>0.10||p.quoted_request_max_usd>p.approved_usd||p.quoted_request_max_usd>p.provider_hard_remaining_usd||p.quoted_request_max_usd>p.monthly_remaining_usd)return deny('PAID_PROVIDER_ENFORCEMENT_UNVERIFIED');
 return {status:'PAID_PREFLIGHT_PASSED_NO_EXECUTION',executed:false};
}
/**
 * Server-only claim port for OFFLINE acceptance, never a paid execution grant.
 * rpc and clock must be supplied by the trusted host, not the signed job/body.
 * Requires agent_dispatch_claim's atomic UPDATE/RETURNING consumption marker;
 * no read-then-write lock, local nonce cache, new RPC or coordination store.
 * A lost response burns this assignment's approval. The existing requeue resets
 * attempts, so that counter alone MUST NOT be treated as replay protection.
 */
export async function claimOfflineGoldenOnce({envelope,publicKeyPem,rpc,clock}={}){
 if(typeof rpc!=='function'||typeof clock!=='function')return deny('TRUSTED_PORTS_MISSING');
 try{
  envelope={payload_b64:envelope?.payload_b64,signature_b64:envelope?.signature_b64};
  const v=verifySignedAssignment(envelope,publicKeyPem,clock());
  if(v.status!=='SIGNED_ASSIGNMENT_VALID')return v;
  const j=v.job;
  if(j.mode!=='offline_golden')return deny('GOLDEN_FIXTURE_REJECTS_PAID_MODE');
  if(j.attempt!==1)return deny('ONE_SHOT_ATTEMPT_REQUIRED');
  const worker=`CODEX_RUNNER:${randomUUID()}`; // Lease token, not a new actor.
  const {data:a,error}=await rpc('agent_dispatch_claim',{
   p_assignment_id:j.assignment_id,p_worker:worker,p_lease_seconds:120,
  });
  if(error)return deny('CANONICAL_CLAIM_UNAVAILABLE');
  if(!a)return deny('LEASE_NOT_ACQUIRED');
  const now=clock(); // Do not reuse the pre-RPC timestamp after a slow response.
  const fresh=verifySignedAssignment(envelope,publicKeyPem,now);
  if(fresh.status!=='SIGNED_ASSIGNMENT_VALID')return fresh;
  if(a.dispatch_attempts!==1)return deny('CANONICAL_ATTEMPT_ALREADY_CONSUMED');
  const c=a.dispatch_context;
  const consumed=c?.codex_consumption;
  if(consumed?.version!==1||consumed.idempotency_key!==j.idempotency_key||
     consumed.lease_owner!==worker||!Number.isFinite(Date.parse(consumed.consumed_at)))
   return deny('CANONICAL_CONSUMPTION_UNVERIFIED');
  const lease=typeof a.dispatch_lease_expires_at==='string'?Date.parse(a.dispatch_lease_expires_at):NaN;
  if(a.id!==j.assignment_id||a.task_key!==j.task_key||a.to_actor!=='GPT'||
     a.dispatch_kind!=='ASSIGNMENT'||a.assignment_mode!=='WRITE'||
     a.archived!==false||a.superseded_by_id!==null||a.dispatch_state!=='CLAIMED'||
     a.dispatch_lease_owner!==worker||!Number.isSafeInteger(lease)||
     lease-now>120000||lease<now+j.timeout_ms||
     c?.created_via!=='work_log_assign_agent_v1'||c.codex_workflow_mode!=='EXECUTE_BOUNDED'||
     c.codex_execution_mode!=='offline_golden'||
     c.idempotency_key!==j.idempotency_key)return deny('CANONICAL_CLAIM_MISMATCH');
  return {status:'OFFLINE_CANONICAL_CLAIM_ACQUIRED',executed:false,paidRequest:false,
   assignment_id:a.id,task_key:a.task_key,lease_owner:worker,lease_valid_until_ms:lease,
   dispatch_attempts:a.dispatch_attempts,idempotency_key:c.idempotency_key};
 }catch{
  // RPC errors can contain credentials/row data. Never return their messages.
  return deny('CANONICAL_CLAIM_UNAVAILABLE');
 }
}
// Acceptance-only ports: existing canonical atomic lease, existing AFTER, existing GPT wake.
// No HTTP, schema, worker, queue, model call or production write in this fixture.
export async function goldenAcceptance({envelope,publicKeyPem,atMs,adapter,executor}){
 const v=verifySignedAssignment(envelope,publicKeyPem,atMs);
 if(v.status!=='SIGNED_ASSIGNMENT_VALID')return v;
 const j=v.job;
 if(j.mode!=='offline_golden')return deny('GOLDEN_FIXTURE_REJECTS_PAID_MODE');
 if(!adapter||!executor||!['claim','readAuthoritativeEvidence','finish','wakeGPT'].every(k=>typeof adapter[k]==='function')||typeof executor.runFixture!=='function')return deny('TRUSTED_PORTS_MISSING');
 const claim=await adapter.claim(j);
 if(claim==='ALREADY_COMPLETED')return {status:'IDEMPOTENT_ALREADY_COMPLETED',executed:false};
 const canonicalClaim=claim?.status==='OFFLINE_CANONICAL_CLAIM_ACQUIRED'?claim:null;
 if(claim!=='ACQUIRED'&&!canonicalClaim)return deny('LEASE_NOT_ACQUIRED');
 try{
  const proof=checkTrustedEvidence(j,await adapter.readAuthoritativeEvidence(j),atMs,canonicalClaim);
  if(proof.status!=='OFFLINE_ACCEPTED_NO_PROVIDER'){
   await adapter.finish(j,{status:'BLOCKED',reason:proof.reason});
   return proof;
  }
  const receipt=await executor.runFixture({task_key:j.task_key,assignment_id:j.assignment_id,scope:'README_TEST_FIXTURE_ONLY',timeout_ms:j.timeout_ms});
  if(!receipt||receipt.tests_passed!==true||!/^[0-9a-f]{40}$/i.test(receipt.commit_sha||'')||receipt.production_changed!==false||receipt.paid_model_calls!==0){
   await adapter.finish(j,{status:'FAILED',reason:'GOLDEN_FIXTURE_RECEIPT_INVALID'});
   return deny('GOLDEN_FIXTURE_RECEIPT_INVALID');
  }
  if(await adapter.finish(j,{status:'AFTER',receipt})!=='COMMITTED_ONCE')return deny('AFTER_NOT_COMMITTED');
  const w=await adapter.wakeGPT(j);
  return {status:w==='ACK_ONCE'?'GOLDEN_SIMULATED_PASS':'GPT_WAKE_NOT_VERIFIED',executed:true,paidModelCalls:0,commitSha:receipt.commit_sha};
 }catch{
  try{await adapter.finish(j,{status:'FAILED',reason:'BOUNDED_EXECUTION_ERROR'});}catch{}
  return deny('BOUNDED_EXECUTION_ERROR');
 }
}
