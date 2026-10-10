#!/usr/bin/env node
// SOD1820 isolated Codex executor prototype.
// LOCAL DRY RUN ONLY by default; never reads the live product DB.
// Live execution requires separate approval and provisioned runner credentials.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const output = (x) => process.stdout.write(JSON.stringify(x) + '\n');
const block = (reason) => {output({status:'BLOCKED',reason,executed:false}); process.exitCode=2;};
let job;
try {
  const input = readFileSync(0,'utf8');
  if (input.length > 16_384) throw Error('input size');
  job=JSON.parse(input);
} catch {block('INVALID_REQUEST_JSON');process.exit();}
const isStr=(x,n=150)=>typeof x==='string' && x.length>0 && x.length<=n;
const live=process.argv.includes('--live');
const taskKey=job.task_key;
if (!isStr(taskKey,100) || !/^[A-Z0-9_]+$/.test(taskKey)) block('INVALID_TASK_KEY');
else if (!isStr(job.scope,300) || !isStr(job.prompt,3000)) block('INVALID_SCOPE_OR_PROMPT');
else if (!['GPT','CLAUDE'].includes(job.actor)) block('UNKNOWN_COORDINATOR');
else if (job.coordination_verified !== true || job.owner_verified !== true) block('COORDINATION_OR_OWNER_UNVERIFIED');
else if (job.active_writer_conflict !== false) block('ACTIVE_WRITER_NOT_CLEARED');
else if (job.production_write_requested !== false) block('PRODUCTION_WRITE_FORBIDDEN');
else if (!['low','normal','critical'].includes(job.risk)) block('INVALID_RISK');
else if (!live) output({status:'DRY_RUN_ONLY',executed:false,task_key:taskKey,modelEffort:job.risk==='critical'?'high':job.risk==='normal'?'medium':'low',warning:'No model request or Codex session started'});
else if (process.env.SOD_EXECUTOR_TRUSTED_GATEWAY !== 'VERIFIED_AND_DEPLOYED') block('TRUSTED_GATEWAY_NOT_IMPLEMENTED');
else if (job.paid_run_approved !== true || job.approval_token !== process.env.SOD_RUN_APPROVAL_TOKEN || !process.env.SOD_RUN_APPROVAL_TOKEN) block('PAID_RUN_NOT_AUTHORIZED');
else if (job.risk==='critical' && job.expensive_run_approved !== true) block('EXPENSIVE_RUN_REQUIRES_APPROVAL');
else if (job.provider_hard_limit_verified !== true || job.provider_balance_verified !== true) block('PROVIDER_BUDGET_UNVERIFIED');
else if (!process.env.OPENAI_API_KEY || !process.env.SOD_ISOLATED_CHECKOUT) block('SECURE_RUNNER_NOT_PROVISIONED');
else {
  // Only explicit operator-provisioned checkout, never the server's live application tree.
  // This is a prototype, not an automatic dispatch from work_log.
  const effort = job.risk==='critical'?'high':job.risk==='normal'?'medium':'low';
  const child=spawn('codex',['exec','--model',job.model || 'gpt-5.3-codex','--config',`model_reasoning_effort="${effort}"`,'--sandbox','workspace-write',job.prompt],{
    cwd:process.env.SOD_ISOLATED_CHECKOUT,env:process.env,stdio:['ignore','pipe','pipe']
  });
  let stdout='',stderr='';
  const append=(old,s)=> (old+s).slice(-4000);
  child.stdout.on('data',d=>stdout=append(stdout,d.toString()));
  child.stderr.on('data',d=>stderr=append(stderr,d.toString()));
  const kill=setTimeout(()=>child.kill('SIGTERM'),Math.min(120000,Number(job.timeout_ms)||60000));
  child.on('error',()=>{clearTimeout(kill);block('CODEX_CLI_LAUNCH_FAILED');});
  child.on('exit',(code)=>{clearTimeout(kill);output({status:code===0?'EXECUTED':'FAILED',executed:true,exitCode:code,task_key:taskKey,stdoutTail:stdout,stderrTail:stderr,
    warning:'Timeout is not a dollar-denominated provider hard stop; usage must be reconciled separately'});});
}
