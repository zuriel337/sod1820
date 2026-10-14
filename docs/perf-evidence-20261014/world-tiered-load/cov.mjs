import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const dir = process.argv[2]||'/tmp/claude-0/fx-dist/base';
const srv = http.createServer((q,rs)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dir,'2029.html');rs.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rs)}).listen(4989);
const br = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg = await br.newPage({viewport:{width:390,height:844}});
await pg.addInitScript(()=>{const of=window.fetch.bind(window);window.fetch=(i,n)=>{const u=typeof i==='string'?i:i.url;if(String((n&&n.method)||'GET')!=='GET'&&/link_identity|track_visit|ingest_event/.test(u))return Promise.resolve(new Response('null'));return of(i,n)}});
await pg.coverage.startJSCoverage({resetOnNavigation:false});
await pg.goto('http://127.0.0.1:4989/world',{waitUntil:'commit'});
await pg.waitForSelector('[data-world-topic],[data-world-discovery-door]',{timeout:60000}); await pg.waitForTimeout(300);
const cov = await pg.coverage.stopJSCoverage();
let tot=0,used=0; const rows=[];
for (const e of cov){ if(!e.url.includes('/assets/'))continue; const len=e.source.length; let u=0; for(const f of e.functions) for(const r of f.ranges) if(r.count>0) u+=r.endOffset-r.startOffset; 
 // block coverage: approximate used = union of ranges with count>0 minus nested zero-count; use text length simpler: sum of top-level
 const bytes=new Array(0); rows.push({n:e.url.split('/').pop().replace(/-[A-Za-z0-9_-]{8}\.js$/,'.js'),len,gz:zlib.gzipSync(Buffer.from(e.source)).length,usedApprox:0}); tot+=len; }
// precise: mark used chars
rows.length=0; tot=0; used=0;
for (const e of cov){ if(!e.url.includes('/assets/'))continue; const len=e.source.length; const mark=new Uint8Array(len);
 // ranges are nested; apply in order of start asc, so inner ranges override
 const all=[]; for(const f of e.functions) for(const r of f.ranges) all.push(r); all.sort((a,b)=>a.startOffset-b.startOffset||b.endOffset-a.endOffset);
 for(const r of all) mark.fill(r.count>0?1:0,r.startOffset,r.endOffset);
 let u=0; for(const m of mark) u+=m; tot+=len; used+=u; rows.push({n:e.url.split('/').pop().replace(/-[A-Za-z0-9_-]{8}\.js$/,'.js'),len,u,gz:zlib.gzipSync(Buffer.from(e.source)).length}); }
console.log('files',rows.length,'total KB',Math.round(tot/1024),'executed-at-ready KB',Math.round(used/1024),'pct',Math.round(used/tot*100));
rows.sort((a,b)=>(b.len-b.u)-(a.len-a.u)); for(const r of rows.slice(0,14)) console.log(String(Math.round((r.len-r.u)/1024)).padStart(4),'KB unused of',String(Math.round(r.len/1024)).padStart(4),'KB (gz',Math.round(r.gz/1024)+')',r.n);
await br.close();srv.close();
