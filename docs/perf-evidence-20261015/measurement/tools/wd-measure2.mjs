// World relation deepening: click "העמק" -> content of the target. Baseline vs fx_world_relation_identity ON.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import { execFile } from 'node:child_process'; import { promisify } from 'node:util';
import { serve } from '/home/user/sod1820/scripts/perf-execution-2029/serve.mjs';
const run=promisify(execFile); const require = createRequire('/opt/node22/node-tools/node_modules/'); const { chromium } = require('playwright');
const [S, dist, flag, target, runsArg='7', out, liveArg='replay'] = process.argv.slice(2); // flag: off|world|db|both ; target: number|other ; liveArg: replay|live
const LIVE = liveArg==='live';
const FLAGS = { off:[], world:['fx_world_relation_identity'], db:['fx_number_lookup_page'], both:['fx_world_relation_identity','fx_number_lookup_page'] }[flag];
if(!FLAGS) throw new Error('bad flag');
const F=S+'/fix-wd2.json'; const fx=fs.existsSync(F)?JSON.parse(fs.readFileSync(F)):{};
const norm=u=>decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g,'TS');
const BLOCK=/rpc\/(link_identity|track_visit|ingest_event|notification_prefs|claim_|record_|log_|admin_)/;
const { srv, port } = await serve(dist); const origin=`http://127.0.0.1:${port}`;
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range'};
const samples=[]; const runs=Number(runsArg);
for(let i=0;i<(LIVE?runs:runs+1);i++){ // first run = warm-up (records missing fixtures live), not counted
  const warm=!LIVE&&i===0; if(LIVE&&i===runs) break; const ctx=await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, locale:'he-IL' });
  await ctx.addInitScript(()=>{ localStorage.setItem('sod-theme','dark'); sessionStorage.setItem('sod_research_context_v2:guest', JSON.stringify({subject:{id:'1820',type:'number',label:'1820',href:'/world'},selection:{entityId:'1820',entityType:'number'},lens:'world',dimensions:{},updatedAt:new Date().toISOString()}));
    window.__m={long:0,longMs:0,cls:0}; new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__m.long++;window.__m.longMs+=e.duration}}).observe({type:'longtask'}); new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__m.cls+=e.value}).observe({type:'layout-shift'}); });
  const page=await ctx.newPage(); const cdp=await ctx.newCDPSession(page); let reqs=[]; let counting=false;
  await page.route('**/*', async route=>{ const req=route.request(), url=req.url(), u=new URL(url);
    if(url.startsWith(origin)) return u.pathname.startsWith('/api/')?route.fulfill({status:200,body:'{}',contentType:'application/json'}):route.continue();
    if(!url.includes('supabase.co')) return route.abort();
    if(BLOCK.test(u.pathname)||u.pathname.includes('/auth/')) return route.fulfill({status:204,body:'',headers:cors});
    if(u.pathname.includes('/rest/v1/site_flags')) return route.fulfill({status:200,body:JSON.stringify(FLAGS.map(k=>({key:k,enabled:true,message:'',mode:'all'}))),headers:{'content-type':'application/json',...cors}});
    if(LIVE){ if(counting) reqs.push(req.method()+' '+u.pathname.replace('/rest/v1/','')+(req.postData()?' '+req.postData().slice(0,60):'')); else reqs.push('pre'); return route.continue(); }
    let body=req.postData()||''; try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[c])=>a.localeCompare(c))))}catch{}
    const key=`${req.method()} ${norm(url)} ${body}`; let row=fx[key];
    if(!row){ if(!warm) { /* miss during measured run */ reqs.push('MISS '+u.pathname); return route.abort(); } const h=req.headers(); const hd={}; for(const k of ['apikey','authorization','accept-profile','prefer','range','accept','content-type']) if(h[k]) hd[k]=h[k];
      const argv=['--silent','--show-error','--compressed','--max-time','30','--request',req.method(),url]; for(const [k,v] of Object.entries(hd)) argv.push('-H',`${k}: ${v}`); if(req.postData()) argv.push('--data-binary',req.postData()); argv.push('--write-out','\n__META__%{http_code}|%{content_type}|%header{content-range}');
      const { stdout } = await run('curl',argv,{encoding:'buffer',maxBuffer:32*1024*1024}); const sp=stdout.lastIndexOf(Buffer.from('\n__META__')); const [st,ty,rg]=stdout.subarray(sp+9).toString().split('|');
      row=fx[key]={status:Number(st),type:ty,range:rg,body:stdout.subarray(0,sp).toString('base64')}; }
    if(counting) reqs.push(req.method()+' '+u.pathname.replace('/rest/v1/','')+(req.postData()?' '+req.postData().slice(0,60):''));
    if(!warm) await new Promise(r=>setTimeout(r,150));
    return route.fulfill({status:row.status,body:Buffer.from(row.body,'base64'),headers:{'content-type':row.type||'application/json',...cors,...(row.range?{'content-range':row.range}:{})}}); });
  await page.goto(origin+'/world',{waitUntil:'load'}); await page.waitForSelector('button:has-text("קשרים")',{timeout:60000});
  if(true){ await cdp.send('Emulation.setCPUThrottlingRate',{rate:4}); }
  await page.locator('button',{hasText:/^קשרים/}).first().click(); await page.waitForSelector('button:has-text("העמק")',{timeout:60000}); await page.waitForTimeout(warm?500:2500); if(LIVE) { /* live: let initial reads settle */ await page.waitForTimeout(1500); }
  const rows=await page.evaluate(()=>[...document.querySelectorAll('.sod29-row')].filter(r=>[...r.querySelectorAll('button')].some(b=>b.innerText.trim()==='העמק')).map((r,i)=>({i,text:r.innerText.replace(/\n/g,' | ')})));
  const pick=rows.find(r=>target==='number'?/· מספר/.test(r.text):!/· מספר/.test(r.text)); if(!pick){ console.error('no row for',target,rows.slice(0,5)); process.exit(2); }
  const label=pick.text.split(' | ')[0]; await page.evaluate(()=>{window.__m.long=0;window.__m.longMs=0;window.__m.cls=0;}); reqs=[]; counting=true;
  const before=await page.evaluate(()=>sessionStorage.getItem('sod_research_context_v2:guest')); await cdp.send('Performance.enable'); const pm0=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  const t0=await page.evaluate(i=>{ const rowsEl=[...document.querySelectorAll('.sod29-row')].filter(r=>[...r.querySelectorAll('button')].some(b=>b.innerText.trim()==='העמק')); const btn=[...rowsEl[i].querySelectorAll('button')].find(b=>b.innerText.trim()==='העמק'); window.__t0=performance.now(); btn.click(); return window.__t0; },pick.i);
  let tCtx=null,tContent=null; const deadline=Date.now()+45000;
  while(Date.now()<deadline){ const s=await page.evaluate(()=>({ctx:sessionStorage.getItem('sod_research_context_v2:guest'),now:performance.now(),heads:[...document.querySelectorAll('h2,h3')].map(e=>e.innerText),busy:[...document.querySelectorAll('button')].some(x=>x.innerText.includes('פותח…')),subject:(()=>{try{return JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')).subject.label}catch{return null}})()}));
    if(tCtx==null && s.ctx!==before) tCtx=s.now-t0;
    if(tCtx!=null && !s.busy && s.heads.some(h=>/^העיקר סביב/.test(h)&&s.subject&&h.includes(s.subject))) { tContent=s.now-t0; break; }
    await page.waitForTimeout(40); }
  await page.waitForTimeout(1500);
  const pm1=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value])); const cpuMs=Math.round(((pm1.TaskDuration||0)-(pm0.TaskDuration||0))*1000), scriptMs=Math.round(((pm1.ScriptDuration||0)-(pm0.ScriptDuration||0))*1000); const headsHash=(await page.evaluate(()=>[...document.querySelectorAll('h2,h3')].map(e=>e.innerText).join('|'))).length;
  const m=await page.evaluate(()=>({...window.__m,subject:(()=>{try{const c=JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'));return {label:c.subject.label,type:c.subject.type,ret:c.returnTo?.subject?.label||null,retHref:c.returnTo?.href||null,sel:c.selection?.entityId||null,lens:c.lens}}catch{return null}})(),text:document.body.innerText.length}));
  if(!warm) samples.push({tCtx,tContent,reqs:reqs.length,lookupReqs:reqs.filter(r=>/fn_number_lookup/.test(r)).length,fast:reqs.filter(r=>/2029_page/.test(r)).length,reqList:reqs,cpuMs,scriptMs,headsLen:headsHash,...m,pickedLabel:label});
  await ctx.close(); }
fs.writeFileSync(F,JSON.stringify(fx));
const med=k=>{const v=samples.map(s=>s[k]).filter(Number.isFinite).sort((a,c)=>a-c);return v.length?v[Math.floor(v.length/2)]:null}, rng=k=>{const v=samples.map(s=>s[k]).filter(Number.isFinite);return v.length?[Math.round(Math.min(...v)),Math.round(Math.max(...v))]:null};
const res={mode:liveArg,flag,target,runs:samples.length,median:{cpuMs:med('cpuMs'),lookupReqs:med('lookupReqs'),fast:med('fast'),tCtx:med('tCtx'),tContent:med('tContent'),reqs:med('reqs'),longMs:med('longMs'),long:med('long'),cls:med('cls')},range:{tCtx:rng('tCtx'),tContent:rng('tContent'),reqs:rng('reqs'),longMs:rng('longMs'),cls:rng('cls')},subjects:[...new Set(samples.map(s=>JSON.stringify(s.subject)))],textLen:rng('text'),reqLists:[...new Set(samples.map(s=>JSON.stringify(s.reqList)))].slice(0,2),samples};
fs.writeFileSync(out,JSON.stringify(res,null,1)); console.log(JSON.stringify({...res,samples:undefined,reqLists:undefined},null,0).slice(0,900)); await b.close(); srv.close();
