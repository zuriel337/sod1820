// Isolated real Chromium/SDK/DOM checks. Every network request is fulfilled or
// denied locally. These synthetic accounts are NOT the user's real acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.CONTINUITY_BROWSER_OUT||'/tmp/continuity-seams-browser';await mkdir(out,{recursive:true});
const pages=JSON.parse(await readFile(new URL('../src/data/publicLegacyLecturePages2029.json',import.meta.url),'utf8'));
const proofs=JSON.parse(await readFile(new URL('../docs/reviews/public-url-exceptions-20261103/residual205/evidence/lecture-recovery/video-order-proof.json',import.meta.url),'utf8'));
proofs.push(JSON.parse(await readFile(new URL('../docs/reviews/public-url-exceptions-20261103/residual205/evidence/lecture-recovery/dependency-proofs-source-order.json',import.meta.url),'utf8')));
const API='https://linswmnnkjxvweumprav.supabase.co',CANONICAL='https://sod1820.co.il',PREVIEW='https://synthetic-preview.vercel.app';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',key='sb-linswmnnkjxvweumprav-auth-token';
const jwt=(id,expired=false)=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+(expired?-3600:3600)})).toString('base64url')+'.synthetic';
const user=id=>({id,aud:'authenticated',role:'authenticated',email:(id===A?'a':'b')+'@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2020-01-01T00:00:00Z'});
const session=(id,expired=false)=>({access_token:jwt(id,expired),refresh_token:'synthetic-refresh-'+id,expires_at:Math.floor(Date.now()/1000)+(expired?-3600:3600),expires_in:expired?-3600:3600,token_type:'bearer',user:user(id)});
const bundle=(await build({stdin:{contents:`import {historicalLectureHtml2029} from './src/lib/publicContinuityReaders2029.js';import {readingSessionOptions,verifyReadingSession} from './src/lib/publicReadingAuthSession.js';import {createClient} from '@supabase/supabase-js';export {historicalLectureHtml2029,readingSessionOptions,verifyReadingSession,createClient};`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Closure',platform:'browser',define:{__SOD_2029_BUILD__:'false','import.meta.env':'{}'},logLevel:'silent'})).outputFiles[0].text;
const report={synthetic:true,realAccounts:false,liveNetwork:0,liveWrites:0,cases:[],denied:[],errors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:900}});let rejectRefresh=false,spoofUser=false;const authCalls=[];
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url());
 if([CANONICAL,PREVIEW].includes(u.origin))return route.fulfill({contentType:u.pathname==='/bundle.js'?'application/javascript':'text/html',body:u.pathname==='/bundle.js'?bundle:'<!doctype html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="source"></main><script src="/bundle.js"></script></body></html>'});
 if(u.origin===API){authCalls.push({path:u.pathname,method:req.method()});
  if(u.pathname==='/auth/v1/user'){let id;try{id=JSON.parse(Buffer.from(req.headers().authorization.split('.')[1],'base64url')).sub;}catch{}return route.fulfill({json:user(spoofUser?B:id||A)});}
  if(u.pathname==='/auth/v1/token'&&u.searchParams.get('grant_type')==='refresh_token')return route.fulfill(rejectRefresh?{status:401,json:{error:'invalid_grant',error_description:'revoked synthetic refresh'}}:{json:session(A)});
  if(u.pathname==='/auth/v1/logout')return route.fulfill({status:204,body:''});
 }
 report.denied.push({path:u.pathname,method:req.method(),host:u.hostname});return route.abort('blockedbyclient');
});
context.on('page',page=>page.on('pageerror',e=>report.errors.push(e.message)));
async function open(origin=CANONICAL){const p=await context.newPage();await p.goto(origin+'/fixture');await p.waitForFunction(()=>!!window.Closure);return p;}
async function check(name,run){try{await run();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:e.message});throw e;}}
async function client(p,{id=A,expired=false,preview=false,previewId=null}={}){
 await p.evaluate(({stored,key,previewId,previewSession,preview})=>{localStorage.setItem(key,JSON.stringify(stored));localStorage.setItem('legacy-local-research-marker','keep-this-work');sessionStorage.removeItem('sod-public-reading-account');if(previewId)sessionStorage.setItem('sod-public-reading-account',JSON.stringify(previewSession));window.client=Closure.createClient('https://linswmnnkjxvweumprav.supabase.co','synthetic-public',{auth:{...Closure.readingSessionOptions(sessionStorage,location,{productionArtifact:true}),autoRefreshToken:false}});},{stored:session(id,expired),key,previewId,previewSession:previewId?session(previewId):null,preview});
 return p.evaluate(async()=>{const {data,error}=await client.auth.getSession();const verified=await Closure.verifyReadingSession(data?.session,client.auth);return{uid:verified?.id||null,error:!!error,localWork:localStorage.getItem('legacy-local-research-marker'),key:client.auth.storageKey};});
}
try{
 await test('isolated source projection and canonical/Preview SDK session continuity',async()=>{
  const page=await open();
  for(const source of pages)await check('source '+source.wpPageId+' exact video order, fallback, playlist, no early embeds',async()=>{
   const view=await page.evaluate(source=>{const root=document.getElementById('source');root.innerHTML=Closure.historicalLectureHtml2029(source);return{links:[...root.querySelectorAll('[data-historical-video-source]')].map(a=>a.href),activeFrames:root.querySelectorAll('iframe[src]').length,internal:[...root.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/')),text:root.textContent};},source);
   const proof=proofs.find(p=>p.wpPageId===source.wpPageId);assert.equal(view.links.length,proof.sourceUrlsInOriginalOrder.length);assert.equal(view.activeFrames,0);
   const videoId=href=>{const u=new URL(href);return u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');};
   assert.deepEqual(view.links.map(videoId),proof.sourceUrlsInOriginalOrder.map(p=>p.videoId));
   for(let i=0;i<view.links.length;i++){const original=new URL(proof.sourceUrlsInOriginalOrder[i].href),actual=new URL(view.links[i]);for(const [k,v]of original.searchParams)if(k!=='autoplay')assert.equal(actual.searchParams.get(k),v);}
   assert.ok(view.text.includes('הגאולה')||view.text.includes('הוכח'));assert.ok(view.internal.every(h=>!h.startsWith('//')));
  });
  await check('canonical valid Legacy session uses existing project key and leaves local work untouched',async()=>{const value=await client(page);assert.equal(value.uid,A);assert.equal(value.key,key);assert.equal(value.localWork,'keep-this-work');});
  const tab2=await open();
  await check('canonical second tab sees the same existing session; local signout propagates',async()=>{
   const seen=await tab2.evaluate(async()=>{window.client=Closure.createClient('https://linswmnnkjxvweumprav.supabase.co','synthetic-public',{auth:{...Closure.readingSessionOptions(sessionStorage,location,{productionArtifact:true}),autoRefreshToken:false}});return (await client.auth.getSession()).data?.session?.user?.id;});assert.equal(seen,A);
   await page.evaluate(async()=>{await client.auth.signOut({scope:'local'});});await tab2.waitForFunction(async()=>!(await client.auth.getSession()).data.session);
   assert.equal(await tab2.evaluate(()=>localStorage.getItem('legacy-local-research-marker')),'keep-this-work');
  });await page.close();await tab2.close();
  const refresh=await open();await check('expired Legacy session refreshes through existing Auth then verifies same principal',async()=>{const r=await client(refresh,{expired:true});assert.equal(r.uid,A);assert.ok(authCalls.some(c=>c.path==='/auth/v1/token'));});await refresh.close();
  rejectRefresh=true;const revoked=await open();await check('revoked expired session stays signed out and local work survives',async()=>{const r=await client(revoked,{expired:true});assert.equal(r.uid,null);assert.equal(r.localWork,'keep-this-work');});await revoked.close();rejectRefresh=false;
  const mismatch=await open();spoofUser=true;await check('server UID mismatch cannot verify a stored Legacy principal',async()=>assert.equal((await client(mismatch)).uid,null));spoofUser=false;await mismatch.close();
  const preview=await open(PREVIEW);await check('Preview with Legacy-shaped local storage alone remains signed out',async()=>{const r=await client(preview,{preview:true});assert.equal(r.uid,null);assert.equal(r.key,'sod-public-reading-account');});await preview.close();
  const previewB=await open(PREVIEW);await check('Preview account B uses only its tab session and never adopts canonical-shaped A',async()=>{const r=await client(previewB,{preview:true,previewId:B});assert.equal(r.uid,B);assert.equal(r.key,'sod-public-reading-account');});await previewB.close();
  assert.equal(report.errors.length,0);assert.equal(report.denied.filter(r=>r.host==='linswmnnkjxvweumprav.supabase.co').length,0);
 });
}finally{await context.close();await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.cases.filter(c=>c.passed).length;report.failed=report.cases.filter(c=>!c.passed).length;await writeFile(out+'/receipt.json',JSON.stringify(report,null,2)+'\n');}
