// Public fixture replay only; no live writes or private content saved.
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serve } from '../../scripts/perf-execution-2029/serve.mjs';
const require = createRequire('/workspace/perf-execution-scratch/tools/node_modules/');
const { chromium } = require('playwright');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync('/workspace/perf-execution-scratch/mobile-image-fixtures.json.gz')));
const {srv,port} = await serve(process.argv[2]);
const origin = `http://127.0.0.1:${port}`;
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g,'TS');
const allow = new Set(['convergence_meter','fn_method_value','fn_zero_scale','gematria_api','gematria_method_trace','get_category_videos','number_neighbors','posts_by_number_strict','world_group_source_arrivals_v2']);
const browser = await chromium.launch({executablePath:'/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const original='https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/post-5116-cover-20261012/reading-v2.jpg';
const rendered=original.replace('/object/public/','/render/image/public/')+'?width=768&resize=contain&quality=90&format=origin';
const cases=[...['light','parchment','dark'].flatMap(theme=>[{theme,width:320,dpr:2},{theme,width:390,dpr:2},{theme,width:1440,dpr:1},{theme,width:1920,dpr:1}]),{theme:'dark',width:390,dpr:3},{theme:'dark',width:420,dpr:2},{theme:'dark',width:421,dpr:2},{theme:'dark',width:390,dpr:2,fail:true}];
const results=[];
try {
 for(const test of cases) {
  const context=await browser.newContext({viewport:{width:test.width,height:844},deviceScaleFactor:test.dpr,locale:'he-IL'});
  await context.addInitScript(theme=>localStorage.setItem('sod-theme',theme),test.theme);
  const page=await context.newPage(); const errors=[],misses=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(req.url().startsWith(origin)) return u.pathname.startsWith('/api/')?route.fulfill({status:200,contentType:'application/json',body:'{}'}):route.continue();
   if(req.url()===original||req.url()===rendered){requests.push(req.url());if(test.fail&&req.url()===rendered)return route.fulfill({status:503,body:'Unreachable rendition'});}
   const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
   if(/link_identity|track_visit|ingest_event|analytics|clarity|googletagmanager|facebook|doubleclick|openweb|spot\.im/.test(req.url()) || u.pathname.startsWith('/auth/') || (!['GET','HEAD'].includes(req.method())&&!allow.has(rpc))) return route.fulfill({status:204,body:''});
   let body=req.postData()||'';try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b))));}catch{}
   const key=`${req.method()} ${norm(req.url())} ${body}`,row=fixtures[key];if(!row){misses.push(key);return route.abort();}
   await route.fulfill({status:row.status,contentType:row.type||'application/json',body:Buffer.from(row.body,'base64'),headers:{'access-control-allow-origin':'*',...(row.range?{'content-range':row.range}:{})}});
  });
  await page.goto(origin+'/post/seventh-to-tenth-sefirot-2027');
  const image=page.locator('.sod29-reading-cover img.is-primary');await image.waitFor();
  await image.evaluate(img=>img.scrollIntoView({block:'center'}));
  await page.waitForFunction(()=>{const img=document.querySelector('.sod29-reading-cover img.is-primary');return img?.complete&&img.naturalWidth>0;});
  const candidate=test.width<=420&&test.dpr<=2&&!test.fail;
  const initial=await image.evaluate(img=>({src:img.src,currentSrc:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit,box:{width:img.clientWidth,height:img.clientHeight}}));
  assert.equal(initial.src,original,'canonical source changed');assert.equal(initial.currentSrc,candidate?rendered:original);assert.equal(initial.width,candidate?768:1586);assert.equal(initial.fit,'contain');
  assert.equal(requests.filter(u=>u===rendered).length,test.width<=420&&test.dpr<=2?1:0,'rendition repeated or downloaded on ineligible viewport');
  assert.equal(requests.filter(u=>u===original).length,candidate?0:1,'original and rendition both fetched before demand');
  await page.locator('.sod29-reading-cover .sod29-canonical-media-figure').click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();const full=dialog.locator('img').first();await full.waitFor();
  assert.equal(await full.getAttribute('src'),original,'Lightbox source changed');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  assert.equal(misses.length,0,'fixture miss');assert.equal(errors.length,0,'runtime error');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow');
  results.push({...test,initial,requests,passed:true});console.log('PASS',JSON.stringify(test));await context.close();
 }
} catch(error) {results.push({failed:true,error:String(error)});throw error;} finally {
 fs.writeFileSync(process.argv[3],JSON.stringify({mode:'fixture-functional',results},null,2)+'\n');
 await browser.close();srv.close();
}
