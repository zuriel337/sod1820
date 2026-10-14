import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const dir = process.argv[2]||'var-base';
const srv = http.createServer((q,rs)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dir,'2029.html');rs.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rs)}).listen(4991);
const br = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg = await br.newPage({viewport:{width:390,height:844}});
const t0=Date.now(); const out=[];
await pg.route('**/*supabase.co/**', async r=>{const q=r.request();const u=q.url();const m=q.method();
  if(m==='OPTIONS')return r.continue();
  if(m!=='GET'&&/link_identity|track_visit|ingest_event/.test(u)){out.push({t:Date.now()-t0,m,u,kb:0,tele:true});return r.fulfill({status:204,body:'',headers:{'access-control-allow-origin':'*'}})}
  const resp=await r.fetch(); const b=await resp.body(); out.push({t:Date.now()-t0,m,u:decodeURIComponent(u),kb:+(b.length/1024).toFixed(1),status:resp.status()}); await r.fulfill({response:resp,body:b})});
await pg.goto('http://127.0.0.1:4991/world',{waitUntil:'commit'}); await pg.waitForTimeout(14000);
fs.writeFileSync('inventory-'+(process.argv[2]||'base')+'.json',JSON.stringify(out,null,1)); console.log(out.length); await br.close(); srv.close();
