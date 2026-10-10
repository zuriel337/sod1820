import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const path='scripts/isolated-codex-executor-prototype.mjs';
const valid={task_key:'SOD1820_OFFLINE_TEST',scope:'docs only',prompt:'Inspect docs',actor:'GPT',coordination_verified:true,owner_verified:true,active_writer_conflict:false,production_write_requested:false,risk:'low'};
function run(job,args=[],env={}){
 const res=spawnSync(process.execPath,[path,...args],{input:JSON.stringify(job),encoding:'utf8',env:{...process.env,...env},timeout:3000});
 assert.equal(res.error,undefined);
 const rows=res.stdout.trim().split('\n').map(x=>JSON.parse(x));
 return {exit:res.status,last:rows.at(-1)};
}
assert.equal(run(valid).last.status,'DRY_RUN_ONLY');
assert.equal(run({...valid,coordination_verified:false}).last.reason,'COORDINATION_OR_OWNER_UNVERIFIED');
assert.equal(run({...valid,active_writer_conflict:true}).last.reason,'ACTIVE_WRITER_NOT_CLEARED');
assert.equal(run({...valid,production_write_requested:true}).last.reason,'PRODUCTION_WRITE_FORBIDDEN');
assert.equal(run({...valid,actor:'UNKNOWN'}).last.reason,'UNKNOWN_COORDINATOR');
// Most important: forged approval and self-attested billing cannot enable a paid run.
const forged={...valid,paid_run_approved:true,approval_token:'x',provider_balance_verified:true,provider_hard_limit_verified:true};
assert.equal(run(forged,['--live'],{SOD_RUN_APPROVAL_TOKEN:'x'}).last.reason,'PAID_TRANSPORT_NOT_DEPLOYED');
console.log('offline executor safety assertions passed');

// Even a fully forged local environment + synthetic self-attestations must not activate paid Codex.
const forgedAll={...forged,coordination_verified:true,owner_verified:true,active_writer_conflict:false,expensive_run_approved:true};
assert.equal(run(forgedAll,['--live'],{SOD_EXECUTOR_TRUSTED_GATEWAY:'VERIFIED_AND_DEPLOYED',OPENAI_API_KEY:'INVALID_TEST_ONLY',SOD_ISOLATED_CHECKOUT:'/tmp',SOD_RUN_APPROVAL_TOKEN:'x'}).last.reason,'PAID_TRANSPORT_NOT_DEPLOYED');
console.log('paid transport hard-stop assertion passed');
