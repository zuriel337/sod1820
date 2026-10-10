import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {collectRepoRecon,readImplementationContext} from './codex-implementation-recon-readonly.mjs';
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

test('ELS UX request returns one committed context with exact source locators, not every domain',()=>{
 const before=diff(),commit=sha();
 const result=collectRepoRecon({task_key:'SOD1820_ELS_UX_ACCEPTANCE',context_id:'els-2029'});
 assert.equal(result.status,'RECON_EVIDENCE_PARTIAL_READ_ONLY');
 const pack=result.context_pack;
 assert.equal(pack.context_id,'els-2029');
 assert.equal(pack.index_locator.ref,commit);
 assert.equal(pack.dependencies_loaded,false);
 assert.equal(pack.live_verified,false);
 assert.ok(pack.owner_refs.includes('els_research_layer_law'));
 assert.ok(pack.related_context_ids.includes('research-2029'));
 assert.ok(pack.source_refs.every(r=>r.exists_at_ref&&r.ref===commit));
 assert.match(pack.markdown,/UNKNOWN/);
 assert.match(pack.markdown,/PLANNED/);
 assert.match(pack.markdown,/VERIFIED_CODE/);
 assert.doesNotMatch(pack.markdown,/implementation-context:payments:start/);
 assert.doesNotMatch(pack.markdown,/implementation-context:ai-raziel:start/);
 const source=execFileSync('git',['show',`${commit}:${pack.index_locator.path}`],{encoding:'utf8'});
 assert.equal(source.split('\n').slice(pack.index_locator.start_line-1,pack.index_locator.end_line).join('\n'),pack.markdown);
 assert.ok(result.candidate_reference_paths.length<=20);
 assert.equal(result.reality_map.canonical_owner,'UNKNOWN');
 assert.equal(result.reality_map.may_authorize_write,false);
 assert.equal(result.writes,false);assert.equal(result.paidRequest,false);
 assert.equal(diff(),before);assert.equal(sha(),commit);
});

test('unknown or malicious context selection fails without broad fallback',()=>{
 for(const id of ['../private','ELS',null,'not-indexed', 'els-2029\n']) {
   const r=collectRepoRecon({task_key:'SOD1820_UX_NEGATIVE_CASE',context_id:id});
   assert.equal(r.status,'BLOCKED');
   assert.equal(r.context_pack,undefined);
   assert.equal(r.candidate_reference_paths,undefined);
 }
 assert.equal(collectRepoRecon({task_key:'SOD1820_UX_NEGATIVE_CASE',context_id:'els-2029',symbols:['spendCredits']}).reason,'CONTEXT_OR_EXPLICIT_FOCUS_NOT_BOTH');
});

test('all indexed domains resolve as bounded pointers without missing committed paths',()=>{
 const ids=['world-2029','frame-2029','number-2029','els-2029','research-2029','users',
   'content-publications','analytics','payments','ai-raziel','infrastructure','control-2029'];
 for(const id of ids){
   const pack=readImplementationContext(id);
   assert.equal(pack.status,'INDEXED_CONTEXT_NOT_LIVE_VERIFICATION',id);
   assert.ok(pack.source_refs.every(r=>r.exists_at_ref),id);
   assert.ok(pack.related_context_ids.every(x=>ids.includes(x)),id);
 }
});
