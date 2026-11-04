import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const pdfPath = process.env.SEFER_YETZIRAH_SOURCE_PDF || '/tmp/books-wide-yetzirah-source-20261028.pdf';
assert.ok(existsSync(pdfPath), 'Set SEFER_YETZIRAH_SOURCE_PDF to the original verified 220-page PDF');
const pdf = readFileSync(pdfPath);
const screenDir = process.env.YETZIRAH_SCREEN_DIR || '/tmp/yetzirah-depths-live-prototype';

async function fixture() {
  process.env.SOD_BUILD_TARGET='2029'; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true'; process.env.VITE_INTEGRATED_PREVIEW='true';
  const server = await createServer({ root, configFile:false, plugins:[react()], appType:'spa', server:{host:'127.0.0.1',port:0} });
  await server.listen();
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']});
  return {server,origin,browser};
}
async function routes(context,origin,realPdf=false) {
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin&&route.request().isNavigationRequest()&&url.pathname==='/2029/control'){const response=await context.request.get(`${origin}/2029.html`);return route.fulfill({status:response.status(),contentType:'text/html',body:await response.body()});}
    if(url.pathname.endsWith('.pdf'))return realPdf?route.fulfill({status:200,contentType:'application/pdf',body:pdf}):route.abort();
    if(url.pathname.startsWith('/functions/'))return route.abort();
    if(url.hostname==='linswmnnkjxvweumprav.supabase.co')return route.fulfill({status:200,contentType:'application/json',body:url.pathname.startsWith('/auth/')?'{}':'[]'});
    if(url.hostname.endsWith('googleapis.com')||url.hostname.endsWith('gstatic.com'))return route.abort();
    return route.continue();
  });
}
const click = async locator => { await locator.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'})); await locator.click(); };
async function sourceLoaded(page, expectedPage = 53) {
  let lastState;
  for(let attempt=0;attempt<80;attempt++){
    for(const frame of page.frames()) { try { const state=await frame.evaluate(()=>{const viewer=document.querySelector('pdf-viewer');if(!viewer)return null;const roots=[document];let currentPage;for(let i=0;i<roots.length;i++)for(const element of roots[i].querySelectorAll('*')){if(element.shadowRoot)roots.push(element.shadowRoot);if(element.id==='pageSelector')currentPage=element.value;}return {pages:viewer.documentDimensions?.pageDimensions?.length,loaded:viewer.initialLoadComplete_===true&&viewer.loadState_==='success',currentPage};});if(state)lastState=state;if(state?.pages===220&&state.loaded&&state.currentPage===String(expectedPage)){await page.waitForTimeout(600);return;} } catch { /* PDF extension frame is still loading. */ } }
    await page.waitForTimeout(200);
  }
  assert.fail(`the original 220-page PDF must load at physical page ${expectedPage} in the native viewer: ${JSON.stringify(lastState)}`);
}

test('depth workbench adapts to phones, tablets and wide desktops while selection drives source and explanation',{timeout:480000},async()=>{
  assert.equal(createHash('sha256').update(pdf).digest('hex'),'2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a');
  mkdirSync(screenDir,{recursive:true});
  const {server,origin,browser}=await fixture();
  const cases=[...[320,390,768,1024,1440,1920].map(width=>[width,'parchment']),...[320,390,1440].flatMap(width=>[[width,'light'],[width,'dark']])];
  try {for(const [width,theme] of cases.filter(([width])=>!process.env.YETZIRAH_DEPTHS_WIDTH||width===Number(process.env.YETZIRAH_DEPTHS_WIDTH))){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
    const realPdf=[320,390,1440].includes(width);
    await routes(context,origin,realPdf);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&experience=depths`,{waitUntil:'domcontentloaded'});
    const workspace=page.locator('.depths-workspace'),source=page.locator('#yetzirah29-source');
    await workspace.locator('[data-depth-id=up]').waitFor();
    assert.equal(await page.locator('.yetzirah29-hero,.yetzirah29-spatial,.yetzirah29-catalog-grid').count(),0,'one workspace rather than stacked independent stages');
    assert.equal(await workspace.locator('canvas').count(),0);
    if(width<=1000)await source.getByRole('img',{name:'צילום עמוד 53 בספר יצירה, מתוך קובץ המקור',exact:true}).waitFor();
    else assert.match(await source.locator('iframe').getAttribute('src'),/#page=53&/);
    if(width<=1000){const preview=await workspace.locator('.dw-source-column').boundingBox();assert.ok(preview.height<=250,'compact source has no empty fixed grid tracks');}
    if(width>1000){const model=await workspace.locator('.dw-explore').boundingBox(),pdfBox=await workspace.locator('.dw-source-column').boundingBox();assert.ok(model.x+model.width<=pdfBox.x+1);assert.ok(model.width>=pdfBox.width);}
    const start=workspace.getByRole('button',{name:'פתח את המרחב בתלת־ממד',exact:true});
    await click(start);await workspace.locator('canvas[data-render-state=ready]').waitFor();
    await click(workspace.locator('[data-depth-id=down]'));
    assert.equal(new URL(page.url()).searchParams.get('component'),'sy-structure:ten-depths:component:down');
    assert.match(await workspace.locator('.dw-explanation').textContent(),/תחת/);
    await click(workspace.getByRole('button',{name:'מיקוד בזוג',exact:true}));
    await page.waitForFunction(()=>JSON.parse(document.querySelector('.dw-stage canvas')?.dataset.visibleComponents||'[]').length===2);
    await click(workspace.getByRole('button',{name:'מבט התחלתי',exact:true}));
    await page.waitForFunction(()=>JSON.parse(document.querySelector('.dw-stage canvas')?.dataset.visibleComponents||'[]').length===6);
    if(theme==='parchment'&&[390,1440].includes(width)){await workspace.locator('.dw-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:`${screenDir}/${width}-${theme}-model.png`,fullPage:width<=1000});}
    await click(workspace.getByRole('button',{name:'התקרב למבנה',exact:true}));
    await page.waitForFunction(()=>document.querySelector('.dw-stage canvas')?.dataset.viewZoom==='1');
    await click(workspace.getByRole('button',{name:'התרחק מהמבנה',exact:true}));
    await page.waitForFunction(()=>document.querySelector('.dw-stage canvas')?.dataset.viewZoom==='0');
    await click(workspace.getByRole('navigation',{name:'חמשת זוגות העומקים'}).getByRole('button',{name:/ראשית ואחרית/}));
    assert.equal(await workspace.locator('.dw-stage').getAttribute('data-pair-kind'),'reading');
    assert.match(await workspace.locator('.dw-concept-pair').textContent(),/ללא ציר פיזי/);
    await click(workspace.getByRole('navigation',{name:'חמשת זוגות העומקים'}).getByRole('button',{name:/צפון ודרום/}));
    await click(workspace.locator('[data-depth-id=south]'));
    if(width<=1000){
      await click(workspace.getByRole('navigation',{name:'מצבי הלימוד'}).getByRole('button',{name:'ההסבר',exact:true}));
      assert.equal(await workspace.locator('.dw-model-area').isVisible(),false);
      assert.equal(await workspace.locator('.dw-explanation').isVisible(),true);
      assert.equal(await workspace.locator('canvas').count(),0);
    }
    await click(workspace.getByRole('button',{name:'קרא את המקור · PDF 53',exact:true}));
    const scan=source.getByRole('img',{name:'צילום מלא של עמוד המקור 53 בספר יצירה',exact:true});await scan.waitFor();await page.waitForFunction(()=>{const image=document.querySelector('#yetzirah29-source .dw-full-source-image');return image?.complete&&image.naturalWidth===637;});
    await click(source.getByRole('button',{name:'התמקד בפסקת העומקים',exact:true}));
    const crop=source.getByRole('img',{name:'פסקת עשרת העומקים · עמוד PDF 53',exact:true});await crop.waitFor();assert.equal(await crop.getAttribute('viewBox'),'610 400 555 235');
    if(theme==='parchment'&&[390,1440].includes(width))await page.screenshot({path:`${screenDir}/${width}-parchment-locus.png`,fullPage:true});
    await click(source.getByRole('button',{name:'הצג את העמוד המלא',exact:true}));
    await click(source.getByRole('button',{name:'הגדל את המקור',exact:true}));
    await page.waitForFunction(()=>document.querySelector('.dw-full-source-image')?.naturalWidth===1591);
    await click(source.getByRole('button',{name:'התאם לרוחב',exact:true}));
    if(width===390&&theme==='parchment')await page.screenshot({path:`${screenDir}/390-parchment-source.png`,fullPage:true});
    await source.getByRole('button',{name:'מסך מלא',exact:true}).click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));
    if(realPdf){await sourceLoaded(page);if(width===390)await page.screenshot({path:`${screenDir}/390-parchment-native-fullscreen.png`});}
    await source.getByRole('button',{name:'הבא',exact:true}).click();
    assert.match(await source.locator('iframe').getAttribute('src'),/#page=54&/);
    if(realPdf)await sourceLoaded(page,54);
    await source.getByRole('button',{name:'הקודם',exact:true}).click();
    if(realPdf)await sourceLoaded(page,53);
    await source.getByRole('textbox',{name:'עמוד',exact:true}).fill('52');
    await source.getByRole('button',{name:'עבור',exact:true}).click();
    assert.match(await source.locator('iframe').getAttribute('src'),/#page=52&/);
    if(realPdf)await sourceLoaded(page,52);
    await click(source.getByRole('button',{name:'חזרה למבנה הנבחר',exact:true}));
    await page.waitForFunction(()=>document.querySelector('#yetzirah29-source iframe')?.getAttribute('src')?.includes('#page=53&')||Boolean(document.querySelector('#yetzirah29-source.dw-source-preview')));
    if(width<=1000){await source.getByRole('img',{name:'צילום עמוד 53 בספר יצירה, מתוך קובץ המקור',exact:true}).waitFor();assert.equal(await source.locator('img').count(),1);}
    else assert.match(await source.locator('iframe').getAttribute('src'),/#page=53&/);
    assert.equal(await workspace.locator('[data-depth-id=south]').getAttribute('aria-pressed'),'true');
    if(realPdf){await click(workspace.getByRole('button',{name:'הרחב מקור',exact:true}));await source.getByRole('button',{name:'מסך מלא',exact:true}).click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));await source.getByRole('button',{name:'יציאה ממסך מלא',exact:true}).click();await click(source.getByRole('button',{name:'חזרה למבנה הנבחר',exact:true}));}
    await page.reload({waitUntil:'domcontentloaded'});await workspace.locator('[data-depth-id=south][aria-pressed=true]').waitFor();
    assert.equal(await workspace.locator('canvas').count(),0,'refresh does not start GPU');
    await click(workspace.getByRole('button',{name:'התחל מסלול מודרך',exact:true}));
    assert.equal(await workspace.locator('.dw-stage').getAttribute('data-pair-kind'),'reading');
    assert.equal(await workspace.locator('canvas').count(),0);
    const next=workspace.getByRole('button',{name:'לתחנה הבאה',exact:true});
    await click(next);assert.match(await workspace.locator('.dw-guide-card').textContent(),/להבחין בערך/);
    await click(next);await click(workspace.getByRole('button',{name:'פתח את המרחב בתלת־ממד',exact:true}));
    await workspace.locator('canvas[data-render-state=ready]').waitFor();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('.dw-stage canvas')?.dataset.visibleComponents||'[]').length===2);
    await click(next);await page.waitForFunction(()=>JSON.parse(document.querySelector('.dw-stage canvas')?.dataset.visibleComponents||'[]').length===4);
    await click(next);await page.waitForFunction(()=>JSON.parse(document.querySelector('.dw-stage canvas')?.dataset.visibleComponents||'[]').length===6);
    assert.equal(await next.isDisabled(),true);
    await click(workspace.getByRole('button',{name:'חקירה חופשית',exact:true}));
    await click(workspace.getByRole('button',{name:'סגור תלת־ממד',exact:true}));
    assert.equal(await workspace.locator('canvas').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${width}/${theme}`);
    assert.deepEqual(errors,[]);
    await context.close();console.log(`depth workbench ${width}/${theme} passed`);
  }}finally{await browser.close();await server.close();}
});

test('depth source and pair navigation remain usable without WebGL',{timeout:90000},async()=>{
  const {server,origin,browser}=await fixture();
  try{const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
    await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:get.call(this,kind,...args);};});await routes(context,origin);
    const page=await context.newPage();await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&experience=depths`);
    const workspace=page.locator('.depths-workspace');await click(workspace.getByRole('button',{name:'פתח את המרחב בתלת־ממד',exact:true}));
    await workspace.getByRole('status').filter({hasText:'התלת־ממד אינו זמין'}).waitFor();
    await click(workspace.locator('[data-depth-id=down]'));
    await click(workspace.getByRole('navigation',{name:'מצבי הלימוד'}).getByRole('button',{name:/המקור/}));
    assert.match(await page.locator('#yetzirah29-source iframe').getAttribute('src'),/#page=53&/);
    assert.equal(new URL(page.url()).searchParams.get('component'),'sy-structure:ten-depths:component:down');
    await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&experience=depths&component=foreign-component`);
    await workspace.getByRole('alert').filter({hasText:'העומק שבקישור אינו שייך'}).waitFor();
    assert.equal(await workspace.locator('.dw-model-area').count(),0);
    assert.equal(await page.locator('#yetzirah29-source').count(),1);
  }finally{await browser.close();await server.close();}
});

test('depth workbench observes motion changes and retains its selection after context loss',{timeout:90000},async()=>{
  const {server,origin,browser}=await fixture();
  try{const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});await routes(context,origin);
    const page=await context.newPage();await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&experience=depths`);
    const workspace=page.locator('.depths-workspace');await click(workspace.getByRole('button',{name:'פתח את המרחב בתלת־ממד',exact:true}));
    const canvas=workspace.locator('canvas[data-render-state=ready]');await canvas.waitFor();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('.sod29-root').evaluate(e=>e.setAttribute('data-frame-reduced-motion','false'));
    const rotation=workspace.getByRole('button',{name:'סיבוב עדין',exact:true});await page.waitForFunction(()=>[...document.querySelectorAll('.dw-tools button')].some(e=>e.textContent==='סיבוב עדין'&&!e.disabled));
    await click(rotation);await page.waitForFunction(()=>document.querySelector('.dw-stage canvas')?.dataset.rotation==='running');
    await click(rotation);
    await click(workspace.getByRole('navigation',{name:'חמשת זוגות העומקים'}).getByRole('button',{name:/מזרח ומערב/}));
    await page.waitForFunction(()=>document.querySelector('.dw-stage canvas')?.dataset.cameraMotion==='moving');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.dw-stage canvas')?.dataset.rotation==='off');
    await page.waitForFunction(()=>document.querySelector('.dw-stage canvas')?.dataset.cameraMotion==='settled');
    assert.equal(await rotation.isDisabled(),true);
    await click(workspace.getByRole('navigation',{name:'חמשת זוגות העומקים'}).getByRole('button',{name:/רום ותחת/}));
    await click(workspace.locator('[data-depth-id=down]'));
    await canvas.evaluate(e=>e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await workspace.getByRole('status').filter({hasText:'התלת־ממד אינו זמין'}).waitFor();
    assert.equal(await workspace.locator('[data-depth-id=down]').getAttribute('aria-pressed'),'true');
    await click(workspace.getByRole('navigation',{name:'מצבי הלימוד'}).getByRole('button',{name:/המקור/}));
    assert.match(await page.locator('#yetzirah29-source iframe').getAttribute('src'),/#page=53&/);
  }finally{await browser.close();await server.close();}
});
