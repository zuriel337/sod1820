import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const dir=process.cwd()+'/var-base';
http.createServer((q,rs)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dir,'2029.html');const e=path.extname(f);const t={'.html':'text/html','.js':'text/javascript','.css':'text/css'}[e];if(t){rs.writeHead(200,{'content-type':t,'content-encoding':'gzip'});rs.end(zlib.gzipSync(fs.readFileSync(f)))}else{rs.writeHead(200);fs.createReadStream(f).pipe(rs)}}).listen(5602);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
for(const [n,r] of [['post','/post/flydubai-fz1073-363-14000-remzei-geula'],['topic','/topic/atzirut-hageula'],['home','/']]){
const page=await (await br.newContext({viewport:{width:1366,height:768}})).newPage();
await page.addInitScript(()=>{navigator.sendBeacon=()=>true;const of=window.fetch.bind(window);window.fetch=(i,n)=>{const u=typeof i==='string'?i:i.url;const m=String((n&&n.method)||'GET').toUpperCase();if(/supabase\.co/.test(u)&&m!=='GET'&&!/rpc\/(convergence_meter|fn_method_value|gematria_method_trace|get_category_videos|world_group_source_arrivals_v2|fn_zero_scale)/.test(u))return Promise.resolve(new Response('null'));return of(i,n)};
 window.__log=[];const sel=['.sod29-bar-zone.is-actions','.sod29-bar-zone','.sod29-raziel-orb','.sod29-companion','.sod29-surface-context-rail','.h29-quiet','.h29-sec'];let prev={};
 const tick=()=>{const t=Math.round(performance.now());for(const s of sel){document.querySelectorAll(s).forEach((e,i)=>{const r=e.getBoundingClientRect();const k=s+'#'+i;const v=[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)].join(',');if(prev[k]!==v){window.__log.push(t+' '+k+' '+(prev[k]||'new')+' -> '+v);prev[k]=v}})}
 if(t<5500)requestAnimationFrame(tick)};requestAnimationFrame(tick);
 new MutationObserver(ms=>{for(const m of ms)for(const a of m.addedNodes){if(a.nodeType===1&&/bar-zone|orb|avatar|companion|rail|h29/.test(a.className||''))window.__log.push(Math.round(performance.now())+' ADD '+a.tagName+'.'+String(a.className).slice(0,50))}}).observe(document,{childList:true,subtree:true})});
await page.goto('http://127.0.0.1:5602'+r,{waitUntil:'commit'});await page.waitForTimeout(6000);
const shifts=await page.evaluate(()=>performance.getEntriesByType('layout-shift').filter(e=>e.value>.004).map(e=>Math.round(e.startTime)+' v='+e.value.toFixed(3)));
console.log('=== '+n,'shifts',shifts.join('; '));console.log((await page.evaluate(()=>window.__log)).filter(l=>!/new -> /.test(l)||/ADD/.test(l)).slice(0,40).join('\n'))}
await br.close();process.exit(0)
