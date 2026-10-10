import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {operatorReadiness,checkSandboxHandoff} from './codex-sandbox-credential-bridge.mjs';

const key='FIXTURE_ONLY_NOT_A_REAL_OPENAI_KEY_123456';
const env=()=>({
 OPENAI_API_KEY:key,
 VERCEL_TEAM_ID:'team_vtfWHZfKvdbob8gvynQb5N89',
 VERCEL_PROJECT_ID:'prj_43q7k7QFAcWnin1tcBjce5xOi7Cq',
 VERCEL_OIDC_TOKEN:'FAKE_OFFLINE_OIDC',
 SOD_SANDBOX_HANDOFF_APPROVED:'YES',
});
test('operator eligibility requires a loaded Development secret, project/team scope, authenticated Vercel identity and explicit intent',()=>{
 const e=env();
 assert.equal(operatorReadiness(e).status,'OPERATOR_READINESS_ELIGIBLE_NOT_CONNECTED');
 for(const mutation of [
  {OPENAI_API_KEY:''},{VERCEL_TEAM_ID:'other'},{VERCEL_PROJECT_ID:'other'},
  {VERCEL_OIDC_TOKEN:''},{SOD_SANDBOX_HANDOFF_APPROVED:'NO'}
 ]){
  const x={...e,...mutation};
  assert.equal(operatorReadiness(x).status,'BLOCKED',JSON.stringify(mutation));
 }
});
test('does not create Sandbox when key, verified scope or authenticated token are missing',async()=>{
 let count=0;
 const SandboxImpl={async create(){count++;throw Error('must not start')}};
 for(const modification of [
  {OPENAI_API_KEY:null},{VERCEL_TEAM_ID:'other'},
  {VERCEL_OIDC_TOKEN:''},{SOD_SANDBOX_HANDOFF_APPROVED:'NO'}
 ])assert.equal((await checkSandboxHandoff({env:{...env(),...modification},SandboxImpl})).status,'BLOCKED');
 assert.equal(count,0);
});
test('authorized PRESENCE ONLY creates ephemeral denied-network Sandbox and does not emit key or run model',async()=>{
 const e=env();let options,command,stops=0;
 const SandboxImpl={async create(opts){
  options=opts;
  return {async runCommand(name,args){
   command={name,args};
   return {exitCode:0,stdout:async()=>'HANDOFF_OK'};
  },async stop(){stops++;}};
 }};
 const result=await checkSandboxHandoff({env:e,SandboxImpl});
 assert.equal(result.status,'HANDOFF_PRESENCE_PASS');
 assert.equal(result.sandboxStopped,true);
 assert.equal(result.noModelCall,true);
 assert.equal(result.secretValueExposed,false);
 assert.equal(stops,1);
 assert.equal(options.networkPolicy,'deny-all');
 assert.equal(options.persistent,false);
 assert.equal(options.timeout,60000);
 assert.equal(options.env.OPENAI_API_KEY,key);
 assert.equal(options.teamId,e.VERCEL_TEAM_ID);
 assert.equal(options.projectId,e.VERCEL_PROJECT_ID);
 assert.equal(options.token,undefined);
 assert.equal(command.name,'sh');
 assert.equal(command.args[0],'-lc');
 assert.match(command.args[1],/HANDOFF_OK/);
 assert.doesNotMatch(command.args[1],/api.openai.com|codex exec|curl|wget/);
 assert.equal(JSON.stringify(result).includes(key),false);
 assert.equal(JSON.stringify(result).includes(e.VERCEL_OIDC_TOKEN),false);
});
test('token authentication is passed only to SDK, never to outputs',async()=>{
 const e={...env(),VERCEL_OIDC_TOKEN:'',VERCEL_TOKEN:'FAKE_TOKEN_OFFLINE'};
 let captured;
 const SandboxImpl={async create(o){captured=o;return {async runCommand(){return {exitCode:0,stdout:async()=>'HANDOFF_OK'}},async stop(){}}}};
 const result=await checkSandboxHandoff({env:e,SandboxImpl});
 assert.equal(captured.token,e.VERCEL_TOKEN);
 assert.equal(result.status,'HANDOFF_PRESENCE_PASS');
 assert.doesNotMatch(JSON.stringify(result),/FAKE_TOKEN_OFFLINE/);
});
test('a command error cannot expose the key; finally always stops the Sandbox',async()=>{
 let stops=0;
 const SandboxImpl={async create(){return {async runCommand(){throw Error('PROVIDER: '+key)},async stop(){stops++;}}}};
 const result=await checkSandboxHandoff({env:env(),SandboxImpl});
 assert.equal(result.status,'HANDOFF_PRESENCE_FAIL');
 assert.equal(result.secretValueExposed,false);
 assert.equal(stops,1);
 assert.equal(JSON.stringify(result).includes(key),false);
});
test('bad command output and sandbox stop errors fail closed without false PASS',async()=>{
 const fakeOut={async create(){return {async runCommand(){return {exitCode:0,stdout:async()=>key}},async stop(){}}}};
 assert.equal((await checkSandboxHandoff({env:env(),SandboxImpl:fakeOut})).status,'HANDOFF_PRESENCE_FAIL');
 const fakeStop={async create(){return {async runCommand(){return {exitCode:0,stdout:async()=>'HANDOFF_OK'}},async stop(){throw Error(key)}}}};
 const result=await checkSandboxHandoff({env:env(),SandboxImpl:fakeStop});
 assert.equal(result.status,'SANDBOX_STOP_UNVERIFIED');
 assert.equal(JSON.stringify(result).includes(key),false);
});
test('CLI with no privileged environment is presence-only, and --test-handoff fails without a Sandbox',()=>{
 const run=(args,patch={})=>spawnSync(process.execPath,['scripts/codex-sandbox-credential-bridge.mjs',...args],{
  encoding:'utf8',timeout:5000,env:{...process.env,...patch,
   OPENAI_API_KEY:'',VERCEL_OIDC_TOKEN:'',VERCEL_TOKEN:'',
   VERCEL_TEAM_ID:'',VERCEL_PROJECT_ID:'',SOD_SANDBOX_HANDOFF_APPROVED:''}
 });
 const p=run([]);
 assert.equal(p.status,0,p.stderr);
 const status=JSON.parse(p.stdout);
 assert.equal(status.mode,'presence-preflight');
 assert.equal(status.developmentKeyPresent,false);
 assert.equal(status.sandboxStarted,false);
 const denied=run(['--test-handoff']);
 assert.equal(denied.status,2);
 assert.equal(JSON.parse(denied.stdout).reason,'DEVELOPMENT_KEY_NOT_LOADED_IN_TRUSTED_RUNTIME');
});
console.log('SOD1820_DEVELOPMENT_SECRET_HANDOFF_OFFLINE_CONTRACT_PASS_NO_KEY_DISCLOSURE');
