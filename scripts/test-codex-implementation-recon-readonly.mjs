import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {collectRepoRecon} from './codex-implementation-recon-readonly.mjs';
const sha=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const diff=()=>execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim();
test('read-only recon collects tracked references and cannot change files',()=>{
 const before=sha(),dirty=diff();
 const result=collectRepoRecon({
  task_key:'SOD1820_RECON_CI_FIXTURE',
  focus_paths:['src/pages/ControlPlane2029Page.jsx'],
  symbols:['ControlPlane2029Page']
 });
 assert.equal(result.status,'RECON_EVIDENCE_PARTIAL_READ_ONLY');
 assert.equal(result.writes,false);assert.equal(result.paidRequest,false);
 assert.ok(result.matched_tracked_paths.includes('src/pages/ControlPlane2029Page.jsx'));
 assert.ok(result.candidate_reference_paths.length>0);
 assert.equal(result.reality_map.canonical_owner,'UNKNOWN');
 assert.equal(result.reality_map.active_writers,'UNKNOWN');
 assert.equal(result.reality_map.drift,'UNKNOWN');
 assert.equal(result.reality_map.may_authorize_write,false);
 assert.match(result.completeness,/NO LIVE DB/);
 assert.equal(sha(),before);assert.equal(diff(),dirty);
});
test('unbounded, malformed and unsafe inputs fail closed',()=>{
 const invalid=[
 {task_key:'bad',focus_paths:['README.md']},
 {task_key:'SOD1820_FIXTURE',symbols:['not valid text']},
 {task_key:'SOD1820_FIXTURE',focus_paths:['../private']},
 {task_key:'SOD1820_FIXTURE',symbols:['*']},
 {task_key:'SOD1820_FIXTURE'},
 {task_key:'SOD1820_FIXTURE',symbols:Array(9).fill('ControlPlane2029Page')}
 ];
 for(const v of invalid)assert.equal(collectRepoRecon(v).status,'BLOCKED');
});
test('CLI prints JSON evidence in no-model/no-write mode',()=>{
 const p=spawnSync(process.execPath,['scripts/codex-implementation-recon-readonly.mjs'],{
  input:JSON.stringify({task_key:'SOD1820_READONLY_FIXTURE',focus_paths:['README.md']}),
  encoding:'utf8',timeout:17000
 });
 assert.equal(p.status,0,p.stderr);
 const result=JSON.parse(p.stdout);
 assert.equal(result.status,'RECON_EVIDENCE_PARTIAL_READ_ONLY');
 assert.equal(result.executed,false);assert.equal(result.writes,false);
});
