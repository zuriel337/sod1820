import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const file='scripts/shared-codex-executor-preflight.mjs';
const base={requested_by:'GPT',task_key:'SOD1820_TEST_TASK_V1',scope:'safe document review',mode:'dry_run',risk:'normal',coordination_verified:true,existing_active_writer:false,scope_owner_verified:true,planned_usd:0};
function run(p){const r=spawnSync(process.execPath,[file],{input:JSON.stringify(p),encoding:'utf8',timeout:2000});assert.equal(r.stderr,'');return {exit:r.status,...JSON.parse(r.stdout)};}
assert.equal(run(base).status,'PRECHECK_PASSED_NO_EXECUTION');
assert.equal(run({...base,coordination_verified:false}).reason,'COORDINATION_UNVERIFIED');
assert.equal(run({...base,existing_active_writer:true}).reason,'ACTIVE_WRITER_CONFLICT');
assert.equal(run({...base,scope_owner_verified:false}).reason,'OWNER_UNVERIFIED');
assert.equal(run({...base,requested_by:'USER'}).reason,'UNKNOWN_ACTOR');
assert.equal(run({...base,mode:'api_codex',planned_usd:0.01}).reason,'PAID_RUN_NEEDS_EXPLICIT_APPROVAL');
assert.equal(run({...base,mode:'api_codex',planned_usd:0.01,user_approved_paid_run:true}).reason,'PROVIDER_BALANCE_UNKNOWN');
assert.equal(run({...base,mode:'api_codex',planned_usd:0.01,user_approved_paid_run:true,actual_provider_balance_verified:true,remaining_monthly_approved_usd:5}).reason,'NO_PROVIDER_HARD_CAP');
assert.equal(run({...base,mode:'api_codex',planned_usd:0.01,user_approved_paid_run:true,actual_provider_balance_verified:true,remaining_monthly_approved_usd:5,provider_hard_cap_verified:true}).status,'PRECHECK_PASSED_NO_EXECUTION');
console.log('shared executor offline preflight tests passed');
