import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const source=JSON.parse(readFileSync(new URL('../public/book-data/sefer-yetzirah.ten-depths-reading-depth.json',import.meta.url)));
const pdf=readFileSync(process.env.SEFER_YETZIRAH_SOURCE_PDF||'/tmp/books-wide-yetzirah-source-20261028.pdf');
const screens=process.env.YETZIRAH_SCREEN_DIR||'/tmp/yetzirah-depths-source-expansion';
async function fixture(){
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_INTEGRATED_PREVIEW='true';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']});return{server,origin,browser};
}
async function routes(context,origin){await context.route('**/*',async r=>{
 const u=new URL(r.request().url());
 if(u.origin===origin&&r.request().isNavigationRequest()&&u.pathname==='/2029/control'){const response=await context.request.get(`${origin}/2029.html`);return r.fulfill({status:200,contentType:'text/html',body:await response.body()});}
 if(u.pathname.endsWith('.pdf'))return r.fulfill({status:200,contentType:'application/pdf',body:pdf});
 if(u.pathname.startsWith('/functions/'))return r.abort();
 if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return r.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});
 if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return r.abort();
 return r.continue();
});}
async function nativeSource(page){for(let i=0;i<100;i++){for(const f of page.frames())try{const ready=await f.evaluate(()=>{const v=document.querySelector('pdf-viewer');if(!v||v.documentDimensions?.pageDimensions?.length!==220||!v.initialLoadComplete_)return false;const roots=[document];for(let j=0;j<roots.length;j++)for(const e of roots[j].querySelectorAll('*')){if(e.shadowRoot)roots.push(e.shadowRoot);if(e.id==='pageSelector'&&e.value==='53')return true;}return false;});if(ready)return;}catch{}await page.waitForTimeout(200);}assert.fail('native original PDF must load all 220 pages at physical page 53');}
const click=async target=>{await target.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await target.click();};

test('four source readings, ten explanations and two reading diagrams keep exact source/selection through refresh and native PDF',{timeout:480000},async()=>{
 assert.equal(createHash('sha256').update(pdf).digest('hex'),source.source_pdf_sha256);mkdirSync(screens,{recursive:true});
 const{server,origin,browser}=await fixture();
 try{for(const width of (process.env.YETZIRAH_READING_WIDTH?[Number(process.env.YETZIRAH_READING_WIDTH)]:[320,390,1440]))for(const theme of ['light','parchment','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await routes(context,origin);await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
  const page=await context.newPage(),errors=[],readingRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('sefer-yetzirah.ten-depths-reading-depth.json'))readingRequests.push(r.url());});
  await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&experience=depths`,{waitUntil:'domcontentloaded'});
  const workspace=page.locator('.depths-workspace'),reading=page.locator('.dw-depth-reading');await workspace.locator('[data-depth-id=up]').waitFor();
  assert.equal(readingRequests.length,0,'reading asset is not loaded before explicit reading entry');assert.equal(await workspace.locator('canvas').count(),0);
  await click(workspace.getByRole('button',{name:'פתח את המרחב בתלת־ממד',exact:true}));await workspace.locator('canvas[data-render-state=ready]').waitFor();
  await click(workspace.getByRole('button',{name:'קריאת עומק ופירושים',exact:true}));await reading.locator('.dw-reading-voices').waitFor();
  assert.ok(readingRequests.length);assert.equal(await workspace.locator('.dw-model-area').isVisible(),false);assert.equal(await workspace.locator('canvas').count(),0);
  for(const [index,r] of source.readings.entries()){
   const voice=reading.locator('.dw-reading-voices button').nth(index);if(index===1){await voice.focus();await page.keyboard.press('Enter');}else await click(voice);await page.waitForFunction(id=>document.querySelector('.dw-depth-reading')?.dataset.readingId===id,r.id);
   assert.equal(new URL(page.url()).searchParams.get('reading'),r.id);
   assert.match(await reading.locator('.dw-printed-reading').textContent(),new RegExp(r.title_he));
   assert.equal(await reading.locator('.dw-reading-crop-scroll svg').getAttribute('viewBox'),`${r.crop.x} ${r.crop.y} ${r.crop.width} ${r.crop.height}`);
   assert.equal(await reading.locator('.dw-reading-quotes q').count(),r.content.exact_short_quotes.length);
   await click(reading.getByRole('button',{name:'הגדל את צילום הקטע',exact:true}));assert.equal(await reading.locator('.dw-reading-crop-scroll svg').evaluate(e=>e.style.width),'175%');
   await click(reading.getByRole('button',{name:'התאם את הקטע לרוחב',exact:true}));
   if(theme==='parchment'&&[390,1440].includes(width)){await page.waitForTimeout(150);await page.screenshot({path:`${screens}/${width}-voice-${index}.png`,fullPage:true});await reading.locator('.dw-reading-crop-scroll').screenshot({path:`${screens}/${width}-crop-${index}.png`});}
  }
  assert.equal(await reading.locator('.dw-depth-word-grid button').count(),10);assert.equal(await reading.locator('[data-reading-diagram]').count(),2);
  await reading.locator('.dw-depth-word-grid button').nth(2).focus();await page.keyboard.press('Space');await page.waitForFunction(()=>new URL(location.href).searchParams.get('component')==='sy-structure:ten-depths:component:good');
  const selectedReading=source.readings[3].id;
  await click(reading.getByRole('button',{name:'פתח את עמוד המקור המלא · PDF 53',exact:true}));
  const panel=page.locator('#yetzirah29-source');await panel.getByRole('button',{name:'מסך מלא',exact:true}).click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));await nativeSource(page);
  await click(panel.getByRole('button',{name:'חזרה למבנה הנבחר',exact:true}));
  await page.waitForFunction(id=>document.querySelector('.dw-depth-reading')?.dataset.readingId===id,selectedReading);
  await page.waitForFunction(()=>document.querySelector('.dw-printed-reading h3')===document.activeElement);
  assert.equal(new URL(page.url()).searchParams.get('component'),'sy-structure:ten-depths:component:good');
  await page.reload({waitUntil:'domcontentloaded'});await reading.locator('.dw-reading-voices').waitFor();assert.equal(await reading.getAttribute('data-reading-id'),selectedReading);assert.equal(await workspace.locator('canvas').count(),0);
  await click(reading.locator('.dw-reading-diagrams button').nth(1));await page.waitForFunction(id=>document.querySelector('.dw-depth-reading')?.dataset.readingId===id,source.readings[1].id);
  await click(reading.getByRole('button',{name:'חזור לרכיב במבנה',exact:true}));await workspace.locator('[data-depth-id=good][aria-pressed=true]').waitFor();
  assert.equal(new URL(page.url()).searchParams.has('reading'),false);assert.equal(await workspace.locator('canvas').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
  await context.close();console.log(`depth reading ${width}/${theme}: four voices, ten words, two diagrams, real PDF and exact return passed`);
 }}finally{await browser.close();await server.close();}
});

test('invalid reading links, wrong-source content and failed transport preserve the original source',{timeout:90000},async()=>{
 const{server,origin,browser}=await fixture();
 try{const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});await routes(context,origin);const page=await context.newPage();
  await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&experience=depths&reading=foreign-reading`);await page.getByRole('alert').filter({hasText:'הקטע שבקישור אינו שייך'}).waitFor();assert.equal(await page.locator('#yetzirah29-source').count(),1);
  await page.route('**/sefer-yetzirah.ten-depths-reading-depth.json',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.reload();await page.getByRole('alert').filter({hasText:'קריאת העומק לא נטענה'}).waitFor();assert.equal(await page.locator('#yetzirah29-source').count(),1);
  await page.unroute('**/sefer-yetzirah.ten-depths-reading-depth.json');await click(page.getByRole('button',{name:'נסה שוב',exact:true}));await page.getByRole('alert').filter({hasText:'הקטע שבקישור אינו שייך'}).waitFor();
  await click(page.getByRole('button',{name:'פתח את קטע המשנה',exact:true}));await page.locator('.dw-reading-voices').waitFor();
  const bad=structuredClone(source);bad.readings[1].source.unit_id=bad.readings[2].source.unit_id;
  await page.route('**/sefer-yetzirah.ten-depths-reading-depth.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bad)}));await page.reload();await page.getByRole('alert').filter({hasText:'קריאת העומק לא נטענה'}).waitFor();assert.equal(await page.locator('.dw-reading-crop-scroll').count(),0);assert.equal(await page.locator('#yetzirah29-source').count(),1);
 }finally{await browser.close();await server.close();}
});
