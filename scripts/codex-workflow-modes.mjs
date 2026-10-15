/**
 * Canonical Codex workflow refinement for existing inter_agent_coordination_law v13.
 * This is a pure OFFLINE verifier. It neither claims work_log nor starts Codex.
 * The trusted executor must use a fresh privileged live assignment read + claim RPC.
 */
export const RECON_READ_ONLY='RECON_READ_ONLY';
export const EXECUTE_BOUNDED='EXECUTE_BOUNDED';
const BROAD=new Set(['ARCHITECTURE','CLEANUP','CROSS_SYSTEM','AMBIGUOUS','LEGACY_CUTOVER','HIGH_BLAST_RADIUS','RETIREMENT']);
const ESCALATE=new Set(['NEW_CONSUMER','UNEXPECTED_WRITER','CROSS_SYSTEM_DISCOVERY','LIVE_DRIFT','UNKNOWN_PROVENANCE','OUT_OF_SCOPE_CHANGE']);
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const fail=(reason)=>({status:'BLOCKED',reason,executionStarted:false,paidRequest:false});
const nonempty=v=>typeof v==='string' && v.trim().length>0;
const list=v=>Array.isArray(v)?v:[];

export function needsImplementationRecon(intentTags=[]) {
  return list(intentTags).some(tag=>BROAD.has(tag));
}
export function routeCodexMode(intentTags=[]) {
  return needsImplementationRecon(intentTags)?RECON_READ_ONLY:EXECUTE_BOUNDED;
}
const safePath=p=>nonempty(p)&&p.length<=240&&!p.startsWith('/')&&!p.startsWith('-')&&
 !p.includes('\\')&&!p.includes('\0')&&!p.split('/').some(s=>s==='..'||s==='.'||s==='')&&
 !/[?*[\]{}]/.test(p)&&!p.startsWith('.env')&&!p.includes('/.env');
const sameArray=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]);

/**
 * The accepted signal MUST come from a scoped, operator-verified canonical
 * source snapshot; never interpret JSON checkboxes as independent proof.
 */
export function assessCodexWorkflow({assignment,mode,plan,recon,source={},now=new Date().toISOString()}={}) {
  const a=assignment, c=a?.dispatch_context;
  if(!a||!UUID.test(a.id||'')||a.to_actor!=='GPT'||a.dispatch_kind!=='ASSIGNMENT')return fail('CANONICAL_ASSIGNMENT_REQUIRED');
  if(a.archived===true||a.superseded_by_id||!['QUEUED','RETRY_WAIT'].includes(a.dispatch_state))
    return fail('ASSIGNMENT_NOT_CURRENT_OR_AVAILABLE');
  if(!c||c.codex_workflow_mode!==mode||![RECON_READ_ONLY,EXECUTE_BOUNDED].includes(mode))return fail('EXPLICIT_CODEX_WORKFLOW_MODE_REQUIRED');
  if(a.dispatch_lease_owner||a.dispatch_lease_expires_at)return fail('CANONICAL_LEASE_NOT_CLEAR');
  if(!nonempty(a.primary_owner)||!nonempty(a.assignment_scope))return fail('OWNER_OR_SCOPE_MISSING');
  if(source.origin!=='PRIVILEGED_CANONICAL_READ'||source.verified_owner!==true||!SHA.test(source.main_sha||''))
    return fail('LIVE_OWNER_AND_MAIN_VERIFICATION_REQUIRED');
  if(!Number.isFinite(Date.parse(now)))return fail('INVALID_TIME');
  if(!Number.isFinite(Date.parse(source.observed_at))||
     Date.parse(source.observed_at)>Date.parse(now)+60000||
     Date.parse(now)-Date.parse(source.observed_at)>300000) return fail('STALE_CANONICAL_SNAPSHOT');
  const tags=list(c.codex_intent_tags);
  if(!tags.length||tags.some(x=>!nonempty(x)))return fail('INTENT_CLASSIFICATION_REQUIRED');
  if(mode===RECON_READ_ONLY){
    if(a.assignment_mode!=='READ_ONLY'||c.codex_no_write!==true||
       list(c.codex_allowed_write_paths).length!==0)return fail('RECON_MUST_BE_READ_ONLY');
    if(c.codex_disposition==='DELETE'||c.codex_disposition==='PUBLISH')return fail('RECON_CANNOT_AUTHORIZE_DISPOSITION');
    return {status:'RECON_READ_ONLY_POLICY_READY_NO_EXECUTION',executionStarted:false,paidRequest:false,
      task_key:a.task_key,canonical_owner:a.primary_owner,assignment_id:a.id,main_sha:source.main_sha,
      required_report_fields:['canonical_owner','implementations','consumers','dependencies','legacy_duplicates',
        'active_writers','branch_release_live','drift','blast_radius','recommendation','coverage_unknowns'],
      note:'Repo/schema/runtime evidence must be collected by approved read-only operator; findings are evidence only.'};
  }
  if(a.assignment_mode!=='WRITE')return fail('EXECUTION_REQUIRES_CANONICAL_WRITE_SCOPE');
  const rel=(a.release_authorization_state||'').toUpperCase();
  if(!rel.startsWith('BRANCH_ONLY')||!rel.includes('NO_MERGE')||!rel.includes('NO_DEPLOY'))return fail('BRANCH_ONLY_RELEASE_REQUIRED');
  if(!plan||!nonempty(plan.owner_decision)||plan.owner_decision!==a.primary_owner||
     !nonempty(plan.stop_condition)||!nonempty(plan.verification)||
     !Array.isArray(plan.dependencies)||!Array.isArray(plan.allowed_paths)||
     plan.allowed_paths.length===0||plan.allowed_paths.length>20||
     plan.allowed_paths.some(p=>!safePath(p))||
     !sameArray(plan.allowed_paths,c.github_paths)||
     !sameArray(plan.allowed_paths,c.codex_allowed_write_paths))return fail('BOUND_WRITE_PLAN_OR_PATHS_INCOMPLETE');
  if(!nonempty(plan.branch)||!/^codex\/[a-z0-9-]{5,90}$/.test(plan.branch))return fail('UNSAFE_ISOLATED_BRANCH');
  if(c.codex_no_production_write!==true)return fail('PRODUCTION_WRITE_NOT_FORBIDDEN');
  if(list(c.codex_discovered_risks).some(r=>ESCALATE.has(r)))return fail('STOP_AND_RECON_NEW_BLAST_RADIUS');
  if(needsImplementationRecon(tags)){
    if(!recon||recon.status!=='GPT_CHALLENGED_OWNER_ACCEPTED'||recon.owner!==a.primary_owner||
       recon.main_sha!==source.main_sha||!UUID.test(recon.source_assignment_id||'')||
       recon.source_assignment_id===a.id||
       !nonempty(recon.coverage)||!nonempty(recon.gpt_challenge_ref)||
       !nonempty(recon.owner_decision_ref))return fail('RECON_AND_GPT_CHALLENGE_REQUIRED');
  }
  if(c.codex_disposition==='DELETE'||c.codex_disposition==='RETIRE'){
    const proof=plan.retirement_proof;
    if(!proof||proof.no_live_consumers!==true||proof.no_active_writers!==true||
       proof.no_runtime_obligation!==true||proof.no_provenance_obligation!==true||
       proof.reversible_or_archived!==true||proof.dry_run_evidence!==true||
       proof.human_gate!=='APPROVED' || !nonempty(proof.owner_disposition_ref))
      return fail('DESTRUCTIVE_HUMAN_GATE_AND_NEGATIVE_PROOF_REQUIRED');
  }
  return {status:'EXECUTE_BOUNDED_POLICY_READY_NO_EXECUTION',executionStarted:false,paidRequest:false,
    task_key:a.task_key,assignment_id:a.id,main_sha:source.main_sha,
    branch:plan.branch,write_paths:plan.allowed_paths,owner:a.primary_owner,
    note:'Offline validation only: lease, signature, file-write sandbox, credential, real provider limit and approval still required.'};
}

/** A partial map must disclose missing evidence explicitly; a missing consumer is never 'none'. */
export function projectImplementationReality(evidence={}) {
 const fields=['canonical_owner','implementations','consumers','dependencies','legacy_duplicates',
   'active_writers','branch_release_live','drift','blast_radius','recommendation'];
 const sources=list(evidence.sources).filter(x=>nonempty(x?.source)&&nonempty(x?.observed_at)).slice(0,30);
 const map={};
 const coverage_unknowns=[];
 for(const f of fields){
   const value=evidence[f];
   if(value===undefined||value===null||value===''){
     map[f]='UNKNOWN';coverage_unknowns.push(f);
   }else if(Array.isArray(value)&&value.length===0){
     map[f]='UNKNOWN';coverage_unknowns.push(f); // empty evidence does not prove absence
   }else{map[f]=value;}
 }
 if(sources.length===0)coverage_unknowns.push('sources');
 return {kind:'IMPLEMENTATION_REALITY_MAP',evidence_only:true,may_authorize_write:false,
   ...map,sources,coverage_unknowns,
   status:coverage_unknowns.length?'PARTIAL_EVIDENCE':'EVIDENCE_COLLECTED_UNVERIFIED'};
}
