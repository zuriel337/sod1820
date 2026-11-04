// Actual protected deployment + actual SW. Deny-only product boundary; no HAR,
// credentials, headers or response bodies persisted. Optional held stylesheet is
// explicit fault injection and is NEVER included in native performance samples.
const {chromium,expect}=require('@playwright/test');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const out=process.env.SOD_COLD_OUT;fs.mkdirSync(out,{recursive:true,mode:0o700});
const cleanUrl=value=>{try{const u=new URL(value);for(const k of [...u.searchParams.keys()])if(/token|key|code|share|signature|email/i.test(k))u.searchParams.delete(k);return{host:u.hostname,path:u.pathname+u.search};}catch{return{path:String(value).slice(0,200)};}};
const cleanText=value=>String(value).replace(/https?:\/\/[^\s"<>]+/g,s=>{const u=cleanUrl(s);return u.host+u.path;}).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT]').slice(0,1600);
function cls(rows=[]){let best=0,sum=0,first=0,last=0;for(const r of rows.filter(r=>!r.hadRecentInput)){if(!sum||r.time-last>1000||r.time-first>5000){sum=r.value;first=r.time;}else sum+=r.value;last=r.time;best=Math.max(best,sum);}return best;}
async function observe(context,origin){
 await require('../home-light-reading-now-20261102/native-read-only-guard.cjs')(context,origin);
 await context.addInitScript(()=>{
  window.__bootPhases=[];window.__bootReady=[];const mark=(stage,info={})=>window.__bootPhases.push({time:performance.now(),stage,...info});
  mark('init',{readyState:document.readyState});
  addEventListener('error',e=>mark('window_error',{name:e.error?.name||null,message:e.message||'resource_error',path:e.target?.src?new URL(e.target.src).pathname:e.target?.href?new URL(e.target.href).pathname:null}),true);
  addEventListener('unhandledrejection',e=>mark('unhandled_rejection',{name:e.reason?.name||null,message:String(e.reason?.message||e.reason).slice(0,400)}));
  document.addEventListener('DOMContentLoaded',()=>mark('dom_content_loaded'));
  addEventListener('load',()=>mark('window_load'));
  if('serviceWorker' in navigator){
   const sw=navigator.serviceWorker,register=sw.register.bind(sw),watched=new WeakSet();
   const watch=reg=>{for(const worker of [reg.installing,reg.waiting,reg.active].filter(Boolean))if(!watched.has(worker)){watched.add(worker);mark('worker_state',{state:worker.state});worker.addEventListener('statechange',()=>mark('worker_state',{state:worker.state}));}reg.addEventListener('updatefound',()=>{mark('worker_update_found');watch(reg);},{once:true});};
   sw.register=(...args)=>{mark('worker_register_start');return register(...args).then(reg=>{mark('worker_register_resolved');watch(reg);return reg;},e=>{mark('worker_register_failed',{name:e.name,message:e.message});throw e;});};
   sw.ready.then(reg=>{mark('worker_ready',{controller:Boolean(sw.controller)});watch(reg);});
   sw.addEventListener('controllerchange',()=>mark('worker_controller_change',{controller:Boolean(sw.controller)}));
   mark('initial_controller',{controller:Boolean(sw.controller)});
  }
  let last='';const sample=()=>{
   const n=document.querySelector('.sod29-number-page'),method=n&&[...n.querySelectorAll('.sod29-number-v10-method-card')].find(e=>e.textContent.includes('מילוי'));
   const state={path:location.pathname+location.search,opening:!!document.querySelector('.sod29-opening'),home:!!document.querySelector('.h29-card-open')&&!document.querySelector('.h29-hero')?.textContent.includes('טוען'),post:!!document.querySelector('.sod29-reading-source'),world:!!document.querySelector('.sod29-world-featured-connections .sod29-world-catalog-card'),number:n?.dataset.numberRoot||null,methodReady:!!method&&!method.disabled,calculator:!!document.querySelector('[data-calculator-2029],.sod29-calculator-page')};
   const key=JSON.stringify(state);if(key!==last){last=key;window.__bootReady.push({time:performance.now(),...state});}
  };new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});
 });
}
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{
 input.close();const cfg=JSON.parse(line),report={sha:cfg.sha,origin:cfg.origin,actualSW:true,productWrites:0,modelCalls:0,networkInterception:Boolean(cfg.holdFont),trials:[]};let browser;
 const flush=()=>fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');
 const proxy=process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{};
 const launch={executablePath:'/usr/bin/chromium',headless:true,...proxy,args:['--no-sandbox','--disable-dev-shm-usage']};
 async function runPage(context,page,width,label,action){
  const result={label,width,network:[],errors:[],console:[],steps:[]};report.trials.push(result);flush();
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  const rows=new Map();cdp.on('Network.requestWillBeSent',e=>{const row={id:e.requestId,...cleanUrl(e.request.url),type:e.type,method:e.request.method,at:e.timestamp};rows.set(e.requestId,row);result.network.push(row);});
  cdp.on('Network.responseReceived',e=>{const row=rows.get(e.requestId);if(row)Object.assign(row,{status:e.response.status,mime:e.response.mimeType,headersMs:(e.timestamp-row.at)*1000,fromSW:e.response.fromServiceWorker,fromCache:e.response.fromDiskCache});});
  cdp.on('Network.loadingFinished',e=>{const row=rows.get(e.requestId);if(row)Object.assign(row,{durationMs:(e.timestamp-row.at)*1000,bytes:e.encodedDataLength,finished:true});});
  cdp.on('Network.loadingFailed',e=>{const row=rows.get(e.requestId);if(row)Object.assign(row,{durationMs:(e.timestamp-row.at)*1000,failure:e.errorText,canceled:e.canceled});});
  const onError=e=>result.errors.push({name:e.name,message:cleanText(e.message)}),onConsole=m=>{if(['error','warning'].includes(m.type()))result.console.push({type:m.type(),text:cleanText(m.text())});};page.on('pageerror',onError);page.on('console',onConsole);
  if(width===390&&!cfg.holdFont){await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});}
  const start=performance.now();let response;
  try{
   response=await action();result.document=response?{status:response.status(),...cleanUrl(response.url())}:null;
   await page.waitForFunction(()=>!!document.querySelector('.h29-card-open'),{},{timeout:cfg.timeoutMs||30000});
   await expect(page.locator('.h29-hero')).not.toContainText('טוען');
   result.homeDriverMs=performance.now()-start;result.homeReady=true;
   await page.waitForFunction(()=>{const r=(window.__safetyReads||[]).filter(r=>r.path.startsWith('/rest/v1/'));return r.every(r=>r.end!=null)&&performance.now()-Math.max(0,...r.map(r=>r.end||r.start))>=250;},{},{timeout:30000});
   await page.waitForTimeout(600);
   result.posts=await page.locator('.h29-card-open').evaluateAll(links=>links.map(a=>({href:a.getAttribute('href'),title:a.closest('article')?.querySelector('.h29-card-t')?.textContent})));
   if(cfg.post){const since=await page.evaluate(()=>performance.now()),href=await page.locator('.h29-card-open').first().getAttribute('href');await page.locator('.h29-card-open').first().click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});await page.waitForTimeout(600);result.steps.push({name:'home-post',start:since,href});const back=await page.evaluate(()=>performance.now());await page.goBack();await expect(page.locator('.h29-card-open').first()).toBeVisible();assert.equal(page.url(),new URL(cfg.address||'/?startup=acceptance',cfg.origin).href);result.steps.push({name:'back-post-home',start:back});}
   result.ok=true;
  }catch(e){result.ok=false;result.error={name:e.name,message:cleanText(e.message)};result.elapsedMs=performance.now()-start;}
  try{
   result.snapshot=await page.evaluate(()=>({readyState:document.readyState,path:location.pathname+location.search,controller:navigator.serviceWorker.controller?.scriptURL?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,phases:window.__bootPhases,readiness:window.__bootReady,reads:window.__safetyReads,denied:window.__safetyDenied,shifts:window.__nativeShifts,resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,start:r.startTime,duration:r.duration,type:r.initiatorType,bytes:r.encodedBodySize})),opening:!!document.querySelector('.sod29-opening'),home:!!document.querySelector('.h29-card-open'),rootChildren:document.getElementById('root')?.children.length}));
   result.documentCls=cls(result.snapshot.shifts);await page.screenshot({path:out+'/'+label+'-'+width+'.png'});
  }catch(e){result.snapshotError=cleanText(e.message);}
  page.off('pageerror',onError);page.off('console',onConsole);await cdp.detach().catch(()=>{});flush();console.log(JSON.stringify({label,width,ok:result.ok,homeDriverMs:result.homeDriverMs,controller:result.snapshot?.controller,lastPhase:result.snapshot?.phases?.at(-1),requests:result.network.length,error:result.error}));
  return result;
 }
 try{
  browser=await chromium.launch(launch);
  for(const width of cfg.widths||[390,1440])for(let i=1;i<=(cfg.trials||3);i++){
   const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
   if(cfg.accessUrl)await context.request.get(cfg.accessUrl);
   const identity=await context.request.get(cfg.origin+'/preview-identity.json');if(identity.status()!==200)throw Error('Vercel access/identity denied:'+identity.status());assert.equal((await identity.json()).sha,cfg.sha);
   await observe(context,cfg.origin);const page=await context.newPage();
   if(cfg.holdFont){let release;const gate=new Promise(r=>release=r);await context.route('https://fonts.googleapis.com/**',async route=>{await gate;await route.continue().catch(()=>{});});
    setTimeout(async()=>{try{const state=await page.evaluate(()=>({phases:window.__bootPhases,home:!!document.querySelector('.h29-card-open'),readyState:document.readyState}));report.fontHeldSnapshot=state;flush();console.log(JSON.stringify({fontHeld:true,home:state.home,phases:state.phases?.map(p=>p.stage)}));}finally{release();}},Number(cfg.fontHoldMs||7000));}
   await runPage(context,page,width,'fresh-'+i,()=>page.goto(cfg.origin+(cfg.address||'/?startup=acceptance'),{waitUntil:'commit'}));
   if(!cfg.holdFont&&cfg.warm!==false)await runPage(context,page,width,'warm-'+i,()=>page.reload({waitUntil:'commit'}));
   await context.close();
  }
  await browser.close();browser=null;
  if(cfg.persistent){const profile=path.join(out,'PRIVATE-browser-profile');fs.mkdirSync(profile,{recursive:true,mode:0o700});
   for(const pass of ['persistent-first','persistent-reopened']){
    const context=await chromium.launchPersistentContext(profile,{...launch,viewport:{width:390,height:900},locale:'he-IL'});if(cfg.accessUrl)await context.request.get(cfg.accessUrl);await observe(context,cfg.origin);const page=await context.newPage();await runPage(context,page,390,pass,()=>page.goto(cfg.origin+(cfg.address||'/?startup=acceptance'),{waitUntil:'commit'}));await context.close();
   }
  }
 }catch(e){report.fatal={name:e.name,message:cleanText(e.message)};}
 finally{await browser?.close();report.ok=!report.fatal&&report.trials.every(r=>r.ok);flush();console.log(JSON.stringify({ok:report.ok,trials:report.trials.length,failed:report.trials.filter(r=>!r.ok).length,fatal:report.fatal}));process.exitCode=report.ok?0:1;}
});
