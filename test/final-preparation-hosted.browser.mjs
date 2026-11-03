// Exact hosted source + real public data + actualSW. No signed-in account,
// subscription, product write, mail delivery, model or third-party playback.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const cfg=JSON.parse(await readFile(process.argv[2],'utf8')),out=process.argv[3];await mkdir(out,{recursive:true});
const origin=new URL(cfg.url).origin,db='https://linswmnnkjxvweumprav.supabase.co';
const inventory=JSON.parse(await readFile('docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json','utf8'));
const reads=inventory.functions.map(x=>x.proname).filter(x=>x!=='lang_links_list');reads.push('convergence_meter','is_number_indexable','is_phrase_indexable','community_feed_page','community_message_context','community_replies_page','community_reply_counts');
const post=JSON.parse(await readFile('docs/reviews/public-url-exceptions-20261103/evidence/attachment-bindings.json','utf8'))[0].postHref;
const report={sourceSha:cfg.sha,branch:cfg.branch,deploymentId:cfg.deploymentId,realPublicData:true,actualSW:true,modelCalls:0,liveWrites:0,testMail:0,accountAcceptance:'existing user-reported two-account receipt retained separately; no new account test',cases:[],errors:[],denied:[]};
const safe=e=>String(e.message||e).replaceAll(cfg.shareUrl||'PRIVATE_NON_MATCH','[private grant]').replace(/_vercel_share=[^\s"'&]+/g,'_vercel_share=[redacted]').slice(0,1200);
const flush=()=>writeFile(out+'/receipt.json',JSON.stringify(report,null,2)+'\n');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
let page;
async function check(name,width,fn){if(process.env.FINALPREP_ONLY&&!new RegExp(process.env.FINALPREP_ONLY).test(name))return;const row={name,width,passed:false};report.cases.push(row);try{await fn(row);row.passed=true;}catch(e){row.error=safe(e);await page?.screenshot({path:out+`/failure-${report.cases.length}.png`}).catch(()=>{});}await flush();console.log(JSON.stringify(row));}
try{for(const width of [390,1440]){
 const ctx=await browser.newContext({viewport:{width,height:900},locale:'he-IL',reducedMotion:'reduce'});
 await ctx.addInitScript(({origin,db,reads})=>{
  const native=fetch.bind(window),allowed=new Set(reads);window.__denied=[];
  window.fetch=(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
   const ok=['GET','HEAD'].includes(req.method)&&(u.origin===origin||u.origin===db&&(u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/storage/v1/object/public/')||['/auth/v1/user','/auth/v1/settings'].includes(u.pathname)))||u.origin===db&&req.method==='POST'&&allowed.has(rpc)||u.origin===db&&req.method==='OPTIONS'&&u.pathname==='/functions/v1/newsletter-signup';
   if(!ok){window.__denied.push({method:req.method,path:u.pathname});return Promise.reject(Error('independent_read_only_guard'));}return native(req);};
  navigator.sendBeacon=()=>false;window.WebSocket=class{constructor(){throw Error('independent_read_only_guard')}};
 },{origin,db,reads});
 page=await ctx.newPage();page.setDefaultTimeout(35000);page.on('pageerror',e=>report.errors.push({width,error:safe(e)}));
 const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://vercel.live/_next-live/feedback/feedback.js','*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://connect.facebook.net/*','*://*.clarity.ms/*','*://*.youtube.com/*','*://youtu.be/*']});
 await page.goto(cfg.shareUrl,{waitUntil:'domcontentloaded',timeout:60000});
 await check('exact protected artifact and real Home/SW',width,async row=>{
  await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('[data-home-primary="ready"]').waitFor();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const artifact=await page.evaluate(async()=>await(await fetch('/public-reading-artifact.json',{cache:'no-store'})).json());assert.equal(artifact.sourceSha,cfg.sha);assert.equal(artifact.protectedReview?.branch,cfg.branch);assert.equal(artifact.protectedReview?.deploymentId,cfg.deploymentId);assert.equal(artifact.productionReady,false);assert.equal(artifact.applicationSourceDirty,false);
  if(artifact.sourceDirty){const m=artifact.platformConfigMaterialization;assert.equal(m?.kind,'vercel-selected-nested-config-at-root');assert.equal(m?.trackedStatus,' M vercel.json');assert.equal(m?.completeJsonEquivalent,true);assert.equal(m?.arrayOrderPreserved,true);assert.equal(m?.sourceSha,cfg.sha);assert.equal(m?.committedPath,'public-reading-deploy/vercel.json');assert.equal(m?.materializedPath,'vercel.json');}
  await page.locator('[data-home-series]').first().waitFor();assert.equal(await page.locator('[data-companion-visibility="temporarily-hidden"]').count(),1);
  row.worker=await page.evaluate(()=>new URL(navigator.serviceWorker.controller.scriptURL).pathname);row.series=await page.locator('[data-home-series]').count();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check('Legacy invitation template, actual2029 fonts/images and old contract denied before email',width,async row=>{
  const sheet=page.getByRole('dialog',{name:'עולם חדש של גילוי נבנה עכשיו',exact:true});
  await sheet.waitFor({state:'visible',timeout:35000});
  await sheet.locator('[data-newsletter-invite="site-updates"]').waitFor();
  assert.ok(!(await sheet.innerText()).includes('קוד המציאות'));assert.ok((await sheet.innerText()).includes('בלי הצפה — רק עדכונים חשובים באמת'));
  await sheet.locator('.sod29-newsletter-invite-logo').evaluate(img=>img.decode());await sheet.locator('.sod29-newsletter-invite-atmosphere').evaluate(img=>img.decode());
  row.visual=await sheet.evaluate(el=>({bodyFont:getComputedStyle(el.querySelector('[data-newsletter-invite]')).fontFamily,titleFont:getComputedStyle(el.querySelector('h3')).fontFamily,logo:el.querySelector('img.sod29-newsletter-invite-logo').naturalWidth,atmosphere:el.querySelector('img.sod29-newsletter-invite-atmosphere').naturalWidth,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status}))}));
  assert.match(row.visual.bodyFont,/Noto Sans Hebrew/);assert.match(row.visual.titleFont,/Rubik/);assert.ok(row.visual.logo>0&&row.visual.atmosphere>0);
  assert.equal(await sheet.locator('input[type=email]').count(),0);await page.screenshot({path:out+`/invitation-${width}.png`});
  await sheet.getByRole('button',{name:'כן, אני רוצה להתעדכן',exact:true}).click();
  await sheet.getByRole('alert').filter({hasText:'עדיין אינה זמינה'}).waitFor();assert.equal(await sheet.locator('input[type=email]').count(),0);assert.equal(await sheet.getByRole('status').count(),0);
  await sheet.getByRole('button',{name:'אולי אחר כך',exact:true}).click();await expect(sheet).toHaveCount(0);
 });
 await check('Now, shared context/dock and compact desktop bar retained',width,async row=>{
  const now=page.locator('.sod29-command-island').getByRole('button',{name:/^עכשיו/});const dialog=page.getByRole('dialog',{name:'עכשיו',exact:true});await now.click();await dialog.waitFor();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await now.click();await dialog.waitFor();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  row.dock=await page.locator('.sod29-command-island').boundingBox();row.frame=await page.locator('.sod29-root').boundingBox();row.viewport=await page.evaluate(()=>({innerWidth,clientWidth:document.documentElement.clientWidth,bodyWidth:document.body.getBoundingClientRect().width}));if(width===1440){assert.ok(row.dock.width<500);assert.ok(Math.abs(row.dock.x+row.dock.width/2-(row.frame.x+row.frame.width/2))<2);}
 });
 await check('real old Post, full Number/Phrase and exact browser return',width,async row=>{
  const original=post+'?part=2&part=7#post-content';await page.goto(origin+original,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('[data-public-post-id]').waitFor();const actual=new URL(page.url());const previous=actual.pathname+actual.search+actual.hash;row.postId=await page.locator('[data-public-post-id]').first().getAttribute('data-public-post-id');
  await page.goto(origin+'/number/1820?returnTo='+encodeURIComponent(previous),{waitUntil:'domcontentloaded',timeout:60000});await page.locator('[data-number-core-root="1820"]').waitFor();assert.equal(await page.getByRole('dialog').count(),0);
  await page.goto(origin+'/number/'+encodeURIComponent('משיח'),{waitUntil:'domcontentloaded',timeout:60000});await page.locator('[data-number-core-root="358"]').waitFor();assert.ok((await page.locator('body').innerText()).includes('משיח'));assert.equal(await page.getByRole('dialog').count(),0);
  await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-number-core-root="1820"]').waitFor();await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-public-post-id]').waitFor();const returned=new URL(page.url());assert.equal(returned.pathname+returned.search+returned.hash,previous);row.returnTo=previous;row.scope='real direct entries plus browser history, not a new method-click acceptance';
 });
 await check('World, calculator and guest personal/admin gates remain truthful',width,async row=>{
  await page.goto(origin+'/world',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.sod29-root.surface-world').waitFor();await expect(page.locator('h1').first()).toContainText('עולם');assert.equal(await page.getByRole('dialog').count(),0);
  await page.goto(origin+'/gematria?w='+encodeURIComponent('משיח'),{waitUntil:'domcontentloaded',timeout:60000});await page.locator('[data-experience-surface="calculator-pro-2029"]').waitFor();
  await page.goto(origin+'/login?returnTo=%2F2029%2Fme%2Fresearch',{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('button',{name:'כניסה עם סיסמה',exact:true}).waitFor();
  const signupPolicy=page.locator('[data-signup-updates-policy="existing-site-default"]');
  await expect(signupPolicy).toContainText('בהרשמה לחשבון חדש תקבלו גם עדכוני אתר במייל. אפשר להסיר בכל מייל. הסרה קודמת נשמרת. כניסה לחשבון קיים אינה משנה את ההרשמה לעדכונים.');
  const stableAuthOrigin='https://sod1820-git-gpt-2029-public-cutover-f-7ce8ee-sod1820-s-projects.vercel.app';
  for(const provider of ['Google','Facebook']) {
    const button=page.getByRole('button',{name:'המשך עם '+provider,exact:true});
    if(origin===stableAuthOrigin && cfg.oauthReady===true)await expect(button).toBeEnabled();else await expect(button).toBeDisabled();
  }
  row.signupPolicy='existing site default visible; ordinary existing-account login changes no preference; OAuth uses only the platform-bound stable callback';
  await page.goto(origin+'/2029/control',{waitUntil:'domcontentloaded',timeout:60000});await page.getByText('זהו מסך פרטי.',{exact:false}).waitFor();assert.equal(await page.getByRole('heading',{name:'Control Plane',exact:true}).count(),0);assert.equal(await page.locator('[data-experience-capability="operational-health-summary"]').count(),0);row.privilegedReads='no genuine admin session used; named private state retained without revealing CP1';
 });
 report.denied.push({width,requests:await page.evaluate(()=>window.__denied||[])});await ctx.close();page=null;
}}finally{await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.cases.filter(x=>x.passed).length;report.failed=report.cases.filter(x=>!x.passed).length;await flush();}
process.exitCode=report.failed||report.errors.length?1:0;
