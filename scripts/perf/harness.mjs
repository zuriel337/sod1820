// Shared 2029 load harness (fixture replay, deterministic). See docs/perf-measurement-conditions-2029.md
// Usage: node harness.mjs <record|run> --dist DIR --label L [--routes /2029,/world,/post/x] [--runs 7] [--cpu 4] [--rtt 150] [--fixtures f.json] [--out out.json] [--sbdelay 150]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib'; import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
const require=createRequire((process.env.PLAYWRIGHT_DIR||'/opt/node-tools')+'/node_modules/'); const { chromium }=require('playwright');
const args=Object.fromEntries(process.argv.slice(3).reduce((a,v,i,arr)=>v.startsWith('--')?[...a,[v.slice(2),arr[i+1]]]:a,[]));
const mode=process.argv[2]; const dist=args.dist; const runs=+(args.runs||7); const cpu=+(args.cpu||4); const rtt=+(args.rtt||150);
const sbdelay=+(args.sbdelay||150); const extdelay=+(args.extdelay||400); const routes=(args.routes||'/2029').split(',');
const fixFile=args.fixtures||new URL('./fixtures.json.gz',import.meta.url).pathname; const norm=u=>decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g,'TS');
const fixtures=fs.existsSync(fixFile)?JSON.parse(zlib.gunzipSync(fs.readFileSync(fixFile))):{};
const { srv, port }=await serve(dist); const origin=`http://127.0.0.1:${port}`;
const browser=await chromium.launch({executablePath:process.env.PERF_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null};
const INIT=`(()=>{window.__m={lt:[],rootAt:null,lcp:0};
new PerformanceObserver(l=>{for(const e of l.getEntries())__m.lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
const mo=new MutationObserver(()=>{const r=document.getElementById('root');if(r&&r.childElementCount&&__m.rootAt==null){__m.rootAt=performance.now();mo.disconnect()}});
document.addEventListener('DOMContentLoaded',()=>{const r=document.getElementById('root');if(r)mo.observe(r,{childList:true})});})()`;
async function one(route){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,locale:'he-IL',timezoneId:'Asia/Jerusalem',userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141 Mobile Safari/537.36'});
  await ctx.addInitScript(INIT); const page=await ctx.newPage(); const cdp=await ctx.newCDPSession(page);
  const misses=[]; const sb=[]; const ext=[];
  await page.route('**/*',async route=>{
    const req=route.request(); const u=req.url();
    if(u.startsWith(origin)){ if(new URL(u).pathname.startsWith('/api/')) return route.fulfill({status:200,contentType:'application/json',body:'{}'}); return route.continue(); }
    if(u.includes('.supabase.co')){
      if(req.method()!=='GET') return route.fulfill({status:204,body:'',headers:{'access-control-allow-origin':'*'}});
      const k=norm(u);
      if(mode==='record'){ try{ const o=execFileSync('curl',['-s','-m','30','-D','-',u,...Object.entries(req.headers()).filter(([h])=>['apikey','accept-profile','prefer','range','accept'].includes(h.toLowerCase())).flatMap(([h,v])=>['-H',h+': '+v])],{maxBuffer:1<<28}).toString('utf8'); const i=o.lastIndexOf('\r\n\r\n'); const head=o.slice(0,i), body=o.slice(i+4); const hv=n=>(head.match(new RegExp('^'+n+': (.*)$','mi'))||[])[1]?.trim()||null; const status=+head.split(' ')[1]; fixtures[k]={status,body,ct:hv('content-type'),cr:hv('content-range')}; return route.fulfill({status,body,headers:{'content-type':fixtures[k].ct||'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range',...(fixtures[k].cr?{'content-range':fixtures[k].cr}:{})}}); }catch(e){ console.error('rec fail',k.slice(0,80),e.message.slice(0,80)); return route.abort(); } }
      const f=fixtures[k]; if(!f){ misses.push(k); }
      await new Promise(r=>setTimeout(r,sbdelay));
      return route.fulfill({status:f?f.status:200,body:f?f.body:'[]',headers:{'content-type':f?.ct||'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range',...(f?.cr?{'content-range':f.cr}:{})}});
    }
    ext.push(u.slice(0,80)); if(mode==='run') await new Promise(r=>setTimeout(r,extdelay)); return route.fulfill({status:200,body:'',contentType:u.endsWith('.css')||u.includes('css2')?'text/css':'text/javascript'});
  });
  if(mode==='run'){ await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:rtt,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8}); await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu}); }
  await cdp.send('Performance.enable'); if(args.profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');}
  await page.goto(origin+route,{waitUntil:'load',timeout:120000}).catch(()=>{});
  await page.waitForLoadState('networkidle',{timeout:30000}).catch(()=>{}); await page.waitForTimeout(1500);
  const m=await page.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0];const res=performance.getEntriesByType('resource');
    const fcp=performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null;
    const sbr=res.filter(r=>r.name.includes('.supabase.co')); const js=res.filter(r=>/\.js(\?|$)/.test(r.name)&&r.name.includes('/assets/'));
    const lt=__m.lt; const tbt=lt.filter(x=>x[0]>=(fcp||0)).reduce((s,x)=>s+Math.max(0,x[1]-50),0); const tbtAll=lt.reduce((s,x)=>s+Math.max(0,x[1]-50),0);
    return {ttfb:nav.responseStart,dcl:nav.domContentLoadedEventEnd,load:nav.loadEventEnd,fcp,lcp:__m.lcp,rootAt:__m.rootAt,
      firstSbReq:sbr.length?Math.min(...sbr.map(r=>r.startTime)):null,firstSbEnd:sbr.length?Math.min(...sbr.map(r=>r.responseEnd)):null,lastSbEnd:sbr.length?Math.max(...sbr.map(r=>r.responseEnd)):null,
      sbCount:sbr.length,jsCount:js.length,jsLastEnd:js.length?Math.max(...js.map(r=>r.responseEnd)):null,
      jsBytes:js.reduce((s,r)=>s+(r.encodedBodySize||0),0),allBytes:res.reduce((s,r)=>s+(r.encodedBodySize||0),0)+nav.encodedBodySize,
      tbt,tbtAll,ltl:lt.map(x=>[Math.round(x[0]),Math.round(x[1])]),ltCount:lt.length,reqs:res.length,tl:res.filter(r=>!r.name.includes('.supabase.co')).map(r=>[r.name.replace(/^https?:\/\/[^/]+/,'').slice(0,60),Math.round(r.startTime),Math.round(r.responseEnd),Math.round((r.encodedBodySize||0)/1024),r.initiatorType]),sbList:sbr.map(r=>[Math.round(r.startTime),r.name.split('.supabase.co')[1].slice(0,90)])};});
  const pm=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  m.script=pm.ScriptDuration*1000; m.task=pm.TaskDuration*1000; m.layout=pm.LayoutDuration*1000; m.style=pm.RecalcStyleDuration*1000;
  if(args.profile){const {profile}=await cdp.send('Profiler.stop');const self={};const byId=new Map(profile.nodes.map(n=>[n.id,n]));const dt=profile.timeDeltas;
    profile.samples.forEach((id,i)=>{const n=byId.get(id);const u=(n.callFrame.url||'(native:'+n.callFrame.functionName+')').replace(/^https?:\/\/[^/]+/,'');self[u]=(self[u]||0)+dt[i]/1000;});
    m.prof=Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([u,t])=>[u,Math.round(t)]);}
  m.misses=misses; m.ext=ext; await ctx.close(); return m;
}
const out={label:args.label,mode,cpu,rtt,sbdelay,routes:{}};
for(const r of routes){ const rs=[]; for(let i=0;i<(mode==='record'?1:runs);i++){ rs.push(await one(r)); }
  const keys=Object.keys(rs[0]).filter(k=>typeof rs[0][k]==='number'||rs[0][k]===null);
  const med={}; for(const k of keys) med[k]=median(rs.map(x=>x[k]).filter(v=>v!=null)); 
  const spread={}; for(const k of ['fcp','lcp','firstSbReq','tbtAll','script']){const v=rs.map(x=>x[k]).filter(v=>v!=null).sort((a,b)=>a-b);spread[k]=[v[0],v[v.length-1]]}
  out.routes[r]={median:med,spread,sbList:rs[0].sbList,tl:rs[0].tl,ltl:rs[0].ltl,prof:rs[0].prof,misses:[...new Set(rs.flatMap(x=>x.misses))],ext:[...new Set(rs.flatMap(x=>x.ext))]}; console.error(r,'done'); }
if(mode==='record') fs.writeFileSync(fixFile,zlib.gzipSync(JSON.stringify(fixtures)));
if(args.out) fs.writeFileSync(args.out,JSON.stringify(out,null,1));
const R=n=>n==null?'-':Math.round(n);
console.log(`\n## ${args.label} (cpu x${cpu}, rtt ${rtt}ms, sb ${sbdelay}ms, n=${runs})`);
console.log('route | FCP | LCP | root | 1stSbReq | 1stSbEnd | lastSbEnd | TBTall | script | task | jsKB(br) | totKB | sb#');
for(const [r,v] of Object.entries(out.routes)){const m=v.median;console.log([r,R(m.fcp),R(m.lcp),R(m.rootAt),R(m.firstSbReq),R(m.firstSbEnd),R(m.lastSbEnd),R(m.tbtAll),R(m.script),R(m.task),R(m.jsBytes/1024),R(m.allBytes/1024),m.sbCount].join(' | '));
  if(v.misses.length)console.log('  fixture misses:',v.misses.length);}
await browser.close(); srv.close();
