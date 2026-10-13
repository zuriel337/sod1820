// Laboratory measurements only; never writes traffic/product records or changes live flags.
// Exact deployment URL and SHA are supplied by the caller. No production aliases are changed.
import fs from 'node:fs/promises';
import { performance as clock } from 'node:perf_hooks';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.STAGE0_BASE_URL;
if (!origin) throw new Error('STAGE0_BASE_URL is required');
const out = process.env.STAGE0_OUTPUT || '/tmp/stage0-navigation.json';
const state = process.env.STAGE0_STORAGE_STATE ? JSON.parse(await fs.readFile(process.env.STAGE0_STORAGE_STATE, 'utf8')) : undefined;
const repetitions = Number(process.env.STAGE0_REPETITIONS || 3);
const receipt = { sha: process.env.STAGE0_SHA, origin, at: new Date().toISOString(),
  method: 'Chromium laboratory, fresh context per repetition, same read-only RPC allowlist; telemetry/writes/realtime suppressed; 2-second observation after route presentation',
  profiles: { desktop: {width:1365,height:900,cpu:1,network:'unthrottled'}, mobile: {width:390,height:844,cpu:4,network:'latency 150ms; download 1.6Mbps; upload 750Kbps'} },
  runs: [], failures: [] };
const safeReads = new Set(['is_number_indexable','is_phrase_indexable','posts_by_number_strict','convergence_meter','gematria_method_trace','fn_method_profile','number_neighbors','community_share_count']);
const browser = await chromium.launch({headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox']});
async function persist() { await fs.writeFile(out, JSON.stringify(receipt,null,2)); }
try {
 for (const profile of ['desktop','mobile']) for (let repeat=1;repeat<=repetitions;repeat++) {
  const p=receipt.profiles[profile];
  const context=await browser.newContext({viewport:{width:p.width,height:p.height},storageState:state,serviceWorkers:'block',
    userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'});
  const requests=[],suppressed=[],errors=[];
  await context.routeWebSocket('**',r=>r.close());
  await context.route('**/*',async r=>{
    const req=r.request(),u=new URL(req.url());
    if (!['GET','HEAD','OPTIONS'].includes(req.method())) {
      const rpc=u.pathname.split('/rpc/')[1];
      if (!(u.hostname==='linswmnnkjxvweumprav.supabase.co' && rpc && safeReads.has(rpc))) {
        suppressed.push(u.pathname);return r.fulfill({status:200,contentType:'application/json',body:'[]'});
      }
    }
    if (/google-analytics|googletagmanager|clarity\.ms|facebook\.net/.test(u.hostname)) return r.abort();
    requests.push({at:clock.now(),path:u.pathname,kind:req.resourceType()});return r.continue();
  });
  await context.addInitScript(()=>{
    window.__stage0Perf={lcp:null};
    try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__stage0Perf.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true})}catch{}
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpu});
  if(profile==='mobile')await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  async function sample(kind,path,action) {
    const start=clock.now(),requestStart=requests.length;
    await action();
    await page.waitForFunction(({path,kind})=>{
      let current;try{current=decodeURIComponent(location.pathname)}catch{current=location.pathname}
      if(current!==path || document.querySelector('.mlock'))return false;
      if(path==='/number')return Boolean(document.querySelector('input[placeholder="הקלידו מספר, שם, פסוק או רמז…"]'));
      if(path.startsWith('/number/')) {
        const input=Boolean(document.querySelector('.ep-topsearch-inp'));
        const gate=kind!=='open-existing-gate'&&[...document.querySelectorAll('button')].some(b=>b.textContent.includes('גלו את כל עולמו'));
        return (input||gate)&&document.title.includes(path.slice('/number/'.length));
      }
      return document.querySelector('#root')?.innerText.trim().length>100;
    },{path,kind},{timeout:45000});
    const presentationMs=clock.now()-start;
    await page.waitForTimeout(2000);
    const measured=await page.evaluate(()=>{
      const n=performance.getEntriesByType('navigation')[0];
      return {title:document.title,robots:document.querySelector('meta[name="robots"]')?.content,
        lcpMs:window.__stage0Perf?.lcp,ttfbMs:n?n.responseStart-n.requestStart:null,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        contentLoaded:!document.querySelector('.ep-sk'),documentTimeOrigin:performance.timeOrigin};
    });
    const observed=requests.slice(requestStart);
    const row={profile,repeat,kind,path,presentationMs:Math.round(presentationMs),requestCount:observed.length,
      dataRequestCount:observed.filter(r=>r.path.includes('/rest/v1/')).length,...measured};
    // LCP and TTFB are document metrics. They are not relabeled as SPA navigation paint.
    if(kind!=='cold-entry'){row.documentLcpMs=row.lcpMs;delete row.lcpMs;delete row.ttfbMs;}
    receipt.runs.push(row);console.log(JSON.stringify({profile,repeat,kind,path,ms:row.presentationMs,requests:row.requestCount,lcp:row.lcpMs}));await persist();
  }
  try {
    await sample('cold-entry','/number/1820',()=>page.goto(origin+'/number/1820',{waitUntil:'domcontentloaded',timeout:60000}));
    await sample('open-existing-gate','/number/1820',async()=>{
      await page.getByRole('button',{name:/גלו את כל עולמו של 1820/}).click({timeout:15000});
    });
    await sample('spa-expression','/number/אמת',async()=>{await page.locator('.ep-topsearch-inp').fill('אמת');await page.locator('.ep-topsearch-inp').press('Enter')});
    await sample('back-number','/number/1820',()=>page.goBack({waitUntil:'domcontentloaded'}));
    await sample('spa-home','/',()=>page.evaluate(()=>{
      const link=document.querySelector('a[href="/"]');if(!link)throw new Error('existing Home link missing');link.click();
    }));
    await sample('spa-search-entry','/number',()=>page.evaluate(()=>{
      const link=document.querySelector('a[href="/number"]');if(!link)throw new Error('existing Number search link missing');link.click();
    }));
    await sample('spa-number','/number/1820',async()=>{
      const input=page.getByPlaceholder('הקלידו מספר, שם, פסוק או רמז…');await input.fill('1820');await input.press('Enter');
    });
    if(errors.length)throw new Error('Page errors: '+errors.join('; '));
  } catch(e) {receipt.failures.push({profile,repeat,error:e.message,pageErrors:errors,
      body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,600)});console.log('FAIL',profile,repeat,e.message.slice(0,200),JSON.stringify(errors))}
  finally {receipt.suppressed=[...new Set([...(receipt.suppressed||[]),...suppressed])];await context.close();await persist();}
 }
} finally {await browser.close();await persist();}
process.exitCode=receipt.failures.length?1:0;
