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
const report = { kind: 'public-url-exceptions-hosted-acceptance', acceptance: true, productSha: config.sha,
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

const proofs=require('./evidence/attachment-bindings.json');
let page;
async function run(name,width,fn){const row={name,width,passed:false};report.cases.push(row);try{await fn(row);row.passed=true;}catch(e){row.failure=safeError(e);if(page){row.path=new URL(page.url()).pathname;row.text=(await page.locator('body').innerText()).slice(0,500);await page.screenshot({path:output+'/failure-'+width+'-'+report.cases.length+'.png'}).catch(()=>{});}}flush();console.log(JSON.stringify({name,width,passed:row.passed,failure:row.failure}));}
async function postIdentity(p){await expect(page.locator('[data-public-post-id="'+p.postId+'"]')).toBeVisible();}
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});if(config.accessUrl)await context.request.get(config.accessUrl);
 const a=await context.request.get(config.origin+'/public-reading-artifact.json');assert.equal(a.status(),200);report.artifact=await a.json();assert.equal(report.artifact.sourceSha,config.sha);
 await installGuard(context);page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(safeError(e)));const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://vercel.live/_next-live/feedback/feedback.js','*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://www.facebook.com/tr*','*://connect.facebook.net/*','*://*.clarity.ms/*']});
 if(width===390)await run('242 exact attachment edge redirects',width,async row=>{
  row.total=proofs.length;row.failures=[];let next=0;await Promise.all(Array.from({length:5},async()=>{while(next<proofs.length){const p=proofs[next++];try{let u=new URL(p.sourceUrl,config.origin),final=false;const visited=new Set;for(let hop=0;hop<6;hop++){assert.ok(!visited.has(u.href),'redirect loop');visited.add(u.href);const r=await context.request.get(u.href,{maxRedirects:0,timeout:30000});if([301,302,307,308].includes(r.status())){u=new URL(r.headers().location,u);assert.equal(u.origin,config.origin);continue;}assert.equal(r.status(),200,'final HTTP');assert.equal(decodeURIComponent(u.pathname).replace(/\/$/,''),decodeURIComponent(p.postHref).replace(/\/$/,''));assert.equal(u.searchParams.get('sourceAttachment'),p.sourcePath);const html=await r.text();assert.ok(html.includes(p.mediaHref),'exact source OG image');final=true;break;}assert.ok(final,'chain must terminate at the identified public document');assert.ok(u.searchParams.has('sourceAttachment'));}catch(e){row.failures.push({url:p.sourceUrl,error:safeError(e)});}}}));assert.equal(row.failures.length,0);
 });
 const samples=[proofs[0],proofs.find(p=>p.sourcePath.includes('/attachment/')),proofs.find(p=>p.sourcePath.endsWith('/showimage')),proofs.find(p=>p.sourcePath.startsWith('/דף-הבית/')),proofs.find(p=>p.witnessPostIds.length>1),proofs.find(p=>p.postId===138)].filter(Boolean);
 for(const [index,p]of samples.entries())await run('image identity/lightbox/refresh '+p.postId+' sample '+index,width,async row=>{
  const r=await page.goto(config.origin+p.sourceUrl+'?ref=a&ref=b',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);await postIdentity(p);
  const chosen=page.locator('[data-legacy-attachment-focus="true"]');await expect(chosen).toHaveCount(1);assert.equal(await chosen.getAttribute('data-source-attachment'),p.sourcePath);assert.equal(await chosen.locator('img').getAttribute('src'),p.mediaHref);assert.deepEqual(new URL(page.url()).searchParams.getAll('ref'),['a','b']);
  await chosen.click();await expect(page.locator('[role=dialog] .lb-img')).toHaveAttribute('src',p.mediaHref);await page.getByRole('button',{name:'סגור',exact:true}).click();
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await postIdentity(p);await expect(page.locator('[data-legacy-attachment-focus="true"]')).toHaveCount(1);
  row.postId=p.postId;row.mediaHref=p.mediaHref;row.finalUrl=new URL(page.url()).pathname+new URL(page.url()).search;
  row.geometry=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,sw:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null}));assert.ok(row.geometry.width<=width+1);
  if(index===0)await page.screenshot({path:output+'/attachment-'+width+'.png'});
 });
 await run('same Post embed and no recursive source iframe',width,async row=>{
  const p=proofs.find(p=>p.postId===1323);const r=await page.goto(config.origin+p.postHref.replace(/\/$/,'')+'/embed/?ref=old#source',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);await postIdentity(p);assert.equal(new URL(page.url()).searchParams.get('ref'),'old');assert.equal(new URL(page.url()).hash,'#source');
  row.selfEmbedCount=await page.locator('[data-public-post-id] iframe[src*="sod1820.co.il"][src*="/embed"]').count();assert.equal(row.selfEmbedCount,0);row.postId=p.postId;
 });
 await run('exact nested category membership',width,async row=>{const r=await page.goto(config.origin+'/category/'+encodeURIComponent('סוד-האותיות')+'/'+encodeURIComponent('גלריות-גימטריה')+'/?page=1#list',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);await expect(page.locator('h1')).toContainText('גלריות');await expect(page.locator('.sod29-library-post-card').first()).toBeVisible();row.headings=await page.locator('h1').allTextContents();row.finalUrl=new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash;});
 await run('verified existing Posts filter and exact return',width,async row=>{await page.goto(config.origin+'/verified',{waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('h1')).toContainText('סימון אימות');const card=page.locator('.sod29-library-post-card a[href]').first();await expect(card).toBeVisible();row.href=await card.getAttribute('href');await card.click();await expect(page.locator('[data-public-post-id]')).toBeVisible();row.postId=await page.locator('[data-public-post-id]').getAttribute('data-public-post-id');await page.goBack({waitUntil:'domcontentloaded'});await expect(page.locator('h1')).toContainText('סימון אימות');row.reads=await page.evaluate(()=>window.__serviceReads.filter(x=>x.path==='/rest/v1/posts'));});
 for(const [path,text] of [['/editor','עריכת פוסטים'],['/research-viewer','מציג המחקר'],['/sulamot11','ניסוי הסולמות'],['/צור-קשר/טופס-הזמנת-עלונים-ודיסקים/','הזמנת עלונים'],['/464378687028017/videos/vb.464378687028017/727568620709021/','סרטון המקור']])await run('named continuation '+path,width,async row=>{const r=await page.goto(config.origin+path,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);await expect(page.locator('h1')).toContainText(text);assert.equal(await page.locator('input[type=email],textarea').count(),0);row.headings=await page.locator('h1').allTextContents();});
 for(const [path,expected] of [['/WORLD?ref=a&ref=b#x','/world'],['/home-classic?ref=old','/']])await run('existing route alias '+path,width,async row=>{const r=await page.goto(config.origin+path,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);assert.equal(new URL(page.url()).pathname,expected);await page.locator('[data-ribbon-state="renewal"]').waitFor({timeout:30000});row.finalPath=new URL(page.url()).pathname;});
 for(const path of ['/old/attachment/999999','/*','/SLUG','/category/סוד-האותיות/unknown','/lemi-ata-neeman-ot-umofet'])await run('real HTTP missing '+path,width,async row=>{const r=await page.goto(config.origin+path,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),404);if(path.startsWith('/lemi-'))await expect(page.getByText('הפוסט לא נמצא',{exact:true})).toBeVisible();else await expect(page.locator('h1')).toBeVisible();row.heading=await page.locator('h1,h2').allTextContents();});
 await run('missing audio is 404 non-HTML bytes',width,async row=>{const r=await context.request.get(config.origin+'/audio/m/1.wav',{timeout:45000});row.status=r.status();row.type=r.headers()['content-type'];assert.equal(row.status,404);assert.match(row.type,/^text\/plain/);});
 await run('forged source selector remains missing',width,async row=>{const p=proofs[0];const r=await page.goto(config.origin+p.postHref+'?sourceAttachment=%2Fwrong',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),404);await postIdentity(p);await expect(page.getByText('המדיה המקושרת אינה מזוהה במקור הזמין',{exact:true})).toBeVisible();row.retainedPublicPostId=p.postId;});
 report.pageErrors??=[];report.pageErrors.push({width,errors});await context.close();page=null;
 }}finally{await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.filter(x=>!x.passed).length;flush();}process.exitCode=report.failed?1:0;
})().catch(error=>{report.fatal=safeError(error);flush();console.error(safeError(error));process.exitCode=1;});
