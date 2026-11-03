import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {PUBLIC_READING_PROFILE_ID,publicReadingFeatureLock,publicReadingPath} from '../src/lib/publicReadingRelease2029.js';
import {calculatorEntryParams,buildCalculatorShareUrl,parseCalculatorShareState} from '../src/lib/research/calculator2029Viral.js';
import {buildCalculatorNumberNavigation} from '../src/lib/research/calculator2029Model.js';
import {publicDocumentHandler} from '../preview-deploy/api/public-document.js';
const branch='gpt/2029-public-reading-release-configuration-20261101';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('one release scope opens only the approved readers; closed aliases cannot enter product routes',()=>{
 for(const path of ['/','/world','/post','/post/existing','/old-post','/number/1820','/number/בראשית','/gematria','/gallery','/map','/topic/existing','/community/researcher/zvi'])assert.ok(['public','post-lookup'].includes(publicReadingPath(path)),path);
 for(const path of ['/code','/els','/journey','/2029/journey','/raziel','/2029/raziel','/2029/me','/admin','/heichal','/היכל'])assert.equal(publicReadingPath(path),'closed',path);
 for(const path of ['/books','/book/existing','/codes','/community/chat','/community/calculator'])assert.equal(publicReadingPath(path),'public',path);
 for(const p of ['/login','/auth/callback'])assert.equal(publicReadingPath(p),'account');
 assert.equal(publicReadingPath('/auth/callback/forged'),'closed');
 for(const path of ['/2029/control','/2029/kingdom','/entity-hub-preview/topic/example','/%ZZ'])assert.equal(publicReadingPath(path),'missing',path);
 for(const flag of ['lock_world','lock_number','lock_gematria'])assert.equal(publicReadingFeatureLock(flag).enabled,false);
 for(const flag of ['lock_els','lock_life_journey','lock_raziel_site','lock_heichal','unknown'])assert.equal(publicReadingFeatureLock(flag).enabled,true);
});
test('legacy calculator parameters seed the existing engine, never trust claimed old n, preserve extra context',()=>{
 for(const key of ['w','calc']){
 const p=calculatorEntryParams('?'+key+'='+encodeURIComponent('דוד')+'&n=999999&source=map&part=2&part=7');assert.equal(p.get('q'),'דוד');assert.equal(p.get('n'),'999999');assert.deepEqual(p.getAll('part'),['2','7']);assert.equal(parseCalculatorShareState(p).isShared,false);
 }
 assert.equal(calculatorEntryParams('?q=משיח&w=דוד').get('q'),'משיח');
});
test('canonical selection and exact calculator return survive both Number and shared-result navigation',()=>{
 const selection={expression:'דוד',methodKey:'מילוי',resultValue:412};
 const location={pathname:'/gematria',search:'?q=%D7%93%D7%95%D7%93&m=%D7%9E%D7%99%D7%9C%D7%95%D7%99&source=map&part=2&part=7',hash:'#calc-result'};
 const n=buildCalculatorNumberNavigation(selection,location,{dimensions:{kept:true}});assert.ok(n.href.includes('/number/412?'));assert.equal(new URL(n.href,'https://sod1820.co.il').searchParams.get('method'),'מילוי');assert.equal(n.context.selection.expression,'דוד');assert.equal(n.context.returnTo.href,location.pathname+location.search+location.hash);assert.equal(n.context.returnTo.dimensions.kept,true);
 const url=buildCalculatorShareUrl(selection,{shareId:'test-share',baseUrl:'https://sod1820.co.il/gematria'});const shared=parseCalculatorShareState(new URL(url).search);assert.equal(shared.methodKey,selection.methodKey);assert.equal(shared.resultValue,selection.resultValue);assert.equal(shared.isShared,true);
 assert.equal(buildCalculatorNumberNavigation({...selection,resultValue:NaN},location),null);
});
test('read-only release transport denies A3, model, Auth mutation and credits before any live fetch',async()=>{
 const builder=read('scripts/build-integrated-preview.mjs');const source=builder.slice(builder.indexOf('const allow ='),builder.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'));
 const listeners={},calls=[];const worker=vm.runInNewContext(source+'\nworker;', {process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch}},JSON,Set,Map,URL,Response,Request,COMMUNITY_UPLOAD_POLICY:{},AVATAR_UPLOAD_POLICY:{}});
 vm.runInNewContext(worker,{self:{location:{origin:'https://preview.example'},skipWaiting(){},clients:{claim(){}},addEventListener:(k,f)=>listeners[k]=f},URL,Response,Request,Set,Map,JSON,fetch:async(...args)=>{calls.push(args);throw Error('live I/O forbidden');}});
 for(const path of ['/functions/v1/research-run','/functions/v1/ai-analyze','/rest/v1/rpc/credit_reserve_v1','/rest/v1/rpc/fn_get_or_create_my_person','/auth/v1/token?grant_type=password']){
 let pending;listeners.fetch({request:new Request('https://linswmnnkjxvweumprav.supabase.co'+path,{method:'POST',body:'{}'}),respondWith:p=>pending=p});assert.equal((await pending)?.status,403,path);
 }assert.equal(calls.length,0);
});
test('public metadata adapter uses the same trusted profile; Production and forged query activation stay denied',async()=>{
 let observed;const handler=publicDocumentHandler({env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch},readDocument:async()=>'<html><head></head><body></body></html>',metadataHandler:async(req,res)=>{observed=req;res.status(200).send('<html><head><title>real owner</title></head></html>');}});
 const res={setHeader(){},status(n){this.code=n;return this;},send(v){this.body=v;return this;}};await handler({method:'GET',query:{path:'/gematria'}},res);assert.equal(res.code,200);assert.equal(observed.publicReadingRelease,PUBLIC_READING_PROFILE_ID);
 await publicDocumentHandler({env:{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:branch}})({method:'GET',query:{publicReadingRelease:PUBLIC_READING_PROFILE_ID}},res);assert.equal(res.code,404);
});
test('normal Legacy build remains the default and the new release branch cannot build in Production',()=>{
 assert.match(read('src/lib/publicLaunch2029.js'),/CORE_PUBLIC_LAUNCH_2029 = false/);
 for(const env of ['production','']){const result=spawnSync(process.execPath,['scripts/build-integrated-preview.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL_ENV:env,VERCEL_GIT_COMMIT_REF:branch},encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/functional_preview_requires_preview_environment/);}
 const app=read('src/App.jsx');assert.match(app,/<Route path="\/"/);assert.match(app,/GematriaToLab/);
});

test('a stray public profile variable cannot change the Legacy capability or SDK session',()=>{
 const source=read('src/lib/publicReadingRelease2029.js').replaceAll('export ', '').replace('import.meta.env?.VITE_PUBLIC_READING_RELEASE',JSON.stringify(PUBLIC_READING_PROFILE_ID));
 assert.equal(vm.runInNewContext(source+';PUBLIC_READING_RELEASE;', {__SOD_2029_BUILD__:false}),false);
 assert.equal(vm.runInNewContext(source+';PUBLIC_READING_RELEASE;', {__SOD_2029_BUILD__:true}),true);
 assert.match(read('src/lib/supabase.js'),/PUBLIC_READING_RELEASE[\s\S]*?readingSessionOptions\(readingStorage\)[\s\S]*?: undefined/);
 assert.match(read('src/lib/publicReadingAuthSession.js'),/storageKey: "sod-public-reading-account"/);
});
