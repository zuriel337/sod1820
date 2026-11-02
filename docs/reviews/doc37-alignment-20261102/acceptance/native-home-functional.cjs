// Exact protected candidate, actual public data + actual SW. No admin/login,
// email subscription, model, payment, product writes or mock responses.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.SOD_COLD_OUT;if(!out)throw Error('SOD_COLD_OUT required');fs.mkdirSync(out,{recursive:true,mode:0o700});
require('node:readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),report={sha:cfg.sha,actualSW:true,realPublicData:true,syntheticAccountEvidence:false,productWrites:0,modelCalls:0,cases:[]};let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:cfg.headed!==true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of cfg.widths||[320,390,1440]){
   const item={width,checks:[]};report.cases.push(item);let context,page;
   try{
    context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
    if(cfg.accessUrl)await context.request.get(cfg.accessUrl);
    const identity=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(identity.status(),200);assert.equal((await identity.json()).sha,cfg.sha);
    await require('./native-home-read-only-guard.cjs')(context,cfg.origin);
    page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,400)));
    const response=await page.goto(cfg.origin+'/?doc37-home=acceptance',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await expect(page.locator('[data-home-primary="ready"]')).toBeVisible();await expect(page.locator('[data-home-public-series="true"]')).toHaveAttribute('aria-busy','false');
    const closed=page.locator('[data-home-top-updates="public-closed"]');await expect(closed).toBeVisible();await expect(closed).toContainText('אזור זה בבנייה מתקדמת');await expect(page.locator('.h29-admin-updates')).toHaveCount(0);item.checks.push('primary-ready/top-only-public-closed/admin-reader-absent');
    for(const key of['mah-kore-habora','dimension-five','sod-hashmal']){const card=page.locator(`[data-home-series="${key}"]`);await expect(card).toBeVisible();await expect(card.locator('.h29-card-open')).toHaveAttribute('href',/^\//);await expect(card.locator('time')).toHaveAttribute('datetime',/.+/);}
    item.checks.push('three-real-series-linked/publication-times');
    await expect(page.locator('[data-home-availability-map="true"]')).toBeVisible();item.checks.push('existing-availability-map');
    await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);
    item.geometry=await page.evaluate(()=>({innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('[data-home-primary="ready"],[data-home-series]')].map(el=>{const r=el.getBoundingClientRect();return{kind:el.dataset.homeSeries||'primary',top:r.top,bottom:r.bottom,visibleHeight:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))};}),dock:(()=>{const r=document.querySelector('.sod29-command-island')?.getBoundingClientRect();return r?{left:r.left,right:r.right,width:r.width}:null;})()}));
    await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});await page.screenshot({path:`${out}/home-first-viewport-${width}.png`});
    assert.ok(item.geometry.scrollWidth<=item.geometry.clientWidth+1,'no horizontal overflow');
    if(width<=390)assert.ok(item.geometry.cards.filter(c=>c.visibleHeight>=48).length>=2,'more than one real content card visible in first viewport');
    if(width>=981)assert.ok(item.geometry.dock.width<500&&Math.abs((item.geometry.dock.left+item.geometry.dock.right)/2-item.geometry.clientWidth/2)<2,'desktop dock compact/centered');
    item.checks.push('whole-home-mobile/desktop-geometry');
    const now=page.locator('.sod29-command-island').getByRole('button',{name:/^עכשיו/});await now.click();await expect(page.getByRole('dialog',{name:'עכשיו',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'עכשיו',exact:true})).toHaveCount(0);await now.click();await expect(page.getByRole('dialog',{name:'עכשיו',exact:true})).toBeVisible();await page.keyboard.press('Escape');
    item.checks.push('now-open-close-reopen');if(cfg.mailProbe){const mail=page.getByRole('region',{name:'עדכוני פתיחת חלקים',exact:true});assert.equal(await page.evaluate(()=>(window.__safetyReads||[]).filter(r=>r.path==='/functions/v1/newsletter-signup').length),0,'newsletter capability probe waits for user intent');await mail.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).click();await expect(mail.locator('input[type=email]')).toBeVisible();await expect(mail.locator('input[type=email]')).toHaveValue('');await expect(mail.getByRole('checkbox')).not.toBeChecked();await expect(mail.locator('button[type=submit]')).toBeDisabled();item.mailGeometry=await mail.evaluate(el=>{const r=el.getBoundingClientRect(),link=el.querySelector('a'),p=link?.getBoundingClientRect();return{left:r.left,right:r.right,link:p?{left:p.left,right:p.right,top:p.top,bottom:p.bottom}:null,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};});assert.ok(item.mailGeometry.scrollWidth<=item.mailGeometry.clientWidth+1,'mail form has no horizontal overflow');assert.ok(item.mailGeometry.link&&item.mailGeometry.link.left>=item.mailGeometry.left&&item.mailGeometry.link.right<=item.mailGeometry.right,'privacy link stays inside region');await page.screenshot({path:`${out}/mail-open-${width}.png`});item.checks.push('mail-exact-OPTIONS/live-contract/form-unchecked/no-email-or-POST');}item.snapshot=await page.evaluate(()=>({controller:navigator.serviceWorker.controller?.scriptURL?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__safetyDenied,reads:(window.__safetyReads||[]).map(r=>({path:r.path,method:r.method,status:r.status,error:r.error?String(r.error).slice(0,120):null})),shifts:window.__nativeShifts}));
    assert.match(item.snapshot.controller||'',/preview-readonly-sw/);assert.deepEqual(errors,[]);assert.ok(!item.snapshot.denied.some(x=>/notification_prefs_guest_get_v1|canonical_follow_subject|ingest_event|visitor_events|meta-capi|credit/.test(x.path)),'no forbidden guest-follow/telemetry/credit attempts');item.errors=errors;item.ok=true;
   }catch(e){item.ok=false;item.failure={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1000)};if(page)await page.screenshot({path:`${out}/failure-${width}.png`,fullPage:true}).catch(()=>{});}
   finally{await context?.close();fs.writeFileSync(out+'/home-functional.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({width,ok:item.ok,checks:item.checks,failure:item.failure}));}
  }
 }catch(e){report.fatal={name:e.name,message:String(e.message).slice(0,400)};}
 finally{await browser?.close();report.ok=!report.fatal&&report.cases.length>0&&report.cases.every(x=>x.ok);fs.writeFileSync(out+'/home-functional.json',JSON.stringify(report,null,2)+'\n');process.exitCode=report.ok?0:1;}
});
