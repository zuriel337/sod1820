#!/usr/bin/env node
/**
 * SOD1820 / PR #1024: Development-secret -> ephemeral Sandbox PRESENCE ONLY.
 * Canonical owner: inter_agent_coordination_law v13 (NOT a dispatch service).
 * Do not call OpenAI, Codex, work_log, GitHub or any production service here.
 *
 * Invoke ONLY from an independently authenticated trusted operator runtime:
 *   vercel env run -- node scripts/codex-sandbox-credential-bridge.mjs --test-handoff
 * Operator also needs trusted Vercel Sandbox auth and matching VERCEL_PROJECT_ID /
 * VERCEL_TEAM_ID, and SOD_SANDBOX_HANDOFF_APPROVED=YES.
 * No secret is read back to the assistant, written to a file, printed or logged.
 *
 * IMPORTANT: SOD_SANDBOX_HANDOFF_APPROVED is a local intent marker, NOT proof of
 * authorization. The Vercel OIDC/token and Development env are independent.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const EXPECTED_PROJECT='prj_43q7k7QFAcWnin1tcBjce5xOi7Cq';
const EXPECTED_TEAM='team_vtfWHZfKvdbob8gvynQb5N89';
const deny=(reason)=>({status:'BLOCKED',reason,secretValueExposed:false,
  noModelCall:true,sandboxStarted:false});
const validKey=x=>typeof x==='string' && x.trim().length>=20;
const match=(a,b)=>typeof a==='string'&&a===b;

export function operatorReadiness(env={}) {
  if(!validKey(env.OPENAI_API_KEY))return deny('DEVELOPMENT_KEY_NOT_LOADED_IN_TRUSTED_RUNTIME');
  if(!match(env.VERCEL_PROJECT_ID,EXPECTED_PROJECT) ||
     !match(env.VERCEL_TEAM_ID,EXPECTED_TEAM))return deny('CANONICAL_VERCEL_PROJECT_SCOPE_UNVERIFIED');
  if(!env.VERCEL_OIDC_TOKEN && !env.VERCEL_TOKEN)
    return deny('AUTHORIZED_VERCEL_OPERATOR_IDENTITY_MISSING');
  if(env.SOD_SANDBOX_HANDOFF_APPROVED!=='YES')
    return deny('EXPLICIT_OPERATOR_TEST_FLAG_REQUIRED');
  return {status:'OPERATOR_READINESS_ELIGIBLE_NOT_CONNECTED',noModelCall:true,
    secretValueExposed:false,sandboxStarted:false};
}

/** Injectable SDK factory is ONLY for offline tests; CLI loads real SDK. */
export async function checkSandboxHandoff({env={},SandboxImpl}={}) {
  const guard=operatorReadiness(env);
  if(guard.status==='BLOCKED')return guard;
  if(!SandboxImpl||typeof SandboxImpl.create!=='function')
    return deny('VERCEL_SANDBOX_SDK_UNAVAILABLE');
  let sandbox=null,verified=false,closed=false;
  try {
    const opts={
      teamId:EXPECTED_TEAM,projectId:EXPECTED_PROJECT,
      ...(env.VERCEL_TOKEN?{token:env.VERCEL_TOKEN}:{}),
      persistent:false,timeout:60000,networkPolicy:'deny-all',
      env:{OPENAI_API_KEY:env.OPENAI_API_KEY},
    };
    sandbox=await SandboxImpl.create(opts);
    // Fixed command; cannot read the secret value, cannot contact the provider.
    // SDK runCommand uses positional executable and args.
    const cmd=await sandbox.runCommand('sh',[
      '-lc','if [ -n "$OPENAI_API_KEY" ]; then printf HANDOFF_OK; else exit 2; fi'
    ]);
    const stdout=typeof cmd.stdout==='function'?(await cmd.stdout()).trim():'';
    verified=cmd.exitCode===0 && stdout==='HANDOFF_OK';
  } catch {
    // Never emit errors or stack traces from privileged SDK; they may carry env.
    verified=false;
  } finally {
    if(sandbox) {
      try { await sandbox.stop(); closed=true; } catch {closed=false;}
    }
  }
  if(!sandbox)return deny('SANDBOX_START_FAILED');
  return {status:!closed?'SANDBOX_STOP_UNVERIFIED':verified?'HANDOFF_PRESENCE_PASS':'HANDOFF_PRESENCE_FAIL',
    noModelCall:true,secretValueExposed:false,sandboxStarted:true,sandboxStopped:closed};
}

// Importing this file in CI never starts a Sandbox or performs a model call.
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const test=process.argv.includes('--test-handoff');
  const extra=process.argv.filter(s=>s.startsWith('--'));
  if(extra.some(s=>s!=='--test-handoff')) {
    console.log(JSON.stringify(deny('UNSUPPORTED_CLI_FLAG')));process.exitCode=2;
  } else if(!test) {
    console.log(JSON.stringify({mode:'presence-preflight',developmentKeyPresent:validKey(process.env.OPENAI_API_KEY),
      vercelOperatorIdentityPresent:Boolean(process.env.VERCEL_OIDC_TOKEN||process.env.VERCEL_TOKEN),
      projectScopeMatches:match(process.env.VERCEL_PROJECT_ID,EXPECTED_PROJECT)&&
        match(process.env.VERCEL_TEAM_ID,EXPECTED_TEAM),
      noModelCall:true,sandboxStarted:false,secretValueExposed:false}));
  } else {
    const guard=operatorReadiness(process.env);
    if(guard.status==='BLOCKED'){console.log(JSON.stringify(guard));process.exitCode=2;}
    else {
      let SDK;
      try { SDK=(await import('@vercel/sandbox')).Sandbox; } catch { SDK=null; }
      const result=await checkSandboxHandoff({env:process.env,SandboxImpl:SDK});
      console.log(JSON.stringify(result));
      if(result.status!=='HANDOFF_PRESENCE_PASS')process.exitCode=2;
    }
  }
}
