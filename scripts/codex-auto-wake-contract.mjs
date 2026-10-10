#!/usr/bin/env node
/**
 * SOD1820 Codex auto-wake contract V1: PURE, offline, no transport.
 * No DB, HTTP, secret, Codex, or expense side effects.
 *
 * Existing owner is inter_agent_coordination_law v13 / public.work_log.
 * This does not create a second queue or an agent identity.
 */
import { verify as cryptoVerify, createPublicKey } from 'node:crypto';

const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny=(reason)=>({status:'BLOCKED',reason,executed:false,paidRequest:false});
const validInt=x=>Number.isSafeInteger(x)&&x>=0;
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const match=(a,b)=>typeof a==='string'&&a.length>0&&a===b;

/** The signature binds the exact JSON payload bytes, not a string chosen by an untrusted caller. */
export function verifyOperatorPermit(permit, publicKeyPem) {
  if(!permit||typeof permit!=='object'||Array.isArray(permit))return false;
  const {payload,signature}=permit;
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||!publicKeyPem||
     typeof signature!=='string'||! /^[A-Za-z0-9_-]{40,150}$/.test(signature))return false;
  try{
    const bytes=Buffer.from(JSON.stringify(payload),'utf8');
    const sig=Buffer.from(signature,'base64url');
    const key=createPublicKey(publicKeyPem);
    if(key.asymmetricKeyType!=='ed25519'||sig.length!==64)return false;
    return cryptoVerify(null,bytes,key,sig);
  }catch{return false;}
}

/**
 * A deliberately non-executable gate. Passing means only "eligible for later
 * authenticated acceptance", never permission to start a paid process.
 *
 * The final trusted runner MUST independently read the canonical DB assignment,
 * claim via agent_dispatch_claim, enforce provider/server cost ceilings, and
 * use a replay-protected one-shot operator permit from an authorized issuer.
 */
export function assessAutoWake({assignment,permit,publicKeyPem,provider,now='2026-10-10T16:00:00Z',project='linswmnnkjxvweumprav'}={}) {
  const a=assignment;
  if(!a||!uuidRe.test(a.id||''))return deny('MISSING_CANONICAL_ASSIGNMENT');
  if(a.to_actor!=='GPT'||a.dispatch_kind!=='ASSIGNMENT')return deny('NOT_GPT_ASSIGNMENT');
  if(a.archived===true||a.superseded_by_id)return deny('STALE_ASSIGNMENT');
  if(!['QUEUED','RETRY_WAIT'].includes(a.dispatch_state))return deny('NOT_CLAIMABLE');
  if(!validInt(a.dispatch_attempts)||a.dispatch_attempts>=3)return deny('RETRY_EXHAUSTED');
  if(!validIso(now))return deny('INVALID_CLOCK');
  if(a.dispatch_next_attempt_at && (!validIso(a.dispatch_next_attempt_at) ||
    Date.parse(a.dispatch_next_attempt_at)>Date.parse(now)))return deny('BACKOFF_ACTIVE');
  if(a.dispatch_lease_owner||a.dispatch_lease_expires_at)return deny('ACTIVE_OR_STALE_LEASE_REQUIRES_CANONICAL_RECOVERY');
  if(a.assignment_mode!=='WRITE')return deny('GOLDEN_FIXTURE_REQUIRES_BRANCH_ONLY_WRITE');
  const release=(a.release_authorization_state||'').toUpperCase();
  if(!release.startsWith('BRANCH_ONLY')||!release.includes('NO_MERGE')||!release.includes('NO_DEPLOY'))return deny('RELEASE_ENVELOPE_INSUFFICIENT');
  if(!/^[-A-Z0-9_]{6,160}$/.test(a.task_key||'')||typeof a.primary_owner!=='string'||!a.primary_owner.trim())return deny('OWNER_OR_TASK_MISSING');
  if(!a.dispatch_context||a.dispatch_context.created_via!=='work_log_assign_agent_v1')return deny('ASSIGNMENT_ORIGIN_UNVERIFIED');
  if(!verifyOperatorPermit(permit,publicKeyPem))return deny('PERMIT_SIGNATURE_UNVERIFIED');
  const c=permit.payload;
  if(c.version!==1||c.issuer!=='SOD1820_TRUSTED_OPERATOR'||c.action!=='CODEX_GOLDEN_ONCE')return deny('PERMIT_PURPOSE_MISMATCH');
  if(!uuidRe.test(c.approval_id||'')||!validIso(c.expires_at)||
     Date.parse(c.expires_at)<=Date.parse(now)||Date.parse(c.expires_at)-Date.parse(now)>3600000)return deny('PERMIT_EXPIRED_OR_TOO_LONG');
  if(!match(c.assignment_id,a.id)||!match(c.task_key,a.task_key)||!match(c.scope,a.assignment_scope)||
     !match(c.project_id,project))return deny('PERMIT_ASSIGNMENT_MISMATCH');
  if(typeof c.branch!=='string'||!/^codex\/golden-[a-z0-9-]{3,70}$/.test(c.branch))return deny('UNSAFE_TARGET_BRANCH');
  if(JSON.stringify(a.dispatch_context.github_paths)!==JSON.stringify(['README.md']))return deny('GOLDEN_FILE_SCOPE_MISMATCH');
  if(c.allowed_files?.length!==1||c.allowed_files[0]!=='README.md')return deny('PERMIT_FILE_SCOPE_MISMATCH');
  if(!validInt(c.max_run_cents)||c.max_run_cents===0||c.max_run_cents>100)return deny('INVALID_MAX_PAID_BUDGET');
  if(!provider||provider.evidence_source!=='TRUSTED_PROVIDER_ADAPTER'||
     provider.hard_cap_verified!==true||!validInt(provider.remaining_cents)||
     provider.remaining_cents<c.max_run_cents)return deny('PROVIDER_HARD_BUDGET_UNVERIFIED');
  if(provider.max_agent_turns!==1||provider.max_parallel_runs!==1)return deny('UNBOUNDED_EXECUTION');
  return {status:'OFFLINE_POLICY_ELIGIBLE_NOT_EXECUTABLE',executed:false,paidRequest:false,
    task_key:a.task_key,assignment_id:a.id,branch:c.branch,max_run_cents:c.max_run_cents,
    note:'Signature and fixtures validated. No live provider evidence, runner identity, replay store, DB lease, secret handoff or GPT wake verified.'};
}

export function assessResultWake({after,original}={}) {
  if(!after||!original||after.dispatch_kind!=='RESULT_WAKE'||
     after.dispatch_state!=='QUEUED'||after.to_actor!==original.from_actor||
     !match(after.parent_assignment_id,original.id)||!match(after.task_key,original.task_key))
    return deny('RESULT_WAKE_NOT_IN_CANONICAL_LEDGER');
  return {status:'RESULT_WAKE_QUEUED_TRANSPORT_UNVERIFIED',executed:false,paidRequest:false,
    note:'Creating a RESULT_WAKE row does not prove an external GPT session was awakened.'};
}
