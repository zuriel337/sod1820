import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {chromium} from 'playwright';
const root=process.cwd();
if (!process.env.SOD_BASELINE_DIST) throw new Error('Set SOD_BASELINE_DIST to a separately built baseline dist directory.');
const servers=[];
for(const [port,dir,baseline] of [[5491,process.env.SOD_BASELINE_DIST,true],[5492,root+'/dist',false]]){
 const cache=new Map();const server=createServer((req,res)=>{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(dir,'.'+path);if(!file.startsWith(dir+'/'))file=dir+'/index.html';if(!existsSync(file)||!statSync(file).isFile())file=dir+(baseline&&path.startsWith('/post/')?'/2029.html':'/index.html');
 if(!cache.has(file))cache.set(file,gzipSync(readFileSync(file)));res.writeHead(200,{'content-type':({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream','content-encoding':'gzip','cache-control':'public, max-age=3600'});res.end(cache.get(file));});await new Promise(r=>server.listen(port,'127.0.0.1',r));servers.push(server);
}
const proxy=process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
const browser=await chromium.launch({headless:true});
const receipt={date:new Date().toISOString(),candidate:process.env.SOD_CANDIDATE_SHA,baseline:process.env.SOD_BASELINE_SHA,method:'Local gzip production builds, Chromium 390x844, CPU x4, browser network 9Mbps/80ms; real Supabase reads forwarded by Node proxy (not subject to CDP network throttling). 3 fresh contexts plus a repeated load each; routing disables HTTP cache, so repeat is NOT true HTTP-cache-warm. layoutShiftSum is NOT session-window CLS. Shared host timings are diagnostic, not release acceptance. Lab only, not field or real phone. Number uses a disclosed open-flag fixture; no auth/DB state is changed. Automated telemetry and product writes blocked.',runs:[]};
async function run(kind,path,selector,numberOpen=false){
 for(let repeat=1;repeat<=3;repeat++){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,ignoreHTTPSErrors:true});let blocked=0;let reads=[];
  await context.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(['127.0.0.1','localhost','linswmnnkjxvweumprav.supabase.co'].includes(u.hostname))return route.fallback();if(q.method()!=='GET'||q.resourceType()==='script'){blocked++;return route.abort();}try{const r=await fetch(q.url(),{signal:AbortSignal.timeout(15000)});const h=Object.fromEntries(r.headers);for(const k of ['content-encoding','content-length','transfer-encoding'])delete h[k];await route.fulfill({status:r.status,headers:h,body:Buffer.from(await r.arrayBuffer())});}catch{await route.abort();}});
  await context.route('https://linswmnnkjxvweumprav.supabase.co/**',async route=>{const req=route.request(),u=new URL(req.url());const name=u.pathname.split('/').pop();const allowed=req.method()==='GET'||(req.method()==='POST'&&u.pathname.startsWith('/rest/v1/rpc/')&&/^(fn_|gematria_|posts_by_number_strict|number_neighbors|lang_links_list|world_group_source_arrivals|community_reply_counts|community_archive_reply_counts)/.test(name));
   if(!allowed){blocked++;return route.abort();}if(/\/storage\/v1\/(object|render)\/(?!public\/)/.test(u.pathname)){blocked++;return route.abort();}
   reads.push({key:u.pathname+u.search+(req.postData()||''),name,start:Date.now()});
   try{const r=await fetch(req.url(),{method:req.method(),headers:req.headers(),body:req.method()==='GET'?undefined:req.postData(),signal:AbortSignal.timeout(25000)});let bytes=Buffer.from(await r.arrayBuffer());if(numberOpen&&u.pathname==='/rest/v1/site_flags'&&r.ok){const rows=JSON.parse(bytes.toString());const updated=rows.map(x=>x.key==='lock_number'?{...x,enabled:false}:x);if(!updated.some(x=>x.key==='lock_number'))updated.push({key:'lock_number',enabled:false,mode:'all'});bytes=Buffer.from(JSON.stringify(updated));}const h=Object.fromEntries(r.headers);for(const k of ['content-encoding','content-length','transfer-encoding'])delete h[k];await route.fulfill({status:r.status,headers:h,body:bytes});}catch{await route.abort();}
  });
  for(const pattern of ['**/*google-analytics.com/**','**/*googletagmanager.com/**','**/*facebook.net/**','**/*facebook.com/tr/**'])await context.route(pattern,r=>r.abort());
  await context.addInitScript(()=>{window.__m={lcp:0,layoutShiftSum:0,long:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__m.layoutShiftSum+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.long+=e.duration;}).observe({type:'longtask',buffered:true});});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:9*1024*1024/8,uploadThroughput:2*1024*1024/8});
  const origin=kind==='baseline'?'http://127.0.0.1:5491':'http://127.0.0.1:5492';
  for(const warm of [false,true]){
   reads=[];blocked=0;const start=Date.now();let failure=null;let contentMs=null;
   try{await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:45000});await page.locator(selector).first().waitFor({timeout:35000});contentMs=Date.now()-start;await page.waitForTimeout(3500);}catch(e){failure=e.message.slice(0,180);}
   const m=await page.evaluate(()=>({...window.__m,resources:performance.getEntriesByType('resource').length,transfer:performance.getEntriesByType('resource').reduce((s,x)=>s+x.transferSize,0)}));const counts={};for(const r of reads)counts[r.key]=(counts[r.key]||0)+1;
   const entry={kind,path,repeat,repeatLoad:warm,contentMs,...m,readCount:reads.length,duplicateRequests:Object.values(counts).reduce((n,v)=>n+Math.max(0,v-1),0),siteFlagReads:reads.filter(x=>x.name==='site_flags').length,blockedWrites:blocked,errors:[...errors],failure};receipt.runs.push(entry);console.log(JSON.stringify(entry));writeFileSync((process.env.SOD_PERFORMANCE_OUTPUT || '/tmp/unified-performance.json'),JSON.stringify(receipt,null,2));
  }
  await context.close();
 }
}
try{
for(const kind of ['baseline','candidate']){await run(kind,'/',kind==='baseline'?'main':'[data-experience-capability="home-composition"]');await run(kind,'/post/flydubai-fz1073-363-14000-remzei-geula','.sod29-reading-source');}
for(const rail of ['', '&rail=smart'])await run('candidate','/number/1820?wide=a'+rail,'[data-number-core-root="1820"]',true);
}finally{await browser.close();for(const s of servers)s.close();}
