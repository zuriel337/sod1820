// Verifies lazy method Stage: no work before open; first open / close / reopen timing; load failure; reload back to same source.
import { createRequire } from 'node:module'; import zlib from 'node:zlib'; import fs from 'node:fs';
import { serve } from '/home/user/sod1820/scripts/perf-execution-2029/serve.mjs';
const require = createRequire('/opt/node22/node-tools/node_modules/'); const { chromium } = require('playwright');
const [S, dist, mode='normal', runs='3', path='/world#world-source-story'] = process.argv.slice(2);
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(S+'/fix.json.gz')));
const F2=S+'/fix2.json'; const fix2=fs.existsSync(F2)?JSON.parse(fs.readFileSync(F2)):{};
const ALLOW=new Set(['convergence_meter','fn_method_value','fn_zero_scale','gematria_api','gematria_method_trace','get_category_videos','number_neighbors','posts_by_number_strict','world_group_source_arrivals_v2']);
async function live(req,key){ if(fix2[key]) return fix2[key]; const u=new URL(req.url()); const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
  if(req.method()==='POST'&&!(rpc&&ALLOW.has(rpc))) return null; if(!['GET','HEAD','POST'].includes(req.method())) return null;
  const h=req.headers(); const headers={}; for(const k of ['apikey','authorization','accept-profile','prefer','range','accept','content-type']) if(h[k]) headers[k]=h[k];
  const r=await fetch(req.url(),{method:req.method(),headers,body:req.postData()||undefined}); const buf=Buffer.from(await r.arrayBuffer());
  return fix2[key]={status:r.status,type:r.headers.get('content-type'),range:r.headers.get('content-range'),body:buf.toString('base64')}; }
const normalize = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g, 'TS');
const { srv, port } = await serve(dist); const origin = `http://127.0.0.1:${port}`;
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const out=[];
for (let r=0;r<Number(runs);r++){
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, locale:'he-IL' });
  await ctx.addInitScript(()=>localStorage.setItem('sod-theme','dark'));
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const jsReqs=[]; let failStage = mode==='fail';
  page.on('request', q=>{ if(q.url().startsWith(origin)&&q.url().endsWith('.js')) jsReqs.push({u:q.url().split('/').pop(), t:Date.now()}); });
  await page.route('**/*', async route => { const req=route.request(), url=req.url();
    if (url.startsWith(origin)) { const p=new URL(url).pathname;
      if (p.startsWith('/api/')) return route.fulfill({status:200,body:'{}',contentType:'application/json'});
      if (failStage && /SpatialMethodStage|semanticSceneCompiler/.test(p)) return route.abort();
      return route.continue(); }
    if (!url.includes('supabase.co')) return route.abort();
    let body=req.postData()||''; try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[c])=>a.localeCompare(c))))}catch{}
    const key=`${req.method()} ${normalize(url)} ${body}`; let row=fixtures[key]||fix2[key]; if(!row){ try{ row=await live(req,key);}catch{} }
    const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range'};
    if(!row) return route.fulfill({status:204,body:'',headers:cors});
    await new Promise(r=>setTimeout(r,150));
    return route.fulfill({status:row.status, body:Buffer.from(row.body,'base64'), headers:{'content-type':row.type||'application/json',...cors,...(row.range?{'content-range':row.range}:{})}});
  });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:96000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(origin+path,{waitUntil:'load'});
  await page.waitForSelector('.sod29-world-calculation-depth',{state:'attached',timeout:30000}).catch(()=>{});
  await page.waitForLoadState('networkidle',{timeout:30000}).catch(()=>{});
  const n = await page.locator('.sod29-world-calculation-depth').count();
  const before = jsReqs.length;
  const stageChunkBefore = jsReqs.filter(x=>/SpatialMethodStage|semanticScene/.test(x.u)).length;
  const stageDomBefore = await page.evaluate(()=>document.querySelectorAll('.sod29-spatial-method-stage').length);
  const row={run:r,mode,depthPanels:n,jsBeforeOpen:before,stageChunkBeforeOpen:stageChunkBefore,stageDomBeforeOpen:stageDomBefore};
  if(n){
    const det=page.locator('.sod29-world-calculation-depth').first();
    await det.scrollIntoViewIfNeeded();
    const t0=Date.now();
    await det.locator(':scope > summary').click();
    const probe = ()=>det.evaluate(d=>({stage: !!d.querySelector('.sod29-spatial-method-stage'), loading: /טוען את פירוט/.test(d.innerText), failed: !!d.querySelector('[data-deferred-state="failed"]'), text: d.innerText.length}));
    let first=null; for(let i=0;i<200;i++){ const s=await probe(); if(!s.loading && (s.stage||s.failed)){first=s;break;} await page.waitForTimeout(50); }
    row.firstOpenMs=Date.now()-t0; row.firstOpenState=first;
    row.stageChunkAfterOpen=jsReqs.filter(x=>/SpatialMethodStage|semanticScene/.test(x.u)).map(x=>x.u);
    await det.locator(':scope > summary').click(); await page.waitForTimeout(200);
    row.closedStillMounted=await det.evaluate(d=>!d.open && !!d.querySelector('.sod29-spatial-method-stage'));
    const t1=Date.now(); const jsBeforeReopen=jsReqs.length;
    await det.locator(':scope > summary').click(); let again=null; for(let i=0;i<100;i++){ const s=await probe(); if(!s.loading&&(s.stage||s.failed)){again=s;break;} await page.waitForTimeout(25);} 
    row.reopenMs=Date.now()-t1; row.reopenNewJs=jsReqs.length-jsBeforeReopen;
    if(mode==='fail'){ failStage=false; const hashBefore=await page.evaluate(()=>location.hash);
      await Promise.all([page.waitForNavigation({waitUntil:'load'}).catch(()=>{}), det.locator('[data-deferred-state="failed"] button').first().click()]);
      await page.waitForSelector('#world-source-date-718',{timeout:30000}).catch(()=>{});
      row.afterReload={hashBefore, hashAfter:await page.evaluate(()=>location.hash), witnessPresent:await page.locator('#world-source-date-718').count(), inView:await page.evaluate(()=>{const e=document.getElementById('world-source-date-718');if(!e)return null;const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;})};
      const d2=page.locator('.sod29-world-calculation-depth').first(); await d2.scrollIntoViewIfNeeded(); await d2.locator(':scope > summary').click();
      for(let i=0;i<120;i++){ if(await d2.evaluate(d=>!!d.querySelector('.sod29-spatial-method-stage'))) {row.afterReload.stageAfterReload=true;break;} await page.waitForTimeout(50);}
 row.failedHasReload=await det.locator('[data-deferred-state="failed"] button').count(); }
  }
  out.push(row); await ctx.close();
}
fs.writeFileSync(F2,JSON.stringify(fix2)); console.log(JSON.stringify(out,null,1)); await b.close(); srv.close();
