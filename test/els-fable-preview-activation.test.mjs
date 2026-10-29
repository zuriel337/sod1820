import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MATRIX_READING_PREVIEW_BRANCHES,selectMatrixRazielPreview,buildMatrixRazielPreviewWorker} from '../scripts/lib/matrix-raziel-preview.mjs';

const builder=readFileSync(new URL('../scripts/build-integrated-preview.mjs',import.meta.url),'utf8');
const base=vm.runInNewContext(builder.slice(builder.indexOf('const allow ='),builder.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+'\nworker;');
const worker=buildMatrixRazielPreviewWorker(base,{readingOnly:true});
const origin='https://linswmnnkjxvweumprav.supabase.co';
const id='11111111-1111-4111-8111-111111111111';
const start={id:'els_matrix_reading_v1',op:'start',request_id:id,window:{rows:33,cols:41},cap:25,ack_upper_bound_usd:2};
const body=action=>({kind:'research',persona:'raziel',research_contract:'public-number-research-run-v1',intelligence_level:'deep',els_matrix_context:{contract:'els_matrix_presentation_context_v1'},...(action?{els_matrix_reading_action:action}:{})});
async function call(payload,path='/functions/v1/ai-analyze'){
 let listener,output,forwarded=0;
 vm.runInNewContext(worker,{self:{addEventListener:(type,fn)=>{if(type==='fetch')listener=fn;}},URL,Request,Response,fetch:async()=>{forwarded++;return Response.json({forwarded:true});}});
 listener({request:new Request(origin+path,{method:'POST',body:JSON.stringify(payload)}),respondWith:value=>{output=value;}});
 const response=await output;return {status:response?.status,forwarded};
}
test('activation is confined to the approved Preview branch, never production or another branch',()=>{
 const branch=[...MATRIX_READING_PREVIEW_BRANCHES][0];
 assert.equal(branch,'gpt/els-fable-preview-activation-20261029');
 assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch}),branch);
 assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch}),null);
 assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'gpt/els-reading-durable-jobs-20261029'}),null);
 assert.throws(()=>selectMatrixRazielPreview({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch,SOD_MATRIX_RAZIEL_PREVIEW:'true'}),/never_production/);
 assert.throws(()=>selectMatrixRazielPreview({VERCEL_GIT_COMMIT_REF:branch,SOD_MATRIX_RAZIEL_PREVIEW:'true'}),/requires_preview_environment/);
});
test('only bounded reading, preview, status, recovery and cancellation use the same existing route',async()=>{
 for(const action of [start,{...start,op:'preview',request_id:undefined,ack_upper_bound_usd:undefined},{id:start.id,op:'status',job_id:id},{id:start.id,op:'cancel',job_id:id},{id:start.id,op:'recover'}])assert.deepEqual(await call(body(action)),{status:200,forwarded:1});
});
test('ordinary matrix chat, planning, enlarged requests and other writes stay blocked',async()=>{
 for(const payload of [body(),body({...start,cap:60}),body({...start,window:{rows:35,cols:45}}),body({...start,ack_upper_bound_usd:10}),body({...start,request_id:undefined}),body({...start,id:'different'}),body({...start,op:'other'}),{...body(start),els_planning_action:{}},{...body(start),companion_action:{}},{...body(start),els_matrix_context:null}])assert.deepEqual(await call(payload),{status:403,forwarded:0});
 for(const path of ['/rest/v1/els_matrix_reading_jobs','/rest/v1/rpc/research_state_apply_v1','/functions/v1/claude-raziel'])assert.deepEqual(await call(body(start),path),{status:403,forwarded:0});
});
test('build enables only the selected client and discloses server job/cost writes',()=>{
 assert.match(builder,/matrixReadingPreview = process.env.VERCEL_ENV === "preview" && MATRIX_READING_PREVIEW_BRANCHES.has/);
 assert.match(builder,/matrixReadingPreview \? \{ "import.meta.env.VITE_ELS_MATRIX_READING_MODE": JSON.stringify\("on"\)/);
 assert.match(builder,/readingOnly: matrixReadingPreview/);
 assert.match(builder,/private-reading-jobs-and-cost-log-only/);
 assert.match(builder,/בכפוף להפעלת השרת/);
});
