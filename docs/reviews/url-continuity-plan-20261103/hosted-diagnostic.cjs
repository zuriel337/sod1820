// Additional service-boundary acceptance only; no performance cohort or live writes.
// Run with a private 0600 access config, never commit that config or browser state.
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 30000 });
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const [configPath, output] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath));
assert.match(config.origin, /^https:\/\/sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.match(config.sha, /^[0-9a-f]{40}$/);
const db = 'https://linswmnnkjxvweumprav.supabase.co';
const reads = require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x => x.proname).filter(x => x !== 'lang_links_list');
reads.push('convergence_meter', 'is_number_indexable', 'is_phrase_indexable', 'writer_public_contributions_page_v1');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const report = { kind: 'url-plan-existing-candidate-diagnostic', acceptance: false, productSha: config.sha,
  origin: config.origin, actualSW: true, performanceComparison: false,
  liveLogin: false, liveSignup: false, liveUnsubscribe: false, mailSent: false,
  sameIndependentRPCReadInventory: true, cases: [] };
const flush = () => fs.writeFileSync(output + '/receipt.json', JSON.stringify(report, null, 2) + '\n');
const safeError = error => ({ name: error.name, message: String(error.message).replace(/_vercel_share=[^\s"')&]+/g, '_vercel_share=[REDACTED]').slice(0, 1600) });

async function installGuard(context) {
  // This task's independent guard retains the prior RPC inventory. Its only
  // additional service request is exact OPTIONS /newsletter-signup, with no
  // query/body; all signup/login/unsubscribe and other mutations stay denied.
  await context.addInitScript(({ db, origin, reads }) => {
    const fetchOriginal = window.fetch.bind(window), permitted = new Set(reads);
    window.__serviceReads = []; window.__serviceDenied = [];
    function admission(req) {
      const u = new URL(req.url), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
      const read = u.origin === db && (
        u.pathname.startsWith('/rest/v1/') && (!rpc || permitted.has(rpc)) &&
          (['GET', 'HEAD'].includes(req.method) || rpc && req.method === 'POST') ||
        req.method === 'GET' && ['/auth/v1/settings', '/auth/v1/user'].includes(u.pathname) ||
        req.method === 'GET' && u.pathname.startsWith('/storage/v1/object/public/'));
      const probe = u.origin === db && u.pathname === '/functions/v1/newsletter-signup' &&
        !u.search && req.method === 'OPTIONS' && req.body === null;
      const local = req.method === 'GET' && u.origin === origin &&
        (!u.pathname.startsWith('/api/') || /^\/api\/(?:public-document|public-sitemap|public-robots)$/.test(u.pathname));
      return { allowed: read || probe || local, u, probe };
    }
    window.fetch = (input, init) => {
      const req = new Request(input instanceof Request ? input : new URL(input, location.href), init);
      const { allowed, u, probe } = admission(req);
      const row = { origin: u.origin, path: u.pathname, method: req.method, suggestionFilter: u.searchParams.get('title') || u.searchParams.get('display_name') || null };
      if (!allowed) { window.__serviceDenied.push(row); return Promise.reject(Error('independent_service_guard')); }
      window.__serviceReads.push(row);
      return fetchOriginal(req).then(response => {
        row.status = response.status;
        if (probe) row.contract = response.headers.get('x-newsletter-purpose-contract');
        return response;
      });
    };
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const req = new Request(new URL(url, location.href), { method });
      if (!['GET', 'HEAD'].includes(req.method) || !admission(req).allowed) throw Error('independent_service_guard');
      return open.call(this, method, url, ...rest);
    };
    navigator.sendBeacon = () => false;
    window.WebSocket = class { constructor() { throw Error('independent_service_guard'); } };
  }, { db, origin: config.origin, reads });
}


(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const paths=['/community/chat','/chat','/community','/tag/צאט','/category/וידאו','/community/calculator','/codes','/name','/or-geula','/contact','/updates','/unsubscribe','/privacy#data-deletion','/login?returnTo=%2Fcommunity%2Fchat','/2029?preview=community&data=live&thread=00000000-0000-4000-8000-000000000000&reply=00000000-0000-4000-8000-000000000001','/tiktok/melech','/whatsapp/kod-hametsiut','/real-url-audit-nonexistent-20261103'];
 try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
  if(config.accessUrl)await context.request.get(config.accessUrl);
  const meta=await context.request.get(config.origin+'/public-reading-artifact.json');assert.equal(meta.status(),200);assert.equal((await meta.json()).sourceSha,config.sha);
  await installGuard(context);
  const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://vercel.live/_next-live/feedback/feedback.js','*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://www.facebook.com/tr*','*://connect.facebook.net/*','*://*.clarity.ms/*']});
  for(const path of paths){
   const row={width,input:path,syntheticThreadQuery:path.includes('00000000'),errors:[]};report.cases.push(row);
   const error=e=>row.errors.push(safeError(e));page.on('pageerror',error);
   try{
    const response=await page.goto(config.origin+path,{waitUntil:'domcontentloaded',timeout:30000});row.http=response.status();row.robots=response.headers()['x-robots-tag'];
    await page.waitForFunction(()=>document.querySelector('h1,main h2,[data-home-top-updates]')!==null,{timeout:15000}).catch(()=>row.contentWaitExpired=true);
    await page.waitForTimeout(700);
    Object.assign(row,await page.evaluate(()=>({finalPath:location.pathname+location.search+location.hash,title:document.title,canonical:document.querySelector('link[rel=canonical]')?.href,headings:[...document.querySelectorAll('h1,main h2')].map(x=>x.textContent.trim()).slice(0,7),closedCopy:document.body.innerText.match(/[^\n]*(?:לא נמצא|תיפתח בהמשך|אינן פעילות|בבנייה)[^\n]*/g)?.slice(0,6)||[],sw:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__serviceDenied||[],documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})));
    if(['/community/chat','/category/וידאו','/privacy#data-deletion'].includes(path))await page.screenshot({path:output+'/diagnostic-'+width+'-'+paths.indexOf(path)+'.png'});
   }catch(e){row.failure=safeError(e);}
   finally{page.off('pageerror',error);flush();console.log(JSON.stringify({width,path,http:row.http,headings:row.headings,failure:row.failure?.name}));}
  }await context.close();
 }
 }finally{await browser.close();report.completed=true;report.notFullTransitionAcceptance=true;flush();}
})().catch(e=>{report.fatal=safeError(e);flush();process.exitCode=1;});
