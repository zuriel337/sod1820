// Built public artifact + its real worker. All hosts resolve to a local fixture;
// Google is stubbed, so this proves outgoing gtag arguments, not GA ingestion.
// VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs
// CHROMIUM_PATH=/usr/bin/chromium node --test test/post-speed-page-analytics.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';
import { POST_BACKGROUND_ASSETS_2029 } from '../src/lib/research/postBackground2029.js';

const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the pinned browser tooling; this acceptance test must not skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const rows = [
  { id:90001, slug:'remzei-geula-ai-sod-hashir', title:'מאמר בדיקה ראשון', content:'<p>תוכן ציבורי מקורי.</p>', source:'sod1820', categories:['סוד החשמל'], tags:[] },
  { id:90002, slug:'measurement-second-post', title:'מאמר בדיקה שני', content:'<p>תוכן ציבורי אחר.</p>', source:'sod1820', categories:[], tags:[] },
];
const views = page => page.evaluate(() => (window.dataLayer || []).map(x=>Array.from(x))
  .filter(x=>x[0]==='event' && x[1]==='page_view').map(x=>x[2]));

for (const width of [390,1280]) test(`[${width}px] public backdrop overlaps calculation; GA identifies both posts once`, {timeout:60000}, async t => {
  let releaseCalculation, calculationStarted = false, calculationFinished = false;
  const calculation = new Promise(resolve => { releaseCalculation = resolve; });
  const fixture = await startFixture({supabase:async ({url})=>{
    if(url.pathname==='/rest/v1/posts') {
      const slug=url.searchParams.get('slug') || '';
      const selected=rows.filter(row=>slug.includes(row.slug));
      if(selected.some(row=>row.id===90002)) await delay(350);
      return {body:selected};
    }
    if(url.pathname==='/rest/v1/rpc/fn_method_value') {
      calculationStarted=true; await calculation; calculationFinished=true; return {body:787};
    }
    return null;
  }});
  const browser=await pw.chromium.launch({executablePath,headless:true,args:fixture.chromiumArgs,env:fixture.browserEnv});
  try {
    const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:900},locale:'he-IL',serviceWorkers:'allow'});
    // These exact existing assets are root files; the shared auth fixture only
    // serves assets/ statics. Answer the actual image locally, once per request.
    const images=[];
    const assets=new Set(Object.values(POST_BACKGROUND_ASSETS_2029).flatMap(x=>[x.mobile,x.desktop]));
    await context.route('https://sod1820.co.il/*.webp',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(!assets.has(path)) return route.continue();
      images.push({path,calculationStarted,calculationFinished});
      await route.fulfill({status:200,contentType:'image/webp',body:readFileSync(join(dist,path))});
    });
    await context.route('https://www.googletagmanager.com/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
    const page=await context.newPage();
    await page.goto(fixture.origin+'/post/'+rows[0].slug+'?utm_source=fixture&utm_medium=email&utm_campaign=acceptance', {waitUntil:'domcontentloaded'});
    // Wait for both independent operations without releasing the calculation.
    // This fails on main, where the image is discovered only after it finishes.
    const deadline=Date.now()+15000;
    while((!calculationStarted || !images.length) && Date.now()<deadline) await delay(25);
    const expected=POST_BACKGROUND_ASSETS_2029['sod-hashmal'][width<=760?'mobile':'desktop'];
    assert.equal(images[0]?.path,expected,'the source-admitted CSS backdrop starts while the RPC is pending');
    assert.equal(images[0].calculationFinished,false);
    releaseCalculation();
    await page.locator('article').waitFor({timeout:15000});
    await page.waitForFunction(()=>window.dataLayer?.some(x=>x[0]==='event'&&x[1]==='page_view'),null,{timeout:10000});
    let sent=await views(page);
    assert.equal(sent.length,1);
    assert.equal(sent[0].page_title,await page.title());
    assert.ok(sent[0].page_title.includes(rows[0].title));
    const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
    assert.equal(sent[0].page_location,canonical);
    assert.equal(sent[0].campaign_source,'fixture');
    assert.equal(sent[0].campaign_medium,'email');
    assert.equal(sent[0].campaign_name,'acceptance');
    assert.equal(images.filter(x=>x.path===expected).length,1,'CSS reuses its preload');
    await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate',{state:{}}));},'/post/'+rows[1].slug);
    await page.waitForFunction(()=>window.dataLayer?.filter(x=>x[0]==='event'&&x[1]==='page_view').length===2,null,{timeout:10000});
    sent=await views(page);
    assert.equal(sent[1].page_title,await page.title());
    assert.ok(sent[1].page_title.includes(rows[1].title),'the next page never inherits the previous title');
    assert.notEqual(sent[0].page_path,sent[1].page_path);
    assert.equal(sent[1].campaign_source,undefined,'the next route does not invent a campaign');
    await delay(600);
    assert.equal((await views(page)).length,2);
    t.diagnostic(JSON.stringify({width,images,pageviews:sent}));
  } finally {releaseCalculation();await browser.close();await fixture.close();}
});
