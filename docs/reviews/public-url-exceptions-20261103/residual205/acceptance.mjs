// Hosted exact-source acceptance. Anonymous public data only; no fixture success
// is represented as a live account test, and no live mutation/model call allowed.
import {chromium,expect as baseExpect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const expect=baseExpect.configure({timeout:30000});
const config=JSON.parse(await readFile(process.argv[2],'utf8')),out=process.argv[3];
const origin=new URL(config.url).origin,db='https://linswmnnkjxvweumprav.supabase.co';
assert.match(origin,/^https:\/\/sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.match(config.sha,/^[a-f0-9]{40}$/);await mkdir(out,{recursive:true});
const reads=JSON.parse(await readFile(new URL('../../public-foundation-20261101/evidence/rpc-read-inventory.json',import.meta.url),'utf8')).functions.map(x=>x.proname).filter(x=>x!=='lang_links_list');
reads.push('convergence_meter','is_number_indexable','is_phrase_indexable','writer_public_contributions_page_v1','community_feed_page','community_message_context','community_replies_page','community_reply_counts');
const report={kind:'residual205-books-hosted-anonymous-acceptance',sourceSha:config.sha,origin,realSW:true,syntheticData:false,liveWrites:0,realAccount:'user reported all listed existing-account operations passed in both owned accounts on7360f1d8; not inspected by this anonymous runner',cases:[],errors:[],denied:[]};
const flush=()=>writeFile(out+'/receipt.json',JSON.stringify(report,null,2)+'\n');
const safeError=e=>String(e.message||e).replaceAll(config.shareUrl||'PRIVATE_NON_MATCH','[private grant]').replace(/_vercel_share=[^\s"'&]+/g,'_vercel_share=[redacted]').slice(0,1400);
let page;
async function run(name,width,fn){if(process.env.RESIDUAL_ONLY&&!new RegExp(process.env.RESIDUAL_ONLY).test(name))return;const row={name,width,passed:false};report.cases.push(row);try{await fn(row);row.passed=true;}catch(e){row.error=safeError(e);if(page){row.path=new URL(page.url()).pathname;row.body=(await page.locator('body').innerText()).slice(0,800);await page.screenshot({path:out+'/failure-'+report.cases.length+'.png'}).catch(()=>{});}}await flush();console.log(JSON.stringify(row));}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL',reducedMotion:'reduce'});
 await context.addInitScript(({origin,db,reads})=>{
  const native=window.fetch.bind(window),allowed=new Set(reads);window.__denied=[];
  window.fetch=(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
   const ok=['GET','HEAD'].includes(req.method)&&(u.origin===origin||u.origin===db&&(u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/storage/v1/object/public/')||['/auth/v1/user','/auth/v1/settings'].includes(u.pathname)))||u.origin===db&&req.method==='POST'&&allowed.has(rpc);
   if(!ok){window.__denied.push({method:req.method,path:u.pathname});return Promise.reject(Error('independent_read_only_acceptance_guard'));}return native(req);};
  const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){if(!['GET','HEAD'].includes(method.toUpperCase()))throw Error('independent_read_only_acceptance_guard');return open.call(this,method,url,...rest);};
  navigator.sendBeacon=()=>false;window.WebSocket=class{constructor(){throw Error('independent_read_only_acceptance_guard');}};
 },{origin,db,reads});
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push({width,error:safeError(e)}));
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://vercel.live/_next-live/feedback/feedback.js','*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://connect.facebook.net/*','*://*.clarity.ms/*','*://*.youtube.com/*','*://youtu.be/*']});
 if(config.shareUrl)await page.goto(config.shareUrl,{waitUntil:'domcontentloaded',timeout:60000});
 await run('exact artifact and existing account entry (anonymous only)',width,async row=>{
  await page.goto(origin+'/login?returnTo=%2F2029%2Fme%2Fresearch',{waitUntil:'domcontentloaded',timeout:60000});
  await expect(page.getByRole('button',{name:'כניסה עם סיסמה',exact:true})).toBeVisible();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const artifact=await page.evaluate(async()=>await(await fetch('/public-reading-artifact.json',{cache:'no-store'})).json());assert.equal(artifact.sourceSha,config.sha);assert.equal(artifact.protectedReview?.branch,'gpt/2029-residual205-books-personal-20261103');
  row.artifact={sourceSha:artifact.sourceSha,productionReady:artifact.productionReady};
 });
 await run('seven admitted book cards retain preparation meters; only Ahavat open',width,async row=>{
  // Eight tracked preparation records, seven current anonymous DB identities.
  // A static manifest must not manufacture the missing eighth publication.
  await page.goto(origin+'/books',{waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('.books29-preparation')).toHaveCount(7);
  assert.equal(await page.getByRole('link',{name:'פתח את הספר',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'סגור — בהכנה',exact:true}).count(),6);
  assert.ok(await page.getByRole('button',{name:'סגור — בהכנה',exact:true}).evaluateAll(nodes=>nodes.every(n=>n.disabled)));
  row.meters=await page.locator('.books29-preparation progress').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label'),value:n.value})));
  assert.equal(row.meters.length,7);assert.ok(row.meters.some(x=>x.value===59));assert.equal(await page.locator('[data-book-ready="true"]').count(),0);
  await expect(page.getByRole('heading',{name:'ספרי התנ״ך — בהכנה'})).toBeVisible();
  for(const w of width===390?[320,390]:[1024,1440]){await page.setViewportSize({width:w,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/books-'+w+'.png'});}
  await page.setViewportSize({width,height:900});
 });
 await run('public Ahavat prototype, source pixels and exact filtered library return',width,async row=>{
  const returnTo='/books?q='+encodeURIComponent('תורה')+'#library-list';await page.goto(origin+returnTo,{waitUntil:'domcontentloaded',timeout:60000});
  const link=page.getByRole('link',{name:'פתח את הספר',exact:true});await expect(link).toHaveCount(1);await link.click();await expect(page.locator('#ahavat29-toc')).toBeVisible();
  assert.equal(new URL(page.url()).pathname,'/book/ahavat-torah');assert.equal(new URL(page.url()).searchParams.get('returnTo'),returnTo);
  await page.goto(origin+'/book/ahavat-torah?dataset=DS-01&page=6&returnTo='+encodeURIComponent(returnTo)+'#ahavat29-selection',{waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('#ahavat29-selection')).toBeVisible();
  const source=page.locator('#ahavat29-source');await source.scrollIntoViewIfNeeded();
  await expect(source.locator('[data-book-pdf-canvas][data-book-pdf-page="6"][data-book-pdf-painted="true"]')).toBeVisible({timeout:60000});
  row.source=await source.locator('[data-book-pdf-renderer="controlled"]').evaluate(root=>{const c=root.querySelector('[data-book-pdf-canvas][data-book-pdf-page="6"][data-book-pdf-painted="true"]');return{sha256:root.dataset.bookSourceSha256,page:Number(c.dataset.bookPdfPage),pages:Number(c.dataset.bookPdfPageCount),width:c.width,height:c.height,pixel:[...c.getContext('2d').getImageData(0,0,1,1).data]};});
  assert.equal(row.source.sha256,'895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b');assert.equal(row.source.pages,99);assert.equal(row.source.pixel[3],255);
  assert.equal(await page.locator('.ahavat29-selection-actions button').count(),0,'no automatic add-to-research action for public reader');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/ahavat-p6-'+width+'.png'});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('#ahavat29-toc')).toBeVisible();
  const back=page.getByRole('link',{name:'→ חזרה לספרייה',exact:true});await expect(back).toHaveAttribute('href',returnTo);await back.click();await expect(page.locator('.books29-preparation')).toHaveCount(1);
  assert.equal(new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash,returnTo);row.returnTo=returnTo;
 });
 await run('public source mode and 1820 return, no private control route',width,async row=>{
  const path='/book/ahavat-torah?dataset=DS-01&page=6&returnTo=%2Fbooks#ahavat29-selection';await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('#ahavat29-selection')).toBeVisible();
  const unified=page.getByRole('link',{name:'בקורא האחיד',exact:true});const href=await unified.getAttribute('href');assert.ok(href.startsWith('/book/ahavat-torah?'));assert.equal(new URL(href,origin).searchParams.get('reader'),'source');
  const number=page.locator('.ahavat29-selection-actions a[href^="/number/1820"]');await expect(number).toHaveCount(1);const n=await number.getAttribute('href');assert.equal(new URL(n,origin).searchParams.get('returnTo'),path);await number.click();await page.locator('[data-number-core-root]').waitFor();await page.goBack({waitUntil:'domcontentloaded'});await expect(page.locator('#ahavat29-toc')).toBeVisible();
  assert.equal(new URL(page.url()).pathname,'/book/ahavat-torah');await page.getByRole('link',{name:'בקורא האחיד',exact:true}).click();await page.locator('[data-public-source-reader="true"]').waitFor();row.sourceHref=href;row.numberHref=n;
 });
 await run('other unfinished book direct link does not mount a PDF reader',width,async row=>{
  await page.goto(origin+'/book/daat-tevunot',{waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('[data-book-preparation-closed="true"]')).toBeVisible();
  assert.equal(await page.locator('[data-book-pdf-renderer],iframe[src$=".pdf"],canvas[data-book-pdf-canvas]').count(),0);row.preparation=await page.locator('.books29-preparation').innerText();assert.match(row.preparation,/60%/);
 });
 for(const [path,dest]of [
  ['/86AND26/videos/vb.103870716369907/801439149946390/','https://www.facebook.com/86AND26/videos/801439149946390/'],
  ['/k1820/videos/839307259461807/','https://www.facebook.com/k1820/videos/839307259461807/'],
  ['/k1820/videos/vb.617996338259568/839307259461807/','https://www.facebook.com/k1820/videos/839307259461807/'],
 ])await run('exact external continuation '+path,width,async row=>{const r=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);await expect(page.locator('h1')).toContainText('סרטון המקור');await expect(page.getByRole('link',{name:'לסרטון באתר המקור',exact:true})).toHaveAttribute('href',dest);row.href=dest;row.providerPlayback='not verified';});
 const historical=[
  ['/משיח-בשנת-התשעו/',2481,'משיח בשנת התשע״ו — כל ההרצאות',17],
  ['/משיח-בשנת-התשעו/מתי-שנת-הגאולה/',3798,'מתי שנת הגאולה',6],
  ['/הוכחות-לאמיתות-התורה-משמים/',3288,'הוכחות לאמיתות התורה משמים',7],
 ];
 for(const [path,id,title,count]of historical)await run('historical source '+id+' exact document and visible provider fallback',width,async row=>{
  const response=await page.goto(origin+encodeURI(path)+'?part=2&part=7#historical-source',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(response.status(),200);await expect(page.locator(`[data-historical-source="wp:page:${id}"]`)).toBeVisible();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const links=page.locator('.sod29-reading-source [data-historical-video-source]');await expect(links).toHaveCount(count);assert.equal(await page.locator('.sod29-reading-source iframe[src]').count(),0,'provider does not load before an explicit choice');
  row.sourceVideos=await links.evaluateAll(nodes=>nodes.map(n=>n.href));row.providerPlayback='not accepted; third-party requests blocked, exact source links visible';
  if(id===3798){const summary=page.locator('.sod29-reading-source details summary').first();await summary.click();await expect(page.locator('.sod29-reading-source iframe[src]')).toHaveCount(1);}
  const sizes=width===390?[320,390]:[1440];for(const w of sizes){await page.setViewportSize({width:w,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'historical content must fit width '+w);await page.screenshot({path:out+'/historical-'+id+'-'+w+'.png'});}await page.setViewportSize({width,height:900});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator(`[data-historical-source="wp:page:${id}"]`)).toBeVisible();
 });
 await run('historical child parent exact dependency links and browser return',width,async row=>{
  const start='/משיח-בשנת-התשעו/מתי-שנת-הגאולה?part=2&part=7#historical-source';await page.goto(origin+encodeURI(start),{waitUntil:'domcontentloaded',timeout:60000});await expect(page.locator('[data-historical-source="wp:page:3798"]')).toBeVisible();
  await page.locator('.sod29-reading-source a[title]').first().click();await expect(page.locator('[data-historical-source="wp:page:2481"]')).toBeVisible();assert.equal(new URL(page.url()).origin,origin);
  await page.locator('.sod29-reading-source a[title="הוכחות לאמיתות התורה משמים"]').click();await expect(page.locator('[data-historical-source="wp:page:3288"]')).toBeVisible();assert.equal(new URL(page.url()).origin,origin);
  await page.goBack();await expect(page.locator('[data-historical-source="wp:page:2481"]')).toBeVisible();await page.goBack();await expect(page.locator('[data-historical-source="wp:page:3798"]')).toBeVisible();assert.equal(decodeURI(new URL(page.url()).pathname)+new URL(page.url()).search+new URL(page.url()).hash,start);row.returnTo=start;
 });
 for(const path of ['/forum','/yuval-kogan-echad-hasichim-hamashiach','/post/yuval-kogan-echad-hasichim-hamashiach','/?p=36971','/forum/e47900d9-5591-4f1b-bc7c-d36986e8535b'])await run('Forum approved continuation '+path,width,async row=>{
  const suffix=path.includes('?')?'&part=2&part=7#original-forum':'?part=2&part=7#original-forum';await page.goto(origin+path+suffix,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForURL(u=>u.pathname==='/community/chat');assert.equal(new URL(page.url()).origin,origin);assert.deepEqual(new URL(page.url()).searchParams.getAll('part'),['2','7']);assert.equal(new URL(page.url()).hash,'#original-forum');row.destination=new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash;row.originalForumThreadRestored=false;
 });
 await run('anonymous personal page remains private',width,async()=>{await page.goto(origin+'/2029/me/notes');await expect(page.getByRole('heading',{name:'צריך להתחבר כדי לראות את האזור האישי'})).toBeVisible();assert.equal(await page.getByLabel('ההערות שלי').count(),0);});
 report.denied.push({width,requests:await page.evaluate(()=>window.__denied||[])});await context.close();page=null;
}}finally{await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.filter(x=>!x.passed).length;await flush();}
process.exitCode=report.failed||report.errors.length?1:0;
