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
reads.push('convergence_meter', 'is_number_indexable', 'is_phrase_indexable', 'writer_public_contributions_page_v1', 'community_feed_page', 'community_message_context', 'community_replies_page', 'community_reply_counts');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const report = { kind: 'public-url-priority1-hosted-acceptance', acceptance: true, productSha: config.sha,
  origin: config.origin, actualSW: true, performanceComparison: false,
  liveLogin: false, liveSignup: false, liveUnsubscribe: false, mailSent: false,
  sameIndependentRPCReadInventory: 'plus existing stable read-only community RPCs; no writes', syntheticData: false, cases: [] };
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
        ['GET','HEAD'].includes(req.method) && u.pathname.startsWith('/storage/v1/object/public/'));
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

const NOTICE = 'האתר מתחדש ונבנה בהדרגה. נתקלתם בתקלה או שיש לכם רעיון לשיפור? עזרו לנו לבנות אותו יחד.';
const cases = [
  ['/', 200], ['/post', 200], ['/tag/נתניהו', 200], ['/category/וידאו', 200],
  ['/category/אסונות%2Fתופעות-טבע', 200], ['/tag/צאט', 200, '/community/chat'],
  ['/chat?utm_source=continuity#discussion', 200, '/community/chat'], ['/community', 200],
  ['/community/calculator?w=שלום', 200], ['/codes', 200], ['/books', 200],
  ['/books/sefer-yetzirah?page=2#reader', 200, '/book/sefer-yetzirah'],
  ['/or-geula?v=8216a3eb-06ba-4587-a3db-8036f85ff482', 200],
  ['/community/researchers', 200], ['/forum/5d48d3fc-500a-4c80-9538-3d9caf064b91', 200],
  ['/community/comments?p=839', 200], ['/contact', 200], ['/about', 200], ['/updates', 200],
  ['/unsubscribe', 200], ['/privacy#data-deletion', 200], ['/map', 200],
  ['/name?name=שלום', 200], ['/code', 200], ['/profile', 200],
  ['/tiktok/melech', 200], ['/whatsapp/kod-hametsiut', 200],
  ['/number/1820', 200], ['/number/שלום?method=מילוי&value=376', 200], ['/gematria?text=שלום', 200],
  ['/post/bennett-melach-631-78', 404], ['/post/flydubai-fz1073-363-14000-remzei-geula', 200],
  ['/tag/a-real-missing-taxonomy-20261103', 404], ['/category/וידאו?page=9999', 404],
  ['/forum/00000000-0000-4000-8000-000000000000', 404], ['/books/maamar-esther', 404],
  ['/or-geula?v=', 404], ['/real-url-audit-nonexistent-20261103', 404],
];

let activePage;
async function record(name, width, action) {
  if(process.env.URL_ACCEPTANCE_ONLY && !new RegExp(process.env.URL_ACCEPTANCE_ONLY).test(name))return;
  const row={name,width,passed:false}; report.cases.push(row);
  try {await action(row);row.passed=true;} catch(error){row.failure=safeError(error);if(activePage){row.finalPath=await activePage.evaluate(()=>location.pathname+location.search);row.visibleText=(await activePage.locator('body').innerText()).slice(0,800);row.pageErrors=activePage.__errors||[];await activePage.screenshot({path:output+'/failure-'+width+'-'+report.cases.length+'.png'});}}
  flush();console.log(JSON.stringify({name,width,passed:row.passed,failure:row.failure}));
}
async function settled(page) {
  await page.locator('[data-ribbon-state="renewal"]').waitFor({timeout:30000});
  await page.waitForTimeout(350);
}
async function geometry(page) {
  return page.evaluate(() => {
    const ribbon=document.querySelector('[data-ribbon-state="renewal"]'),text=ribbon?.querySelector('p');
    const dock=document.querySelector('[data-command-mode="global"]'),bounds=dock?.getBoundingClientRect();
    return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
      notice:text?.textContent,noticeClipped:!!text&&(text.scrollHeight>text.clientHeight+1||text.scrollWidth>text.clientWidth+1),
      animations:ribbon?.getAnimations({subtree:true}).map(x=>({state:x.playState})),
      dock:bounds&&{width:bounds.width,left:bounds.left,right:bounds.right},
      sw:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,
      canonical:document.querySelector('link[rel="canonical"]')?.href,
      headings:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim()),
      denied:window.__serviceDenied||[]};
  });
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of (process.env.URL_ACCEPTANCE_WIDTH?[Number(process.env.URL_ACCEPTANCE_WIDTH)]:[390,1440])){
   const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
   if(config.accessUrl)await context.request.get(config.accessUrl);
   const meta=await context.request.get(config.origin+'/public-reading-artifact.json');assert.equal(meta.status(),200);report.artifact=await meta.json();assert.equal(report.artifact.sourceSha,config.sha);
   await installGuard(context);
   const page=await context.newPage();activePage=page;page.__errors=[];page.on('pageerror',error=>page.__errors.push(safeError(error))); const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://vercel.live/_next-live/feedback/feedback.js','*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://www.facebook.com/tr*','*://connect.facebook.net/*','*://*.clarity.ms/*']});
   for(const [path,status,destination] of cases){
    await record('route '+path,width,async row=>{
     const errors=[];const listener=e=>errors.push(safeError(e));page.on('pageerror',listener);
     try{
      const response=await page.goto(config.origin+path,{waitUntil:'domcontentloaded',timeout:45000});row.http=response.status();assert.equal(row.http,status);
      assert.match(response.headers()['x-robots-tag']||'',/noindex/);
      if(['/tiktok/melech','/whatsapp/kod-hametsiut'].includes(path)){await page.locator('h1').waitFor();assert.equal(await page.locator('form input[type=email]').count(),0);row.campaignStandalone=true;row.headings=await page.locator('h1').allTextContents();return;}
      await settled(page);row.finalPath=decodeURI(new URL(page.url()).pathname);if(destination)assert.equal(row.finalPath,destination);
      Object.assign(row,await geometry(page));row.errors=errors;
      assert.equal(row.notice,NOTICE);assert.equal(row.noticeClipped,false);assert.equal(row.animations.length,0);
      assert.ok(row.documentWidth<=width+1,'horizontal overflow');assert.equal(errors.length,0,'pageerror');
      if(path==='/books/sefer-yetzirah?page=2#reader'){await expect(page.locator('[data-public-source-reader]')).toBeVisible();await expect(page.locator('[data-book-pdf-frame] canvas,[data-book-pdf-frame] iframe')).toBeVisible();row.realSourceReader=true;}
      if(path==='/category/וידאו')await expect(page.getByRole('link',{name:'לסרטוני אור הגאולה במקור ←'})).toBeVisible();
      if(['/tag/נתניהו','/community/chat','/community/calculator?name=שלום','/category/וידאו','/codes'].includes(path))await page.screenshot({path:output+'/page-'+width+'-'+cases.findIndex(x=>x[0]===path)+'.png'});
     } finally{page.off('pageerror',listener);}
    });
   }
   await record('ticker-contact-source-and-direct-share',width,async row=>{
    await page.goto(config.origin+'/number/1820?method=רגיל&token=synthetic-secret#source',{waitUntil:'domcontentloaded'});await settled(page);
    await page.getByRole('button',{name:'דיווח או הצעה ←',exact:true}).click();
    await expect(page.locator('[data-contact-gateway="true"]')).toBeVisible();
    await page.getByRole('button',{name:/חסר לי משהו \/ יש לי רעיון/}).click();
    await expect(page.getByText('השליחה אינה זמינה בפריוויו הזה.',{exact:false})).toBeVisible();
    const source=page.getByText('מקור הפנייה:',{exact:false});await expect(source).toContainText('/number/1820');row.attachedSource=await source.innerText();assert.ok(!row.attachedSource.includes('token='));
    await expect(page.getByRole('button',{name:'שליחה',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'סגור',exact:true}).first().click();
    await page.locator('[data-command-mode="global"]').getByRole('button',{name:'שיתוף',exact:true}).click();
    await expect(page.locator('[data-share-owner="ShareActions"]')).toBeVisible();
    row.shareChoices=await page.locator('[data-share-owner="ShareActions"]').innerText();
    row.shareLinks=await page.locator('[data-share-owner="ShareActions"] a').evaluateAll(xs=>xs.map(x=>({text:x.textContent,href:x.href.replace(/rid%3D[^%&]+/g,'rid%3DREDACTED')})));
    assert.ok(row.shareChoices.includes('WhatsApp')||row.shareChoices.includes('וואטסאפ'));
    assert.ok(!JSON.stringify(row.shareLinks).includes('synthetic-secret'));
    await page.screenshot({path:output+'/share-'+width+'.png'});
    await page.getByRole('button',{name:'סגור',exact:true}).first().click();
    const g=await geometry(page);row.dock=g.dock;assert.ok(g.dock&&g.dock.width<=(width>800?600:width));
    row.networkDenied=g.denied;
   });
   await record('public-cipher-source-detail',width,async row=>{
    await page.goto(config.origin+'/codes',{waitUntil:'domcontentloaded'});await settled(page);
    const link=page.locator('.public-library29-card > a').first();await link.waitFor({timeout:30000});row.publicHref=await link.getAttribute('href');
    await link.click();await expect(page.locator('.public-library29-detail')).toBeVisible();
    await expect(page.locator('[data-experience-capability="cipher-search-unavailable"]')).toBeVisible();
    row.publicSourceRef=await page.locator('.public-library29-detail').getAttribute('data-public-source-ref');assert.ok(row.publicSourceRef);
    const response=await page.reload({waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await expect(page.locator('.public-library29-detail')).toBeVisible();
    await page.goBack({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/\/codes$/);
   });
   await record('community-public-thread-return-no-writes',width,async row=>{
    await page.goto(config.origin+'/community/chat',{waitUntil:'domcontentloaded'});await settled(page);
    const article=page.locator('article[id^="message-"]:not(.sod29-community-thread--deleted)').first();await article.waitFor({timeout:30000});
    const ids=await page.locator('article[id^="message-"]').evaluateAll(xs=>xs.map(x=>x.id));assert.equal(new Set(ids).size,ids.length);
    assert.equal(await page.locator('.sod29-community-composer').count(),0);
    assert.equal(await page.locator('iframe[src*="openweb"],iframe[src*="spot.im"]').count(),0);
    const id=(await article.getAttribute('id')).slice(8);row.publicThread=id;
    const response=await page.goto(config.origin+'/community/chat?thread='+id+'#message-'+id,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await expect(page.locator('#message-'+id)).toBeVisible();row.exactThreadVisible=true;
    await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('#message-'+id)).toBeVisible();
    await page.goBack({waitUntil:'domcontentloaded'});assert.equal(new URL(page.url()).search,'');
    row.denied=(await geometry(page)).denied;
   });
   await record('calculator-method-number-return',width,async row=>{
    await page.goto(config.origin+'/community/calculator?w='+encodeURIComponent('שלום'),{waitUntil:'domcontentloaded'});await settled(page);
    const input=page.locator('#community-calculator-name');await expect(input).toHaveValue('שלום');
    const link=page.locator('.sod29-community-calc-method').first().getByRole('link',{name:'למספר ולביטוי ←'});await link.waitFor();
    row.href=await link.getAttribute('href');assert.match(row.href,/376/);await link.click();
    await expect(page).toHaveURL(/\/number\//);await settled(page);assert.equal(await page.locator('[role="dialog"]').count(),0);
    await page.goBack({waitUntil:'domcontentloaded'});await expect(input).toHaveValue('שלום');row.exactReturn=true;
   });
   await record('controlled-taxonomy-failure-retry',width,async row=>{
    row.controlledFailure=true;row.dataAfterRetry='real anonymous published data';
    await page.addInitScript(()=>{const fetchOriginal=window.fetch.bind(window);window.__fixturePostsFailure=new URLSearchParams(location.search).has('continuityFailure');window.fetch=(input,init)=>{const url=typeof input==='string'?input:input.url;return window.__fixturePostsFailure&&new URL(url,location.href).pathname==='/rest/v1/posts'?Promise.reject(Error('synthetic taxonomy transport failure')):fetchOriginal(input,init);};});
    await page.goto(config.origin+'/tag/נתניהו?continuityFailure=1',{waitUntil:'domcontentloaded'});
    await expect(page.locator('[data-taxonomy-state="unavailable"]')).toBeVisible();
    await expect(page.getByText('לא הצלחתי לפתוח את הפוסטים',{exact:true})).toBeVisible();
    assert.equal(await page.getByText('לא נמצאו פוסטים לחיפוש הזה',{exact:true}).count(),0);
    await page.evaluate(()=>{window.__fixturePostsFailure=false;});await page.getByRole('button',{name:'ניסיון טעינה נוסף',exact:true}).click();
    await expect(page.locator('[data-taxonomy-state="ready"]')).toBeVisible();row.recovered=true;
   });
   await record('taxonomy-post-browser-return',width,async row=>{
    await page.goto(config.origin+'/tag/נתניהו',{waitUntil:'domcontentloaded'});await settled(page);
    const card=page.locator('[data-experience-surface="posts-index"] .sod29-posts-library-grid a').first();
    await card.waitFor({timeout:30000});
    await card.waitFor();row.postHref=await card.getAttribute('href');await card.click();
    await expect(page).not.toHaveURL(/\/tag\//);await page.waitForTimeout(600);row.postPath=new URL(page.url()).pathname;
    await page.goBack({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/\/tag\//);await settled(page);
    row.returnPath=new URL(page.url()).pathname;await page.reload({waitUntil:'domcontentloaded'});await settled(page);
    await expect(page.locator('[data-posts-taxonomy="tag"]')).toBeVisible();
   });
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:320,height:780},locale:'he-IL'});if(config.accessUrl)await context.request.get(config.accessUrl);await installGuard(context);const page=await context.newPage();
  await record('320px-notice-and-theme',320,async row=>{
   await page.goto(config.origin+'/',{waitUntil:'domcontentloaded',timeout:45000});await settled(page);
   row.presets=[];
   for(const preset of ['יום','קלף','לילה']){
    await page.locator('.sod29-theme-trigger').click();await page.locator('.sod29-theme-options').getByRole('button',{name:preset,exact:false}).click();
    const result=await geometry(page);result.preset=preset;row.presets.push(result);assert.equal(result.noticeClipped,false);assert.ok(result.documentWidth<=321);assert.equal(result.animations.length,0);
    await page.screenshot({path:output+'/notice-320-'+preset+'.png'});
   }
  });await context.close();
 }finally{await browser.close();report.completed=true;report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.filter(x=>!x.passed).length;flush();console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;}
})().catch(e=>{report.fatal=safeError(e);flush();process.exitCode=1;});


