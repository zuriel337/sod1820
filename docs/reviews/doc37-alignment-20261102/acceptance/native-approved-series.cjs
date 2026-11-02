// Exact deployed source association acceptance. Native cases use actual public
// data and SW. Explicit fetch-response fault cases are separate, never timing
// or real publication evidence. No account, model, mail or product writes.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.SOD_COLD_OUT;if(!out)throw Error('SOD_COLD_OUT required');
fs.mkdirSync(out,{recursive:true,mode:0o700});
const ID='9d4e6b80-f52b-4461-9231-ca30f37f0db9',ASSET='25e378462b55298219e5f7562698bfa7';
const REF='channel_updates:'+ID,KEY='messages-from-righteous';
const SERIES='/2029/posts?series='+KEY;
const safeText=v=>String(v).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1800);
const cls=rows=>{let best=0,sum=0,first=0,last=0;for(const r of (rows||[]).filter(x=>!x.hadRecentInput)){if(!sum||r.time-last>1000||r.time-first>5000){sum=r.value;first=r.time;}else sum+=r.value;last=r.time;best=Math.max(best,sum);}return best;};
async function fault(context,mode){
 if(!mode)return;
 await context.addInitScript(({mode,ID})=>{
  const native=window.fetch.bind(window);window.__seriesFaults=[];
  window.fetch=async(input,init)=>{
   const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url);
   const source=req.method==='GET'&&u.pathname==='/rest/v1/channel_updates'&&u.searchParams.get('id')==='eq.'+ID;
   const posts=req.method==='GET'&&u.pathname==='/rest/v1/posts'&&u.searchParams.get('limit')==='24'&&u.searchParams.get('order')==='date.desc.nullslast,id.asc';
   if(!source&&!(posts&&mode==='duplicate-post'))return native(req);
   if(source){window.__seriesFaults.push({mode,path:u.pathname,at:performance.now()});
    if(mode==='source-failed')return new Response(JSON.stringify({code:'XX000',message:'controlled_source_failure'}),{status:500,headers:{'content-type':'application/json'}});
    if(mode==='private'||mode==='expired')return new Response(JSON.stringify([{id:ID,channel:'or-geula',status:'live',page_only:mode==='private',expires_at:mode==='expired'?'2000-01-01T00:00:00Z':null,created_at:'2026-08-04T18:50:31Z',text:'CONTROLLED PRIVATE SOURCE MUST NOT RENDER'}]),{status:200,headers:{'content-type':'application/json'}});
    const response=await native(req);
    if(mode==='pending'||mode==='cancel')await new Promise(r=>setTimeout(r,1800));
    return response;
   }
   const response=await native(req),rows=await response.clone().json();
   if(!Array.isArray(rows)||!rows.length)return response;
   window.__seriesFaults.push({mode,path:u.pathname,duplicates:1,originalRows:rows.length});
   return new Response(JSON.stringify([...rows,rows[0]]),{status:response.status,headers:response.headers});
  };
 },{mode,ID});
}
require('node:readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),report={sha:cfg.sha,origin:cfg.origin,deploymentId:cfg.deploymentId,actualSW:true,productWrites:0,modelCalls:0,videoPlayback:false,cases:[]};let browser;
 const flush=()=>fs.writeFileSync(out+'/series.json',JSON.stringify(report,null,2)+'\n');
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:cfg.headed!==true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const scenarios=cfg.seriesScenarios||[{width:390,mode:null},{width:1440,mode:null},...['pending','source-failed','private','expired','duplicate-post','cancel'].map(mode=>({width:390,mode}))];
  for(const {width,mode} of scenarios){
   const item={width,mode:mode||'native',realPublicData:!mode,controlledFixture:Boolean(mode),checks:[]};report.cases.push(item);let context,page;
   try{
    context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});if(cfg.accessUrl)await context.request.get(cfg.accessUrl);
    const identity=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(identity.status(),200);assert.equal((await identity.json()).sha,cfg.sha);
    await require('./native-home-read-only-guard.cjs')(context,cfg.origin);await fault(context,mode);
    page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];item.errors=errors;page.on('pageerror',e=>errors.push(safeText(e.message)));
    const card=page.locator(`[data-series-source="${REF}"]`),postCards=page.locator('[data-series-kind="post"]');
    if(!mode){
     await page.goto(cfg.origin+'/?approved-series=acceptance',{waitUntil:'domcontentloaded'});
     await expect(page.locator('[data-home-primary="ready"]')).toBeVisible();await expect(page.locator('[data-home-public-series="true"]')).toHaveAttribute('aria-busy','false');
     item.initialReads=await page.evaluate(()=>window.__safetyReads.filter(r=>r.path==='/rest/v1/posts'||r.path==='/rest/v1/channel_updates'||r.path==='/rest/v1/video_media_assets_v1').map(r=>({path:r.path,method:r.method,query:r.query,status:r.status})));
     assert.ok(!item.initialReads.some(r=>r.query?.includes(ID)||r.query?.includes(ASSET)),'approved source/asset is not requested by initial Home');
     item.checks.push('Home-no-approved-source-or-asset-GET');
     await page.locator(`[data-home-series="${KEY}"] .h29-series-name`).click();
    }else await page.goto(cfg.origin+SERIES,{waitUntil:'domcontentloaded'});
    await expect(page.locator('.sod29-posts-library h1')).toHaveText('מסרים מצדיקים');
    if(mode==='cancel'){
     await page.waitForFunction(()=>window.__seriesFaults?.some(x=>x.mode==='cancel'));
     await page.locator('.sod29-posts-library-back').click();await expect(page.locator('.sod29-posts-library h1')).toHaveText('פוסטים');await page.waitForTimeout(2300);
     await expect(card).toHaveCount(0);assert.equal(new URL(page.url()).search,'');item.checks.push('late-source-result-not-rendered-after-scope-change');
    }else{
     await expect(postCards.first()).toBeVisible();
     if(mode==='pending'){await expect(page.getByText('טוען את המקור הנוסף בסדרה…',{exact:true})).toBeVisible();item.checks.push('readable-Posts-do-not-wait-for-source');}
     if(['source-failed','private','expired'].includes(mode)){
      await expect(page.getByText('המקור הנוסף בסדרה לא זמין כרגע. הפוסטים שנקראו נשארים זמינים.',{exact:true})).toBeVisible();
      await expect(card).toHaveCount(0);await expect(page.getByText('אין פוסטים בעמוד הזה',{exact:true})).toHaveCount(0);
      await expect(page.getByText('CONTROLLED PRIVATE SOURCE MUST NOT RENDER',{exact:false})).toHaveCount(0);
      item.checks.push('source-denied-or-failed-is-not-empty/Posts-preserved');
     }else{
      await expect(card).toHaveCount(1);await expect(card).toBeVisible();
      await expect(card).toContainText('אור הגאולה');await expect(card).toContainText('הרב אלדד שמואלי');await expect(card).toContainText('2026');
      await expect(card.locator('a').first()).toHaveAttribute('href','/video/'+ASSET);
      await expect(page.locator('.sod29-posts-library-stage-head')).toContainText('פריטים');
      item.cards=await page.locator('#posts-catalog .sod29-library-post-card').evaluateAll(rows=>rows.map(row=>({ref:row.dataset.seriesSource,kind:row.dataset.seriesKind,href:row.querySelector('a').getAttribute('href'),title:row.querySelector('h2').textContent,meta:row.querySelector('.sod29-library-post-meta').textContent})));
      assert.equal(new Set(item.cards.map(x=>x.ref)).size,item.cards.length,'no duplicate identities in displayed list');
      item.checks.push('one-exact-source/public-credit/speaker/publication/native-video-href/distinct-posts');
      if(!mode){
       const reads=await page.evaluate(()=>window.__safetyReads.map(r=>({path:r.path,method:r.method,query:r.query,status:r.status})));
       item.selectedReads=reads.filter(r=>r.query?.includes(ID)||r.query?.includes(ASSET)||r.path==='/rest/v1/posts'&&r.method==='HEAD');
       assert.equal(reads.filter(r=>r.path==='/rest/v1/channel_updates'&&r.query?.includes(ID)).length,1);
       assert.equal(reads.filter(r=>r.path==='/rest/v1/video_media_assets_v1'&&r.query?.includes(ASSET)).length,1);
       assert.ok(item.selectedReads.filter(r=>r.path==='/rest/v1/video_media_assets_v1').every(r=>!r.query.includes('placements')));
       item.checks.push('one-source-plus-one-minimal-asset-read/bounded-rank-HEAD');
       const older=page.getByRole('button',{name:'פוסטים קודמים',exact:true});
       if(await older.isEnabled()){
        const firstRefs=item.cards.map(row=>row.ref);await older.click();
        await expect(page.locator('#posts-catalog')).toHaveAttribute('data-posts-page','2');
        await expect(page.getByText('טוען את המקור הנוסף בסדרה…',{exact:true})).toHaveCount(0);
        await expect(card).toHaveCount(0);
        const secondRefs=await page.locator('#posts-catalog [data-series-source]').evaluateAll(rows=>rows.map(row=>row.dataset.seriesSource));
        assert.ok(secondRefs.length>0&&secondRefs.length<=24,'second page bounded and nonempty');
        assert.equal(new Set(secondRefs).size,secondRefs.length);assert.deepEqual(secondRefs.filter(ref=>firstRefs.includes(ref)),[],'no duplicated identity across adjacent pages');
        item.pagination={firstRefs,secondRefs};await page.goBack();
        await expect(page.locator('#posts-catalog')).toHaveAttribute('data-posts-page','1');await expect(card).toBeVisible();
        item.checks.push('real-page2/bounded/distinct-identities/exact-page1-back');
       }
       await card.scrollIntoViewIfNeeded();await page.waitForTimeout(250);const before={url:page.url(),scroll:await page.evaluate(()=>scrollY)};await page.screenshot({path:`${out}/source-${width}.png`});
       await card.locator('a').first().click();await expect(page.getByRole('button',{name:'נגן סרטון',exact:true})).toBeVisible({timeout:30000});
       assert.equal(new URL(page.url()).pathname,'/video/'+ASSET);await expect(page.locator('.sod29-root')).toBeVisible();await expect(page.locator('video,iframe')).toHaveCount(0);
       item.video={url:new URL(page.url()).pathname,titles:await page.locator('h1').allTextContents(),playbackStarted:false};await page.screenshot({path:`${out}/video-${width}.png`});
       await page.goBack();await expect(card).toBeVisible();await page.waitForTimeout(600);item.return={before,after:{url:page.url(),scroll:await page.evaluate(()=>scrollY)}};
       assert.equal(item.return.after.url,before.url);assert.ok(Math.abs(item.return.after.scroll-before.scroll)<=2,'exact series scroll return');
       item.checks.push('real2029-video-ready/no-autoplay/exact-series-return');
       await page.goForward();await expect(page.getByRole('button',{name:'נגן סרטון',exact:true})).toBeVisible({timeout:30000});assert.equal(new URL(page.url()).pathname,'/video/'+ASSET);
       await page.goBack();await expect(card).toBeVisible();await page.waitForTimeout(600);assert.equal(page.url(),before.url);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before.scroll)<=2,'exact return after forward');item.checks.push('browser-forward/video/back-restoration');
       item.preReloadCls=cls(await page.evaluate(()=>window.__nativeShifts));assert.ok(item.preReloadCls<=.1,'whole native journey CLS<=0.1 before reload');
       const response=await page.reload({waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await expect(card).toHaveCount(1);await expect(postCards.first()).toBeVisible();item.checks.push('direct-refresh-native-series');
      }
     }
    }
    item.snapshot=await page.evaluate(()=>({controller:navigator.serviceWorker.controller?.scriptURL?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__safetyDenied,reads:(window.__safetyReads||[]).map(r=>({path:r.path,query:r.query,method:r.method,status:r.status,error:r.error?String(r.error).slice(0,120):null})),faults:window.__seriesFaults||[],shifts:window.__nativeShifts,geometry:{client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}}));
    if(mode)assert.ok(item.snapshot.faults.some(row=>row.mode===mode),'requested controlled fixture actually triggered');
    if(mode==='duplicate-post')assert.ok(item.snapshot.faults.some(row=>row.path==='/rest/v1/posts'&&row.duplicates===1),'duplicate Post fixture actually delivered');
    if(['source-failed','private','expired'].includes(mode))assert.ok(!item.snapshot.reads.some(row=>row.path==='/rest/v1/video_media_assets_v1'&&row.query?.includes(ASSET)),'source denial stops before asset read');
    item.cls=cls(item.snapshot.shifts);assert.ok(item.cls<=.1,'CLS<=0.1');assert.ok(item.snapshot.geometry.scroll<=item.snapshot.geometry.client,'no horizontal overflow');assert.match(item.snapshot.controller||'',/preview-readonly-sw/);assert.deepEqual(errors,[]);item.errors=errors;item.ok=true;
    await page.screenshot({path:`${out}/${mode||'native'}-${width}.png`,fullPage:true});
   }catch(error){item.ok=false;item.failure={name:error.name,message:safeText(error.message)};if(page){await page.screenshot({path:`${out}/failure-${mode||'native'}-${width}.png`,fullPage:true}).catch(()=>{});item.failureState=await page.evaluate(()=>({path:location.pathname+location.search,heads:[...document.querySelectorAll('h1')].map(x=>x.textContent),source:document.querySelector('[data-series-kind="channel_update"]')?.textContent,statuses:[...document.querySelectorAll('[role=status]')].map(x=>x.textContent),denied:window.__safetyDenied,reads:window.__safetyReads?.map(r=>({path:r.path,query:r.query,method:r.method,status:r.status,error:r.error})),faults:window.__seriesFaults||[]})).catch(()=>null);}}
   finally{await context?.close();flush();console.log(JSON.stringify({width,mode:item.mode,ok:item.ok,checks:item.checks,failure:item.failure}));}
  }
 }catch(error){report.fatal={name:error.name,message:safeText(error.message)};}
 finally{await browser?.close();report.ok=!report.fatal&&report.cases.length>0&&report.cases.every(x=>x.ok);flush();process.exitCode=report.ok?0:1;}
});
