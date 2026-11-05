import fs from 'node:fs';
import https from 'node:https';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {buildPublicReadingWorker,publicReadingBootstrap} from '/workspace/sod1820-bd-approved/public-reading-deploy/transport.js';
const require=createRequire('/workspace/sod1820-bd-approved/package.json');
const {build}=require('esbuild');
const {chromium}=require('/tmp/sod1820-bd-test-tools/node_modules/@playwright/test');
const dir='/tmp/sod-observability-real-sw-lab',SITE='https://sod1820.co.il',DB='linswmnnkjxvweumprav.supabase.co',sha='a'.repeat(40);
fs.mkdirSync(dir,{recursive:true});
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',dir+'/fixture.key','-out',dir+'/fixture.crt','-days','1','-subj','/CN=sod1820.co.il','-addext','subjectAltName=DNS:sod1820.co.il,DNS:linswmnnkjxvweumprav.supabase.co,DNS:www.google-analytics.com,DNS:www.googletagmanager.com'],{stdio:'ignore'});
const compiled=await build({stdin:{resolveDir:'/workspace/sod1820-bd-approved',contents:`import {startWebVitals2029} from './src/lib/webVitals2029.js';import{initGA,trackPageview}from './src/lib/analytics.js';
startWebVitals2029({publicReading:true,bot:false,sampleId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});initGA({publicReading:true,path:location.pathname});trackPageview(location.pathname,{publicReading:true});window.labReady=true;`},bundle:true,write:false,format:'esm',platform:'browser',define:{'import.meta.env':JSON.stringify({VITE_PUBLIC_READING_RELEASE:'public-reading-20261101',VITE_GA_ID:'G-TEST12345'}),__SOD_2029_BUILD__:'true',__SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__:'true'}});
const worker=buildPublicReadingWorker(sha,{anonKey:'local-public-fixture',gaId:'G-TEST12345'}),records=[],requests=[];
const server=https.createServer({key:fs.readFileSync(dir+'/fixture.key'),cert:fs.readFileSync(dir+'/fixture.crt')},async(req,res)=>{
 const host=req.headers.host,path=new URL(req.url,SITE).pathname;requests.push({host,path,method:req.method});
 res.setHeader('Access-Control-Allow-Origin',SITE);res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'*');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 let raw='';for await(const chunk of req)raw+=chunk;
 if(host===DB&&path==='/rest/v1/rpc/ingest_event'){
  records.push({kind:'rum',payload:JSON.parse(raw),anonymousCredential:req.headers.authorization==='Bearer local-public-fixture'});res.setHeader('Content-Type','application/json');res.end('null');return;
 }
 if(host==='www.google-analytics.com'&&path==='/g/collect'){
  const params=Object.fromEntries(new URL(req.url,'https://www.google-analytics.com').searchParams);records.push({kind:'ga',params});res.writeHead(204);res.end();return;
 }
 if(host==='www.googletagmanager.com'&&path==='/gtag/js'){
  res.setHeader('Content-Type','application/javascript');res.end(`for(const a of(window.dataLayer||[])){if(a[0]==='event'&&a[1]==='page_view'){const p=a[2];fetch('https://www.google-analytics.com/g/collect?'+new URLSearchParams({v:'2',tid:'G-TEST12345',en:'page_view',dl:p.page_location,dt:p.page_title}),{method:'POST',body:''});}}`);return;
 }
 if(host==='sod1820.co.il'&&path==='/sw.js'){res.setHeader('Service-Worker-Allowed','/');res.setHeader('Content-Type','application/javascript');res.end(worker);return;}
 if(host==='sod1820.co.il'&&path==='/assets/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end(compiled.outputFiles[0].text);return;}
 if(host==='sod1820.co.il'&&path.startsWith('/number/')){
  res.setHeader('Content-Type','text/html');res.end('<html><body><h1>בדיקת תעבורה מקומית ומבודדת</h1>'+publicReadingBootstrap('/assets/fixture.js',sha)+'</body></html>');return;
 }
 if(host==='sod1820.co.il'&&path==='/done'){res.setHeader('Content-Type','text/html');res.end('<html><body>done</body></html>');return;}
 res.writeHead(404);res.end('fixture route unavailable');
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(443,'127.0.0.1',ok);});
let browser;
try{
 const ua='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 SOD1820-ISOLATED-LAB';
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server','--ignore-certificate-errors','--user-agent='+ua,'--host-resolver-rules=MAP * 127.0.0.1']});
 const context=await browser.newContext({ignoreHTTPSErrors:true,userAgent:ua,viewport:{width:390,height:844},locale:'he-IL'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(SITE+'/number/PRIVATE-PHRASE?token=DO-NOT-LEAK',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.labReady===true,{timeout:15000});
 assert.equal(new URL(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).pathname,'/sw.js');
 await page.waitForTimeout(16000);
 const ga=records.filter(r=>r.kind==='ga'),rum=records.filter(r=>r.kind==='rum');
 assert.equal(ga.length,1);assert.equal(ga[0].params.dl,SITE+'/number/:value');assert.equal(ga[0].params.dt,'SOD1820');assert.equal(rum.length,1);assert.equal(rum[0].payload.p_props.phase,'checkpoint');assert.equal(rum[0].payload.p_path,'/number/:value');assert.equal(rum[0].anonymousCredential,true);
 assert.ok(!JSON.stringify(records).includes('PRIVATE-PHRASE'));assert.ok(!JSON.stringify(records).includes('DO-NOT-LEAK'));
 const denied=await page.evaluate(async()=>{
  const r=await fetch('https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/ingest_event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_surface:'identity',p_event_type:'legacy_seed',p_sod_id:'private'})});return r.status;
 });assert.equal(denied,403);
 await page.goto(SITE+'/done');await page.waitForTimeout(800);
 const final=records.filter(r=>r.kind==='rum'&&r.payload.p_props.phase==='final');
 const report={scope:'CONTROLLED ISOLATED LOOPBACK LAB; real Chromium and SW, fixture Google SDK/provider and fake local Supabase; NOT live provider/DB acceptance',network:{dns:'all browser hosts mapped only to127.0.0.1',listening:'127.0.0.1:443',productionWrites:0,providerCalls:0},realServiceWorker:true,records,negativeGenericEventStatus:denied,finalObserved:final.length===1,errors,pass:true};
 assert.deepEqual(errors,[]);assert.equal(final.length,1,'final event must survive real pagehide and worker handover');
 fs.writeFileSync(dir+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
