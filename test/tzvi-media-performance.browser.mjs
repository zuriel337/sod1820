// Same-build-mode, same-source comparison; no product writes, no baseline updates.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const bases = process.env.TZVI_COMPARE_BASES?.split(',');
assert.equal(bases?.length, 2, 'TZVI_COMPARE_BASES=baseline,candidate is required');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'],
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) });
const results = [];
try {
  for (const base of bases) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', route => ['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage(); let groupReads = 0;
    page.on('request', request => { if (request.method() === 'GET' && request.url().includes('/rpc/world_group_source_arrivals_v2')) groupReads++; });
    await page.addInitScript(() => {
      window.__cls=0;window.__shifts=[];let start=0,last=0,total=0;
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){
        if(e.startTime-last>1000||e.startTime-start>5000){start=e.startTime;total=0;}
        last=e.startTime;total+=e.value;window.__cls=Math.max(window.__cls,total);
        window.__shifts.push({value:e.value,nodes:e.sources?.map(s=>({tag:s.node?.tagName,className:String(s.node?.className||'')}))});
      }}).observe({type:'layout-shift',buffered:true});
    });
    const start = Date.now();
    await page.goto(base+'/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A94cab26c-02cb-4eb3-ae32-61fee950dfea#source-occurrence-94cab26c-02cb-4eb3-ae32-61fee950dfea', {waitUntil:'domcontentloaded'});
    const selector='article[data-source-ref="channel_updates:94cab26c-02cb-4eb3-ae32-61fee950dfea"] img';
    await page.locator(selector).waitFor({timeout:55000});
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForFunction(selector=>{const img=document.querySelector(selector);return img?.complete&&img.naturalWidth>0;},selector,{timeout:20000});
    const mediaMs=Date.now()-start;
    const cls=await page.evaluate(()=>window.__cls);
    results.push({base,mediaMs,cls,groupReads,shifts:await page.evaluate(()=>window.__shifts)});await context.close();
  }
  console.log(JSON.stringify({results,comparison:'observational navigation timing; no threshold or baseline raised'}));
  for(const result of results){assert.ok(result.cls<=0.1, `${result.base} CLS exceeds fixed threshold`);assert.ok(result.groupReads<=32, 'group reader page budget exceeded');}
} finally {await browser.close();}
