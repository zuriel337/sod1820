import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ahavatReaderUnitHref } from '../src/data/ahavatTorahReaderUnits2029.js';
import { AHAVAT_BOOK_COMPLETION_PAGES } from './fixtures/ahavat-book-completion-baseline-2029.mjs';
import { ahavatNativePdfPageAtStart } from './fixtures/ahavat-native-pdf-page-2029.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const path = process.env.AHAVAT_SOURCE_PDF || '/tmp/books-wide-ahavat-source-20261028.pdf';
const bytes = existsSync(path) ? readFileSync(path) : null;
const companion = JSON.parse(readFileSync(new URL('../public/book-data/ahavat-torah.commentary.json', import.meta.url)));
const click = async target => { await target.focus(); await target.evaluate(e => e.scrollIntoView({block:'center',behavior:'instant'})); await target.click(); };
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function native(page, physical) {
  return assertAhavatSourcePage(page, physical);
}

test('all 35 new physical pages open the actual PDF; nine contexts retain fullscreen, exact source and return', {skip:!bytes,timeout:600_000}, async () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b');
  process.env.SOD_BUILD_TARGET='2029'; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true'; process.env.VITE_INTEGRATED_PREVIEW='true';
  const out='/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-torah-book-completion-native-2029'; mkdirSync(out,{recursive:true});
  const server=await createServer({root,configFile: false, cacheDir: `/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-torah-book-completion-native-2029${process.pid}`,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});
  await server.listen(); const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const actualPages=new Set(); let visits=0;
  try {
    for (const width of [320,390,1440]) for (const theme of ['light','parchment','dark']) {
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
      await context.route('**/*',async route=>{
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
        const u=new URL(route.request().url());
        if(u.origin===origin&&route.request().isNavigationRequest()&&u.pathname==='/2029/control'){const r=await context.request.get(`${origin}/2029.html`);return route.fulfill({status:r.status(),contentType:'text/html',body:await r.body()});}
        if(u.pathname.endsWith('Hebrewbooks_org_5635.pdf'))return route.fulfill({status:200,contentType:'application/pdf',body:bytes,headers:{'content-disposition':'inline','access-control-allow-origin':'*'}});
        if(u.pathname.startsWith('/functions/')||u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return route.abort();
        if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return route.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});
        return route.continue();
      });
      const page=await context.newPage(),errors=[]; page.on('pageerror',e=>errors.push(e.message));
      const pages=width===1440&&theme==='parchment'?AHAVAT_BOOK_COMPLETION_PAGES:[1,5,6,25,42,44];
      for(const physical of pages){
        const unit=companion.pages[physical-1].companion_units.at(-1);
        await page.goto(`${origin}${ahavatReaderUnitHref(unit.id)}`,{waitUntil:'domcontentloaded'});
        const detail=page.locator(`[data-reader-unit="${unit.id}"]`),source=page.locator('#ahavat29-source'); await detail.waitFor();
        await click(detail.getByRole('button',{name:`פתח מקור היחידה · PDF ${physical}`,exact:true}));
        await native(page,physical); await settled(page);
        const sourceTop=await source.evaluate(e=>e.getBoundingClientRect().top);
        assert.ok(sourceTop>=70&&sourceTop<=110, `source heading must remain below the fixed shell at ${width}/${theme}/p${physical}: ${sourceTop}`);
        actualPages.add(physical); visits++;
        if(physical===42){
          await page.waitForTimeout(250); await page.screenshot({path:`${out}/source-p42-${width}-${theme}.png`});
          await click(source.getByRole('button',{name:'מסך מלא',exact:true})); await native(page,physical);
          assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
          await click(source.getByRole('button',{name:'יציאה ממסך מלא',exact:true}));
          await page.waitForFunction(()=>!document.fullscreenElement); await settled(page);
        }
        await click(source.getByRole('link',{name:'חזור ליחידת הקריאה',exact:true}));
        await page.waitForFunction(id=>document.activeElement?.closest('[data-reader-unit]')?.dataset.readerUnit===id,unit.id);
        await settled(page); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-reader-unit]')?.dataset.readerUnit),unit.id);
        assert.equal(await detail.evaluate(e=>e.open),true);
        assert.equal(new URL(page.url()).searchParams.get('readerUnit'),unit.id);
        assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(),0);
      }
      assert.deepEqual(errors,[]); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await context.close(); console.log(JSON.stringify({width,theme,nativePhysicalPages:pages,actualPdf:true,fullscreenPage:42,stableReturn:true}));
    }
    assert.equal(actualPages.size,35); assert.equal(visits,83);
  } finally {await browser.close();await server.close();}
});
