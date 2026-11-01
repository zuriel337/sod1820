import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {COMMUNITY_UPLOAD_POLICY} from '../src/lib/community/communityUploadPolicy.js';
import {AVATAR_UPLOAD_POLICY} from '../src/lib/userCenter/avatarPolicy.js';
import {previewRazielHandler} from '../preview-deploy/api/preview-raziel.js';
import {publicPageShareUrl, publicPostShareUrl} from '../src/lib/publicPostUrls.js';
import {surfaceContextForRoute2029} from '../src/components/experience2029/razielSessionSeam2029.js';
import {publicSurfaceFindingsFromConnections} from '../src/lib/research/post2029ExperienceProjection.js';
import {resolvePostExperienceConnections} from '../src/lib/research/post2029ReadingProjection.js';

const branch='gpt/2029-public-frame-context-20261101';
const lock=readFileSync(new URL('../src/components/MaintenanceLock.jsx',import.meta.url),'utf8');
// Execute the real canonical resolver and hook without rendering unrelated JSX.
const resolver=lock.slice(lock.indexOf('export function resolveFeatureState'),lock.indexOf('// canonical hook')).replace('export function','function');
const hook=lock.slice(lock.indexOf('export function useFeatureState'),lock.indexOf('// עטיפה ברמת-הראוט')).replace('export function','function');
const apply=lock.slice(lock.indexOf('function applyPreviewFeatureState'),lock.indexOf('export function MaintenanceLock'));
function state(flag,{restricted=true,admin=false,user=null,enabled=false,loading=false,authLoading=false}={}){
 return vm.runInNewContext(`${resolver}\n${apply}\n${hook}\nuseFeatureState(flag,{requireFlag:true})`,{
  flag,publicFramePreview:restricted,unlockedPreview:true,LIFE_JOURNEY_PREVIEW_OPEN:true,
  previewAdminOnly:new Set(['lock_els','lock_life_journey','lock_raziel_site']),DEFAULT_MSG:'closed',
  useAuth:()=>({user,isAdmin:admin,loading:authLoading}),useMemo:fn=>fn(),
  useSiteFlag:()=>({loading,lock:{enabled,mode:'all'}}),
 });
}
for(const flag of ['lock_els','lock_life_journey','lock_raziel_site'])test(`${flag}: Preview ceiling denies guests and registered users, including broad bypass`,()=>{
 for(const user of [null,{id:'fixture',user_metadata:{role:'admin'}}])assert.equal(state(flag,{user}).blocked,true);
 assert.equal(state(flag,{admin:true,user:{id:'fixture'}}).allowed,true);
 assert.equal(state(flag,{admin:true,loading:true}).loading,true);
 assert.equal(state(flag,{admin:true,authLoading:true}).loading,true);
 assert.equal(state(flag,{restricted:false}).allowed,true,'historical unrestricted Preview unchanged');
});
test('public Number/World/Books retain the existing Preview projection and default resolver never gains bypass',()=>{
 for(const flag of ['lock_number','lock_world','lock_books'])assert.equal(state(flag,{enabled:true}).allowed,true);
 const resolve=vm.runInNewContext(resolver+';resolveFeatureState',{DEFAULT_MSG:'closed'});
 assert.equal(resolve({enabled:true,mode:'all'}).blocked,true);
 assert.equal(resolve(null,{requireFlag:true,isAdmin:true,adminOnly:true}).blocked,true);
});

const body={kind:'research',persona:'raziel',research_contract:'public-number-research-run-v1',subject:'synthetic'};
const req={method:'POST',headers:{host:'preview.vercel.app',origin:'https://preview.vercel.app',authorization:'Bearer a.b.c','x-vercel-oidc-token':'signed.platform.proof'},body};
const response=()=>({code:0,setHeader(){},status(n){this.code=n;return this;},json(value){this.value=value;return this;}});
async function proxy({role=false,roleStatus=200,environment='preview',ref=branch,failModel=false,request=req}={}){
 const calls=[],res=response();await previewRazielHandler({env:{VERCEL_ENV:environment,VERCEL_GIT_COMMIT_REF:ref},fetchImpl:async(url,init)=>{
  calls.push({url,init});if(url.endsWith('/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_metadata:{role:'admin'}});
  if(url.endsWith('/rd_is_admin'))return Response.json(role,{status:roleStatus});
  if(failModel)throw Error('ambiguous');return Response.json({status:'ok'});
 }})(request,res);return {res,calls};
}
test('actual Preview proxy denies non-admin/forged metadata before model forwarding and fails closed on unavailable roles',async()=>{
 for(const role of [false,'true',[],{role:'admin'},null]){const {res,calls}=await proxy({role});assert.equal(res.code,403);assert.equal(calls.length,2);assert.ok(calls.every(c=>!c.url.includes('ai-analyze')));}
 const {res,calls}=await proxy({roleStatus:503});assert.equal(res.code,503);assert.equal(calls.length,2);
});
test('verified admin keeps one caller JWT, one signed server identity and no paid retry',async()=>{
 for(const failModel of [false,true]){const {res,calls}=await proxy({role:true,failModel});assert.equal(res.code,failModel?502:200);assert.equal(calls.length,3);assert.equal(calls[2].init.body,JSON.stringify(body));assert.equal(calls[2].init.headers.Authorization,req.headers.authorization);assert.equal(calls[2].init.headers['x-sod-preview-identity'],'signed.platform.proof');assert.equal(calls[1].init.method,undefined,'role probe is GET');}
});
test('Production, unknown branch, missing JWT, cross-origin and non-POST requests cannot reach an identity/role/model lookup',async()=>{
 for(const options of [{environment:'production'},{ref:branch+'-foreign'},{request:{...req,method:'GET'}},{request:{...req,headers:{...req.headers,authorization:''}}},{request:{...req,headers:{...req.headers,origin:'https://foreign.invalid'}}}]){
  const {res,calls}=await proxy(options);assert.ok(res.code>=400);assert.equal(calls.length,0);
 }
 const result=spawnSync(process.execPath,['scripts/build-integrated-preview.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/functional_preview_requires_preview_environment/);
});
test('More shares existing canonical addresses and repeated reading context without private grants',()=>{
 const location={pathname:'/post/native',search:'?part=1&part=2&_vercel_share=synthetic-grant&access_token=synthetic-token',hash:'#source'};
 const url=publicPageShareUrl(location,'https://sod1820.co.il/post/native');
 assert.equal(url,'https://sod1820.co.il/post/native?part=1&part=2#source');
 assert.equal(publicPostShareUrl({slug:'old',source:'wordpress',link:'https://sod1820.co.il/old/'},location),'https://sod1820.co.il/old/?part=1&part=2#source');
 assert.equal(publicPageShareUrl({...location,pathname:'/number/1820'},'https://sod1820.co.il/number/1820'),'https://sod1820.co.il/number/1820?part=1&part=2#source');
 for(const pathname of ['/2029/me/profile','/2029/journey','/auth/callback','/unsubscribe'])assert.equal(publicPageShareUrl({...location,pathname},'https://sod1820.co.il/'),null);
 assert.equal(publicPageShareUrl(location,'https://foreign.invalid/post/native'),null);
});
test('exact new branch keeps the complete accepted read/write worker byte-identical; default and historical branches unchanged',()=>{
 const current=readFileSync(new URL('../scripts/build-integrated-preview.mjs',import.meta.url),'utf8');
 const baseline=execFileSync('git',['show','4987d7a12167fbcdc37467b21930f18156438908:scripts/build-integrated-preview.mjs'],{encoding:'utf8'});
 const worker=(source,ref)=>vm.runInNewContext(source.slice(source.indexOf('const allow ='),source.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'))+';worker;',{COMMUNITY_UPLOAD_POLICY,AVATAR_UPLOAD_POLICY,process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:ref}}});
 assert.equal(worker(current,branch),worker(baseline,'gpt/2029-public-foundation-continuity-20261101'));
 for(const ref of ['gpt/2029-home-loading-acceptance-20261031','gpt/2029-functional-unified-preview-20261031','gpt/unrelated'])assert.equal(worker(current,ref),worker(baseline,ref));
});
test('ordinary destination masks a previous document without mutating selected work or pending Path; explicit World/ELS continuation remains',()=>{
 const stored={subject:{id:'92',type:'post',label:'old',href:'/old/'},selection:{entityId:'92',entityType:'post'},journey:{kind:'research_path',pendingSteps:[{id:'draft'}]},dimensions:{surfaceContextHref:'/old/?part=7',surfaceFindings:[{label:'old private context'}]},returnTo:{href:'/world?original=1#source'}};
 const snapshot=structuredClone(stored);
 for(const [surface,pathname]of [['world','/world'],['els','/code'],['topic','/topic/other'],['post','/post/new'],['number','/number/1820'],['home','/']]){
  const visible=surfaceContextForRoute2029(stored,{surface,pathname});assert.equal(visible.subject,null);assert.equal(visible.selection,null);assert.deepEqual(visible.dimensions,{});assert.deepEqual(visible.journey,stored.journey);assert.deepEqual(visible.returnTo,stored.returnTo);
 }
 assert.equal(surfaceContextForRoute2029(stored,{surface:'world',pathname:'/world',search:'?focus=context'}),stored);
 assert.equal(surfaceContextForRoute2029(stored,{surface:'els',pathname:'/code',intent:'continue'}),stored);
 assert.equal(surfaceContextForRoute2029(stored,{surface:'post',pathname:'/old/',search:'?part=7'}),stored);
 assert.equal(surfaceContextForRoute2029(stored,{surface:'post',pathname:'/post/new',intent:'continue'}).subject,null);
 assert.deepEqual(stored,snapshot);
});
test('existing outward-link projection is bounded/deduplicated and real destination readers deny private or removed sources',async()=>{
 const links=[{id:'p',label:'stored public post',href:'/post/public',reason:'stored reference'},{id:'dup',label:'duplicate',href:'/post/public'}, {label:'private',href:'/2029/me/profile'},{label:'external',href:'https://foreign.invalid'},{label:'unsafe',href:'//foreign.invalid'}];
 const projected=publicSurfaceFindingsFromConnections(links);assert.equal(projected.length,1);assert.equal(projected[0].reason,'stored reference');
 assert.equal(publicSurfaceFindingsFromConnections(Array.from({length:20},(_,i)=>({label:String(i),href:'/post/p'+i}))).length,8);
 for(const privateFields of [{_privateStage:true},{_previewSnapshot:true},{tags:['טיוטה']},{source:'gpt-draft'}]){
  const result=await resolvePostExperienceConnections({connections:[{label:'declared',href:'/post/private'}]},{readPost:async()=>({id:1,slug:'private',...privateFields})});assert.equal(result.connections[0].href,null);
 }
});
