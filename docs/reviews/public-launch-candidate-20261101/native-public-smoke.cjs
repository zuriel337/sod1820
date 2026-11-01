// Actual deployed app and its actual service worker, native network/cache.
// Independent deny-only fetch/XHR/beacon/WS safety guard: no mock data/handlers.
const {chromium,expect}=require('@playwright/test'),fs=require('fs'),assert=require('assert/strict');
const scenarios=require('../../../test/public-world-scenarios.cjs');
const outDir=process.env.SOD_NATIVE_PUBLIC_EVIDENCE;fs.mkdirSync(outDir,{recursive:true});
const db='https://linswmnnkjxvweumprav.supabase.co';
const allowed=require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x=>x.proname).filter(x=>x!=='lang_links_list');
allowed.push('convergence_meter','is_number_indexable','is_phrase_indexable','writer_public_contributions_page_v1');
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{input.close();let browser;const out={sha:'cf1f8f1a35eb90c10a3a84a310f8616b2121f965',realServiceWorker:true,networkInterception:false,mockResponses:false,liveProductWrites:0,models:0,cases:[]};
 try{const cfg=JSON.parse(line);browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of[390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});await context.request.get(cfg.accessUrl);
  await context.addInitScript(({db,allowed,origin})=>{
   const reads=new Set(allowed),nativeFetch=window.fetch.bind(window);window.__safetyReads=[];window.__safetyDenied=[];
   window.fetch=(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
    const safeRead=u.origin===db&&((u.pathname.startsWith('/rest/v1/')&&(!rpc||reads.has(rpc))&&(['GET','HEAD'].includes(req.method)||rpc&&req.method==='POST'))||req.method==='GET'&&['/auth/v1/user','/auth/v1/settings'].includes(u.pathname)||req.method==='GET'&&u.pathname.startsWith('/storage/v1/object/public/'));
    const local=req.method==='GET'&&u.origin===origin&&!u.pathname.startsWith('/api/')||req.method==='GET'&&u.origin===origin&&/^\/api\/(?:preview-capabilities|public-document|public-sitemap|contributor-self)(?:$|\/)/.test(u.pathname);
    if(!safeRead&&!local){window.__safetyDenied.push({path:u.pathname,method:req.method});return Promise.reject(new Error('independent_read_only_guard'));}
    const row={path:u.pathname,method:req.method};window.__safetyReads.push(row);return nativeFetch(req).then(response=>{row.status=response.status;return response;});
   };
   const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,...args){if(!['GET','HEAD'].includes(String(method).toUpperCase()))throw Error('independent_read_only_guard');return open.call(this,method,...args);};
   navigator.sendBeacon=()=>false;const NativeSocket=window.WebSocket;
   window.WebSocket=class extends NativeSocket{constructor(url,protocols){const u=new URL(url);if(u.origin!==db.replace('https:','wss:'))throw Error('independent_read_only_guard');super(url,protocols);}send(data){const m=JSON.parse(data),event=Array.isArray(m)?m[3]:m.event;if(!['phx_join','phx_leave','heartbeat','access_token'].includes(event))throw Error('independent_read_only_guard');return super.send(data);}};
  },{db,allowed,origin:cfg.origin});
  const page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push({name:e.name,message:e.message.slice(0,180)});});
  await page.goto(cfg.origin+'/',{waitUntil:'domcontentloaded'});await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});
  assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/\/preview-readonly-sw\.js$/);
  const states=[];const capture=async name=>states.push({name,url:page.url(),reads:await page.evaluate(()=>window.__safetyReads),denied:await page.evaluate(()=>window.__safetyDenied)});
  const post=page.locator('.h29-card-open').first(),postHref=await post.getAttribute('href');await post.click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});await capture('home-post');
  if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'העולם',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('link',{name:'העולם',exact:true}).click();
  await expect(page.locator('.sod29-world-featured-connections .sod29-world-catalog-card').first()).toBeVisible({timeout:60000});await capture('post-world');
  await scenarios.numberFullPage(page,width,{outputPath:f=>outDir+'/native-'+width+'-'+f},cfg.origin);await capture('number-method-phrase-return');
  assert.equal(errors.length,0);out.cases.push({width,passed:true,postHref,actualWorkerControlled:true,states,errors});await page.screenshot({path:outDir+'/native-public-'+width+'.png'});await context.close();
 }
 out.ok=true;
 }catch(e){out.ok=false;out.error={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,500)};}
 finally{await browser?.close();fs.writeFileSync(outDir+'/native-public.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:out.ok,cases:out.cases.length,error:out.error}));process.exitCode=out.ok?0:1;}
});
