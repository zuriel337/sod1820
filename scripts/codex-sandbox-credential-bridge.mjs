#!/usr/bin/env node
/**
 * SOD1820 isolated Codex credential bridge preflight.
 * Run only from a trusted, Vercel-linked project operator process using:
 *   vercel env run -- node scripts/codex-sandbox-credential-bridge.mjs
 * Default performs no network, does not print credential material.
 * This is NOT a Codex dispatcher or paid AI executor.
 */
const mode = process.argv.includes('--launch') ? 'launch' : 'preflight';
const gotKey = Boolean(process.env.OPENAI_API_KEY);
const approved = process.env.SOD_SANDBOX_KEY_INJECTION_APPROVED === 'YES';
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;
const result = (x)=>process.stdout.write(JSON.stringify(x)+'\n');
if(mode==='preflight'){
  result({status:gotKey?'KEY_PRESENT_IN_TRUSTED_PROCESS':'KEY_NOT_AVAILABLE',mode,startedSandbox:false,keyValueExposed:false,
    note:'Sensitive keys are never displayed or logged. This process must run under a trusted Vercel-linked identity.'});
  process.exit(0);
}
if(!gotKey || !approved || !projectId || !teamId){
  result({status:'BLOCKED',reason:'TRUSTED_PROCESS_APPROVAL_OR_SCOPE_MISSING',startedSandbox:false});
  process.exit(2);
}
if(process.env.SOD_TRUSTED_RUNNER_BACKEND!=='AUDITED'){
  result({status:'BLOCKED',reason:'UNREVIEWED_TRUST_BOUNDARY',startedSandbox:false});
  process.exit(2);
}
// A future audited backend can call Vercel's Sandbox.create({...env:{OPENAI_API_KEY: process.env.OPENAI_API_KEY}}).
// Do not implement a paid run or leak values into a PR, logs, URL or prompt.
result({status:'BLOCKED',reason:'PAID_RUNNER_NOT_RELEASED',startedSandbox:false});
process.exit(2);
