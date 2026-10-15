// Synthetic guard inputs ONLY, never timing evidence or a live database substitute.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync}from'node:fs';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{spawnSync}from'node:child_process';
import{runInNewContext}from'node:vm';
import{createHash}from'node:crypto';
const script=new URL('../scripts/perf-navigation-2029/compare.mjs',import.meta.url).pathname;
function data(){return{mode:'replay',runtime:'unit-only',runs:7,profile:{cpu:4,viewport:{width:390,height:844}},fixtureSha256:'same-unit-snapshot',samples:Array.from({length:7},(_,sample)=>({sample,path:'/world',errors:[],misses:[],reads:[{key:'unit public read',hash:'unchanged'}],measures:[{name:'actual-click',readyMs:1000,metrics:{TaskDuration:50,ScriptDuration:20,LayoutDuration:5},storage:[],frames:[{ms:16.7}],longTasks:[],trustedClicks:[{trusted:true}]}]}))};}
function check(before,after){const dir=mkdtempSync(join(tmpdir(),'navigation-guard-unit-'));try{writeFileSync(join(dir,'before.json'),JSON.stringify(before));writeFileSync(join(dir,'after.json'),JSON.stringify(after));const r=spawnSync(process.execPath,[script,join(dir,'before.json'),join(dir,'after.json'),join(dir,'out.json')],{encoding:'utf8'});return{status:r.status,out:r.status===0?JSON.parse(readFileSync(join(dir,'out.json'))):null};}finally{rmSync(dir,{recursive:true,force:true});}}
test('matched complete trusted-input replay accepted',()=>assert.equal(check(data(),data()).status,0));
test('runtime failure, fixture miss and failed primary cannot masquerade as fast content',()=>{for(const change of [s=>s.errors.push('failure'),s=>s.misses.push('unmapped'),s=>s.failedPrimary=true]){const a=data();change(a.samples[0]);assert.notEqual(check(data(),a).status,0);}});
test('synthetic click and fewer than seven samples are rejected',()=>{const a=data();a.samples[0].measures[0].trustedClicks[0].trusted=false;assert.notEqual(check(data(),a).status,0);a.samples=data().samples.slice(0,6);assert.notEqual(check(data(),a).status,0);});
test('hosted/fixture, profile and snapshot mismatches are rejected',()=>{for(const change of [a=>a.mode='hosted',a=>a.profile.cpu=1,a=>a.fixtureSha256='different']){const a=data();change(a);assert.notEqual(check(data(),a).status,0);}});
test('slower transitions and extra repeated reads fail regression gate',()=>{const a=data();a.samples.forEach(s=>s.measures[0].readyMs=1300);assert.notEqual(check(data(),a).status,0);const b=data();b.samples.forEach(s=>s.reads.push({key:'extra',hash:'extra'}));assert.notEqual(check(data(),b).status,0);});
test('same query with changed response bytes fails parity',()=>{const a=data();a.samples.forEach(s=>s.reads[0].hash='changed');assert.notEqual(check(data(),a).status,0);});
test('mixed legacy and controller-clock reports are rejected by the existing profile guard',()=>{
 const current=data();current.profile.navigationInstrumentation='controller-read-clock-v2';
 assert.notEqual(check(data(),current).status,0);
 assert.notEqual(check(current,data()).status,0);
 assert.equal(check(current,current).status,0);
});

test('a blocked renderer cannot postpone the fixed replay response',async()=>{
 // Execute the production route callback, without booting its CLI/browser. This
 // tests its actual async response path, not a copy of its implementation.
 const source=readFileSync(new URL('../scripts/perf-navigation-2029/run.mjs',import.meta.url),'utf8');
 const start=source.indexOf("  await page.route('**/*',async route=>{");
 assert.ok(start>=0);const end=source.indexOf('\n  });',start);assert.ok(end>start);
 let handler,releaseRenderer,fulfillResponse,evaluations=0,fulfilledWhileBlocked=false,rendererBlocked=true;
 const renderer=new Promise(resolve=>{releaseRenderer=resolve;});
 const fulfilled=new Promise(resolve=>{fulfillResponse=resolve;});
 const payload=Buffer.from('{"fixture":"unit-only"}'),key='GET https://linswmnnkjxvweumprav.supabase.co/rest/v1/unit_probe '; // empty body; no header signature
 const reads=[],errors=[],misses=[],delays=[];
 const page={route:async(_pattern,callback)=>{handler=callback;},evaluate:()=>{evaluations++;return renderer;}};
 await runInNewContext(`(async()=>{${source.slice(start,end+'\n  });'.length)}})()`,{
  page,URL,Buffer,performance,args:{},base:'http://127.0.0.1:1',hosted:false,mode:'replay',allowed:new Set(),blocked:[],allowCatalogRetry:true,
  reads,errors,misses,fixtures:{[key]:{status:200,type:'application/json',body:payload.toString('base64')}},
  norm:u=>decodeURIComponent(u),hash:data=>createHash('sha256').update(data).digest('hex'),
  setTimeout:(callback,ms)=>{delays.push(ms);return setTimeout(callback,ms);},capture:()=>assert.fail('Replay must not capture live data')
 });
 const request={url:()=>key.slice(4,-1),method:()=>'GET',postData:()=>null,headers:()=>({})};
 const launchedAt=performance.now();
 const running=handler({request:()=>request,fulfill:async response=>{fulfilledWhileBlocked=rendererBlocked;fulfillResponse(response);},abort:()=>assert.fail('Known fixture must not abort')});
 let deadline;
 try{
  const response=await Promise.race([fulfilled,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Fixture waited for the blocked renderer')),1000);})]);
  assert.ok(fulfilledWhileBlocked);assert.equal(evaluations,0);assert.deepEqual(delays,[150]);
  assert.equal(response.status,200);assert.equal(response.body.toString(),payload.toString());
  assert.equal(reads.length,1);assert.ok(reads[0].at>=launchedAt&&reads[0].at<=performance.now());
  assert.equal(reads[0].hash,createHash('sha256').update(payload).digest('hex'));assert.equal(errors.length,0);assert.equal(misses.length,0);
 }finally{clearTimeout(deadline);rendererBlocked=false;releaseRenderer(0);await running;}
});
