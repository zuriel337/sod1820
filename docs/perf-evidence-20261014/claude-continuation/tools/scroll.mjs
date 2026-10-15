// Post reading scroll: real wheel scrolling through the article; counts storage writes/bytes, long tasks, and region->context updates.
import { createRequire } from 'node:module'; import zlib from 'node:zlib'; import fs from 'node:fs';
import { serve } from '/home/user/sod1820/scripts/perf-execution-2029/serve.mjs';
const require = createRequire('/opt/node22/node-tools/node_modules/'); const { chromium } = require('playwright');
const [S, dist, accumulated='0', runs='5', slug='tashpav-tashpaz-787-hidden-connection'] = process.argv.slice(2);
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
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'he-IL' });
  await ctx.addInitScript((acc)=>{
    localStorage.setItem('sod-theme','dark');
    if (acc==='1') { const ent=(i,t)=>({id:t+i,type:'number',ref:t+i,title:'ביטוי ארוך '+i+' '+'א'.repeat(30),meta:{note:'x'.repeat(120)}});
      const cart=[],saved=[]; for(let i=0;i<300;i++){cart.push(ent(i,'c'));saved.push(ent(i,'s'));}
      localStorage.setItem('sod_research_v2:guest',JSON.stringify({state:{cart,saved,pinned:[],history:[],collections:[],journeys:[],context:null},mode:'reader',revision:0})); }
    window.__w={calls:0,bytes:0,long:0,longMs:0};
    const set=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ window.__w.calls++; window.__w.bytes+=String(v).length; return set.call(this,k,v); };
    new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__w.long++;window.__w.longMs+=e.duration;}}).observe({type:'longtask',buffered:true});
  }, accumulated);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.route('**/*', async route => { const req=route.request(), url=req.url();
    if (url.startsWith(origin)) return new URL(url).pathname.startsWith('/api/')?route.fulfill({status:200,body:'{}',contentType:'application/json'}):route.continue();
    if (!url.includes('supabase.co')) return route.abort();
    let body=req.postData()||''; try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[c])=>a.localeCompare(c))))}catch{}
    const key=`${req.method()} ${normalize(url)} ${body}`; let row=fixtures[key]||fix2[key]; if(!row){ try{ row=await live(req,key);}catch{} } const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range'};
    if(!row) return route.fulfill({status:204,body:'',headers:cors}); await new Promise(r=>setTimeout(r,150));
    return route.fulfill({status:row.status, body:Buffer.from(row.body,'base64'), headers:{'content-type':row.type||'application/json',...cors,...(row.range?{'content-range':row.range}:{})}}); });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:96000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(origin+'/post/'+slug,{waitUntil:'load'});
  await page.waitForFunction(()=>{const s=document.querySelector('[data-experience-capability="post-master-reading-stage"]');return s&&s.innerText.length>800},null,{timeout:30000});
  await page.waitForLoadState('networkidle',{timeout:30000}).catch(()=>{}); await page.waitForTimeout(800);
  const regions = await page.evaluate(()=>document.querySelectorAll('[data-reading-region]').length);
  await page.evaluate(()=>{window.__w.calls=0;window.__w.bytes=0;window.__w.long=0;window.__w.longMs=0;});
  const t0=Date.now(); const total = await page.evaluate(()=>document.documentElement.scrollHeight);
  await page.mouse.move(200,400);
  for(let y=0;y<Math.min(total,14000);y+=300){ await page.mouse.wheel(0,300); await page.waitForTimeout(120); }
  await page.waitForTimeout(600);
  const w = await page.evaluate(()=>({...window.__w, active: document.querySelector('[data-reading-region]')?.dataset.readingRegion}));
  console.error(JSON.stringify({dbg:await page.evaluate(()=>({h2:document.querySelectorAll('h2').length,regions:document.querySelectorAll('[data-reading-region]').length,txt:document.body.innerText.length,h1:document.querySelector('h1')?.innerText}))}));out.push({run:r,accumulated,regions,scrollHeight:total,elapsed:Date.now()-t0,storageSetItemCalls:w.calls,storageKB:Math.round(w.bytes/1024),longTasks:w.long,longTaskMs:Math.round(w.longMs)});
  await ctx.close();
}
const med=k=>{const v=out.map(o=>o[k]).sort((a,b)=>a-b);return v[Math.floor(v.length/2)]};
fs.writeFileSync(F2,JSON.stringify(fix2)); console.log(JSON.stringify({dist:dist.split('/').pop(),accumulated,runs:out.length,regions:out[0].regions,median:{calls:med('storageSetItemCalls'),storageKB:med('storageKB'),longTasks:med('longTasks'),longTaskMs:med('longTaskMs')},range:{storageKB:[Math.min(...out.map(o=>o.storageKB)),Math.max(...out.map(o=>o.storageKB))],longTaskMs:[Math.min(...out.map(o=>o.longTaskMs)),Math.max(...out.map(o=>o.longTaskMs))]}}));
await b.close(); srv.close();
