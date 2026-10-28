import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url));
const pdf=readFileSync(process.env.SEFER_YETZIRAH_SOURCE_PDF||'/tmp/books-wide-yetzirah-source-20261028.pdf');
const screens=process.env.YETZIRAH_SCREEN_DIR||'/tmp/yetzirah-unified-screens';
const widths=process.env.YETZIRAH_UNIFIED_WIDTH?[Number(process.env.YETZIRAH_UNIFIED_WIDTH)]:[320,390,1440];
async function fixture(){
 assert.equal(createHash('sha256').update(pdf).digest('hex'),'2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a');
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']});
 return {server,origin,browser};
}
async function contextFor(browser,origin,width,theme){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
 await context.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.origin===origin&&r.request().isNavigationRequest()&&u.pathname==='/2029/control'){const response=await context.request.get(`${origin}/2029.html`);return r.fulfill({status:200,contentType:'text/html',body:await response.body()});}
  if(u.pathname.endsWith('.pdf'))return r.fulfill({status:200,contentType:'application/pdf',body:pdf});
  if(u.pathname.startsWith('/functions/'))return r.abort();
  if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return r.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});
  if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return r.abort();return r.continue();
 });return context;
}
async function nativeSource(page,physical){
 for(let i=0;i<100;i++){for(const frame of page.frames())try{const ready=await frame.evaluate(p=>{const v=document.querySelector('pdf-viewer');if(!v||v.documentDimensions?.pageDimensions?.length!==220||!v.initialLoadComplete_||v.loadState_!=='success')return false;const roots=[document];for(let j=0;j<roots.length;j++)for(const e of roots[j].querySelectorAll('*')){if(e.shadowRoot)roots.push(e.shadowRoot);if(e.id==='pageSelector'&&e.value===String(p))return true;}return false;},physical);if(ready)return;}catch{}await page.waitForTimeout(200);}assert.fail(`actual 220-page PDF must load at ${physical}`);
}
const click=async button=>{await button.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await button.click();};
async function returnTo(page,target){await click(page.getByRole('button',{name:'חזרה למבנה הנבחר',exact:true}));await page.waitForFunction(id=>document.getElementById(id)===document.activeElement,target);}
async function accessibility(page,scope){
 const measures=await scope.locator('button').evaluateAll(elements=>elements.filter(e=>e.getClientRects().length).map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,size:parseFloat(getComputedStyle(e).fontSize)})));
 assert.ok(measures.every(m=>m.w>=44&&m.h>=44&&m.size>=16),JSON.stringify(measures));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.equal(await page.locator('canvas').count(),0);
}
for(const testWidth of widths){
test(`family source fields, printed correction and shared depth entry work with actual PDF (${testWidth}px)`,{timeout:480000},async()=>{
 const {server,origin,browser}=await fixture();mkdirSync(screens,{recursive:true});
 try{for(const width of [testWidth])for(const theme of ['light','parchment','dark']){
  const context=await contextFor(browser,origin,width,theme),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&structure=sy-structure:letter-families&component=sy-structure:letter-families:component:mothers&page=65`,{waitUntil:'domcontentloaded'});
  const guide=page.locator('.ssl-guide'),card=page.locator('[data-yetzirah-model="letter-families"]');await guide.waitFor();
  assert.equal(await guide.locator('nav button').count(),3);await accessibility(page,guide);
  if(width===390&&theme==='parchment'){await click(card.locator('[data-catalog-row$=":doubles"] td[data-label="אותיות המשפחה"] button'));await nativeSource(page,100);await returnTo(page,'yetzirah29-structure-learning');assert.equal(new URL(page.url()).searchParams.get('component'),'sy-structure:letter-families:component:doubles','an inactive row field selects that row before opening its source');}
  for(const [i,id] of ['mothers','doubles','simples'].entries()){
   await guide.locator('nav button').nth(i).focus();await page.keyboard.press('Enter');await page.waitForFunction(id=>document.querySelector('[data-yetzirah-model="letter-families"]')?.dataset.selectedId.endsWith(`:${id}`),id);
   const physical=[91,100,113][i];
   await click(card.locator(`[data-source-field$=":field:letters"]`).getByRole('button'));
   await nativeSource(page,physical);await returnTo(page,'yetzirah29-structure-learning');
   assert.equal(new URL(page.url()).searchParams.get('component'),`sy-structure:letter-families:component:${id}`);
   await click(card.locator(`[data-source-field$=":field:source_count"]`).getByRole('button'));await nativeSource(page,65);await returnTo(page,'yetzirah29-structure-learning');
  }
  await page.reload({waitUntil:'domcontentloaded'});await guide.waitFor();assert.equal(await guide.locator('nav button').nth(2).getAttribute('aria-pressed'),'true');
  await guide.locator('nav button').nth(2).focus();await accessibility(page,guide);if(theme==='parchment'){for(let i=0;i<8;i++){await guide.locator('h2').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(100);}await page.waitForFunction(()=>{const r=document.querySelector('.ssl-guide h2').getBoundingClientRect();return r.top>70&&r.top<innerHeight-100;});await page.screenshot({path:`${screens}/families-${width}.png`});}
  await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&structure=sy-structure:six-seals-gra-edition&page=175`,{waitUntil:'domcontentloaded'});
  const corrected=page.locator('[data-source-correction="gra-seals-175"]');await corrected.waitFor();assert.equal(await corrected.locator('q').textContent(),'בירר שלש אותיות מן הפשוטות');await click(corrected.getByRole('button'));await nativeSource(page,175);if(width===390&&theme==='parchment'){await page.locator('#yetzirah29-source iframe').scrollIntoViewIfNeeded();await page.screenshot({path:`${screens}/native-pdf-175.png`});}await returnTo(page,'yetzirah29-structure-learning');
  assert.deepEqual(errors,[]);console.log(`family field locators / Gra correction ${width}/${theme}: original PDF65,91,100,113,175 passed`);await context.close();
 }}finally{await browser.close();await server.close();}
});
test(`the integrated catalog reaches the rich Ten Depths reading and returns to the same unified book (${testWidth}px)`,{timeout:120000},async()=>{
 const {server,origin,browser}=await fixture();try{const context=await contextFor(browser,origin,testWidth,'parchment'),page=await context.newPage();
 await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&structure=sy-structure:ten-depths&page=53`,{waitUntil:'domcontentloaded'});
 await page.getByRole('link',{name:'פתחו את מסלול עשרת העומקים וקריאת הפירושים'}).click();await page.locator('.depths-workspace').waitFor();await page.getByRole('button',{name:'קריאת עומק ופירושים',exact:true}).click();await page.locator('.dw-reading-voices').waitFor();assert.equal(await page.locator('.dw-reading-voices button').count(),4);
 await page.getByRole('link',{name:'לכל מבני הספר',exact:true}).click();await page.locator('[data-yetzirah-model="ten-depths"]').waitFor();assert.equal(await page.locator('canvas').count(),0);await context.close();
 }finally{await browser.close();await server.close();}
});
test(`pair exploration is lazy, keyboard-readable, complete, refreshable and returns from both actual source witnesses (${testWidth}px)`,{timeout:480000},async()=>{
 const {server,origin,browser}=await fixture();mkdirSync(screens,{recursive:true});
 try{for(const width of [testWidth])for(const theme of ['light','parchment','dark']){
  const context=await contextFor(browser,origin,width,theme),page=await context.newPage(),errors=[],modules=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('LetterGateExploration2029.jsx'))modules.push(r.url());});
  await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&page=203`,{waitUntil:'domcontentloaded'});
  const lab=page.locator('#yetzirah29-letter-lab');await lab.waitFor();assert.equal(modules.length,0);
  await click(lab.getByRole('button',{name:'פתח את חקירת רל״א השערים',exact:true}));const explorer=lab.locator('[data-gate-explorer]');await explorer.waitFor();assert.ok(modules.length);assert.equal(await explorer.locator('tbody tr').count(),21);
  await explorer.getByRole('button',{name:'בחרו את הזוג אק',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>new URL(location.href).searchParams.get('partner')==='ק');
  assert.match(await lab.locator('.yetzirah29-letter-result').textContent(),/אק/);assert.equal(await explorer.locator('tr[data-selected=true]').count(),1);
  for(const physical of [83,203]){await click(explorer.getByRole('button',{name:physical===83?'קראו את פסקת הגלגל · PDF 83':'פתחו את לוח הגר״א · PDF 203',exact:true}));await nativeSource(page,physical);await returnTo(page,'yetzirah29-letter-lab');assert.equal(new URL(page.url()).searchParams.get('partner'),'ק');}
  const previousFrame=await page.locator('#yetzirah29-source iframe').elementHandle();await click(explorer.getByRole('button',{name:'פתחו את לוח הגר״א · PDF 203',exact:true}));assert.equal(await previousFrame.evaluate(e=>e.isConnected),false,'same-page source action reanchors the native viewer');await click(page.locator('#yetzirah29-source').getByRole('button',{name:'מסך מלא',exact:true}));await page.waitForFunction(()=>Boolean(document.fullscreenElement));await nativeSource(page,203);await returnTo(page,'yetzirah29-letter-lab');await page.waitForFunction(()=>!document.fullscreenElement);
  await page.reload({waitUntil:'domcontentloaded'});await explorer.waitFor();assert.equal(await explorer.locator('tr[data-selected=true]').count(),1);await click(page.getByRole('button',{name:'חזרה למבנה הנבחר',exact:true}));await page.waitForFunction(()=>document.getElementById('yetzirah29-letter-lab')===document.activeElement);
  await click(explorer.getByRole('button',{name:'הצג את כל 231 הזוגות',exact:true}));assert.equal(await explorer.locator('tbody tr').count(),231);await click(explorer.getByRole('button',{name:'בחרו את הזוג שת',exact:true}));assert.equal(new URL(page.url()).searchParams.get('letter'),'ש');assert.equal(new URL(page.url()).searchParams.get('partner'),'ת');
  await click(explorer.getByRole('button',{name:'הצג את זוגות האות הנבחרת',exact:true}));assert.equal(await explorer.locator('tbody tr').count(),21);assert.equal(await explorer.locator('tr[data-selected=true]').count(),1);
  await accessibility(page,explorer);await explorer.locator('h3').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));if(theme==='parchment'){await page.waitForFunction(()=>{const r=document.getElementById('letter-gate-exploration-title').getBoundingClientRect();return r.top>70&&r.top<innerHeight-100;});await page.screenshot({path:`${screens}/pairs-${width}.png`});}
  await click(page.getByRole('button',{name:'פתח את המבנה התלת־ממדי',exact:true}));const scene=page.locator('.yetzirah29-canvas');await scene.locator('canvas').waitFor();assert.equal(await scene.getAttribute('data-active-pair'),'שת');await page.waitForFunction(()=>{const c=document.querySelector('.yetzirah29-canvas canvas'),gl=c?.getContext('webgl2');return gl&&!gl.isContextLost()&&c.width>0;});
  await page.locator('.yetzirah29-spatial .yetzirah29-letter-picker').getByRole('button',{name:'מ',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>new URL(location.href).searchParams.get('letter')==='מ');assert.equal(new URL(page.url()).searchParams.has('partner'),false);assert.equal(await scene.getAttribute('data-active-pair'),'מ');assert.equal(await explorer.locator('caption').textContent(),'זוגות האות מ · הסבר נלווה');assert.equal(new URL(page.url()).searchParams.get('sourceReturn'),'letters');await nativeSource(page,203);await returnTo(page,'yetzirah29-letter-lab');
  await page.reload({waitUntil:'domcontentloaded'});await explorer.waitFor();assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.yetzirah29-spatial .yetzirah29-letter-picker').getByRole('button',{name:'מ',exact:true}).getAttribute('aria-pressed'),'true');await click(page.getByRole('button',{name:'פתח את המבנה התלת־ממדי',exact:true}));await scene.locator('canvas').waitFor();assert.equal(await scene.getAttribute('data-active-pair'),'מ');
  await click(explorer.getByRole('button',{name:'בחרו את הזוג מת',exact:true}));assert.equal(await scene.getAttribute('data-active-pair'),'מת');if(width===1440&&theme==='parchment'){await page.locator('.yetzirah29-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(200);await page.screenshot({path:`${screens}/pairs-spatial-1440.png`});}
  await click(page.getByRole('button',{name:'סגור את המבנה התלת־ממדי',exact:true}));assert.equal(await page.locator('canvas').count(),0);
  const openCatalog=page.getByRole('button',{name:'פתח את קטלוג המבנים',exact:true});if(await openCatalog.count())await click(openCatalog);
  await click(page.getByRole('button',{name:/למדו את המבנה.*משפחות/}));await page.locator('[data-yetzirah-model="letter-families"]').waitFor();assert.equal(new URL(page.url()).searchParams.has('sourceReturn'),false);assert.equal(new URL(page.url()).searchParams.get('structure'),'sy-structure:letter-families');await returnTo(page,'yetzirah29-structure-learning');
  assert.deepEqual(errors,[]);console.log(`pair exploration ${width}/${theme}: 21/231, selected 3D endpoints/edge, keyboard, original PDF83/203, refresh and focused return passed`);await context.close();
 }}finally{await browser.close();await server.close();}
});
}
