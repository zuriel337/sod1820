// Dedicated matched World experiment. Public API bodies stay in an uncommitted snapshot.
// PLAYWRIGHT_DIR contains pinned playwright@1.56.1. No product writes leave this runner.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
import { serve } from '../../../scripts/perf-execution-2029/serve.mjs';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`);
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).map((x,i,a)=>i%2===0?[x.slice(2),a[i+1]]:null).filter(Boolean));
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g,'TS');
const allowed = new Set(['convergence_meter','fn_method_value','fn_method_profile','fn_number_dossier','fn_number_journey','fn_number_lookup','fn_zero_scale','gematria_api','gematria_method_trace','get_category_videos','number_neighbors','posts_by_number_strict','world_group_source_arrivals_v3','world_group_source_arrivals_v2','notification_prefs_guest_get_v1','public_enrichment_batch','fn_all_methods','fn_verses_by_gematria']);
const fixtures = fs.existsSync(args.fixtures) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(args.fixtures))) : {};
const profile = { viewport:{width:390,height:844},dpr:2,cpu:4,rtt:150,download:209715.2,upload:96000,theme:'dark',identity:'anonymous',motion:'reduce' };
const record = args.mode === 'record';
const servers = {};
for (const arm of ['a','b']) if(args[arm]) servers[arm] = await serve(path.resolve(args[arm]));
const browser = await chromium.launch({executablePath:process.env.PERF_CHROME||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report = {base:'5c147e4a2db97ac035227f7c6d15787849f61f6e',mode:args.mode,profile,browser:await browser.version(),playwright:require('playwright/package.json').version,samples:[]};
const pendingCapture = new Map();
async function capture(req,key) {
  if(fixtures[key])return fixtures[key];
  if(pendingCapture.has(key))return pendingCapture.get(key);
  const work=(async()=>{
    const headers=req.headers();
    assert.ok(!headers.authorization || headers.authorization === `Bearer ${headers.apikey}`, 'Only public identity is authorized');
    const argv=['-sS','--compressed','--max-time','35','-X',req.method(),req.url()];
    for(const [k,v] of Object.entries(headers))if(['apikey','authorization','accept-profile','content-profile','prefer','range','accept','content-type'].includes(k))argv.push('-H',`${k}: ${v}`);
    if(req.postData())argv.push('--data-binary',req.postData());
    argv.push('--write-out','\n__META__%{http_code}|%{content_type}|%header{content-range}');
    const {stdout:data}=await exec('curl',argv,{maxBuffer:24*1024*1024,encoding:'buffer'});
    const at=data.lastIndexOf(Buffer.from('\n__META__'));assert.ok(at>=0);
    const [status,type,range]=data.subarray(at+9).toString().trim().split('|');
    const denial = +status===401 && new URL(req.url()).pathname==='/rest/v1/research_objects' && JSON.parse(data.subarray(0,at).toString()).code==='42501';
    assert.ok((+status>=200&&+status<300)||denial,`Read failed ${status} ${req.url()} ${data.subarray(0,at).toString()}`);
    return fixtures[key]={status:+status,type,range,explainedDenial:denial,body:data.subarray(0,at).toString('base64')};
  })();pendingCapture.set(key,work);return work;
}
export async function sample(arm, pair, flow='navigation') {
  const base=`http://127.0.0.1:${servers[arm].port}`;
  const ctx=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'he-IL',timezoneId:'Asia/Jerusalem',reducedMotion:'reduce'});
  await ctx.addInitScript(flow=>{
    localStorage.setItem('sod-theme','dark');
    localStorage.setItem('sod_vid','c6d2d1e1-7939-4264-af00-5c193cfaf503');
    if(flow==='context')sessionStorage.setItem('sod_research_context_v2:guest',JSON.stringify({subject:{id:'1820',type:'number',label:'1820',href:'/number/1820'},selection:{entityId:'1820',entityType:'number'},lens:'world'}));
    window.__worldMeasure={cls:[],lcp:[],clicks:[],anchorJumps:[]};
    const scroll=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){if(this.id==='world-sources')window.__worldMeasure.anchorJumps.push({at:performance.now(),y:scrollY});return scroll.apply(this,args);};
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__worldMeasure.cls.push({at:e.startTime,value:e.value});}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())window.__worldMeasure.lcp.push(e.startTime);}).observe({type:'largest-contentful-paint',buffered:true});
    document.addEventListener('click',e=>window.__worldMeasure.clicks.push({at:performance.now(),trusted:e.isTrusted}),true);
  },flow);
  const page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);
  const row={arm,pair,flow,reads:[],blocked:[],errors:[],misses:[],steps:[]};
  page.on('pageerror',e=>row.errors.push(e.message));
  await page.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
    if(req.url().startsWith(base))return u.pathname.startsWith('/api/')?route.fulfill({status:200,body:'{}',contentType:'application/json'}):route.continue();
    const up=u.hostname==='linswmnnkjxvweumprav.supabase.co';
    if(/vercel\.live|link_identity|track_visit|ingest_event|analytics|clarity|googletagmanager|facebook|doubleclick|openweb|spot\.im/.test(req.url())||u.pathname.startsWith('/auth/')||(up&&rpc&&!allowed.has(rpc))||(!['GET','HEAD','OPTIONS'].includes(req.method())&&!(up&&allowed.has(rpc)))) {
      row.blocked.push({method:req.method(),path:u.pathname});return route.fulfill({status:204,body:''});
    }
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
    let body=req.postData()||'';try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b))));}catch{}
    const signature=JSON.stringify(Object.fromEntries(['prefer','range','accept-profile','content-profile'].map(k=>[k,req.headers()[k]||''])));
    const key=`${req.method()} ${norm(req.url())} ${body} ${signature}`;
    try {
      const f=record?await capture(req,key):fixtures[key];
      if(!f){row.misses.push(key);return route.abort();}
      const at=await page.evaluate(()=>performance.now());
      if(!record)await new Promise(r=>setTimeout(r,(up?150:400)+(flow.startsWith('input')&&up?1500:0)));
      const data=Buffer.from(f.body,'base64');
      if(up)row.reads.push({at,key,status:f.status,explainedDenial:!!f.explainedDenial,bytes:data.length,hash:hash(data),explainedDenial:!!f.explainedDenial});
      await route.fulfill({status:f.status,body:req.method()==='HEAD'?'':data,headers:{'content-type':f.type||'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range',...(f.range?{'content-range':f.range}:{})}});
    }catch(e){row.errors.push(e.message);await route.abort();}
  });
  const ready=async target=>page.waitForFunction(target=>location.pathname===target&&[...document.querySelectorAll(target==='/world'?'[data-flight-story="world"] .sod29-flight-feature':target==='/'?'[data-experience-capability="home-composition"]':'.sod29-topic2029[data-canonical-slug]')].some(e=>e.innerText.length>100),target,{timeout:45000});
  const identity=async target=>page.evaluate(target=>{
    const el=document.querySelector(target==='/world'?'[data-flight-story="world"] .sod29-flight-feature':'.sod29-topic2029[data-canonical-slug]');
    return {path:location.pathname,slug:el?.dataset.canonicalSlug||null,text:el?.innerText,topics:[...document.querySelectorAll('a[data-world-topic]')].map(e=>e.getAttribute('data-world-topic'))};
  },target);
  const mark=()=>page.evaluate(()=>performance.now());
  const measure=async(name,action,target)=>{
    const start=await mark(),before=await cdp.send('Performance.getMetrics');await action();await ready(target);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const end=await mark();await page.waitForTimeout(1200);
    const metrics=await cdp.send('Performance.getMetrics');
    const task=m=>m.metrics.find(x=>x.name==='TaskDuration').value;
    row.steps.push({name,ms:end-start,start,end,taskMs:(task(metrics)-task(before))*1000,identity:await identity(target),observations:await page.evaluate(start=>({scrollY,cls:window.__worldMeasure.cls.filter(e=>e.at>=start).reduce((s,e)=>s+e.value,0),clicks:window.__worldMeasure.clicks.filter(e=>e.at>=start)}),start)});
  };
  try {
    await cdp.send('Network.enable');await cdp.send('Performance.enable');
    await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:profile.download,uploadThroughput:profile.upload});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const route=flow==='navigation'?'/world':(flow==='direct'||flow==='context')?'/world#world-sources':'/';
    await page.goto(base+route,{waitUntil:'load'});await ready(flow==='navigation'||flow==='direct'||flow==='context'?'/world':'/');
    row.coldReady=await mark();await page.waitForTimeout(1600);
    row.cold=await page.evaluate(()=>({lcp:window.__worldMeasure.lcp.at(-1),cls:window.__worldMeasure.cls.reduce((s,e)=>s+e.value,0),scripts:performance.getEntriesByType('resource').filter(e=>/\.js(?:\?|$)/.test(e.name)).map(e=>({file:new URL(e.name).pathname,encoded:e.encodedBodySize,decoded:e.decodedBodySize}))}));
    await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
    if(flow==='navigation') {
      const link=page.locator('#world-all-convergences a[data-world-topic]').first();
      await link.waitFor();row.target=await link.getAttribute('href');
      await link.scrollIntoViewIfNeeded();
      await measure('World→Topic',()=>link.click(),row.target);
      await measure('Back→World',()=>page.goBack(),'/world');
      await measure('Forward→Topic',()=>page.goForward(),row.target);
    } else {
      const anchor=()=>page.evaluate(()=>({path:location.pathname,hash:location.hash,y:scrollY,top:document.getElementById('world-sources')?.getBoundingClientRect().top??null,items:[...document.querySelectorAll('#world-sources [data-source-arrival]')].map(e=>e.dataset.sourceArrival),jumps:window.__worldMeasure.anchorJumps}));
      if(flow!=='direct'&&flow!=='context'){
        const link=page.locator('a[href="/world#world-sources"]').first();await link.scrollIntoViewIfNeeded();await link.click();
        await page.waitForFunction(()=>location.pathname==='/world'&&!!document.getElementById('world-sources'));
        if(flow.startsWith('input')){
          row.userInputAt=await mark();
          if(flow==='input-key')await page.keyboard.press('PageDown');
          else if(flow==='input-touch'){
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:370,y:650}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:370,y:350}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          } else await page.mouse.wheel(0,360);
          await page.waitForTimeout(300);
          row.afterInput=await anchor();
        }
        await ready('/world');
      }
      await page.waitForTimeout(flow.startsWith('input')?6500:3500);
      row.anchor=await anchor();
      if(flow==='context')row.retainedContext=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.subject);
      if(args.screenshot)await page.screenshot({path:args.screenshot});
      if(flow==='cross'){
        await page.goBack();await ready('/');await page.waitForTimeout(1200);
        await page.goForward();await ready('/world');await page.waitForTimeout(3000);row.forwardAnchor=await anchor();
        const nav=page.locator('a[href="#world-sources"]').first();await nav.scrollIntoViewIfNeeded();await nav.click();await page.waitForTimeout(1000);row.inPageAnchor=await anchor();
      }
    }
    assert.equal(row.errors.length,0,JSON.stringify(row.errors));assert.equal(row.misses.length,0,JSON.stringify(row.misses));
    assert.ok(row.reads.every(r=>(r.status>=200&&r.status<300)||r.explainedDenial),'No unexplained read failures');
  }catch(e){row.failure=e.message;throw e;}finally{
    report.samples.push(row);fs.writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');
    if(record)fs.writeFileSync(args.fixtures,zlib.gzipSync(JSON.stringify(fixtures)));
    await ctx.close();
  }
  console.log(JSON.stringify({pair,arm,flow,cold:Math.round(row.coldReady),steps:row.steps.map(s=>[s.name,Math.round(s.ms)]),anchor:row.anchor?{...row.anchor,items:row.anchor.items.length}:null,reads:row.reads.length}));
}
try {
  const flows=(args.flows||'navigation').split(',');
  for(let pair=0;pair<Number(args.runs||7);pair++)for(const arm of pair%2?['b','a']:['a','b'])if(servers[arm])for(const flow of flows)await sample(arm,pair,flow);
}finally {
  if(record)fs.writeFileSync(args.fixtures,zlib.gzipSync(JSON.stringify(fixtures)));
  report.fixtureSha256=hash(fs.readFileSync(args.fixtures));
  report.fixtureManifest=Object.entries(fixtures).map(([key,f])=>({key,status:f.status,explainedDenial:!!f.explainedDenial,bytes:Buffer.from(f.body,'base64').length,sha256:hash(Buffer.from(f.body,'base64'))}));
  fs.writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');
  await browser.close();for(const s of Object.values(servers))s.srv.close();
}
