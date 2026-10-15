#!/usr/bin/env node
/**
 * SOD1820 Codex stage-C mode-aware preflight.
 * Reads one JSON offline fixture. No DB, HTTP, code modification or model call.
 * DO NOT substitute this for the trusted canonical-work_log/lease/provider gateway.
 */
import {readFileSync} from 'node:fs';
import {assessCodexWorkflow,RECON_READ_ONLY,EXECUTE_BOUNDED} from './codex-workflow-modes.mjs';
const out=x=>process.stdout.write(JSON.stringify(x)+'\n');
const block=reason=>{out({status:'BLOCKED',reason,executed:false,paidRequest:false});process.exitCode=2;};
let job;
try{
 const raw=readFileSync(0,'utf8');
 if(raw.length>16384)throw Error('request too long');
 job=JSON.parse(raw);
 if(!job||typeof job!=='object'||Array.isArray(job))throw Error('invalid object');
}catch{block('INVALID_REQUEST_JSON');process.exit();}
const live=process.argv.includes('--live');
// Remove the historical environment-flag bypass completely. This condition
// must remain unconditional until a separately audited operator is deployed.
if(live){block('PAID_TRANSPORT_NOT_DEPLOYED');process.exit();}
if(![RECON_READ_ONLY,EXECUTE_BOUNDED].includes(job.workflow_mode)){
 block('EXPLICIT_CODEX_WORKFLOW_MODE_REQUIRED');process.exit();
}
if(job.actor!=='GPT'){block('UNKNOWN_COORDINATOR');process.exit();}
if(typeof job.prompt!=='string'||!job.prompt.trim()||job.prompt.length>3000||
   typeof job.scope!=='string'||job.scope!==job.assignment?.assignment_scope||
   job.task_key!==job.assignment?.task_key){
 block('ASSIGNMENT_PROMPT_OR_SCOPE_MISMATCH');process.exit();
}
if(job.production_write_requested!==false){block('PRODUCTION_WRITE_FORBIDDEN');process.exit();}
if(!['low','normal','critical'].includes(job.risk)){
 block('INVALID_RISK');process.exit();
}
const checked=assessCodexWorkflow({
 assignment:job.assignment,mode:job.workflow_mode,
 plan:job.plan,recon:job.recon,source:job.source,
 now:job.now||new Date().toISOString()
});
if(checked.status==='BLOCKED'){block(checked.reason);process.exit();}
out({
 status:'DRY_RUN_ONLY',executed:false,paidRequest:false,
 task_key:job.task_key,workflow_mode:job.workflow_mode,
 policyStatus:checked.status,
 read_only:job.workflow_mode===RECON_READ_ONLY,
 permitted_branch:job.workflow_mode===EXECUTE_BOUNDED?checked.branch:null,
 allowed_write_paths:job.workflow_mode===EXECUTE_BOUNDED?checked.write_paths:[],
 modelEffortHint:job.risk==='critical'?'high':job.risk==='normal'?'medium':'low',
 note:'PURE OFFLINE assessment. User-supplied source flags are NOT trusted runtime evidence. No Codex, network call, work_log claim, repository changes, or charge.'
});
