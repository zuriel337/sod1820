import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectImplementationRealityAssignments} from '../src/lib/implementationRealityProjection.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('work_log projection contains no invented implementation or live evidence',()=>{
 const row={task_key:'SOD1820_TEST',primary_owner:'inter_agent_coordination_law v13',
   assignment_scope:'README.md',from_actor:'GPT',to_actor:'CLAUDE',
   dispatch_state:'COMPLETED',dispatch_kind:'ASSIGNMENT',
   release_authorization_state:'BRANCH_ONLY_NO_MERGE_NO_DEPLOY',
   created_at:'2026-10-10T16:00:00Z'};
 const [p]=projectImplementationRealityAssignments([row]);
 assert.equal(p.task_key,row.task_key);assert.equal(p.canonical_owner_reported,row.primary_owner);
 assert.equal(p.implementations,'UNKNOWN');assert.equal(p.consumers,'UNKNOWN');
 assert.equal(p.dependencies,'UNKNOWN');assert.equal(p.branch_release_live.live,'UNKNOWN');
 assert.equal(p.cost,'UNKNOWN');assert.equal(p.health,'UNKNOWN');assert.equal(p.drift,'UNKNOWN');
 assert.equal(p.may_authorize_delete,false);assert.equal(p.may_authorize_write,false);
 assert.equal(p.source,'WORK_LOG_CURRENT_COORDINATION_ONLY');
});
test('duplicate/sparse ledger rows do not imply no consumers; output is bounded',()=>{
 const rows=[{task_key:'A',created_at:'1'}, {task_key:'A',created_at:'2'}, {task_key:'B'},
   ...Array.from({length:70},(_,i)=>({task_key:'TASK_'+i}))];
 const result=projectImplementationRealityAssignments(rows,25);
 assert.equal(result.length,20);
 assert.equal(result.filter(x=>x.task_key==='A').length,1);
 assert.equal(projectImplementationRealityAssignments([],12).length,0);
 assert.equal(projectImplementationRealityAssignments(null,12).length,0);
});
test('Control Plane reads only admin guarded current work_log, not raw table or cache',()=>{
 const page=read('src/pages/ControlPlane2029Page.jsx');
 const visits=read('src/lib/visits.js');
 const f=visits.slice(visits.lastIndexOf('export async function getImplementationRealityAssignments'));
 assert.match(page,/if \(!isAdmin\) return <Navigate replace to="\/2029" \/>/);
 assert.match(page,/data-experience-capability="implementation-reality"/);
 assert.match(page,/getImplementationRealityAssignments\(12\)/);
 assert.match(page,/IMPLEMENTATION REALITY/);
 assert.match(page,/COORDINATION ONLY/);
 assert.match(page,/UNKNOWN until repo\/runtime verification/);
 assert.match(f,/\.rpc\("get_work_log_current"\)/);
 assert.match(f,/\.select\("task_key,primary_owner,assignment_scope,from_actor,to_actor,dispatch_state,dispatch_kind,release_authorization_state,created_at"\)/);
 assert.match(f,/Math\.min\(20,/);
 assert.doesNotMatch(f,/\.from\(["']work_log/);
 assert.doesNotMatch(f,/get_work_log"\)|create table|localStorage|service_role|dispatch_emit/);
});
