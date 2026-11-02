// Native deployed browser: actual Service Worker, network and canonical public data.
// Independent deny-only guard; no routed/mock responses and no product/model writes.
const {chromium,expect}=require('@playwright/test');
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const db='https://linswmnnkjxvweumprav.supabase.co';
const allowed=require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x=>x.proname).filter(x=>x!=='lang_links_list');
allowed.push('convergence_meter','is_number_indexable','is_phrase_indexable','writer_public_contributions_page_v1');
const outDir=process.env.SOD_NATIVE_PERF_EVIDENCE;fs.mkdirSync(outDir,{recursive:true});
const cleanUrl=s=>{const u=new URL(s);for(const k of ['_vercel_share','token','apikey','code'])u.searchParams.delete(k);return u.pathname+u.search;};
function cls(rows){let max=0,sum=0,first=0,last=0;for(const r of rows.filter(x=>!x.hadRecentInput).sort((a,b)=>a.time-b.time)){if(!sum||r.time-last>1000||r.time-first>5000){first=r.time;sum=r.value;}else sum+=r.value;last=r.time;max=Math.max(max,sum);}return max;}
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{input.close();let browser,active,activeNetwork=[],activeErrors=[];const cfg=JSON.parse(line),out={baselineSha:cfg.before.sha,candidateSha:cfg.after?.sha||null,realServiceWorker:true,networkInterception:false,mockResponses:false,productWrites:0,modelCalls:0,observationMs:600,thresholdCLS:0.1,completionDefinition:"initially admitted REST readers settled, 250ms allowance separately recorded; closed/offscreen readers deferred; not generic networkidle",results:[]};let matchedHomeSignature=null;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of (cfg.widths||[390,1440]))for(let pair=Number(cfg.pairStart||1);pair<Number(cfg.pairStart||1)+Number(cfg.pairs||3);pair++)for(const version of (cfg.after?(pair%2?['before','after']:['after','before']):['before'])){
  const c=cfg[version],origin=c.origin,context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
  if(c.accessUrl)await context.request.get(c.accessUrl);
  assert.equal((await (await context.request.get(origin+'/preview-identity.json')).json()).sha,c.sha);
  const workerResponse=await context.request.get(origin+'/preview-readonly-sw.js');assert.equal(workerResponse.status(),200);const workerHash=crypto.createHash('sha256').update(await workerResponse.body()).digest('hex');
  await require('./native-read-only-guard.cjs')(context,origin);
  await context.addInitScript(()=>{
window.__readiness=[];let last='';
const sample=()=>{
 const number=document.querySelector('.sod29-number-page');
 const method=number&&[...number.querySelectorAll('.sod29-number-v10-method-card')].find(e=>e.textContent.includes('מילוי'));
 const state={path:location.pathname+location.search,opening:!!document.querySelector('nav[aria-label="ניווט בזמן פתיחת העמוד"]'),home:!!document.querySelector('.h29-card-open')&&!document.querySelector('.h29-hero')?.textContent.includes('טוען'),post:!!document.querySelector('.sod29-reading-source'),world:!!document.querySelector('.sod29-world-featured-connections .sod29-world-catalog-card'),drawer:document.querySelector('[role=dialog] [data-number-core-root]')?.dataset.numberCoreRoot||null,number:number?.dataset.numberRoot||null,expression:number?.querySelector('.sod29-number-v10-expression-line>strong')?.textContent||null,methodReady:!!method&&!method.disabled,material:number?.dataset.materialState||(number?'ready':null)};
 const key=JSON.stringify(state);if(key!==last){last=key;window.__readiness.push({time:performance.now(),...state});}
};
new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});addEventListener('popstate',()=>requestAnimationFrame(sample));
performance.setResourceTimingBufferSize(10000);window.__shellReadyMs=null;const watch=new MutationObserver(()=>{if(document.querySelector('.sod29-command-island button')&&document.querySelector('.sod29-mobile-menu-trigger,.sod29-sidebar a')){window.__shellReadyMs=performance.now();watch.disconnect();}});watch.observe(document,{childList:true,subtree:true});window.__perfTasks=[];window.__perfInputs=[];document.addEventListener('click',e=>window.__perfInputs.push({time:performance.now(),tag:e.target.tagName,cls:String(e.target.className).slice(0,180)}),true);new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perfTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});});
  const page=active=await context.newPage();page.setDefaultTimeout(30000);const errors=[],network=[],metrics=[];let phase='setup';activeNetwork=network;activeErrors=errors;
  page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push({phase,name:e.name,message:e.message.slice(0,250)});});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Performance.enable');
  const requests=new Map();cdp.on('Network.requestWillBeSent',e=>{const r={id:e.requestId,phase,path:cleanUrl(e.request.url),type:e.type,method:e.request.method,start:e.timestamp,initiator:e.initiator.type};requests.set(e.requestId,r);network.push(r);});
  cdp.on('Network.responseReceived',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{status:e.response.status,headersMs:(e.timestamp-r.start)*1000,worker:e.response.fromServiceWorker,cache:e.response.fromDiskCache,mime:e.response.mimeType,timing:e.response.timing});});
  cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{ms:(e.timestamp-r.start)*1000,encodedBytes:e.encodedDataLength});});
  cdp.on('Network.loadingFailed',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{ms:(e.timestamp-r.start)*1000,failure:e.errorText,canceled:e.canceled});});
  if(width===390){await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});}
  if(cfg.profileCpu) {await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:4000});await cdp.send('Profiler.start');}
  const readyHome=async()=>{await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});await expect(page.locator('.h29-hero')).not.toContainText('טוען',{timeout:60000});};
  const readyWorld=async()=>{await expect(page.locator('.sod29-world-featured-connections .sod29-world-catalog-card').first()).toBeVisible({timeout:60000});};
  const readyNumber=async(n,expr)=>{await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(n),{timeout:60000});await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText(expr,{timeout:60000});await expect(page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first()).toBeEnabled({timeout:60000});};
  const menu=async()=>{if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'העולם',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('link',{name:'העולם',exact:true}).click();};
  const step=async(name,action)=>{
   phase=name;console.log(JSON.stringify({stage:name,version,width,pair}));const beforeMetrics=(await cdp.send('Performance.getMetrics')).metrics;const wall=performance.now();const stamp=await page.evaluate(()=>({origin:performance.timeOrigin,now:performance.now()})).catch(()=>({origin:0,now:0}));
   await action();const ms=performance.now()-wall;
   // Wait separately for initially admitted Number material; closed/offscreen readers stay deferred.
   if(name.includes('number')||name.includes('phrase'))await page.waitForFunction(()=>{const n=document.querySelector('.sod29-number-page');return !n||n.dataset.materialState!=='loading';},{},{timeout:60000});
   const materialDriverMs=performance.now()-wall;
   // Bounded completion definition: only REST readers actually admitted in this
   // stage, including follow-on Number readers. No sockets, generic networkidle,
   // closed depth or offscreen content. The quiet allowance is not timed content.
   let admittedReadTimeout=false;
   await page.waitForFunction(({previousOrigin,previousNow})=>{
    const since=performance.timeOrigin===previousOrigin?previousNow:0;
    const rows=(window.__safetyReads||[]).filter(r=>r.start>=since&&r.path.startsWith('/rest/v1/'));
    return rows.every(r=>r.end!=null)&&performance.now()-Math.max(since,...rows.map(r=>r.end||r.start))>=250;
   },{previousOrigin:stamp.origin,previousNow:stamp.now},{timeout:30000}).catch(()=>{admittedReadTimeout=true;});
   const completionDriverMs=performance.now()-wall;await page.waitForTimeout(600);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const data=await page.evaluate(()=>({origin:performance.timeOrigin,now:performance.now(),readiness:window.__readiness||[],shifts:window.__nativeShifts||[],tasks:window.__perfTasks||[],resources:performance.getEntriesByType('resource').map(x=>({name:new URL(x.name).pathname,type:x.initiatorType,start:x.startTime,duration:x.duration,responseStart:x.responseStart,transfer:x.transferSize,encoded:x.encodedBodySize})),reads:window.__safetyReads,denied:window.__safetyDenied,inputs:window.__perfInputs}));
   const since=data.origin===stamp.origin?stamp.now:0,shifts=data.shifts.filter(x=>x.time>=since),tasks=data.tasks.filter(x=>x.start>=since);
   const afterMetrics=(await cdp.send('Performance.getMetrics')).metrics;const previous=Object.fromEntries(beforeMetrics.map(x=>[x.name,x.value]));const cpu=Object.fromEntries(afterMetrics.filter(x=>/Duration$/.test(x.name)).map(x=>[x.name,(x.value-(previous[x.name]||0))*1000]));
   const result={name,ms,materialDriverMs,completionDriverMs,admittedReadTimeout,measurementStart:since,documentTimeOrigin:data.origin,readiness:data.readiness.filter(x=>x.time>=since),startTime:stamp.now,timeOrigin:stamp.origin,shellReadyMs:await page.evaluate(()=>window.__shellReadyMs),inputs:data.inputs?.filter(x=>x.time>=since),cls:cls(shifts),shifts,tasks,cpu,reads:data.reads?.filter(x=>x.start>=since),resources:data.resources.filter(x=>x.start>=since),denied:data.denied};metrics.push(result);return result;
  };
  const expr='אחת ארבע שבע ושתיים',address='/?measure=native-public-mobile-cycle';let numberAddress,postHref;
  for(const repeat of['first','repeat']){
   const steps=[];
   steps.push(await step('home-entry',async()=>{if(repeat==='first')await page.goto(origin+address,{waitUntil:'domcontentloaded'});else await page.goBack();await expect(page).toHaveURL(origin+address);await readyHome();}));
   assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/\/preview-readonly-sw\.js$/);
   if(cfg.homeOnly){if(cfg.storyProbe){await page.locator('#home-plane').scrollIntoViewIfNeeded();await expect(page.locator('[data-flight-story="home"]')).toBeVisible({timeout:60000});}await page.waitForTimeout(5000);const geometry=await page.evaluate(()=>Object.fromEntries(['.h29-hero','.h29-updates','.h29-sec:has(.h29-notable)','#home-plane'].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()])));out.results.push({version,sha:c.sha,width,pair,repeat,steps,geometry,reads:await page.evaluate(()=>window.__safetyReads)});break;}
   steps.push(await step('home-post',async()=>{const homeCards=await page.locator('.h29-card-open').evaluateAll(links=>links.map(a=>({href:a.getAttribute('href'),title:a.closest('article')?.querySelector('.h29-card-t')?.textContent})));const signature=JSON.stringify(homeCards);if(matchedHomeSignature==null)matchedHomeSignature=signature;assert.equal(signature,matchedHomeSignature,'public Home content changed during matched comparison');out.matchedHomeCards=homeCards;const link=cfg.postHref?page.locator('.h29-card-open[href='+JSON.stringify(cfg.postHref)+']').first():page.locator('.h29-card-open').first();postHref=await link.getAttribute('href');if(cfg.postHref)assert.equal(postHref,cfg.postHref);await link.click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});}));
   if(cfg.entryPostOnly){
    steps.push(await step('back-post-home',async()=>{await page.goBack();await expect(page).toHaveURL(origin+address);await readyHome();}));
    steps.push(await step('repeat-home-post',async()=>{await page.locator('.h29-card-open').first().click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});}));
    steps.push(await step('repeat-back-post-home',async()=>{await page.goBack();await expect(page).toHaveURL(origin+address);await readyHome();}));
    out.results.push({version,sha:c.sha,width,pair,repeat,postHref,workerHash,steps,homeAndPostOnly:true});break;
   }
   steps.push(await step('post-world',async()=>{await menu();await readyWorld();}));
   steps.push(await step('world-number-full-page',async()=>{await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const panel=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true}),input=panel.locator('input').first();await input.fill(expr);await input.press('Enter');await expect(panel.locator('[data-number-core-root="1820"]')).toBeVisible({timeout:60000});await panel.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await readyNumber(1820,expr);numberAddress=page.url();assert.equal(new URL(numberAddress).searchParams.get('focus'),expr);}));
   steps.push(await step('number-method-full-page',async()=>{await page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first().click();await readyNumber(3928,expr);assert.equal(new URL(page.url()).searchParams.get('method'),'מילוי');await expect(page.getByRole('dialog')).toHaveCount(0);}));
   steps.push(await step('back-method-number',async()=>{await page.goBack();await expect(page).toHaveURL(numberAddress);await readyNumber(1820,expr);}));
   steps.push(await step('number-phrase-full-page',async()=>{const input=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await input.fill('בראשית');await input.press('Enter');await readyNumber(913,'בראשית');}));
   steps.push(await step('back-phrase-number',async()=>{await page.goBack();await expect(page).toHaveURL(numberAddress);await readyNumber(1820,expr);}));
   steps.push(await step('back-number-world',async()=>{await page.goBack();await readyWorld();}));
   steps.push(await step('back-world-post',async()=>{await page.goBack();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});assert.equal(new URL(page.url()).pathname,new URL(postHref,origin).pathname);}));
   steps.push(await step('back-post-home',async()=>{await page.goBack();await expect(page).toHaveURL(origin+address);await readyHome();}));
   const row={version,sha:c.sha,width,pair,repeat,postHref,workerHash,steps,totalMs:steps.reduce((n,s)=>n+s.ms,0)};out.results.push(row);fs.writeFileSync(outDir+'/native-cycle-progress.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({version,width,pair,repeat,totalMs:Math.round(row.totalMs),maxCLS:Math.max(...steps.map(s=>s.cls))}));
   phase='unmeasured-world-preparation';await menu();await readyWorld();
  }
  const documentCls=cls(await page.evaluate(()=>window.__nativeShifts||[]));for(const row of out.results.filter(r=>r.version===version&&r.width===width&&r.pair===pair))row.documentCls=documentCls;
  if(cfg.profileCpu){const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(`${outDir}/cpu-${version}-${width}-${pair}.json`,JSON.stringify(profile));}
  fs.writeFileSync(`${outDir}/network-${version}-${width}-${pair}.json`,JSON.stringify({network,errors},null,2)+'\n');assert.deepEqual(errors,[]);await page.screenshot({path:`${outDir}/cycle-${version}-${width}-${pair}.png`});await context.close();
 }
 out.functionalOk=true;out.candidateClsPass=!out.results.some(c=>c.version==='after'&&(c.documentCls>out.thresholdCLS||c.steps.some(s=>s.cls>out.thresholdCLS)));out.ok=out.candidateClsPass;if(!out.ok)out.error={name:'CLS',message:'candidate exceeds unchanged0.1 budget; all samples retained'};
}catch(e){out.ok=false;out.error={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,700)};fs.writeFileSync(outDir+'/failed-network.json',JSON.stringify({network:activeNetwork,errors:activeErrors},null,2));if(active)try{out.failure=await active.evaluate(()=>({path:location.pathname+location.search,reads:window.__safetyReads,readiness:window.__readiness,worker:!!navigator.serviceWorker.controller,readyState:document.readyState,resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,start:r.startTime,duration:r.duration})),rootButton:document.querySelector('.sod29-number-root-open')?.outerHTML}));await active.screenshot({path:outDir+'/failure.png'});}catch{}}
finally{await browser?.close();fs.writeFileSync(outDir+'/native-cycle.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:out.ok,cycles:out.results.length,error:out.error}));process.exitCode=out.ok?0:1;}
});
