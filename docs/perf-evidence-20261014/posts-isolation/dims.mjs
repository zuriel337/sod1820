import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const dir = process.argv[2]; const port=Number(process.argv[3]||4996);
const srv = http.createServer((q,rs)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dir,'2029.html');rs.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rs)}).listen(port);
const br = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
for (const [n,vp,mob] of [['desktop',{width:1366,height:768},false],['mobile',{width:390,height:844},true]]) {
 const ctx = await br.newContext({viewport:vp,isMobile:mob}); const pg = await ctx.newPage();
 await pg.addInitScript(()=>{const of=window.fetch.bind(window);window.fetch=(i,n)=>{const u=typeof i==='string'?i:i.url;if(String((n&&n.method)||'GET')!=='GET'&&/link_identity|track_visit|ingest_event/.test(u))return Promise.resolve(new Response('null'));return of(i,n)}});
 await pg.goto(`http://127.0.0.1:${port}/world`,{waitUntil:'commit'}); await pg.waitForTimeout(14000);
 console.log(n, JSON.stringify(await pg.evaluate(()=>{const r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {h:Math.round(b.height),w:Math.round(b.width),top:Math.round(b.top+scrollY)}};
  return {flight:r('[data-flight-story]')||r('.sod29-flight-story'),doc:document.documentElement.scrollHeight,arrivals:r('.sod29-source-arrivals,[class*=arrival]'),overview:r('.sod29-world-overview')}})));
 await ctx.close();}
await br.close();srv.close();
