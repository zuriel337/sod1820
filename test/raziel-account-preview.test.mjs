import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { buildMatrixRazielPreviewWorker, selectMatrixRazielPreview, RAZIEL_ACCOUNT_PREVIEW_BRANCH as branch } from '../scripts/lib/matrix-raziel-preview.mjs';
import { razielSavedSyncCopy, canRetryRazielSync, RAZIEL_LOCAL_SAVE_NOTICE } from '../src/lib/research/razielSavedSync2029.js';
import { RAZIEL_ONE_SHOT_COPY } from '../src/lib/research/razielOneShotCopy2029.js';

const builder = readFileSync(new URL('../scripts/build-integrated-preview.mjs', import.meta.url), 'utf8');
const base = vm.runInNewContext(builder.slice(builder.indexOf('const allow ='), builder.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")')) + '\nworker;');
const worker = buildMatrixRazielPreviewWorker(base, { readingOnly:true, branch });
const origin = 'https://linswmnnkjxvweumprav.supabase.co';
const uid = '11111111-1111-4111-8111-111111111111';
const token = 'test.'+Buffer.from(JSON.stringify({sub:uid,role:'authenticated'})).toString('base64url')+'.not-a-signature';
const read = { p_expected_user_id:uid };
const write = { ...read, p_batch_id:'22222222-2222-4222-8222-222222222222', p_expected_revision:0,
  p_ops:[{op_id:'save',kind:'item_upsert',bucket:'library',entity:{id:'test',type:'raziel_session'}}] };
async function call(source, path, body, {auth=true, method='POST', host=origin, status=200, bearer=token}={}) {
  let handler, response, forwarded=0;
  vm.runInNewContext(source, { URL, Request, Response, atob,
    self:{addEventListener:(name,fn)=>{if(name==='fetch')handler=fn;}},
    fetch:async req=>{forwarded++; assert.equal(req.headers.get('authorization'),'Bearer '+bearer); return Response.json({fixture:true},{status});},
  });
  handler({request:new Request(host+path,{method,headers:auth?{authorization:'Bearer '+bearer}:{},body:JSON.stringify(body)}),respondWith:p=>{response=p;}});
  return {response:response?await response:null,forwarded};
}
test('before/after: baseline and other branches deny private sync; only named Preview forwards unchanged',async()=>{
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch}),branch);
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch}),null);
  for(const [rpc,body] of [['research_state_snapshot_v1',read],['research_state_apply_ops_v1',write]]){
    for(const source of [base,buildMatrixRazielPreviewWorker(base,{readingOnly:true}),buildMatrixRazielPreviewWorker(base,{branch})]){
      const r=await call(source,'/rest/v1/rpc/'+rpc,body); assert.equal(r.response.status,403); assert.equal(r.forwarded,0);
    }
    const r=await call(worker,'/rest/v1/rpc/'+rpc,body); assert.equal(r.response.status,200); assert.equal(r.forwarded,1);
  }
});
test('exact ELS return Preview retains existing account guard without a branch wildcard',async()=>{
  const next='gpt/els-research-exact-return-preview-20261030';
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:next}),next);
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:next+'-other'}),null);
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:next}),null);
  const source=buildMatrixRazielPreviewWorker(base,{readingOnly:true,branch:next});
  assert.equal(source,worker,'same bounded guard as the previously approved account Preview');
  assert.equal((await call(source,'/rest/v1/rpc/research_state_snapshot_v1',read)).forwarded,1);
  assert.equal((await call(source,'/rest/v1/rpc/research_state_snapshot_v1',read,{auth:false})).forwarded,0);
  assert.equal((await call(source,'/rest/v1/els_records',{})).forwarded,0);
});
test('no auth, malformed batch, wrong origin/method, direct tables and unrelated writes remain denied',async()=>{
  for(const [path,body,opts] of [
    ['/rest/v1/rpc/research_state_snapshot_v1',read,{auth:false}],
    ['/rest/v1/rpc/research_state_snapshot_v1',read,{bearer:'invalid-token'}],
    ['/rest/v1/rpc/research_state_snapshot_v1',read,{bearer:'test.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.none'}],
    ['/rest/v1/rpc/research_state_snapshot_v1',{p_expected_user_id:'22222222-2222-4222-8222-222222222222'}],
    ['/rest/v1/rpc/research_state_snapshot_v1',{...read,extra:true}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',{...write,p_ops:[]}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',{...write,p_ops:Array(101).fill(write.p_ops[0])}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',{...write,p_expected_revision:-1}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',{...write,p_batch_id:'invalid'}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',{...write,unexpected:true}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',write,{host:'https://example.test'}],
    ['/rest/v1/rpc/research_state_apply_ops_v1',write,{method:'PUT'}],
    ['/rest/v1/research_items',write],['/rest/v1/rpc/fn_upsert_family_member',{}],['/auth/v1/signup',{}],
  ]){const r=await call(worker,path,body,opts);assert.equal(r.response.status,403,path);assert.equal(r.forwarded,0);}
});
for(const next of ['gpt/els-lexicon-structure-preview-20261030','gpt/els-search-clarity-preview-20261030','gpt/els-unified-research-preview-20261031','gpt/els-search-planners-preview-20261031'])
test(`${next}: retains byte-identical account/reading guards on its exact branch only`,async()=>{
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:next}),next);
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:next+'-other'}),null);
  assert.equal(selectMatrixRazielPreview({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:next}),null);
  assert.throws(()=>selectMatrixRazielPreview({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:next,SOD_MATRIX_RAZIEL_PREVIEW:'true'}),/never_production/);
  const source=buildMatrixRazielPreviewWorker(base,{readingOnly:true,branch:next});
  assert.equal(source,worker);
  assert.equal((await call(source,'/rest/v1/rpc/research_state_snapshot_v1',read)).forwarded,1);
  assert.equal((await call(source,'/rest/v1/rpc/research_state_snapshot_v1',read,{auth:false})).forwarded,0);
  assert.equal((await call(source,'/rest/v1/els_records',{})).forwarded,0);
});
test('server authorization/conflict errors are not converted to success',async()=>{
  for(const status of [401,403,409,500]) assert.equal((await call(worker,'/rest/v1/rpc/research_state_apply_ops_v1',write,{status})).response.status,status);
});
test('same authenticated Raziel submit and landscape permitted; no alternate actions/engines',async()=>{
  const body={kind:'research',persona:'raziel',subject:'השאלה שלי',research_contract:'public-number-research-run-v1',intelligence_level:'fast'};
  for(const view_mode of [undefined,'landscape','exploratory']) assert.equal((await call(worker,'/functions/v1/ai-analyze',{...body,view_mode})).forwarded,1);
  for(const patch of [{persona:'other'},{metatron:true},{companion_action:{}},{els_planning_action:{}},{els_matrix_reading_action:{}},{view_mode:'other'}]){
    const r=await call(worker,'/functions/v1/ai-analyze',{...body,...patch});assert.equal(r.response.status,403);assert.equal(r.forwarded,0);
  }
  assert.equal((await call(worker,'/functions/v1/ai-analyze',body,{auth:false})).forwarded,0);
});
test('save result is local, never a stale synced closure; failed state is not empty-account evidence',()=>{
  assert.match(RAZIEL_LOCAL_SAVE_NOTICE,/בדפדפן/);
  assert.match(razielSavedSyncCopy('synced'),/מסונכרנות.*לחשבון/);
  for(const status of ['pending','syncing','error','local_only','local_error','conflict','unknown']) assert.doesNotMatch(razielSavedSyncCopy(status),/מסונכרנות באופן פרטי/);
  assert.equal(canRetryRazielSync('error'),true);assert.equal(canRetryRazielSync('conflict'),false);
  assert.match(razielSavedSyncCopy('local_error'),/נכשלה/);
});
test('map is a deliberate same-thread AI continuation, not a graphical page or new scan',()=>{
  assert.match(RAZIEL_ONE_SHOT_COPY.map.explanation,/לא פתיחת מפה גרפית ולא סריקה/);
  assert.match(RAZIEL_ONE_SHOT_COPY.map.explanation,/רק לחיצה/);
  assert.match(RAZIEL_ONE_SHOT_COPY.map.noMaterial,/לא נשלחה בקשת AI/);
});
