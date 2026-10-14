import { createRequire } from 'node:module'; import zlib from 'node:zlib'; import fs from 'node:fs';
import { serve } from '/home/user/sod1820/scripts/perf-execution-2029/serve.mjs';
const require = createRequire('/opt/node22/node-tools/node_modules/'); const { chromium } = require('playwright');
const S=process.argv[2], dist=process.argv[3];
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(S+'/fix.json.gz')));
const normalize = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g, 'TS');
const { srv, port } = await serve(dist); const origin = `http://127.0.0.1:${port}`;
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:390,height:844} }); const page = await ctx.newPage(); const seen=[];
await page.route('**/*', async route => { const req=route.request(), url=req.url();
  if (url.startsWith(origin)) return new URL(url).pathname.startsWith('/api/')?route.fulfill({status:200,body:'{}',contentType:'application/json'}):route.continue();
  if (!url.includes('supabase.co')) return route.abort();
  let body=req.postData()||''; try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[c])=>a.localeCompare(c))))}catch{}
  const row=fixtures[`${req.method()} ${normalize(url)} ${body}`];
  const h=req.headers(); seen.push({b:(req.postData()||'').slice(0,160),m:req.method(),u:decodeURIComponent(url).replace(/.*rest\/v1\//,'').slice(0,600),h:JSON.stringify(Object.fromEntries(Object.entries(h).filter(([k])=>!['user-agent','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','referer','origin','accept-language','accept-encoding'].includes(k))))});
  if(!row) return route.fulfill({status:204,body:'',headers:{'access-control-allow-origin':'*'}});
  await new Promise(r=>setTimeout(r,150));
  return route.fulfill({status:row.status, body:Buffer.from(row.body,'base64'), headers:{'content-type':row.type||'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range',...(row.range?{'content-range':row.range}:{})}});
});
await page.goto(origin+(process.argv[4]||'/'),{waitUntil:'load'}); await page.waitForTimeout(4000);
const m=new Map(); for(const s of seen){const k=s.m+' '+s.u+(s.m==='POST'?' '+s.b:''); m.set(k,(m.get(k)||[]).concat(s.h))}
for(const [k,v] of m) if(v.length>1){console.log('DUP x'+v.length,k); const uniq=new Set(v); console.log('  distinct header sets:',uniq.size); if(uniq.size>1)[...uniq].forEach(x=>console.log('   ',x))}
console.log('total',seen.length); await b.close(); srv.close();
