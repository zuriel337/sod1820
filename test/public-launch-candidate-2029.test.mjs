import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {COMMUNITY_UPLOAD_POLICY} from '../src/lib/community/communityUploadPolicy.js';
import {AVATAR_UPLOAD_POLICY} from '../src/lib/userCenter/avatarPolicy.js';
import {previewRazielHandler} from '../preview-deploy/api/preview-raziel.js';
const branch='gpt/2029-public-launch-candidate-20261101';
const builder=readFileSync(new URL('../scripts/build-integrated-preview.mjs',import.meta.url),'utf8');
function generatedWorker(){return vm.runInNewContext(builder.slice(builder.indexOf('const allow ='),builder.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+';worker;',{
 COMMUNITY_UPLOAD_POLICY,AVATAR_UPLOAD_POLICY,process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch}},
});}
async function requestWorker(path,{method='POST',body={}}={}){
 const calls=[],listeners={};
 vm.runInNewContext(generatedWorker(),{Request,Response,URL,Set,self:{location:{origin:'https://candidate.vercel.app'},addEventListener:(name,fn)=>listeners[name]=fn},
  fetch:async(...args)=>{calls.push(args);return Response.json({ok:true});}});
 let pending;const url=path.startsWith('/api/')?'https://candidate.vercel.app'+path:'https://linswmnnkjxvweumprav.supabase.co'+path;
 listeners.fetch({request:new Request(url,{method,...(!['GET','HEAD'].includes(method)?{body:JSON.stringify(body)}:{})}),respondWith:p=>pending=p});
 return {response:pending?await pending:null,calls};
}
test('candidate transport closes account, mail, private media, model and direct credit mutation paths',async()=>{
 for(const [path,method] of [
  ['/auth/v1/token?grant_type=password','POST'],['/auth/v1/signup','POST'],['/auth/v1/otp','POST'],
  ['/rest/v1/rpc/credit_reserve_v1','POST'],['/rest/v1/rpc/fn_get_or_create_my_person','POST'],
  ['/rest/v1/users','PATCH'],['/storage/v1/object/private/owned.png','DELETE'],
  ['/functions/v1/ai-analyze','POST'],['/functions/v1/newsletter-signup','POST'],
  ['/functions/v1/newsletter-unsubscribe?e=synthetic&t=synthetic','GET'],
  ['/api/preview-raziel','POST'],['/api/contributor-self','POST'],
 ]){
  const {response,calls}=await requestWorker(path,{method});
  assert.equal(response?.status,403,path);assert.equal(calls.length,0,path);
 }
});
test('public numeric reads and source pages remain usable through the stricter transport',async()=>{
 assert.equal((await requestWorker('/rest/v1/rpc/gematria_api',{body:{p_text:'בראשית'}})).response,null);
 assert.equal((await requestWorker('/rest/v1/posts?select=slug,title',{method:'GET'})).response,null);
 assert.equal((await requestWorker('/storage/v1/object/public/gallery/example.webp',{method:'GET'})).response,null);
});
test('direct Preview model proxy is closed before Auth/provider I/O and Production remains rejected',async()=>{
 for(const environment of ['preview','production']){
  let calls=0;const res={setHeader(){},status(n){this.code=n;return this;},json(x){this.body=x;}};
  await previewRazielHandler({env:{VERCEL_ENV:environment,VERCEL_GIT_COMMIT_REF:branch},fetchImpl:()=>{calls++;throw Error('must not call');}})({method:'POST',headers:{}},res);
  assert.equal(res.code,environment==='preview'?403:404);assert.equal(calls,0);
 }
 for(const environment of ['production','']){
  const result=spawnSync(process.execPath,['scripts/build-integrated-preview.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL_ENV:environment,VERCEL_GIT_COMMIT_REF:branch},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/functional_preview_requires_preview_environment/);
 }
});
test('Home opt-in uses the same admitted cards with a bounded metadata projection; legacy default shape is preserved',async()=>{
 const source=readFileSync(new URL('../src/lib/supabase.js',import.meta.url),'utf8');
 const start=source.indexOf('export async function getLatestPostCards('),end=source.indexOf('// 🎬',start);
 const publicRow={id:1,slug:'existing',title:'public',thumb_url:'thumb',tags:['1820'],date:'2026-01-01',categories:['category'],source:'wordpress',wp_id:36935,private_ignored:'never project'};
 let selected;const chain={select(s){selected=s;return this;},not(){return this;},order(){return this;},async limit(){return {data:[publicRow,{slug:'draft',tags:['טיוטה']},{slug:'forum',tags:['פורום']}],error:null};}};
 const fn=vm.runInNewContext(source.slice(start,end).replace('export async','async')+';getLatestPostCards;',{supabase:{from(name){assert.equal(name,'posts');return chain;}},stripHtml:s=>s});
 const normal=await fn({limit:4});assert.equal(normal.length,1);assert.equal('sourcePost' in normal[0],false);assert.equal(selected.includes('categories'),false);
 const enriched=await fn({limit:4,includeMetadata:true});assert.equal(enriched.length,1);assert.equal(enriched[0].slug,normal[0].slug);
 assert.equal(enriched[0].sourcePost.categories[0],'category');assert.equal('private_ignored' in enriched[0].sourcePost,false);
 assert.equal(selected.includes('categories'),true);assert.equal(enriched[0].poster,'thumb');
});
