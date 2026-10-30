import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { AHAVAT_ERRATA_LINKS as notes } from '../src/data/ahavatTorahContentDepth2029.js';
import { ahavatReaderUnitHref } from '../src/data/ahavatTorahReaderUnits2029.js';
import { ahavatNativePdfPageAtStart, ahavatNativePdfFinalPageAtEnd } from './fixtures/ahavat-native-pdf-page-2029.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)), {chromium}=createRequire(import.meta.url)('playwright');
const path=process.env.AHAVAT_SOURCE_PDF||'/tmp/books-wide-ahavat-source-20261028.pdf';
const click=async target=>{await target.focus();await target.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await target.click();};
const settled=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function actualPdf(page, physical) {
  return assertAhavatSourcePage(page, physical);
}
test('nine editorial notes retain both exact sources and return in nine contexts, with actual Amor/errata PDF witnesses', {timeout:360_000},async()=>{
  assert.ok(existsSync(path),'acceptance requires the original PDF witness');
  const bytes=readFileSync(path);assert.equal(createHash('sha256').update(bytes).digest('hex'),'895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b');
  process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
  const out='/tmp/ahavat-editorial-return-20261029';mkdirSync(out,{recursive:true});
  const server=await createServer({root,configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  let transitions=0,nativeChecks=0;
  try{for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});let nativeMode=false;
    await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
    await context.route('**/*',async route=>{
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
      const u=new URL(route.request().url());
      if(u.origin===origin&&route.request().isNavigationRequest()&&u.pathname==='/2029/control'){const r=await context.request.get(`${origin}/2029.html`);return route.fulfill({status:r.status(),contentType:'text/html',body:await r.body()});}
      if(u.pathname.endsWith('Hebrewbooks_org_5635.pdf')&&nativeMode)return route.fulfill({status:200,contentType:'application/pdf',body:bytes,headers:{'content-disposition':'inline','access-control-allow-origin':'*'}});
      if(u.pathname.endsWith('.pdf')||u.pathname.startsWith('/functions/')||u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return route.abort();
      if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return route.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});
      return route.continue();
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    nativeMode=true;
    await page.goto(`${origin}${ahavatReaderUnitHref(notes[0].id)}`,{waitUntil:'domcontentloaded'});
    for(const [index,note] of notes.entries()){
      nativeMode=index===0;
      const detail=page.locator(`[data-reader-unit="${note.id}"]`),source=page.locator('#ahavat29-source');await detail.waitFor({state:'visible'});
      assert.equal(await detail.locator('..').evaluate(e=>e.open),true);
      for(const physical of [99,note.targetPdfPage]){
        await click(detail.getByRole('button',{name:physical===99?'פתחו את ההערה · PDF 99':`פתחו את הקטע · PDF ${physical}`,exact:true}));
        assert.match(await ahavatSourceHref(source),new RegExp(`#page=${physical}&view=FitH$`));
        assert.equal(new URL(page.url()).searchParams.get('readerUnit'),note.id);
        if(nativeMode){await actualPdf(page,physical);nativeChecks++;}
        if(nativeMode&&physical===14){
          assert.match(await detail.textContent(),/וט״ו/);assert.match(await detail.textContent(),/וה׳/);
          await page.reload({waitUntil:'domcontentloaded'});await detail.waitFor({state:'visible'});await actualPdf(page,14);nativeChecks++;
          await click(source.getByRole('button',{name:'מסך מלא',exact:true}));await actualPdf(page,14);nativeChecks++;
          await click(source.getByRole('button',{name:'יציאה ממסך מלא',exact:true}));await page.waitForFunction(()=>!document.fullscreenElement);await settled(page);
          await page.waitForTimeout(250);await page.screenshot({path:`${out}/amor-p14-${width}-${theme}.png`});
        }
        await detail.locator('..').evaluate(e=>{e.open=false;});
        await click(source.getByRole('link',{name:'חזור ליחידת הקריאה',exact:true}));
        await page.waitForFunction(id=>document.activeElement?.closest('[data-reader-unit]')?.dataset.readerUnit===id,note.id);await settled(page);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-reader-unit]')?.dataset.readerUnit),note.id,'return focus survives the native plugin transition');
        assert.equal(await detail.locator('..').evaluate(e=>e.open),true);
        assert.equal(new URL(page.url()).searchParams.get('page'),'99');transitions++;
      }
    }
    // Exercise every independent note deep link/refresh across the nine contexts;
    // source/target/return is still checked for all nine notes in EACH context.
    const deep=notes[[320,390,1440].indexOf(width)*3+['light','parchment','dark'].indexOf(theme)];
    await page.goto(`${origin}${ahavatReaderUnitHref(deep.id)}`,{waitUntil:'domcontentloaded'});
    await page.locator(`[data-reader-unit="${deep.id}"]`).waitFor({state:'visible'});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator(`[data-reader-unit="${deep.id}"]`).waitFor({state:'visible'});
    assert.equal(new URL(page.url()).searchParams.get('readerUnit'),deep.id);
    assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(),0);assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await context.close();console.log(JSON.stringify({width,theme,notes:9,sourceReturnTransitions:18,actualPdfPages:[99,14],fullscreenAndReload:true}));
  }assert.equal(transitions,162);assert.equal(nativeChecks,36);
  }finally{await browser.close();await server.close();}
});
