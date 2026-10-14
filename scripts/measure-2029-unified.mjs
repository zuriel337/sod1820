// Lab load measurement on two builds of the unified preview (BEFORE=e2068eef, AFTER=0e4e2d57): cold entry for world/home/post/number
// and world->home->post->back->world->number->back navigation, mobile (CPU x4, 150ms/1.6Mbps) and desktop (CPU x1, 40ms/10Mbps).
// site_flags is mocked open (lock_number/lock_world) so the gated Number page renders; other Supabase reads are real, writes/analytics blocked.
// Usage: BEFORE=<dist> AFTER=<dist> REPS=10 OUT=out.jsonl PLAYWRIGHT=<playwright path> CHROME=<chromium> node scripts/measure-2029-unified.mjs
// Laboratory numbers on a local static server; not field data.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const { chromium } = await import(process.env.PLAYWRIGHT||'playwright');
const SC=process.cwd(); const OUT=process.env.OUT||'m10.jsonl'; const REPS=Number(process.env.REPS||10);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.webp':'image/webp'};
const serve=(dir,port)=>new Promise(r=>{const s=http.createServer((q,rs)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dir,'2029.html');rs.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rs)}).listen(port,'127.0.0.1',()=>r(s))});
const builds={before:[process.env.BEFORE||`${SC}/e2068/dist`,4901],after:[process.env.AFTER||`${SC}/unif/dist`,4902]};
const profiles={mobile:{vp:{width:390,height:844},mobile:true,cpu:4,lat:150,down:1.6e6/8,up:750e3/8},desktop:{vp:{width:1366,height:768},mobile:false,cpu:1,lat:40,down:10e6/8,up:5e6/8}};
const POST='/post/flydubai-fz1073-363-14000-remzei-geula';
const cold={world:'/world',home:'/',post:POST,number:'/number/1820'};
const FLAGS=[{key:'lock_number',enabled:false,message:null,mode:'all'},{key:'lock_world',enabled:false,message:null,mode:'all'}];
const sv=await Promise.all(Object.values(builds).map(([d,p])=>serve(d,p)));
const br=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
const emit=o=>fs.appendFileSync(OUT,JSON.stringify(o)+'\n');
async function newPage(prof,port){
  const P=profiles[prof]; const ctx=await br.newContext({viewport:P.vp,isMobile:P.mobile,hasTouch:P.mobile});
  const page=await ctx.newPage(); const st={jsGz:0,total:0,reqs:0,supa:0,flags:0};
  await page.route('**/*',r=>{const rq=r.request();const u=rq.url();if(u.includes('/rest/v1/site_flags')){if(rq.method()==='GET')st.flags++;return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,OPTIONS'},body:JSON.stringify(FLAGS)})}if(!u.startsWith(`http://127.0.0.1:${port}`)&&!['GET','OPTIONS','HEAD'].includes(rq.method()))return r.abort();if(/google|facebook|clarity|openweb|spot\.im|doubleclick|analytics/.test(u))return r.abort();r.continue()});
  page.on('response',async resp=>{try{const u=resp.url();const b=await resp.body();st.total+=b.length;st.reqs++;if(u.startsWith(`http://127.0.0.1:${port}`)){if(u.endsWith('.js'))st.jsGz+=zlib.gzipSync(b,{level:9}).length}else if(u.includes('supabase.co/'))st.supa++}catch{}});
  const cdp=await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate',{rate:P.cpu});
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:P.lat,downloadThroughput:P.down,uploadThroughput:P.up});
  await page.addInitScript(()=>{window.__m={lcp:0,fcp:0,lt:0,ltn:0};
    new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')window.__m.fcp=e.startTime}).observe({type:'paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__m.lt+=Math.max(0,e.duration-50);window.__m.ltn++}}).observe({type:'longtask',buffered:true});
    window.__usable=(match,t0,limit,prev,sel)=>new Promise(res=>{const chk=()=>{const h=document.querySelector('h1');const content=sel?!!document.querySelector(sel):(h&&h.innerText.trim().length>3&&(prev==null||h.innerText.trim()!==prev));const ok=match.test(location.pathname+location.search)&&content&&document.body.innerText.length>600;if(ok)return res(Math.round(performance.now()-t0));if(performance.now()-t0>limit)return res(-1);requestAnimationFrame(chk)};chk()});});
  return {ctx,page,st};
}
const stamp=()=>new Date().toISOString();
for(let rep=0;rep<REPS;rep++) for(const prof of Object.keys(profiles)){
  for(const [name,route] of Object.entries(cold)) for(const [bn,[dir,port]] of Object.entries(builds)){
    const {ctx,page,st}=await newPage(prof,port);
    const match=name==='world'?/^\/world/:name==='home'?/^\/$/:name==='number'?/^\/number\//:/^\/post\//; const sel=name==='number'?'.sod29-number-page':null;
    await page.addInitScript(({m})=>{},{m:0});
    await page.goto(`http://127.0.0.1:${port}${route}`,{waitUntil:'commit',timeout:120000}).catch(()=>{});
    const usable=await page.evaluate(({src,limit,sel})=>window.__usable(new RegExp(src),0,limit,null,sel),{src:match.source,limit:60000,sel}).catch(()=>-1);
    await page.waitForTimeout(2500);
    const m=await page.evaluate(()=>window.__m).catch(()=>({}));
    emit({t:stamp(),kind:'cold',rep,prof,scenario:name,build:bn,flags:st.flags,usable,fcp:Math.round(m.fcp||0),lcp:Math.round(m.lcp||0),tbt:Math.round(m.lt||0),longtasks:m.ltn||0,jsGzKB:Math.round(st.jsGz/1024),totalKB:Math.round(st.total/1024),reqs:st.reqs,supa:st.supa});
    await ctx.close();
  }
  for(const [bn,[dir,port]] of Object.entries(builds)){
    const {ctx,page,st}=await newPage(prof,port); const steps=[];
    await page.goto(`http://127.0.0.1:${port}/world`,{waitUntil:'commit',timeout:120000}).catch(()=>{});
    const first=await page.evaluate(()=>window.__usable(/^\/world/,0,60000)).catch(()=>-1); steps.push(['world-cold',first]);
    const step=async(label,selector,re,act,usableSel)=>{ const r0=st.reqs,j0=st.jsGz; await page.evaluate(()=>{window.__m.lt=0;window.__m.ltn=0;window.__prev=(document.querySelector('h1')?.innerText||'').trim()}).catch(()=>{}); 
      const t0=Date.now(); if(act==='back'){await page.evaluate(()=>{window.__t0=performance.now();history.back()})} else {await page.evaluate(([s])=>{window.__t0=performance.now();document.querySelector(s)?.click()},[selector])}
      const u=await page.evaluate(([src,usableSel])=>window.__usable(new RegExp(src),window.__t0,60000,usableSel?null:window.__prev,usableSel),[re,usableSel]).catch(()=>-1);
      const mm=await page.evaluate(()=>({lt:window.__m.lt,ltn:window.__m.ltn})).catch(()=>({lt:0,ltn:0}));
      steps.push([label,u,{flags:0,reqs:st.reqs-r0,jsGzKB:Math.round((st.jsGz-j0)/1024),tbt:Math.round(mm.lt),longtasks:mm.ltn}]); await page.waitForTimeout(1500); };
    await step('world->home','a[href="/"]','^\\/$',null,'[data-experience-capability="home-composition"]');
    await step('home->post','a[href^="/post/"]','^\\/post\\/',null,'[data-experience-capability="post-master-reading-stage"]');
    await step('post->back(home)',null,'^\\/$','back','[data-experience-capability="home-composition"]');
    await step('home->world','a[href="/world"]','^\\/world');
    await step('world->number','a[href^="/number/"]','^\\/number\\/',null,'.sod29-number-page');
    await step('number->back(world)',null,'^\\/world','back');
    emit({t:stamp(),kind:'nav',rep,prof,build:bn,steps});
    await ctx.close();
  }
}
emit({kind:'done'}); await br.close(); sv.forEach(s=>s.close());
