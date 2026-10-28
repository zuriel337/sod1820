import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const specs=JSON.parse(readFileSync(resolve(root,'public/book-data/sefer-yetzirah.structures.json'))).structures;
const allKeys=['ten-depths','five-against-five','letter-families','five-mouth-groups','six-seals-synoptic','six-seals-gra-edition','mothers-world-year-soul','doubles-synoptic','doubles-gra-distinction','stones-houses','twelve-boundaries-gra','three-kings'];
const keys=process.env.YETZIRAH_REAL_PDF?['ten-depths']:process.env.YETZIRAH_PRODUCT_MODEL?[process.env.YETZIRAH_PRODUCT_MODEL]:allKeys;
const pdf='/workspace/scratch/sefer-yetzirah-depth/source.pdf';
test('existing book reader: 12 structures, source, return, refresh, explicit GPU and fallback across viewport presets',{timeout:900000},async()=>{
 assert.ok(existsSync(pdf));process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});mkdirSync('/workspace/scratch/yetzirah-product-screens',{recursive:true});
 try{for(const key of keys)for(const width of (process.env.YETZIRAH_REAL_PDF?[390]:[320,390,1440]))for(const theme of (process.env.YETZIRAH_REAL_PDF?['parchment']:['light','parchment','dark'])){
  const spec=specs.find(s=>s.id===`sy-structure:${key}`),c=spec.components[0];const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',hasTouch:true});
  await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);window.__gl=[];const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=get.call(this,kind,...args);if(/webgl/i.test(kind)&&result&&!window.__gl.includes(result))window.__gl.push(result);return result;};},theme);
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin===origin&&route.request().isNavigationRequest()&&url.pathname==='/2029/control'){const response=await context.request.get(`${origin}/2029.html`);return route.fulfill({status:response.status(),contentType:'text/html',body:await response.body()});}if(url.pathname.endsWith('.pdf')){if(!process.env.YETZIRAH_REAL_PDF)return route.abort();const bytes=readFileSync(pdf);assert.equal(createHash('sha256').update(bytes).digest('hex'),'2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a');return route.fulfill({status:200,contentType:'application/pdf',body:bytes});}if(url.hostname==='linswmnnkjxvweumprav.supabase.co')return route.fulfill({status:200,contentType:'application/json',body:url.pathname.startsWith('/auth/')?'{}':'[]'});if(url.hostname.endsWith('googleapis.com')||url.hostname.endsWith('gstatic.com'))return route.abort();return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));try{
   const url=`${origin}/2029/control?surface=sefer-yetzirah-world&structure=${encodeURIComponent(spec.id)}&component=${encodeURIComponent(c.stable_id)}&page=${c.source.pdf_page}`;
   await page.goto(url,{waitUntil:'domcontentloaded'});const card=page.locator(`[data-yetzirah-model="${key}"]`);await card.locator('[data-component-id]').first().waitFor({timeout:30000});assert.equal(await card.getAttribute('data-selected-id'),c.stable_id);assert.equal(await page.locator('canvas').count(),0);
   await card.locator('.ym-selection').getByRole('button',{name:`פתח את עמוד המקור ${c.source.pdf_page}`,exact:true}).click();assert.match(await page.locator('#yetzirah29-source iframe').getAttribute('src'),new RegExp(`#page=${c.source.pdf_page}&`));assert.equal(await card.getAttribute('data-selected-id'),c.stable_id);await page.getByRole('button',{name:'חזרה למבנה הנבחר'}).click();assert.equal(await page.locator('#yetzirah29-structure-learning').evaluate(e=>e===document.activeElement),true);
   await page.reload({waitUntil:'domcontentloaded'});await card.locator('[data-component-id]').first().waitFor();assert.equal(await card.getAttribute('data-selected-id'),c.stable_id);assert.match(await page.locator('#yetzirah29-source iframe').getAttribute('src'),new RegExp(`#page=${c.source.pdf_page}&`));
   const start=card.getByRole('button',{name:'פתח המחשה בתלת־ממד',exact:true});await start.click();await card.locator('canvas[data-render-state="ready"]').waitFor({timeout:30000});assert.equal(await card.getByRole('button',{name:'סיבוב עדין',exact:true}).isDisabled(),true);await card.getByRole('button',{name:'סגור את ההמחשה',exact:true}).click();assert.equal(await card.locator('canvas').count(),0);await page.waitForFunction(()=>window.__gl.length>0&&window.__gl.every(c=>c.isContextLost()));assert.equal(await start.evaluate(e=>e===document.activeElement),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
   if(width===390&&theme==='parchment')await page.screenshot({path:`/workspace/scratch/yetzirah-product-screens/${key}.png`,fullPage:true});console.log(`${key} ${width}/${theme} passed`);
  }finally{await context.close();}
 }}finally{await browser.close();await server.close();}
});
