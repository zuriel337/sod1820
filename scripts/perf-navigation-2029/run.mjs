// Actual control clicks/back/forward/wheel, public fixture replay or guarded live Preview.
// SPA content-ready latency is measured from input, never from document FCP/LCP.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {serve} from '../perf-execution-2029/serve.mjs';
const exec=promisify(execFile), require=createRequire(`${process.env.PLAYWRIGHT_DIR||'/workspace/perf-execution-scratch/tools'}/node_modules/`);
const {chromium}=require('playwright');
const args=Object.fromEntries(process.argv.slice(2).filter((_,i)=>i%2===0).map((k,i)=>[k.slice(2),process.argv[3+i*2]]));
const mode=args.mode||'replay', runs=Number(args.runs||7), fixture=args.fixtures;
const fixtures=fixture&&fs.existsSync(fixture)?JSON.parse(zlib.gunzipSync(fs.readFileSync(fixture))):{};
const allowed=new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','fn_verses_by_gematria','number_neighbors','fn_all_methods','convergence_meter','get_category_videos','world_group_source_arrivals_v2']);
const norm=u=>decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g,'TS');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const hosted=mode==='hosted', server=hosted?null:await serve(args.dist), base=hosted?process.env.SOD_PERF_PREVIEW_BASE:`http://127.0.0.1:${server.port}`;
const browser=await chromium.launch({executablePath:process.env.PERF_CHROME||'/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',...(hosted?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const report={mode,runtime:args.sha||process.env.SOD_PERF_EXPECTED_SHA,runs,profile:{viewport:{width:390,height:844},dpr:2,cpu:4,rtt:150,download:209715.2,upload:96000,theme:args.theme||'dark'},fixtureSha256:fixture&&fs.existsSync(fixture)?hash(fs.readFileSync(fixture)):null,note:'Actual controls and browser history. Browser cache cold on entry; navigation and revisit warm in same document. Replay API150ms and externalasset400ms fixed; no SQL latency/bandwidth claim.',samples:[]};
if(args.width)report.profile.viewport.width=Number(args.width);
if(!hosted&&fs.existsSync(`${args.dist}/preview-build.json`)){
 report.build=JSON.parse(fs.readFileSync(`${args.dist}/preview-build.json`));
 assert.ok(report.build.commit.startsWith(report.runtime),'Built source SHA differs from requested SHA');report.runtime=report.build.commit;
}
const paths=(args.paths||'/world,/post/seventh-to-tenth-sefirot-2027,/topic/india-axis,/number/376').split(',');
let captureCount=0;
const captures=new Map();
async function capture(req,key){
 if(fixtures[key])return fixtures[key];if(captures.has(key))return captures.get(key);
 const promise=(async()=>{
  assert.ok(++captureCount<=220,'public capture budget exceeded');
  const headers=req.headers();assert.ok(!headers.authorization||headers.authorization===`Bearer ${headers.apikey}`,'authenticated capture forbidden');
  const argv=['--silent','--show-error','--compressed','--max-time','30','--request',req.method(),req.url()];
  for(const[k,v]of Object.entries(headers))if(['apikey','authorization','accept-profile','prefer','range','accept','content-type'].includes(k))argv.push('-H',`${k}: ${v}`);
  if(req.postData())argv.push('--data-binary',req.postData());
  argv.push('--write-out','\n__META__%{http_code}|%{content_type}|%header{content-range}');
  const {stdout}=await exec('curl',argv,{encoding:'buffer',maxBuffer:16*1024*1024});const at=stdout.lastIndexOf(Buffer.from('\n__META__'));assert.ok(at>=0);
  const[status,type,range]=stdout.subarray(at+9).toString().split('|');assert.ok(Number(status)>0);
  return fixtures[key]={status:Number(status),type,range,body:stdout.subarray(0,at).toString('base64')};
 })();captures.set(key,promise);return promise;
}
const ready=path=>path==='/world'?{selector:'[data-flight-story="world"] .sod29-flight-feature',length:20}:path.startsWith('/post/')?{selector:'[data-experience-capability="post-master-reading-stage"]',length:800}:path.startsWith('/topic/')?{selector:'.sod29-topic2029[data-canonical-slug]',length:100}:path.startsWith('/number/')?{selector:'[data-number-depth="ready"]',length:100}:{selector:'[data-experience-capability="home-composition"]',length:100};
async function waitReady(page,path){const spec=ready(path);await page.waitForFunction(({path,spec})=>location.pathname===path&&[...document.querySelectorAll(spec.selector)].some(el=>el.innerText.length>=spec.length),{path,spec},{timeout:45000});}
try{
 for(let sample=0;sample<runs;sample++)for(const path of paths){
  const context=await browser.newContext({viewport:report.profile.viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'he-IL',timezoneId:'Asia/Jerusalem',reducedMotion:'reduce'});
  const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],misses=[],reads=[],blocked=[],resources=[];let allowCatalogRetry=args.catalogfail!=='1';
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(theme=>{
   localStorage.setItem('sod-theme',theme);window.__nav={storage:[],frames:[],long:[],clicks:[]};
   const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const t=performance.now();try{return set.call(this,k,v);}finally{if(k.startsWith('sod_research'))window.__nav.storage.push({at:t,ms:performance.now()-t,bytes:String(v).length,key:k.replace(/:pending:.*/,':pending:JOURNAL')});}};
   new PerformanceObserver(l=>{for(const e of l.getEntries())window.__nav.long.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
   let last;function frame(t){if(last)window.__nav.frames.push({at:t,ms:t-last});last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
   document.addEventListener('click',e=>window.__nav.clicks.push({at:performance.now(),trusted:e.isTrusted}),true);
  },report.profile.theme);
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1],up=u.hostname==='linswmnnkjxvweumprav.supabase.co';
   if(/vercel\.live|link_identity|track_visit|ingest_event|analytics|clarity|googletagmanager|facebook|doubleclick|openweb|spot\.im/.test(req.url())||u.pathname.startsWith('/auth/')||(up&&rpc&&!allowed.has(rpc))||(!['GET','HEAD','OPTIONS'].includes(req.method())&&!(up&&allowed.has(rpc)))){blocked.push({method:req.method(),path:u.pathname});return route.fulfill({status:204,body:''});}
   if(req.url().startsWith(base))return u.pathname.startsWith('/api/')?route.fulfill({status:200,body:'{}',contentType:'application/json'}):route.continue();
   if(hosted)return route.continue();
   let body=req.postData()||'';try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b))));}catch{}
   const signature=args.headers==='1'?` ${JSON.stringify(Object.fromEntries(['prefer','range','accept-profile'].map(k=>[k,req.headers()[k]||''])))}`:'';
   const key=`${req.method()} ${norm(req.url())} ${body}${signature}`,at=await page.evaluate(()=>performance.now());
   if(!allowCatalogRetry&&u.pathname==='/rest/v1/topic_cards_public'&&u.searchParams.get('offset')==='2'){
    reads.push({at,key,method:req.method(),status:503,intentionalFailure:true,hash:'functional-injection'});return route.fulfill({status:503,contentType:'application/json',body:'{"message":"functional-only catalog continuation failure"}'});
   }
   if(args.catalograce==='1'&&u.pathname==='/rest/v1/topic_cards_public'&&u.searchParams.get('offset')==='2')await new Promise(r=>setTimeout(r,2000));
   try{
    const row=mode==='record'?await capture(req,key):fixtures[key];if(!row){misses.push(key);return route.abort();}
    if(mode==='replay')await new Promise(r=>setTimeout(r,up?150:400));const data=Buffer.from(row.body,'base64');
    if(up)reads.push({at,key,method:req.method(),status:row.status,bytes:data.length,hash:hash(data)});
    await route.fulfill({status:row.status,body:req.method()==='HEAD'?'':data,headers:{'content-type':row.type||'application/json','access-control-allow-origin':'*',...(row.range?{'content-range':row.range}:{})}});
   }catch(e){errors.push(`capture ${u.pathname}: ${e.message}`);return route.abort();}
  });
  if(hosted){
   await page.goto(`${base}/preview-build.json?_vercel_share=${encodeURIComponent(process.env.SOD_PERF_SHARE)}`);const build=JSON.parse(await page.textContent('body'));assert.equal(build.commit,report.runtime);assert.equal(build.readOnly,true);report.build=build;report.preview=base;
   await page.evaluate(async()=>{await navigator.serviceWorker.register('/preview-readonly-sw.js',{scope:'/'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
  }
  await cdp.send('Network.enable');await cdp.send('Performance.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:209715.2,uploadThroughput:96000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  cdp.on('Network.requestWillBeSent',e=>{if(e.type==='Script')resources.push({url:e.request.url,at:e.timestamp});});
  await page.goto(base+path,{waitUntil:'load'});
  try{await waitReady(page,path);}catch(e){report.samples.push({sample,path,failedPrimary:true,errors,misses,blocked,reads,terminal:await page.locator('body').innerText()});throw e;}
  await page.waitForTimeout(1300);
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
  const measures=[];
  let catalog=null;
  async function measure(name,action,target){
   const before=await cdp.send('Performance.getMetrics'),start=await page.evaluate(()=>performance.now());await action();
   if(target)await waitReady(page,target);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const readyAt=await page.evaluate(()=>performance.now());
   await page.waitForTimeout(800);const end=await page.evaluate(()=>performance.now()),after=await cdp.send('Performance.getMetrics');
   const delta={};for(const k of ['TaskDuration','ScriptDuration','LayoutDuration'])delta[k]=(after.metrics.find(m=>m.name===k).value-before.metrics.find(m=>m.name===k).value)*1000;
   const observations=await page.evaluate(({start,end})=>{const p=window.__nav,f=a=>a.filter(e=>e.at>=start&&e.at<=end);return{storage:f(p.storage),frames:f(p.frames),longTasks:f(p.long),trustedClicks:f(p.clicks),scrollY,context:JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null')};},{start,end});
   measures.push({name,start,end,readyMs:readyAt-start,metrics:delta,...observations});
  }
  if(args.catalog==='1'){
   const area=page.locator('#world-all-convergences');
   const ids=()=>area.locator('a[data-world-topic]').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>e.getAttribute('data-world-topic')));
   await page.waitForFunction(n=>[...document.querySelectorAll('#world-all-convergences a[data-world-topic]')].filter(e=>e.getClientRects().length).length===n,Number(args.catalogsize||2));
   catalog={initial:await ids(),functionalOnly:true};
   catalog.initialRequests=reads.map(r=>r.key);
   if(Number(args.catalogsize||2)===2){
    assert.ok(reads.some(r=>r.key.includes('order=meter_score.desc')&&r.key.includes('offset=0&limit=3 ')),'Two examples must come from a bounded reader, not a hidden full list');
    assert.ok(!reads.some(r=>r.key.includes('order=meter_score.desc')&&r.key.includes('offset=0&limit=25 ')),'Full secondary page/count must wait for demand');
   }
   await area.getByRole('button',{name:'עוד נושאים בעולם',exact:true}).click();
   if(args.catalograce==='1'){
    await area.getByRole('textbox',{name:'חיפוש בכל ההתכנסויות'}).fill('__SOD_CATALOG_NO_MATCH_20261014__');
    await page.waitForFunction(()=>!!document.querySelector('#world-all-convergences')?.innerText.includes('לא נמצאו נושאים במסנן הזה.'));
    await page.waitForTimeout(2500);catalog.afterStaleResponse=await ids();assert.equal(catalog.afterStaleResponse.length,0,'Old continuation must not overwrite the new filter');
    await area.getByRole('textbox',{name:'חיפוש בכל ההתכנסויות'}).fill('');
   }
   if(args.catalogfail==='1'){
    await area.getByText('חלק מהנושאים לא נטענו כרגע. מה שכבר נפתח נשאר זמין.',{exact:true}).waitFor();catalog.afterFailure=await ids();assert.deepEqual(catalog.afterFailure,catalog.initial);
    allowCatalogRetry=true;
    await area.getByRole('button',{name:'טען עוד נושאים',exact:true}).click();
   }
   await page.waitForFunction(()=>[...document.querySelectorAll('#world-all-convergences a[data-world-topic]')].filter(e=>e.getClientRects().length).length===24);
   catalog.expanded=await ids();await page.waitForTimeout(1200);
   await area.getByRole('button',{name:'הצג פחות נושאים',exact:true}).click();catalog.collapsed=await ids();assert.equal(catalog.collapsed.length,Number(args.catalogsize||2));
   const beforeReopen=reads.length;await area.getByRole('button',{name:'עוד נושאים בעולם',exact:true}).click();await page.waitForTimeout(1200);
   catalog.reopened=await ids();assert.deepEqual(catalog.reopened,catalog.expanded);
   catalog.reopenRequests=reads.slice(beforeReopen);catalog.newReadsOnReopen=catalog.reopenRequests.filter(r=>r.key.includes('/rest/v1/')).length;
   assert.equal(catalog.newReadsOnReopen,0,`Reopening must preserve already-demanded ratings and page: ${JSON.stringify(catalog.reopenRequests)}`);
   if(args.catalogreturn==='1'){
    const third=area.locator('a[data-world-topic]').nth(2),href=await third.getAttribute('href'),target=new URL(href,base).pathname;
    await third.click();await waitReady(page,target);await page.waitForTimeout(700);await page.goBack();await waitReady(page,'/world');
    await page.waitForFunction(()=>[...document.querySelectorAll('#world-all-convergences a[data-world-topic]')].filter(e=>e.getClientRects().length).length===8);
    catalog.returned=await ids();assert.deepEqual(catalog.returned,catalog.expanded.slice(0,8),'Existing Topic return window must remain available');
   }
  }else{
   await measure('scroll-forward',async()=>{for(let i=0;i<12;i++){await page.mouse.wheel(0,520);await page.waitForTimeout(65);}});
   await measure('scroll-back',async()=>{for(let i=0;i<12;i++){await page.mouse.wheel(0,-520);await page.waitForTimeout(65);}});
  }
  const links=await page.locator('a[href]').evaluateAll(els=>els.filter(e=>/^(\/post\/|\/topic\/|\/number\/|\/world$)/.test(e.getAttribute('href'))).map(e=>({href:e.getAttribute('href'),text:e.innerText,visible:!!e.getClientRects().length})).slice(0,100));
  let selected=links.find(e=>e.visible&&e.text.trim()&&e.href==='/world'&&path!=='/world')||links.find(e=>e.visible&&e.text.trim()&&e.href.startsWith('/topic/')&&path==='/world')||links.find(e=>e.visible&&e.text.trim()&&e.href.startsWith('/number/')&&!path.startsWith('/number/'));
  if(args.catalog!=='1'&&args.inspect!=='1'&&selected){
   const target=new URL(selected.href,base).pathname;const candidates=page.locator(`a[href=${JSON.stringify(selected.href)}]`);let control;
   for(let n=0;n<await candidates.count();n++){if(await candidates.nth(n).isVisible()){control=candidates.nth(n);break;}}
   assert.ok(control,'Actual navigation control not visible');
   await control.scrollIntoViewIfNeeded();await measure('actual-click',()=>control.click(),target);
   await measure('browser-back',()=>page.goBack(),path);await measure('browser-forward-revisit',()=>page.goForward(),target);
  }
  const row={sample,path,links,measures,catalog,reads,resources,errors,misses,blocked};report.samples.push(row);
  fs.writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');
  if(mode==='record')fs.writeFileSync(fixture,zlib.gzipSync(JSON.stringify(fixtures)));
  console.error(path,sample+1,'storage',measures.map(m=>m.storage.length),'errors',errors.length,'misses',misses.length);await context.close();
 }
 assert.ok(report.samples.every(s=>!s.errors.length&&!s.misses.length),'runtime/fixture errors invalidate run');
}finally{if(mode==='record')fs.writeFileSync(fixture,zlib.gzipSync(JSON.stringify(fixtures)));if(fixture&&fs.existsSync(fixture))report.fixtureSha256=hash(fs.readFileSync(fixture));fs.writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');await browser.close();server?.srv.close();}
