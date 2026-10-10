#!/usr/bin/env node
/**
 * SOD1820 isolated Codex executor Stage C.
 * Until a trusted signed operator/transport, provider budget reserve and
 * canonical work_log lease are independently proven, ALWAYS DRY RUN ONLY.
 * Never infer authorization from booleans inside caller-supplied JSON.
 */
import {readFileSync} from 'node:fs';
const output=(x)=>process.stdout.write(JSON.stringify(x)+'\n');
const block=(reason)=>{output({status:'BLOCKED',reason,executed:false,paidRequest:false});process.exitCode=2;};
let job;
try{
 const raw=readFileSync(0,'utf8');
 if(raw.length>16384)throw Error('input size');
 job=JSON.parse(raw);
 if(!job||typeof job!=='object'||Array.isArray(job))throw Error('object required');
}catch{
 block('INVALID_REQUEST_JSON');process.exit();
}
const isStr=(x,n=150)=>typeof x==='string'&&x.length>0&&x.length<=n;
const live=process.argv.includes('--live');
const taskKey=job.task_key;
if(!isStr(taskKey,100)||! /^[A-Z0-9_]+$/.test(taskKey))block('INVALID_TASK_KEY');
else if(!isStr(job.scope,300)||!isStr(job.prompt,3000))block('INVALID_SCOPE_OR_PROMPT');
else if(!['GPT','CLAUDE'].includes(job.actor))block('UNKNOWN_COORDINATOR');
else if(job.coordination_verified!==true||job.owner_verified!==true)block('COORDINATION_OR_OWNER_UNVERIFIED');
else if(job.active_writer_conflict!==false)block('ACTIVE_WRITER_NOT_CLEARED');
else if(job.production_write_requested!==false)block('PRODUCTION_WRITE_FORBIDDEN');
else if(!['low','normal','critical'].includes(job.risk))block('INVALID_RISK');
else if(live){
 // Explicit, *unconditional* guard. No arbitrary env toggle or forged JSON can
 // activate paid Codex before the independently audited runtime gateway exists.
 // scripts/codex-auto-wake-contract.mjs is an OFFLINE acceptance fixture only.
 block('PAID_TRANSPORT_NOT_DEPLOYED');
}else{
 output({status:'DRY_RUN_ONLY',executed:false,paidRequest:false,task_key:taskKey,
  modelEffort:job.risk==='critical'?'high':job.risk==='normal'?'medium':'low',
  warning:'No model request, remote dispatcher, Codex execution or charge started'});
}
