// Missing per-route measurement only: real public data, real SW, deny-only guard.
// Three independent contexts per width, cold document then warm repeat in same
// context. Every observation retained. No model/mail/login/product writes.
const {chromium,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:45000});
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.SOD_COLD_OUT;fs.mkdirSync(out,{recursive:true,mode:0o700});
const selector={home:'.h29-hero2 h1',post:'.sod29-reading-source',world:'.sod29-world-featured-connections .sod29-world-catalog-card',number:'.sod29-number-page'};
function cls(rows){let best=0,sum=0,first=0,last=0;for(const r of rows.filter(r=>!r.hadRecentInput)){if(!sum||r.time-last>1000||r.time-first>5000){sum=r.value;first=r.time;}else sum+=r.value;last=r.time;best=Math.max(best,sum);}return best;}
require('node:readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),report={sha:cfg.sha,origin:cfg.origin,actualSW:true,realPublicData:true,productWrites:0,modelCalls:0,conditions:{height:900,mobile:{cpu:4,latency:150,download:200000,upload:100000},desktop:'unthrottled',cold:'new context; first route loop',warm:'reload Home and repeat route loop in same context',readsSettled:'all currently observed admitted REST reads finished, no new completion for250ms; excludes deferred unrequested sections'},trials:[]};let browser;
 const flush=()=>fs.writeFileSync(out+'/stage-timings.json',JSON.stringify(report,null,2)+'\n');
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:false,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of cfg.widths||[390,1440])for(let trial=1;trial<=3;trial++){
   const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
   try{
    if(cfg.accessUrl)await context.request.get(cfg.accessUrl);const id=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(id.status(),200);assert.equal((await id.json()).sha,cfg.sha);
    await require('../../home-light-reading-now-20261102/native-read-only-guard.cjs')(context,cfg.origin);
    await context.addInitScript(()=>{
     window.__routePhases=[];let last='';const sample=()=>{const n=document.querySelector('.sod29-number-page'),method=n&&[...n.querySelectorAll('.sod29-number-v10-method-card')].find(e=>e.textContent.includes('מילוי'));const state={path:location.pathname+location.search+location.hash,home:!!document.querySelector('.h29-hero2 h1'),post:!!document.querySelector('.sod29-reading-source'),world:!!document.querySelector('.sod29-world-featured-connections .sod29-world-catalog-card'),number:n?.dataset.numberRoot||null,expression:document.querySelector('.sod29-number-v10-expression-line>strong')?.textContent||null,material:n?.dataset.materialState||null,methodsReady:!!method&&!method.disabled};const key=JSON.stringify(state);if(key!==last){last=key;window.__routePhases.push({time:performance.now(),...state});}};new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});
    });
    const page=await context.newPage();page.setDefaultTimeout(45000);const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://www.facebook.com/tr*','*://connect.facebook.net/*','*://*.clarity.ms/*']});if(width<=390){await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});}
    for(const state of ['cold','warm']){
     const item={width,trial,state,steps:[],errors:[]};report.trials.push(item);const onError=e=>item.errors.push(e.message.slice(0,300));page.on('pageerror',onError);flush();
     const expr='אחת ארבע שבע ושתיים';let numberAddress,postAddress,worldAddress,homeScroll;
     const now=()=>page.evaluate(()=>performance.now());
     const waitReadFinish=()=>page.waitForFunction(()=>{const rows=(window.__safetyReads||[]).filter(r=>r.path.startsWith('/rest/v1/'));return rows.every(r=>r.end!=null)&&performance.now()-Math.max(0,...rows.map(r=>r.end||r.start))>=250;},null,{timeout:45000});
     async function number(n,text){await expect(page.locator(selector.number)).toHaveAttribute('data-number-root',String(n));await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText(text);await expect(page.getByRole('dialog')).toHaveCount(0);}
     async function step(name,action,readiness,kind,n,text){
      const row={name,start:name==='enter-home'?0:await now()};item.steps.push(row);await action();await readiness();row.driverReady=await now();
      row.useful=await page.evaluate(({start,kind,n,text})=>{const match=r=>kind==='number'?r.number===String(n)&&r.expression===text:r[kind]===true;return window.__routePhases.find(r=>r.time>=start&&match(r))?.time||null;},{start:row.start,kind,n,text});
      if(kind==='number'){await expect(page.locator(selector.number)).toHaveAttribute('data-material-state','ready');await expect(page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first()).toBeEnabled();row.materialAndMethods=await page.evaluate(({start,n,text})=>window.__routePhases.find(r=>r.time>=start&&r.number===String(n)&&r.expression===text&&r.material==='ready'&&r.methodsReady)?.time||performance.now(),{start:row.start,n,text});}
      await waitReadFinish();row.readsSettledObservedAt=await now();row.lastInitialReadEnd=await page.evaluate(start=>Math.max(start,...window.__safetyReads.filter(r=>r.path.startsWith('/rest/v1/')&&r.start>=start&&r.end!=null).map(r=>r.end)),row.start);row.endPath=new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash;
      row.usefulMs=row.useful===null?null:row.useful-row.start;row.materialAndMethodsMs=row.materialAndMethods==null?null:row.materialAndMethods-row.start;row.initialReadMs=row.lastInitialReadEnd-row.start;flush();
     }
     async function navWorld(){if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'העולם',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('link',{name:'העולם',exact:true}).click();}
     const home=cfg.origin+'/?stage-acceptance=1&keep=one&keep=two#home-source';
     try{
      await step('enter-home',()=>page.goto(home,{waitUntil:'domcontentloaded'}),()=>expect(page.locator(selector.home)).toBeVisible(),'home');assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/preview-readonly-sw/);
      const first=page.locator('.h29-card-open[href="/post/mah-kore-elections-mutual-responsibility"]').first();await expect(first).toBeVisible();await first.scrollIntoViewIfNeeded();homeScroll=await page.evaluate(()=>scrollY);
      await step('home-post',()=>first.click(),()=>expect(page.locator(selector.post)).toBeVisible(),'post');postAddress=page.url();
      await step('post-world',navWorld,()=>expect(page.locator(selector.world).first()).toBeVisible(),'world');worldAddress=page.url();
      await step('world-number-full',async()=>{await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const panel=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});await panel.locator('input').first().fill(expr);await panel.locator('input').first().press('Enter');await expect(panel.locator('[data-number-core-root="1820"]')).toBeVisible();await panel.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();},()=>number(1820,expr),'number',1820,expr);numberAddress=page.url();
      await step('number-milui',()=>page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first().click(),()=>number(3928,expr),'number',3928,expr);assert.equal(new URL(page.url()).searchParams.get('method'),'מילוי');
      await step('milui-number-back',()=>page.goBack(),async()=>{await expect(page).toHaveURL(numberAddress);await number(1820,expr);},'number',1820,expr);
      await step('number-phrase',async()=>{const search=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await search.fill('בראשית');await search.press('Enter');},()=>number(913,'בראשית'),'number',913,'בראשית');
      await step('phrase-number-back',()=>page.goBack(),async()=>{await expect(page).toHaveURL(numberAddress);await number(1820,expr);},'number',1820,expr);
      await step('number-world-back',()=>page.goBack(),async()=>{await expect(page).toHaveURL(worldAddress);await expect(page.locator(selector.world).first()).toBeVisible();},'world');
      await step('world-post-back',()=>page.goBack(),async()=>{await expect(page).toHaveURL(postAddress);await expect(page.locator(selector.post)).toBeVisible();},'post');
      await step('post-home-back',()=>page.goBack(),async()=>{await expect(page).toHaveURL(home);await expect(page.locator(selector.home)).toBeVisible();},'home');await page.waitForTimeout(400);item.homeScroll=homeScroll;item.restoredHomeScroll=await page.evaluate(()=>scrollY);assert.ok(Math.abs(item.restoredHomeScroll-homeScroll)<=4);
      await step('home-world-repeat',navWorld,()=>expect(page.locator(selector.world).first()).toBeVisible(),'world');await step('world-home-back',()=>page.goBack(),async()=>{await expect(page).toHaveURL(home);await expect(page.locator(selector.home)).toBeVisible();},'home');
      assert.deepEqual(item.errors,[]);item.ok=true;
     }catch(e){item.ok=false;item.failure={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,900),phase:item.steps.at(-1)?.name};await page.screenshot({path:`${out}/failure-${width}-${trial}-${state}.png`}).catch(()=>{});}
     item.snapshot=await page.evaluate(()=>({phases:window.__routePhases,shifts:window.__nativeShifts,reads:window.__safetyReads,denied:window.__safetyDenied,controller:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null})).catch(()=>null);item.documentCls=cls(item.snapshot?.shifts||[]);item.stabilityOk=item.documentCls<=0.1;page.off('pageerror',onError);flush();console.log(JSON.stringify({width,trial,state,ok:item.ok,cls:item.documentCls,steps:item.steps.length,failure:item.failure}));
    }
    await cdp.detach();
   }finally{await context.close();}
  }
 }catch(e){report.fatal={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,900)};}finally{await browser?.close();report.ok=!report.fatal&&report.trials.every(x=>x.ok&&x.stabilityOk);flush();console.log(JSON.stringify({complete:true,ok:report.ok,trials:report.trials.length,fatal:report.fatal}));process.exitCode=report.ok?0:1;}
});
