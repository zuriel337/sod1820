#!/usr/bin/env node
/**
 * SOD1820 trusted CLI proof of Vercel Development -> short-lived Sandbox credential handoff.
 * Usage from linked Vercel project with operator auth:
 *   vercel env run -- node scripts/codex-sandbox-credential-bridge.mjs --test-handoff
 * No API request to OpenAI, no Codex agent, no persistent sandbox.
 * Default mode is read-only preflight. Never print or store keys.
 */
const testHandoff=process.argv.includes('--test-handoff');
const key=process.env.OPENAI_API_KEY;
const hasKey=typeof key==='string' && key.length>0;
const emit=x=>console.log(JSON.stringify(x));
if(!testHandoff){
 emit({mode:'preflight',keyPresent:hasKey,sandboxStarted:false,noModelCall:true});
 process.exit(0);
}
if(process.env.SOD_SANDBOX_HANDOFF_APPROVED!=='YES'||!hasKey){
 emit({status:'BLOCKED',reason:'OPERATOR_APPROVAL_OR_DEVELOPMENT_KEY_UNAVAILABLE',sandboxStarted:false});
 process.exit(2);
}
let sandbox;
try{
 const {Sandbox}=await import('@vercel/sandbox');
 sandbox=await Sandbox.create({persistent:false,timeout:60000,networkPolicy:{mode:'deny-all'},env:{OPENAI_API_KEY:key}});
 const res=await sandbox.runCommand({cmd:'sh',args:['-lc','test -n "$OPENAI_API_KEY" && echo HANDOFF_OK || exit 2']});
 const output=(await res.stdout()).trim();
 emit({status:res.exitCode===0 && output==='HANDOFF_OK'?'HANDOFF_VERIFIED':'HANDOFF_FAILED',exitCode:res.exitCode,sandboxStarted:true,keyValueExposed:false,noModelCall:true});
 if(res.exitCode!==0 || output!=='HANDOFF_OK')process.exitCode=2;
}catch(e){
 emit({status:'ERROR',errorType:e?.name||'unknown',sandboxStarted:Boolean(sandbox),keyValueExposed:false});
 process.exitCode=2;
}finally{
 if(sandbox)try{await sandbox.stop()}catch{emit({status:'WARNING',reason:'SANDBOX_STOP_UNVERIFIED'})}
}
