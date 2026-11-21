// Matched public artifacts; real worker, root-route hints and server article renderer.
// Local HTTP/2 + gzip fixture, browser HTTP cache enabled (no Playwright routing).
// Local TLS is pinned by SPKI: broad ignore-certificate-errors prevents Chromium HTTP caching.
// Database: recorded anonymous reads only; all writes denied. Not field performance.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT=process.cwd(), OUT=process.env.ROYAL_PERF_OUT || path.join(ROOT,'docs/reviews/royal-persistent-20261121/final-public');fs.mkdirSync(OUT,{recursive:true});
const roots={main:process.env.ROYAL_BASE_ROOT||'/workspace/scratch/main-quiet',royal:process.env.ROYAL_CANDIDATE_ROOT||ROOT};
const cachePath=path.join(OUT,'public-read-fixture.json');
const cache=new Map(fs.existsSync(cachePath)?JSON.parse(fs.readFileSync(cachePath)):[]), posts=new Map();
const allowed=new Set(JSON.parse(fs.readFileSync('docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json')).functions.map(x=>x.proname));
const denied=[],unprimed=[];let sealed=false;
function remember(answer){try{const rows=JSON.parse(answer.body);if(Array.isArray(rows))for(const row of rows)if(row.id&&row.slug&&row.content)posts.set(row.slug,row);}catch{}}
for(const answer of cache.values())remember(answer);
async function read({url,method,headers,body}){
 const rpc=url.pathname.split('/rpc/')[1];
 if(!((method==='GET'&&(url.pathname.startsWith('/rest/v1/')||/^\/storage\/v1\/(object|render\/image)\/public\//.test(url.pathname)))||(method==='POST'&&rpc&&allowed.has(rpc)))){denied.push({path:url.pathname,method});return {status:403,body:{error:'lab_no_write'}};}
 const key=url.href+'\n'+body.toString();
 if(!cache.has(key)){
  if(sealed){unprimed.push(url.pathname+url.search);throw Error('Unprimed read: '+url.pathname+url.search);}
  const target=new URL(url);if(method==='POST')for(const [k,v]of Object.entries(JSON.parse(body||'{}')))if(v!==null)target.searchParams.set(k,typeof v==='object'?JSON.stringify(v):String(v));
  const answer=JSON.parse(execFileSync('python',['-c',`import sys,json,urllib.request,urllib.error,base64
q=json.load(sys.stdin)
try:
 r=urllib.request.urlopen(urllib.request.Request(q['url'],headers=q['headers']),timeout=20)
 typ=r.headers.get('content-type','application/json'); data=r.read(); binary=not ('json' in typ or 'text' in typ)
 print(json.dumps({'status':r.status,'type':typ,'headers':{'cache-control':r.headers.get('cache-control','no-store')},'binary':binary,'body':base64.b64encode(data).decode() if binary else data.decode()}))
except urllib.error.HTTPError as e: print(json.dumps({'status':e.code,'body':e.read().decode()}))`],{input:JSON.stringify({url:target.href,headers:Object.fromEntries(Object.entries(headers).filter(([k])=>['apikey','authorization','accept','prefer'].includes(k)))}),maxBuffer:10*1024*1024}).toString());cache.set(key,answer);remember(answer);fs.writeFileSync(cachePath,JSON.stringify([...cache]));
 }
 const answer=cache.get(key);return answer.binary?{...answer,body:Buffer.from(answer.body,'base64')}:answer;
}
async function fixture(root){
 let source=fs.readFileSync(path.join(ROOT,'test/helpers/authBrowserFixture.mjs'),'utf8');
 source="import {createHash,X509Certificate} from 'node:crypto';\n"+source.replace("'--ignore-certificate-errors'","'--ignore-certificate-errors-spki-list='+createHash('sha256').update(new X509Certificate(readFileSync(join(dir,'c.pem'))).publicKey.export({type:'spki',format:'der'})).digest('base64')");
 // Same acceptance fixture and Auth model on both arms; HTTP/2/gzip and real cache headers added for timings only.
 source=source.replace("import { createServer } from 'node:https';","import { createSecureServer as createServer } from 'node:http2';\nimport { gzipSync } from 'node:zlib';")
 .replace("'./authContractHarness.mjs'",JSON.stringify(pathToFileURL(path.join(ROOT,'test/helpers/authContractHarness.mjs')).href))
 .replace("const root = fileURLToPath(new URL('../..', import.meta.url));",'const root = '+JSON.stringify(root)+';')
 .replace("JSON.stringify(custom.body ?? null), cors);", "JSON.stringify(custom.body ?? null), { ...cors, ...custom.headers });")
 .replace("typeof custom.body === 'string' ? custom.body", "(typeof custom.body === 'string' || Buffer.isBuffer(custom.body)) ? custom.body")
 .replace("req.headers.host || ''", "req.headers.host || req.headers[':authority'] || ''")
 .replace('createServer({ key:', 'createServer({ allowHTTP1: true, key:')
 .replace("url.pathname === '/favicon.ico')", "url.pathname === '/favicon.ico' || /\\.(avif|webp|png|svg|jpg)$/.test(url.pathname))")
 .replace("res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers }); res.end(data);", "let bytes=Buffer.isBuffer(data)?data:Buffer.from(data); if (/text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding']||'')) { bytes=gzipSync(bytes); headers={...headers,'content-encoding':'gzip'}; } headers={...headers,'content-length':bytes.length}; res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers }); res.end(bytes);");
 if(process.env.ROYAL_SLOW==='1'){
  source = `const labActive=new Set(); const labTimer=setInterval(()=>{let budget=2000;while(budget>0&&labActive.size){const job=labActive.values().next().value;labActive.delete(job);if(job.res.destroyed)continue;const n=Math.min(budget,1024,job.bytes.length-job.at);job.res.write(job.bytes.subarray(job.at,job.at+n));job.at+=n;budget-=n;if(job.at===job.bytes.length)job.res.end();else labActive.add(job);}},10);labTimer.unref();
function labSend(res,status,headers,bytes){if(!globalThis.__royalLabSlow){res.writeHead(status,headers);res.end(bytes);return;}setTimeout(()=>{if(res.destroyed)return;res.writeHead(status,headers);if(!bytes.length)return res.end();labActive.add({res,bytes,at:0});},150);}
`+source;
  source=source.replace("res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers }); res.end(bytes);", "labSend(res,status,{ 'content-type': type, 'cache-control': 'no-store', ...headers },bytes);");
 }
 if(process.env.ROYAL_DEBUG)fs.writeFileSync('/workspace/scratch/royal-fixture-debug.mjs',source);
 const {startFixture}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const serverFields=/const SEL = 'select=([^']+)&limit=1'/.exec(fs.readFileSync(path.join(root,'api/og.js'),'utf8'))[1].split(',');
 const {withRoutePreloads2029}=await import(pathToFileURL(path.join(root,'public-reading-deploy/route-preload.js')));
 const {withArticleFirst2029,loadArticleFirstRenderer}=await import(pathToFileURL(path.join(root,'public-reading-deploy/api/article-first.js')));await loadArticleFirstRenderer();
 const rules=JSON.parse(fs.readFileSync(path.join(root,'public-reading-deploy/vercel.json'))).headers;
 return startFixture({supabase:read,staticAsset:({path:p})=>{
  const f=path.join(root,'public-reading-deploy/dist',p);if(!fs.existsSync(f))return null;
  const rule=[...rules].reverse().find(r=>r.source!=='/(.*)' && new RegExp('^'+r.source.replace(/:[a-zA-Z]+\(([^)]+)\)/g,'($1)')+'$').test(p));const headers=Object.fromEntries((rule?.headers||[]).map(h=>[h.key.toLowerCase(),h.value]));
  if(!Object.keys(headers).length&&!p.startsWith('/assets/'))return null;
  return {body:fs.readFileSync(f),type:({'.js':'text/javascript','.css':'text/css','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'})[path.extname(p)]||'application/octet-stream',headers:p.startsWith('/assets/')?{'cache-control':'public, max-age=31536000, immutable'}:headers};
 },documentFor:({path:p,template})=>{
  let html=withRoutePreloads2029(template,{path:p,status:200});const slug=p.replace(/^\/post\//,'').replace(/^\//,'');const row=[...posts.values()].find(x=>decodeURIComponent(x.slug).toLowerCase()===decodeURIComponent(slug).toLowerCase());
  const out=withArticleFirst2029(html,{path:p,search:'',status:200,post:row?Object.fromEntries(serverFields.map(k=>[k,row[k]])):null});html=out.html.replace("<head>",`<head><meta name="royal-lab-article" content="${out.state}">`);
  return html;
 }});
}
const POST='/post/remzei-geula-ai-sod-hashir';
const routes=[['home','/','[data-home-pinned-lead]:not([data-home-pinned-lead="loading"]):not([hidden])'],['heichal','/heichal','input[aria-label="נושא למחקר בהיכל"]'],['world','/world','.sod29-flight-copy h2'],['books','/books','.sod29-book-grid'],['code','/code','.els29-mode-selector'],['post',POST,'article h1'],['imported','/%d7%a1%d7%93%d7%a8-%d7%aa%d7%a4%d7%99%d7%9c%d7%94-%d7%9c%d7%a8%d7%a4%d7%95%d7%90%d7%94-%d7%a9%d7%9c%d7%9e%d7%94-%d7%aa%d7%a4%d7%99%d7%9c%d7%94-%d7%a9%d7%9c-%d7%94%d7%a6%d7%94%d7%a7-%d7%a8%d7%91','article h1']].filter(x=>!process.env.ROYAL_ROUTES||process.env.ROYAL_ROUTES.split(',').includes(x[0]));
function observe(selector){
 if(location.protocol!=='https:')return;
 localStorage.setItem('sod2029:theme-preset','dark');localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000));
 window.__royal={lcp:0,cls:0,lcpElements:[],useful:null,dom:null};
 new PerformanceObserver(l=>{for(const e of l.getEntries()){__royal.lcp=e.startTime;__royal.lcpElements.push({at:e.startTime,url:e.url,tag:e.element?.tagName,classes:e.element?.className,text:e.element?.textContent?.slice(0,90)});}}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__royal.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 const sample=()=>{const e=document.querySelector(selector);if(e){const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.height&&r.width&&s.visibility==='visible'&&s.opacity!=='0'){__royal.dom??=performance.now();if(r.top<innerHeight&&r.bottom>0&&__royal.useful===null)requestAnimationFrame(()=>{__royal.useful??=performance.now();});}}if(performance.now()<60000)requestAnimationFrame(sample);};requestAnimationFrame(sample);
}
const wallNow=Date.now();
function fixedWall(now){const NativeDate=Date;class LabDate extends NativeDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}window.Date=LabDate;}
const fixtures={},browsers={},rows=[];
try{
 for(const [arm,root]of Object.entries(roots)){fixtures[arm]=await fixture(root);browsers[arm]=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:fixtures[arm].chromiumArgs,env:fixtures[arm].browserEnv});}
 // Prime the identical real-read replay before timing. No page-level routing: cache semantics remain native.
 for(const arm of Object.keys(roots))for(const width of [390,1440])for(const [name,url,selector]of routes){const c=await browsers[arm].newContext({ignoreHTTPSErrors:false,viewport:{width,height:width===390?844:900}});await c.addInitScript(fixedWall,wallNow);const p=await c.newPage();p.on('pageerror',e=>console.log('prime error',e.message));p.on('console',m=>{if(m.type()==='error')console.log('prime console',m.text().slice(0,180));});await p.goto(fixtures[arm].origin+url);await p.locator(selector).first().waitFor({timeout:45000}).catch(async e=>{console.log('prime body',(await p.locator('body').innerText()).slice(0,1000));throw e;});await p.waitForTimeout(2000);if(name==='imported'&&width===1440){const state=await p.locator('meta[name="royal-lab-article"]').getAttribute('content');if(!['served','served-new'].includes(state))throw Error('Imported article-first not exercised: '+state);}
if(process.env.ROYAL_DEBUG)console.log('images debug',arm,name,await p.evaluate(async()=>{const i=document.querySelector('img[fetchpriority="high"]');if(!i)return null;const r=await fetch(i.currentSrc);const b=new Uint8Array(await r.arrayBuffer());return {url:i.currentSrc,width:i.naturalWidth,status:r.status,type:r.headers.get('content-type'),head:[...b.slice(0,30)],size:b.length};}));await c.close();console.log('primed',arm,name);}
 sealed=true;globalThis.__royalLabSlow=process.env.ROYAL_SLOW==='1';
 const rounds=Number(process.env.ROYAL_ROUNDS||3),slow=process.env.ROYAL_SLOW==='1';
 for(let rep=0;rep<rounds;rep++)for(const width of process.env.ROYAL_WIDTHS?process.env.ROYAL_WIDTHS.split(',').map(Number):slow?[390]:[390,1440])for(const [route,url,selector]of routes)for(const arm of rep%2?['royal','main']:['main','royal']){
  const c=await browsers[arm].newContext({ignoreHTTPSErrors:false,viewport:{width,height:width===390?844:900},locale:'he-IL',serviceWorkers:'allow'});await c.addInitScript(observe,selector);await c.addInitScript(fixedWall,wallNow);const p=await c.newPage();const errors=[];let responses=[];p.on('pageerror',e=>errors.push(e.message));const cd=await c.newCDPSession(p);await cd.send('Network.enable');cd.on('Network.responseReceived',e=>{const r=e.response;if(/woff2|royal-connected|canonical-lockup/.test(r.url))responses.push({url:r.url,status:r.status,headers:r.headers,disk:r.fromDiskCache,worker:r.fromServiceWorker});});
  if(slow){await cd.send('Emulation.setCPUThrottlingRate',{rate:4});}
  for(const warm of [false,true]){ responses=[];if(warm)await p.goto('about:blank');
   await p.goto(fixtures[arm].origin+url,{waitUntil:'domcontentloaded',timeout:60000});await p.locator(selector).first().waitFor({timeout:60000});await p.waitForFunction(()=>__royal.useful!==null,{timeout:60000});await p.locator('#root .sod29-root').first().waitFor({timeout:60000});await p.waitForFunction(()=>[...document.querySelectorAll('img[fetchpriority="high"]')].every(x=>x.complete),null,{timeout:60000});await p.waitForTimeout(slow?2500:1500);
   const data=await p.evaluate(()=>({...__royal,articleFirst:window.__sodArticleFirst||null,serverArticle:document.querySelector('meta[name="royal-lab-article"]')?.content,controlled:!!navigator.serviceWorker.controller,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,transfer:e.transferSize,encoded:e.encodedBodySize,protocol:e.nextHopProtocol,start:e.startTime,end:e.responseEnd})),overflow:document.documentElement.scrollWidth>innerWidth,scrollY,images:[...document.images].map(i=>({src:i.currentSrc,complete:i.complete,width:i.naturalWidth,priority:i.fetchPriority}))}));
   if(unprimed.length)throw Error('Unprimed timing reads: '+JSON.stringify(unprimed));if(data.images.some(i=>i.priority==='high'&&(!i.complete||!i.width)))throw Error('Primary image did not decode: '+JSON.stringify(data.images.filter(i=>i.priority==='high')));
   rows.push({arm,rep,width,route,warm,slow,errors:[...errors],responses,...data});fs.writeFileSync(path.join(OUT,(slow?'slow':'fast')+(process.env.ROYAL_ROUTES?'-'+process.env.ROYAL_ROUTES.replaceAll(',','-'):'')+'.json'),JSON.stringify(rows,null,2));console.log(arm,rep,width,route,warm,Math.round(data.lcp),Math.round(data.useful),data.cls);
   if(rep===0)await p.screenshot({path:path.join(OUT,`${arm}-${route}-${width}-${warm?'warm':'cold'}.png`)});
  }await c.close();
 }
}finally{for(const b of Object.values(browsers))await b.close();for(const f of Object.values(fixtures))await f.close();fs.writeFileSync(path.join(OUT,'denied.json'),JSON.stringify(denied,null,2));}
