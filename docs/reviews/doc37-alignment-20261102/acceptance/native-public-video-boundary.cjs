// Focused exact-Preview native/direct video acceptance and explicitly synthetic
// source failures. The single optional play is a public self-hosted GET only.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const ID='9d4e6b80-f52b-4461-9231-ca30f37f0db9',ASSET='25e378462b55298219e5f7562698bfa7';
const out=process.env.SOD_COLD_OUT;if(!out)throw Error('SOD_COLD_OUT required');fs.mkdirSync(out,{recursive:true,mode:0o700});
const safe=v=>String(v).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1500);
const cls=rows=>{let best=0,sum=0,first=0,last=0;for(const row of (rows||[]).filter(r=>!r.hadRecentInput)){if(!sum||row.time-last>1000||row.time-first>5000){sum=row.value;first=row.time;}else sum+=row.value;last=row.time;best=Math.max(best,sum);}return best;};
require('node:readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),report={sha:cfg.sha,origin:cfg.origin,actualSW:true,productWrites:0,modelCalls:0,cases:[]};let browser;
 const flush=()=>fs.writeFileSync(out+'/video-boundary.json',JSON.stringify(report,null,2)+'\n');
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:cfg.headed!==true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const mode of ['native','failed','private','expired']){
   const item={mode,realPublicData:mode==='native',controlledFixture:mode!=='native',checks:[],errors:[]};report.cases.push(item);let context,page;
   try{
    context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});if(cfg.accessUrl)await context.request.get(cfg.accessUrl);
    const identity=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(identity.status(),200);assert.equal((await identity.json()).sha,cfg.sha);
    await require('./native-home-read-only-guard.cjs')(context,cfg.origin);
    if(mode!=='native')await context.addInitScript(({mode,ID})=>{
     window.__videoFaultMode=mode;window.__videoFaults=[];const native=window.fetch.bind(window);
     window.fetch=(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url),fault=window.__videoFaultMode;
      if(fault==='native'||req.method!=='GET'||u.pathname!=='/rest/v1/channel_updates'||u.searchParams.get('id')!=='eq.'+ID)return native(req);
      window.__videoFaults.push({mode:fault,path:u.pathname});
      if(fault==='failed')return Promise.resolve(new Response(JSON.stringify({code:'XX000',message:'controlled_video_source_failure'}),{status:500,headers:{'content-type':'application/json'}}));
      return Promise.resolve(new Response(JSON.stringify([{id:ID,channel:'or-geula',status:'live',page_only:fault==='private',expires_at:fault==='expired'?'2000-01-01T00:00:00Z':null,created_at:'2026-08-04T18:50:31Z',text:'CONTROLLED PRIVATE VIDEO SOURCE MUST NOT RENDER'}]),{status:200,headers:{'content-type':'application/json'}}));
     };
    },{mode,ID});
    page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>item.errors.push(safe(e.message)));
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');let mediaBytes=0,ceilingReached=false;const mediaIds=new Set();item.mediaResponses=[];
    cdp.on('Network.responseReceived',e=>{if(e.type==='Media'){mediaIds.add(e.requestId);item.mediaResponses.push({path:new URL(e.response.url).pathname,status:e.response.status,mime:e.response.mimeType});}});
    cdp.on('Network.dataReceived',e=>{if(mediaIds.has(e.requestId)){mediaBytes+=e.encodedDataLength||e.dataLength;if(mediaBytes>8*1024*1024&&!ceilingReached){ceilingReached=true;page.evaluate(()=>{const video=document.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}}).catch(()=>{});}}});
    const response=await page.goto(cfg.origin+'/video/'+ASSET,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    const main=page.locator('main[data-experience-capability="public-video-source"]');await expect(main).toBeVisible();
    const play=page.getByRole('button',{name:'נגן סרטון',exact:true});
    if(mode==='native'){
     await expect(play).toBeVisible({timeout:30000});await expect(main).toContainText('אור הגאולה');await expect(main).toContainText('הרב אלדד שמואלי');await expect(main).toContainText('04.08.2026');await expect(page.locator('video,iframe')).toHaveCount(0);item.checks.push('native-direct/public-source-credit-date/no-autoplay');
     const reads=await page.evaluate(()=>window.__safetyReads.filter(r=>r.path==='/rest/v1/video_media_assets_v1'||r.path==='/rest/v1/channel_updates').map(r=>({path:r.path,query:r.query,method:r.method,status:r.status})));
     item.firstReads=reads;const assets=reads.filter(r=>r.path==='/rest/v1/video_media_assets_v1');assert.equal(assets.length,2);assert.equal(reads.filter(r=>r.path==='/rest/v1/channel_updates').length,1);assert.ok(assets.every(r=>!/[?&,](placements|topics|source_types|series_keys)/.test(decodeURIComponent(r.query))));item.checks.push('three-bounded-reads/no-broad-placements');
     await page.reload({waitUntil:'domcontentloaded'});await expect(play).toBeVisible({timeout:30000});await expect(page.locator('video,iframe')).toHaveCount(0);item.checks.push('direct-refresh/no-autoplay');
     if(cfg.skipPlayback){item.play={attempts:0,confirmed:null,reason:'Approved single playback already recorded on51ad; no new attempt.'};}
     else{
     // Root explicitly authorizes ONE play of this verified public self-hosted
     // item. Stop promptly on first progress,12s or8MiB; never retry playback.
     const start=Date.now();item.play={attempts:1,observationLimitMs:12000,byteCeiling:8*1024*1024,confirmed:false};
     await play.click();
     if(await page.locator('video').count()){
      try{await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.readyState>=2&&v.currentTime>0;},{},{timeout:12000});item.play.confirmed=true;}catch(e){item.play.waitOutcome=e.name;}
      item.play.state=await page.locator('video').evaluate(v=>({readyState:v.readyState,networkState:v.networkState,currentTime:v.currentTime,paused:v.paused,width:v.videoWidth,height:v.videoHeight,error:v.error?{code:v.error.code,message:v.error.message}:null}));
      await page.locator('video').evaluate(v=>{v.pause();v.removeAttribute('src');v.load();});
     }else{item.play.waitOutcome='not_selfhost_playback';await page.locator('iframe').evaluateAll(rows=>rows.forEach(row=>row.remove()));}
     item.play.elapsedMs=Date.now()-start;item.play.observedMediaBytes=mediaBytes;item.play.ceilingReached=ceilingReached;item.checks.push(item.play.confirmed?'single-public-play-confirmed-and-stopped':'single-public-play-unconfirmed-no-retry');
     }
    }else{
     await expect(main).toContainText(mode==='failed'?'לא ניתן לטעון את הסרטון':'הסרטון לא נמצא');await expect(play).toHaveCount(0);await expect(page.locator('video,iframe')).toHaveCount(0);await expect(main).not.toContainText('CONTROLLED PRIVATE VIDEO SOURCE MUST NOT RENDER');
     item.denialReads=await page.evaluate(()=>window.__safetyReads.filter(r=>r.path==='/rest/v1/video_media_assets_v1').map(r=>({query:r.query,status:r.status})));
     assert.equal(item.denialReads.length,1,'denial stops after identity and before playable metadata');assert.ok(!decodeURIComponent(item.denialReads[0].query).includes('media_url'));item.checks.push('source-denied-or-failed/no-playable-metadata/no-source-text');
     if(mode==='failed'){await page.evaluate(()=>window.__videoFaultMode='native');await main.getByRole('button',{name:'ניסיון טעינה נוסף',exact:true}).click();await expect(play).toBeVisible({timeout:30000});await expect(main).toContainText('אור הגאולה');await expect(page.locator('video,iframe')).toHaveCount(0);item.checks.push('explicit-retry-recovers-real-source-without-play');}
    }
    item.snapshot=await page.evaluate(()=>({controller:navigator.serviceWorker.controller?.scriptURL?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__safetyDenied,faults:window.__videoFaults||[],heads:[...document.querySelectorAll('h1')].map(x=>x.textContent),shifts:window.__nativeShifts,geometry:{client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},reads:window.__safetyReads.map(r=>({path:r.path,method:r.method,query:r.query,status:r.status}))}));
    item.cls=cls(item.snapshot.shifts);assert.ok(item.cls<=.1,'direct video CLS<=0.1');
    assert.match(item.snapshot.controller||'',/preview-readonly-sw/);assert.equal(item.snapshot.denied.length,0);assert.deepEqual(item.errors,[]);assert.ok(item.snapshot.geometry.scroll<=item.snapshot.geometry.client);if(mode!=='native')assert.ok(item.snapshot.faults.length>0);await page.screenshot({path:`${out}/${mode}.png`});item.ok=true;
   }catch(e){item.ok=false;item.failure={name:e.name,message:safe(e.message)};if(page)await page.screenshot({path:`${out}/failure-${mode}.png`}).catch(()=>{});}
   finally{await context?.close();flush();console.log(JSON.stringify({mode,ok:item.ok,checks:item.checks,play:item.play,failure:item.failure}));}
  }
 }catch(e){report.fatal={name:e.name,message:safe(e.message)};}
 finally{await browser?.close();report.ok=!report.fatal&&report.cases.length>0&&report.cases.every(c=>c.ok);flush();process.exitCode=report.ok?0:1;}
});
