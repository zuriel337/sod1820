// In-app navigation A/B (same conditions as harness.mjs). Flow per rep (cold start, then 3 client navigations):
//   "/" -> /post/<slug> -> /world -> "/"      Usage: node nav.mjs --dist DIR --label L [--runs 5] [--out f.json]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib';
import { serve } from './serve.mjs';
const require=createRequire((process.env.PLAYWRIGHT_DIR||'/opt/node-tools')+'/node_modules/'); const { chromium }=require('playwright');
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>v.startsWith('--')?[...a,[v.slice(2),arr[i+1]]]:a,[]));
const runs=+(args.runs||5); const fixFile=new URL('./fixtures.json.gz',import.meta.url).pathname;
const norm=u=>decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g,'TS');
const fixtures=JSON.parse(zlib.gunzipSync(fs.readFileSync(fixFile)));
const { srv, port }=await serve(args.dist); const origin=`http://127.0.0.1:${port}`;
const browser=await chromium.launch({executablePath:process.env.PERF_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const SLUG='seventh-to-tenth-sefirot-2027';
const READY={home:`document.querySelector("[data-experience-capability='home-composition'] a[href^='/post/']")`,world:`document.querySelector('[data-world-topic],[data-world-discovery-door]')`,post:`(()=>{const e=document.querySelector("[data-experience-capability='post-master-reading-stage']");return e&&e.innerText.length>800})()`};
const INIT=`(()=>{window.__lt=[];window.__cls=[];
new PerformanceObserver(l=>{for(const e of l.getEntries())__lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__cls.push([e.startTime,e.value])}).observe({type:'layout-shift',buffered:true});
const R={home:()=>${READY.home},world:()=>${READY.world},post:()=>${READY.post}};
window.__go=(url,key,push)=>new Promise(res=>{const t0=performance.now();let done=false;
 const fin=()=>{if(done)return;done=true;mo.disconnect();const t1=performance.now();res({t0,t1,ms:t1-t0})};
 const mo=new MutationObserver(()=>{if(R[key]())fin()});mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
 if(push){history.pushState({}, '', url);dispatchEvent(new PopStateEvent('popstate'));}
 if(R[key]()&&!push)fin();
 setTimeout(()=>{if(!done){done=true;mo.disconnect();res({t0,t1:performance.now(),ms:null})}},30000)})})()`;
const median=a=>{const s=a.filter(x=>x!=null).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null};
async function rep(){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,locale:'he-IL',timezoneId:'Asia/Jerusalem'});
  await ctx.addInitScript(INIT); const page=await ctx.newPage(); const cdp=await ctx.newCDPSession(page); let reqs=[];
  await page.route('**/*',async route=>{const req=route.request(),u=req.url();
    if(u.startsWith(origin)){ if(new URL(u).pathname.startsWith('/api/')) return route.fulfill({status:200,contentType:'application/json',body:'{}'}); if(/\.js(\?|$)/.test(u))reqs.push('js'); return route.continue(); }
    if(u.includes('.supabase.co')){ if(req.method()!=='GET') return route.fulfill({status:204,body:'',headers:{'access-control-allow-origin':'*'}}); reqs.push('rest'); const f=fixtures[norm(u)]; await new Promise(r=>setTimeout(r,150));
      return route.fulfill({status:f?f.status:200,body:f?f.body:'[]',headers:{'content-type':f?.ct||'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range',...(f?.cr?{'content-range':f.cr}:{})}}); }
    await new Promise(r=>setTimeout(r,400)); return route.fulfill({status:200,body:'',contentType:'text/css'}); });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8}); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(origin+'/',{waitUntil:'load'}); const first=await page.evaluate(()=>window.__go('/','home',false)); await page.waitForTimeout(2500);
  const steps=[['post','/post/'+SLUG],['world','/world'],['home','/']]; const out={coldHome:first.ms};
  for(const [key,url] of steps){ reqs=[]; const r=await page.evaluate(([u,k])=>window.__go(u,k,true),[url,key]); await page.waitForTimeout(2500);
    const m=await page.evaluate(([t0,t1])=>{const lt=__lt.filter(x=>x[0]>=t0&&x[0]<=t1+400);return {block:lt.reduce((s,x)=>s+Math.max(0,x[1]-50),0),maxTask:lt.reduce((s,x)=>Math.max(s,x[1]),0),cls:__cls.filter(x=>x[0]>=t0&&x[0]<=t1+1500).reduce((s,x)=>s+x[1],0)}},[r.t0,r.t1]);
    out[key]={ms:r.ms,...m,js:reqs.filter(x=>x==='js').length,rest:reqs.filter(x=>x==='rest').length}; }
  await ctx.close(); return out; }
const all=[]; for(let i=0;i<runs;i++) all.push(await rep());
const res={label:args.label,runs,coldHome:median(all.map(a=>a.coldHome))}; for(const k of ['post','world','home']){res[k]={}; for(const f of ['ms','block','maxTask','cls','js','rest']) res[k][f]=median(all.map(a=>a[k][f])); res[k].spread=[Math.min(...all.map(a=>a[k].ms)),Math.max(...all.map(a=>a[k].ms))];}
if(args.out) fs.writeFileSync(args.out,JSON.stringify({res,all},null,1));
console.log(`\n## NAV ${args.label} (n=${runs}) coldHome READY ${Math.round(res.coldHome)}ms`);
console.log('step | nav->READY ms (range) | blocking ms | max task | CLS | new JS req | REST req');
for(const k of ['post','world','home']){const r=res[k];console.log([k,Math.round(r.ms)+' ('+r.spread.map(Math.round)+')',Math.round(r.block),Math.round(r.maxTask),r.cls.toFixed(3),r.js,r.rest].join(' | '));}
await browser.close(); srv.close();
