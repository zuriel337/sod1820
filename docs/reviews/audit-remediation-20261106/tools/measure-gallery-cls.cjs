const { chromium } = require('playwright'); const fs=require('fs');
const html=fs.readFileSync('/home/user/sod1820/dist/2029.html','utf8');
(async()=>{ const b=await chromium.launch(); const out=[];
 for(const vp of [{n:'m390',width:390,height:844,isMobile:true,dsf:2},{n:'d1440',width:1440,height:900,isMobile:false,dsf:1}]){
 for(let run=0;run<2;run++){
  const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',viewport:{width:vp.width,height:vp.height},isMobile:vp.isMobile,deviceScaleFactor:vp.dsf});
  for(const pat of ['**/www.google-analytics.com/**','**/region1.google-analytics.com/**','**/www.googletagmanager.com/**']) await ctx.route(pat,x=>x.abort());
  await ctx.route('http://127.0.0.1:4173/**',r=>{ const q=r.request(); if(q.resourceType()==='document') return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}); return r.continue(); });
  const p=await ctx.newPage();
  await p.addInitScript(()=>{window.__s=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__s.push({v:e.value,t:Math.round(e.startTime),src:(e.sources||[]).map(s=>s.node?((s.node.nodeName||'')+'.'+String(s.node.className||'').slice(0,30)):'?')})}).observe({type:'layout-shift',buffered:true});});
  await p.goto('http://127.0.0.1:4173/gallery',{waitUntil:'load'}); await p.waitForTimeout(6000);
  const info=await p.evaluate(()=>({s:window.__s,hasStream:!!document.querySelector('[data-gallery-entry-stream]'),hasCat:!!document.querySelector('#gallery-catalog'),h:document.querySelector('[data-gallery-entry-stream]')?Math.round(document.querySelector('[data-gallery-entry-stream]').getBoundingClientRect().height):null}));
  const tot=info.s.reduce((a,x)=>a+x.v,0); out.push(`${vp.n} run${run} CLS=${tot.toFixed(3)} stream=${info.hasStream} cat=${info.hasCat} h=${info.h} top=${info.s.sort((a,b)=>b.v-a.v).slice(0,2).map(x=>x.v.toFixed(3)+'@'+x.t+' '+x.src[0]).join(' ; ')}`);
  await ctx.close(); } }
 console.log(out.join('\n')); await b.close();})();
