// Public fixture replay only; no live writes or private content saved.
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serve } from '../../scripts/perf-execution-2029/serve.mjs';
const require = createRequire('/workspace/perf-execution-scratch/tools/node_modules/');
const { chromium } = require('playwright');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync('/workspace/perf-execution-scratch/causal-fixtures.json.gz')));
const {srv,port} = await serve(process.argv[2]);
const origin = `http://127.0.0.1:${port}`;
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g,'TS');
const allow = new Set(['convergence_meter','fn_method_value','fn_zero_scale','gematria_api','gematria_method_trace','get_category_videos','number_neighbors','posts_by_number_strict','world_group_source_arrivals_v2']);
const browser = await chromium.launch({executablePath:'/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const results=[];
try {
 for(const test of [...['light','parchment','dark'].flatMap(theme=>[390,1440].map(width=>({theme,width}))),{theme:'dark',width:390,fail:true}]) {
  const context=await browser.newContext({viewport:{width:test.width,height:844},locale:'he-IL'});
  await context.addInitScript(theme=>localStorage.setItem('sod-theme',theme),test.theme);
  const page=await context.newPage(); const errors=[],misses=[]; let lightboxRequests=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(req.url().startsWith(origin)) {
    if(/\/Lightbox-[^/]+\.js$/.test(u.pathname)) {lightboxRequests++; if(test.fail) return route.abort(); await new Promise(r=>setTimeout(r,700));}
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
    return route.continue();
   }
   const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
   if(/link_identity|track_visit|ingest_event|analytics|clarity|googletagmanager|facebook|doubleclick|openweb|spot\.im/.test(req.url()) || u.pathname.startsWith('/auth/') || (!['GET','HEAD'].includes(req.method())&&!allow.has(rpc))) return route.fulfill({status:204,body:''});
   let body=req.postData()||''; try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b))));}catch{}
   const key=`${req.method()} ${norm(req.url())} ${body}`, row=fixtures[key];
   if(!row){misses.push(key);return route.abort();}
   await route.fulfill({status:row.status,contentType:row.type||'application/json',body:Buffer.from(row.body,'base64'),headers:{'access-control-allow-origin':'*',...(row.range?{'content-range':row.range}:{})}});
  });
  await page.goto(origin+'/post/seventh-to-tenth-sefirot-2027');
  const cover=page.locator('.sod29-canonical-media-figure').first(); await cover.waitFor();
  assert.equal(lightboxRequests,0,'lightbox fetched before demand');
  const source=await cover.locator('img').getAttribute('src');
  await cover.click();
  await page.getByText(test.fail?'לא ניתן לפתוח את התמונה כרגע':'פותחים את התמונה',{exact:true}).waitFor();
  if(test.fail) {
   await page.getByRole('button',{name:'בטל פעולה'}).click();
   assert.equal(await page.getByRole('dialog').count(),0);
   assert.equal(await cover.locator('img').getAttribute('src'),source);
  } else {
   const dialog=page.getByRole('dialog');await dialog.waitFor();
   assert.equal(await dialog.locator('img').first().getAttribute('src'),source);
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
   await cover.click();await dialog.waitFor();
   assert.equal(lightboxRequests,1,'reopen fetched another module');
   await dialog.getByRole('button',{name:'סגור',exact:true}).click();await dialog.waitFor({state:'detached'});
  }
  assert.equal(misses.length,0,'fixture miss');assert.equal(errors.length,0,'uncaught runtime error');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  results.push({...test,passed:true,lightboxRequests,errors,misses});await context.close();
 }
} finally {await browser.close();srv.close();}
fs.writeFileSync(process.argv[3],JSON.stringify({mode:'fixture-functional',results},null,2)+'\n');
console.log(JSON.stringify(results));
