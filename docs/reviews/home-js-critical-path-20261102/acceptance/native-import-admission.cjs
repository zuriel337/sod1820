// Bounded changed-import acceptance, separate from performance samples.
// Native public reads; controlled modes hold or fail only a new lazy JS module.
// Real SW remains enabled. No account, model, mail, playback or product writes.
const {chromium,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:45000});
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.SOD_COLD_OUT;fs.mkdirSync(out,{recursive:true,mode:0o700});
require('node:readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),report={sha:cfg.sha,origin:cfg.origin,actualSW:true,externalToolbarBlocked:Boolean(cfg.blockExternalVercelToolbar),productWrites:0,modelCalls:0,playbackAttempts:0,cases:[]};let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:false,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const mode of['native-admission','held-import-cancel','failed-import-reload']){
   const item={mode,width:390,controlledFixture:mode!=='native-admission',realPublicData:true,chunks:[],errors:[],checks:[]};report.cases.push(item);
   const context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});let release=()=>{},held=false,failed=false;
   try{
    if(cfg.accessUrl)await context.request.get(cfg.accessUrl);const identity=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(identity.status(),200);assert.equal((await identity.json()).sha,cfg.sha);
    await require('../../home-light-reading-now-20261102/native-read-only-guard.cjs')(context,cfg.origin);
    await context.addInitScript(()=>{window.__pulseReads=()=>window.__safetyReads.filter(r=>{const q=new URLSearchParams(r.query);return r.path==='/rest/v1/gematria_words'&&q.get('is_verified')==='eq.true'&&q.get('is_published')==='eq.true'&&['phrase','phrase,ragil,created_at,visibility_changed_at'].includes(q.get('select'));});});
    if(mode==='held-import-cancel'){const gate=new Promise(r=>release=r);await context.route('**/assets/home2029Projection-*.js',async route=>{held=true;item.heldModule=new URL(route.request().url()).pathname;await gate;await route.continue().catch(()=>{});});}
    if(mode==='failed-import-reload')await context.route('**/assets/home2029Projection-*.js',async route=>{if(!failed){failed=true;item.failedModule=new URL(route.request().url()).pathname;await route.abort('failed');}else await route.continue();});
    const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>item.errors.push(e.message.slice(0,500)));page.on('request',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/assets/')&&p.endsWith('.js'))item.chunks.push(p);});
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://www.facebook.com/tr*','*://connect.facebook.net/*','*://*.clarity.ms/*',...(cfg.blockExternalVercelToolbar?['https://vercel.live/_next-live/feedback/feedback.js']:[])]});
    const home=cfg.origin+'/?home-import-admission=1';const openHome=async()=>{const r=await page.goto(home,{waitUntil:'commit'});assert.equal(r.status(),200);await expect(page.locator('[data-home-primary="ready"]')).toBeVisible();await expect(page.locator('.h29-hero2 h1')).toBeVisible();};
    const summary=page.locator('.h29-quiet');const primary=page.locator('.h29-hero2 .h29-actions a.is-primary').first();
    const pulse=()=>page.evaluate(()=>window.__pulseReads());
    const waitPulse=()=>page.waitForFunction(()=>{const rows=window.__pulseReads();return rows.length>=6&&rows.every(r=>r.end!=null);},null,{timeout:45000});
    await openHome();item.initialChunks=[...item.chunks];assert.ok(!item.chunks.some(p=>/home2029Projection-|GoldenProjectorModeLayer2029-/.test(p)),'non-admitted Home summary reader and admin projector code stays absent');assert.equal((await pulse()).length,0);item.checks.push('primary-real-content-before-summary-module/no-pulse-reads/no-admin-projector');
    await summary.scrollIntoViewIfNeeded();
    if(mode==='held-import-cancel'){
     await expect.poll(()=>held,{timeout:15000}).toBe(true);assert.equal((await pulse()).length,0);await expect(primary).toHaveAttribute('href',cfg.expectedPrimaryPost||'/post/sprites-lightning-over-france');await primary.click();await expect(page.locator('.sod29-reading-source')).toBeVisible();release();await page.waitForTimeout(1200);assert.equal((await pulse()).length,0,'aborted Home must not start pulse reads after import completion');await expect(page.locator('.h29-quiet')).toHaveCount(0);item.checks.push('held-module-does-not-block-primary-or-post/late-import-does-not-read-aborted-home');
    }else if(mode==='failed-import-reload'){
     await expect.poll(()=>failed,{timeout:15000}).toBe(true);await expect(summary).not.toContainText('בודק מה זז עכשיו');assert.equal((await pulse()).length,0);await expect(page.locator('[data-home-primary="ready"]')).toBeVisible();await page.reload({waitUntil:'commit'});await expect(page.locator('[data-home-primary="ready"]')).toBeVisible();await summary.scrollIntoViewIfNeeded();await waitPulse();await expect(summary).toContainText('ביטויים במאגר');item.checks.push('module-failure-keeps-primary/does-not-fake-data/reload-recovers-real-summary');
    }else{
     await waitPulse();item.pulseReads=await pulse();assert.ok(item.pulseReads.every(r=>r.status>=200&&r.status<300),'admitted public pulse reads succeed');await expect(summary).toContainText('ביטויים במאגר');assert.ok(item.chunks.some(p=>/home2029Projection-/.test(p)));await expect(primary).toHaveAttribute('href',cfg.expectedPrimaryPost||'/post/sprites-lightning-over-france');await primary.click();await expect(page.locator('.sod29-reading-source')).toBeVisible();item.checks.push('approach-loads-existing-real-summary/primary-post-still-readable');
    }
    assert.ok(!item.chunks.some(p=>/GoldenProjectorModeLayer2029-/.test(p)),'guest Post must not load admin-only projector');assert.deepEqual(item.errors,[]);item.snapshot=await page.evaluate(()=>({path:location.pathname,controller:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__safetyDenied,pulse:window.__pulseReads(),shifts:window.__nativeShifts}));assert.match(item.snapshot.controller||'',/preview-readonly-sw/);assert.deepEqual(item.snapshot.denied,[]);item.checks.push('guest-admin-boundary/no-denials/no-pageerrors/actual-SW');await page.screenshot({path:`${out}/${mode}.png`});item.ok=true;
   }catch(e){item.ok=false;item.failure={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1200)};}finally{release();await context.close();fs.writeFileSync(out+'/admission.json',JSON.stringify(report,null,2)+'\n');}
  }
 }catch(e){report.fatal={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1200)};}finally{await browser?.close();report.ok=!report.fatal&&report.cases.every(c=>c.ok);fs.writeFileSync(out+'/admission.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,cases:report.cases.map(c=>({mode:c.mode,ok:c.ok,checks:c.checks,failure:c.failure})),fatal:report.fatal}));process.exitCode=report.ok?0:1;}
});
