const { chromium } = require('playwright'); const fs=require('fs');
const html=fs.readFileSync('/home/user/sod1820/dist/2029.html','utf8');
(async()=>{ const b=await chromium.launch();
 for(const vp of [{n:'m390x844',width:390,height:844,isMobile:true},{n:'m360x640',width:360,height:640,isMobile:true},{n:'m430x932',width:430,height:932,isMobile:true},{n:'t768x1024',width:768,height:1024,isMobile:false},{n:'d1440x900',width:1440,height:900,isMobile:false},{n:'d1920x1080',width:1920,height:1080,isMobile:false}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.isMobile});
  for(const pat of ['**/www.google-analytics.com/**','**/region1.google-analytics.com/**','**/www.googletagmanager.com/**']) await ctx.route(pat,x=>x.abort());
  await ctx.route('http://127.0.0.1:4173/**',r=>{ const q=r.request(); if(q.resourceType()==='document') return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}); return r.continue(); });
  const p=await ctx.newPage(); await p.goto('http://127.0.0.1:4173/gallery',{waitUntil:'commit'});
  let loadH=null; for(let i=0;i<40;i++){ await p.waitForTimeout(100); const r=await p.evaluate(()=>{const e=document.querySelector('.r29-river');return e?{h:e.getBoundingClientRect().height,loading:!!e.querySelector('.r29-status[role=status]')||e.classList.contains('is-loading')}:null}); if(r&&r.loading&&loadH==null) loadH=Math.round(r.h); if(r&&!r.loading) break; }
  await p.waitForTimeout(3000);
  const fin=await p.evaluate(()=>{const e=document.querySelector('.r29-river');const cs=getComputedStyle(e);return {h:Math.round(e.getBoundingClientRect().height),win:cs.getPropertyValue('--r29-window-height'),tray:cs.getPropertyValue('--r29-tray'),ph:cs.paddingTop+'/'+cs.paddingBottom}});
  console.log(vp.n,'loading',loadH,'final',JSON.stringify(fin),'vh',vp.height); await ctx.close();}
 await b.close();})();
