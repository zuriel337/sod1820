// Controlled, repeatable browser timings over an immutable public-read snapshot.
// Actual compiled applications; GET-only RPC transport, no product/model calls.
const {chromium,request,expect}=require('@playwright/test');
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const db='https://linswmnnkjxvweumprav.supabase.co';
const origins={before:'http://127.0.0.1:4197',after:'http://127.0.0.1:4231'};
const allowed=new Set(require('../docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(r=>r.proname));
for(const name of['convergence_meter','is_number_indexable','is_phrase_indexable'])allowed.add(name);
const out=process.env.SOD_NUMBER_METRICS||'/tmp/number-fullpage-performance-20261101/transitions.json';
const snapshots=new Map(),results=[];let api,localApi,browser;
// Home's seven-day pulse otherwise gets a new millisecond cutoff on every
// mount. Pin that same public read window for both clients, without changing
// the app clock, data, calculations or permissions.
const homePulseSince=new Date(Date.now()-7*86400000).toISOString();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const profiles=process.env.SOD_NUMBER_PERF_SMOKE==='1'?[{name:'desktop',width:1440,cpu:1,rtt:0,bytesPerSecond:0}]:[
 {name:'desktop',width:1440,cpu:1,rtt:0,bytesPerSecond:0},
 {name:'mobile-slow',width:390,cpu:4,rtt:150,bytesPerSecond:200000},
];
async function run(version,profile,{warmup=false,pair=0}={}){
 const origin=origins[version],context=await browser.newContext({viewport:{width:profile.width,height:900},locale:'he-IL',serviceWorkers:'block'});
 const seenAssets=new Set(),audit={reads:[],blocked:[],errors:[],models:0,writes:0};let phase='setup',queue=Date.now();
 await context.routeWebSocket('**/*',socket=>socket.close());
 await context.addInitScript(()=>{window.__numberCLS=0;new PerformanceObserver(list=>{for(const row of list.getEntries())if(!row.hadRecentInput)window.__numberCLS+=row.value;}).observe({type:'layout-shift',buffered:true});});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
  const local=url.origin===origin&&method==='GET';
  const read=url.origin===db&&((['GET','HEAD'].includes(method)&&url.pathname.startsWith('/rest/v1/')&&(!rpc||allowed.has(rpc)))||method==='POST'&&allowed.has(rpc)||method==='GET'&&url.pathname==='/auth/v1/settings'||method==='GET'&&url.pathname.startsWith('/storage/v1/object/public/'));
  const font=method==='GET'&&['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin);
  if(!local&&!read&&!font){audit.blocked.push({phase,path:url.pathname,method});return route.abort();}
  const target=new URL(url),start=Date.now(),requestPhase=phase;
  const record={phase:requestPhase,path:url.pathname,rpc:rpc||null,originalMethod:method,forwardedMethod:method==='HEAD'?'HEAD':'GET',start};audit.reads.push(record);
  if(method==='POST')for(const[key,value]of Object.entries(req.postDataJSON()||{})){
   if(value==null)continue;target.searchParams.set(key,Array.isArray(value)?'{'+value.map(v=>typeof v==='string'?'"'+v.replaceAll('"','\\"')+'"':String(v)).join(',')+'}':typeof value==='object'?JSON.stringify(value):String(value));
  }
  if(url.origin===db&&['/rest/v1/gematria_words','/rest/v1/research_contributions'].includes(url.pathname)){
   for(const key of['created_at','visibility_changed_at'])if(/^gte\.\d{4}-\d\d-\d\dT/.test(target.searchParams.get(key)||''))target.searchParams.set(key,'gte.'+homePulseSince);
  }
  const incoming=req.headers(),headers={};for(const key of['apikey','authorization','accept','range','range-unit','prefer','origin','user-agent'])if(incoming[key])headers[key]=incoming[key];
  // Public body snapshots are shared between variants. CORS varies by the
  // current origin, not the first variant that read an identical public body.
  const key=(method==='HEAD'?'HEAD ':'GET ')+target.href+JSON.stringify({accept:headers.accept,range:headers.range,prefer:headers.prefer});
  record.primed=snapshots.has(key);
  try{
   if(!snapshots.has(key)){
    const pending=(async()=>{const response=await (local?localApi:api).fetch(target.href,{method:method==='HEAD'?'HEAD':'GET',headers,maxRedirects:0,timeout:30000});const h=response.headers();delete h['content-encoding'];delete h['content-length'];delete h['transfer-encoding'];const body=await response.body();const wireBytes=/javascript|json|text|svg/.test(h['content-type']||'')?zlib.brotliCompressSync(body,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}).length:body.length;return {status:response.status(),headers:h,body,wireBytes};})();
    snapshots.set(key,pending);pending.catch(()=>snapshots.delete(key));
   }
   const entry=await snapshots.get(key),h={...entry.headers};if(incoming.origin)h['access-control-allow-origin']=incoming.origin;
   const isAsset=local&&/\.(?:js|css|woff2|png|jpg|webp|svg)(?:$)/.test(url.pathname)||font;
   const cachedAsset=isAsset&&seenAssets.has(key);if(isAsset)seenAssets.add(key);
   const wireBytes=entry.wireBytes;
   if(!warmup&&!cachedAsset){
    const ready=Date.now()+profile.rtt;const done=Math.max(ready,queue)+(profile.bytesPerSecond?wireBytes*1000/profile.bytesPerSecond:0);queue=done;await sleep(Math.max(0,done-Date.now()));
   }
   Object.assign(record,{status:entry.status,bytes:entry.body.length,modeledWireBytes:cachedAsset?0:wireBytes,ms:Date.now()-start});
   await route.fulfill({status:entry.status,headers:h,body:entry.body});
  }catch(error){audit.errors.push({phase,path:url.pathname,type:error.name});await route.abort();}
 });
 const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:warmup?1:profile.cpu});
 page.on('pageerror',error=>audit.errors.push({phase,type:error.name,message:error.message.slice(0,300)}));page.setDefaultTimeout(30000);
 const readyNumber=async root=>{
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(root),{timeout:60000});await expect(page.locator('.sod29-number-core2029.is-page')).toHaveAttribute('data-number-core-root',String(root));
  // Both variants must show an actionable canonical method result, rather
  // than counting the old client's still-loading method placeholders as ready.
  const method=page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();await expect(method).toBeEnabled({timeout:60000});await expect(method.locator('strong')).toHaveText(/[0-9]/,{timeout:60000});
 };
 const readyHome=async()=>{await expect(page.locator('.h29-hero')).not.toContainText('טוען',{timeout:60000});await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});};
 const menu=async label=>{
  if(profile.width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:label,exact:true}).click();}
  else await page.locator('.sod29-sidebar').getByRole('link',{name:label,exact:true}).click();
 };
 const openNumber=async()=>{
  await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const panel=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});await panel.locator('input').first().fill('1820');await panel.locator('input').first().press('Enter');
  await expect(panel.locator('[data-number-core-root="1820"]')).toBeVisible({timeout:60000});await panel.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await readyNumber(1820);
 };
 const step=async(name,action)=>{
  phase=name;const count=audit.reads.length,start=Date.now();await page.evaluate(()=>{window.__numberCLS=0;}).catch(()=>{});await action();
  const row={name,ms:Date.now()-start,requests:audit.reads.length-count,cls:await page.evaluate(()=>window.__numberCLS||0)};
  return row;
 };
 try{
  let postHref,numberHref,phraseHref;
  for(const repeat of['first','repeat']){
   const steps=[];
   steps.push(await step(repeat+'-home-entry',async()=>{if(repeat==='first')await page.goto(origin+'/?measure=number-cycle');else await menu('בית');await readyHome();}));
   steps.push(await step('home-post',async()=>{postHref=await page.locator('.h29-card-open').first().getAttribute('href');await page.locator('.h29-card-open').first().click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});}));
   steps.push(await step('post-world',async()=>{await menu('העולם');await expect(page.locator('.sod29-world-entry-grid button').first()).toBeEnabled({timeout:60000});}));
   steps.push(await step('world-number-full-page',async()=>{await openNumber();numberHref=page.url();}));
   steps.push(await step('number-phrase-full-page',async()=>{const input=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await input.fill('בראשית');await input.press('Enter');await readyNumber(913);await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText('בראשית');phraseHref=page.url();}));
   steps.push(await step('phrase-number-full-page',async()=>{const input=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await input.fill('1820');await input.press('Enter');await readyNumber(1820);}));
   steps.push(await step('back-number-phrase',async()=>{await page.goBack();await expect(page).toHaveURL(phraseHref);await readyNumber(913);}));
   steps.push(await step('back-phrase-number',async()=>{await page.goBack();await expect(page).toHaveURL(numberHref);await readyNumber(1820);}));
   steps.push(await step('back-number-world',async()=>{await page.goBack();await expect(page.locator('.sod29-world-entry-grid button').first()).toBeEnabled({timeout:60000});}));
   steps.push(await step('back-world-post',async()=>{await page.goBack();await expect(page).toHaveURL(origin+postHref);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});}));
   steps.push(await step('back-post-home',async()=>{await page.goBack();await readyHome();}));
   steps.push(await step('home-number-full-page',openNumber));
   steps.push(await step('number-home',async()=>{await menu('בית');await readyHome();}));
   if(!warmup){const row={version,profile:profile.name,width:profile.width,pair,repeat,postHref,steps,totalMs:steps.reduce((sum,s)=>sum+s.ms,0)};results.push(row);fs.writeFileSync(out,JSON.stringify({baselineSha:'dbbe91de46d21a37110664dc732473de6d9cc6ca',source:'actual compiled clients and frozen actual public read responses; not field telemetry',profiles,homePulseSince,networkModel:'shared RTT/bandwidth response delivery; Brotli-equivalent text sizes; tab asset reuse; identical seven-day public Home pulse window; real server variation excluded after unmeasured snapshot warmup; misses explicitly audited',firstVsRepeat:'first is a fresh tab, repeat returns within the same SPA after one complete cycle',worldImplementation:'unchanged dbbe product, separate World source branch not imported',results},null,2)+'\n');console.log(JSON.stringify({version,profile:profile.name,pair,repeat,totalMs:row.totalMs,requests:steps.reduce((sum,s)=>sum+s.requests,0)}));}
   phase='unmeasured-world-preparation';await menu('העולם');await expect(page.locator('.sod29-world-entry-grid button').first()).toBeEnabled({timeout:60000});
  }
  assert.deepEqual(audit.errors,[]);assert.equal(audit.models,0);assert.equal(audit.writes,0);
  if(!warmup)fs.writeFileSync(out.replace(/\.json$/,`-${version}-${profile.name}-${pair}-audit.json`),JSON.stringify(audit,null,2)+'\n');
 }catch(error){fs.writeFileSync(out.replace(/\.json$/,`-${version}-${profile.name}-${pair}-failure.json`),JSON.stringify({phase,url:page.url(),body:(await page.locator('body').textContent().catch(()=>''))?.slice(0,1800),audit},null,2)+'\n');throw error;}finally{await context.close();}
}
(async()=>{
 api=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});localApi=await request.newContext();browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const profile of profiles)for(const version of['before','after'])await run(version,profile,{warmup:true});
  for(const profile of profiles)for(let pair=1;pair<=(process.env.SOD_NUMBER_PERF_SMOKE==='1'?1:3);pair++)for(const version of pair%2?['before','after']:['after','before'])await run(version,profile,{pair});
 }finally{await browser?.close();await api?.dispose();await localApi?.dispose();}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
