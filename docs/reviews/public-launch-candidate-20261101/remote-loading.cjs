// Controlled, repeatable browser timings over an immutable public-read snapshot.
// Actual compiled applications; GET-only RPC transport, no product/model calls.
const {chromium,request,expect}=require('@playwright/test');
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const db='https://linswmnnkjxvweumprav.supabase.co';
const origins={before:'http://127.0.0.1:4231',after:'http://127.0.0.1:4251'};
const allowed=new Set(require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(r=>r.proname));
for(const name of['convergence_meter','is_number_indexable','is_phrase_indexable'])allowed.add(name);
const out=process.env.SOD_PUBLIC_METRICS||'/tmp/public-launch-candidate-20261101/remote-loading.json';
const observationMs=Number(process.env.SOD_PERF_OBSERVATION_MS??600);
const snapshots=new Map(),results=[];let api,localApi,browser,matchedPostHref;
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
 await context.addInitScript(()=>{window.__publicShifts=[];new PerformanceObserver(list=>{for(const row of list.getEntries())window.__publicShifts.push({time:row.startTime,value:row.value,hadRecentInput:row.hadRecentInput,sources:row.sources.map(s=>({node:[s.node?.tagName,s.node?.id,s.node?.className,s.node?.parentElement?.className].map(String).join(' ').slice(0,300),previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});});
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
    const pending=(async()=>{const response=await (local?localApi:api).fetch(target.href,{method:method==='HEAD'?'HEAD':'GET',headers,maxRedirects:0,timeout:30000});const h=response.headers();delete h['content-encoding'];delete h['content-length'];delete h['transfer-encoding'];let body=await response.body();if(local&&(h['content-type']||'').includes('text/html')){const html=body.toString(),entry=html.match(/await import\('([^']+)'\)/)?.[1];if(entry)body=Buffer.from(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));}const wireBytes=/javascript|json|text|svg/.test(h['content-type']||'')?zlib.brotliCompressSync(body,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}).length:body.length;return {status:response.status(),headers:h,body,wireBytes};})();
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
  }catch(error){audit.errors.push({phase,path:url.pathname,type:error.name,message:String(error.message).split('\n')[0].slice(0,180)});await route.abort();}
 });
 const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:warmup?1:profile.cpu});
 page.on('pageerror',error=>audit.errors.push({phase,type:error.name,message:error.message.slice(0,300)}));page.setDefaultTimeout(30000);

 const readyNumber=async(root,expression)=>{
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(root),{timeout:60000});
  await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText(expression,{timeout:60000});
  await expect(page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first()).toBeEnabled({timeout:60000});
 };
 const readyHome=async()=>{await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});await expect(page.locator('.h29-hero')).not.toContainText('טוען',{timeout:60000});};
 const readyWorld=async()=>{await expect(page.locator('.sod29-world-featured-connections .sod29-world-catalog-card').first()).toBeVisible({timeout:60000});};
 const menu=async label=>{if(profile.width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:label,exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('link',{name:label,exact:true}).click();};
 const clsOf=rows=>{let max=0,sum=0,first=0,last=0;for(const r of rows.filter(r=>!r.hadRecentInput).sort((a,b)=>a.time-b.time)){if(!sum||r.time-last>1000||r.time-first>5000){first=r.time;sum=r.value;}else sum+=r.value;last=r.time;max=Math.max(max,sum);}return max;};
 const step=async(name,action)=>{
  phase=name;const n=audit.reads.length,start=Date.now();
  const stamp=await page.evaluate(()=>{window.__publicShifts=[];return {origin:performance.timeOrigin,now:performance.now()};}).catch(()=>({origin:0,now:0}));
  await action();const primaryMs=Date.now()-start;
  // Same explicit post-read observation window in every before/after run. It
  // is excluded from primary-ready timing, and is not a field/RUM substitute.
  if(observationMs)await page.waitForTimeout(observationMs);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const capture=await page.evaluate(()=>({origin:performance.timeOrigin,rows:window.__publicShifts||[]}));
  const shifts=capture.rows.filter(r=>r.time>=(capture.origin===stamp.origin?stamp.now:0));
  return {name,ms:primaryMs,observedMs:Date.now()-start,requests:audit.reads.length-n,cls:clsOf(shifts),shifts};
 };
 const address='/?measure=public-world-number-cycle',expression='אחת ארבע שבע ושתיים';let postHref,numberAddress;
 try{
  for(const repeat of['first','repeat']){
   const steps=[];
   steps.push(await step('home-entry',async()=>{if(repeat==='first')await page.goto(origin+address);else await page.goBack();await expect(page).toHaveURL(origin+address);await readyHome();}));
   steps.push(await step('home-post',async()=>{const link=page.locator('.h29-card-open').first();postHref=await link.getAttribute('href');if(matchedPostHref)expect(postHref).toBe(matchedPostHref);else matchedPostHref=postHref;await link.click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});}));
   steps.push(await step('post-world',async()=>{await menu('העולם');await readyWorld();}));
   steps.push(await step('world-number-full-page',async()=>{
    await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const panel=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});const input=panel.locator('input').first();await input.fill(expression);await input.press('Enter');
    await expect(panel.locator('[data-number-core-root="1820"]')).toBeVisible({timeout:60000});await panel.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await readyNumber(1820,expression);numberAddress=page.url();expect(new URL(numberAddress).searchParams.get('focus')).toBe(expression);
   }));
   steps.push(await step('number-method-full-page',async()=>{await page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first().click();await readyNumber(3928,expression);expect(new URL(page.url()).searchParams.get('method')).toBe('מילוי');await expect(page.getByRole('dialog')).toHaveCount(0);}));
   steps.push(await step('back-method-number',async()=>{await page.goBack();await expect(page).toHaveURL(numberAddress);await readyNumber(1820,expression);}));
   steps.push(await step('number-phrase-full-page',async()=>{const input=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await input.fill('בראשית');await input.press('Enter');await readyNumber(913,'בראשית');}));
   steps.push(await step('back-phrase-number',async()=>{await page.goBack();await expect(page).toHaveURL(numberAddress);await readyNumber(1820,expression);}));
   steps.push(await step('back-number-world',async()=>{await page.goBack();await readyWorld();}));
   steps.push(await step('back-world-post',async()=>{await page.goBack();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});expect(new URL(page.url()).pathname).toBe(new URL(postHref,origin).pathname);}));
   steps.push(await step('back-post-home',async()=>{await page.goBack();await expect(page).toHaveURL(origin+address);await readyHome();}));
   if(!warmup){
    const row={version,profile:profile.name,pair,repeat,postHref,steps,totalMs:steps.reduce((sum,s)=>sum+s.ms,0)};results.push(row);
    fs.writeFileSync(out,JSON.stringify({baselineSha:process.env.SOD_BASELINE_SHA||'7649e46c199ade990fd75ea8400f60f93522ef82',candidateSha:process.env.SOD_CANDIDATE_SHA||'UNSPECIFIED',source:'actual exact protected deployment assets, independent GET-only broker and identical immutable real public response snapshots; same explicit Number operand/method and actual same Home Post',profiles,observationWindowMs:observationMs,thresholdCLS:0.1,clsDefinition:'largest standard 1s-gap/5s session window per measured route/action; timestamps exclude entries queued before action, document navigation uses new time origin',definition:'11 primary-ready transitions, World requires a real featured Topic card, Number requires matching operand and enabled canonical method. First is a fresh browser context; repeat returns from World in the same SPA. Other pages first visited along that cycle, not independently cold direct HTML.',networkModel:'shared RTT/bandwidth delivery, Brotli-equivalent sizes, 4x mobile CPU; server bodies pinned after warmup; not field LCP/RUM or live backend latency',results},null,2)+'\n');
    console.log(JSON.stringify({version,profile:profile.name,pair,repeat,totalMs:row.totalMs,maxStepCLS:Math.max(...steps.map(s=>s.cls))}));
   }
   phase='unmeasured-world-preparation';await menu('העולם');await readyWorld();
  }
  assert.deepEqual(audit.errors,[]);
  if(!warmup)fs.writeFileSync(out.replace(/\.json$/,`-${version}-${profile.name}-${pair}-audit.json`),JSON.stringify(audit,null,2)+'\n');
 }catch(error){fs.writeFileSync(out.replace(/\.json$/,`-${version}-${profile.name}-${pair}-failure.json`),JSON.stringify({phase,url:page.url(),audit},null,2)+'\n');throw error;}finally{await context.close();}
}
(async()=>{
 const input=require('readline').createInterface({input:process.stdin});const cfg=await new Promise(resolve=>input.once('line',line=>{input.close();resolve(JSON.parse(line));}));
 origins.before=cfg.before.origin;origins.after=cfg.after.origin;
 api=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});localApi=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});
 for(const version of ['before','after']){assert.equal(new URL(cfg[version].accessUrl).origin,origins[version]);await localApi.get(cfg[version].accessUrl);const identity=await localApi.get(origins[version]+'/preview-identity.json');assert.equal((await identity.json()).sha,cfg[version].sha);}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const profile of profiles)for(const version of['before','after'])await run(version,profile,{warmup:true});
  for(const profile of profiles)for(let pair=1;pair<=Number(process.env.SOD_PUBLIC_PERF_PAIRS||(process.env.SOD_NUMBER_PERF_SMOKE==='1'?1:3));pair++)for(const version of pair%2?['before','after']:['after','before'])await run(version,profile,{pair});
 }finally{await browser?.close();await api?.dispose();await localApi?.dispose();}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
