// Controlled, repeatable browser timings over an immutable public-read snapshot.
// Actual compiled applications; GET-only RPC transport, no product/model calls.
const {chromium,request,expect}=require('@playwright/test');
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const db='https://linswmnnkjxvweumprav.supabase.co';
const origins={before:'http://127.0.0.1:4231',after:'http://127.0.0.1:4241'};
const allowed=new Set(require('../docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(r=>r.proname));
for(const name of['convergence_meter','is_number_indexable','is_phrase_indexable'])allowed.add(name);
const out=process.env.SOD_NUMBER_METRICS||'/tmp/number-mobile-order-speed-20261101/loading.json';
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
 const ready=async(root,expression=null)=>{
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(root),{timeout:60000});
  const method=page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();await expect(method).toBeEnabled({timeout:60000});await expect(method.locator('strong')).toHaveText(/[0-9]/);
  if(expression)await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText(expression);
 };
 const menu=async label=>{if(profile.width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:label,exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('link',{name:label,exact:true}).click();};
 const address='/number/1820?focus='+encodeURIComponent('אחת ארבע שבע ושתיים')+'&method='+encodeURIComponent('רגיל')+'&source=number-speed#number-essential';
 const step=async(name,action)=>{phase=name;const n=audit.reads.length,start=Date.now();await page.evaluate(()=>{window.__numberCLS=0;}).catch(()=>{});await action();return {name,ms:Date.now()-start,requests:audit.reads.length-n,cls:await page.evaluate(()=>window.__numberCLS||0)};};
 try{
  for(const repeat of['first','repeat']){
   const steps=[];
   steps.push(await step('number-entry',async()=>{if(repeat==='first')await page.goto(origin+address);else await page.goBack();await expect(page).toHaveURL(origin+address);await ready(1820,'אחת ארבע שבע ושתיים');}));
   steps.push(await step('method-full-page',async()=>{await page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first().click();await ready(3928,'אחת ארבע שבע ושתיים');expect(new URL(page.url()).searchParams.get('method')).toBe('מילוי');await expect(page.getByRole('dialog')).toHaveCount(0);}));
   steps.push(await step('back-method-number',async()=>{await page.goBack();await expect(page).toHaveURL(origin+address);await ready(1820,'אחת ארבע שבע ושתיים');}));
   steps.push(await step('number-phrase-full-page',async()=>{const input=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await input.fill('בראשית');await input.press('Enter');await ready(913,'בראשית');}));
   steps.push(await step('back-phrase-number',async()=>{await page.goBack();await expect(page).toHaveURL(origin+address);await ready(1820,'אחת ארבע שבע ושתיים');}));
   if(!warmup){const row={version,profile:profile.name,pair,repeat,steps,totalMs:steps.reduce((sum,s)=>sum+s.ms,0)};results.push(row);fs.writeFileSync(out,JSON.stringify({baselineSha:'7649e46c199ade990fd75ea8400f60f93522ef82',source:'actual compiled clients, actual immutable public responses, same explicit operand/method in both versions; editorial-default order checked separately',profiles,firstVsRepeat:'fresh tab vs return in same SPA after Home',networkModel:'shared RTT/bandwidth delivery, Brotli-equivalent sizes, 4x mobile CPU; measured snapshot misses audited; not field/server latency',results},null,2)+'\n');console.log(JSON.stringify({version,profile:profile.name,pair,repeat,totalMs:row.totalMs}));}
   phase='unmeasured-home-preparation';await menu('בית');await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});
  }
  assert.deepEqual(audit.errors,[]);
  if(!warmup)fs.writeFileSync(out.replace(/\.json$/,`-${version}-${profile.name}-${pair}-audit.json`),JSON.stringify(audit,null,2)+'\n');
 }catch(error){fs.writeFileSync(out.replace(/\.json$/,`-${version}-${profile.name}-${pair}-failure.json`),JSON.stringify({phase,url:page.url(),audit},null,2)+'\n');throw error;}finally{await context.close();}
}
(async()=>{
 api=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});localApi=await request.newContext();browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const profile of profiles)for(const version of['before','after'])await run(version,profile,{warmup:true});
  for(const profile of profiles)for(let pair=1;pair<=(process.env.SOD_NUMBER_PERF_SMOKE==='1'?1:3);pair++)for(const version of pair%2?['before','after']:['after','before'])await run(version,profile,{pair});
 }finally{await browser?.close();await api?.dispose();await localApi?.dispose();}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
