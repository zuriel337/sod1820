// Focused return readiness/failure/user-cancellation. Exact actual Preview/SW,
// real public Posts; only the explicitly marked source delivery is controlled.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const ID='9d4e6b80-f52b-4461-9231-ca30f37f0db9',ASSET='25e378462b55298219e5f7562698bfa7';
const SERIES='/2029/posts?series=messages-from-righteous';
const out=process.env.SOD_COLD_OUT;if(!out)throw Error('SOD_COLD_OUT required');fs.mkdirSync(out,{recursive:true,mode:0o700});
require('node:readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),report={sha:cfg.sha,origin:cfg.origin,actualSW:true,controlledFixtures:true,productWrites:0,modelCalls:0,playbackAttempts:0,cases:[]};let browser;
 const flush=()=>fs.writeFileSync(out+'/return-faults.json',JSON.stringify(report,null,2)+'\n');
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:cfg.headed!==true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const mode of cfg.returnModes||['failed-readiness','user-cancel']){
   const item={mode,width:390,checks:[],errors:[]};report.cases.push(item);let context,page;
   try{
    context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});if(cfg.accessUrl)await context.request.get(cfg.accessUrl);const identity=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(identity.status(),200);assert.equal((await identity.json()).sha,cfg.sha);
    await require('./native-home-read-only-guard.cjs')(context,cfg.origin);
    await context.addInitScript(({ID})=>{
     window.__returnMode='native';window.__returnFaults=[];window.__departureY=null;window.__returnScroll=[];let previous='';
     const mark=(event,extra={})=>{const row={event,time:performance.now(),path:location.pathname+location.search,y:scrollY,height:document.documentElement.scrollHeight,...extra},key=JSON.stringify([row.path,row.y,row.height]);if(event!=='sample'||key!==previous){window.__returnScroll.push(row);previous=key;}};
     setInterval(()=>mark('sample'),100);addEventListener('wheel',e=>mark('wheel',{deltaY:e.deltaY,target:e.target?.tagName,className:String(e.target?.className||'')}),{capture:true,passive:true});addEventListener('popstate',()=>mark('popstate'));
     document.addEventListener('click',e=>{if(e.target.closest('a[href^="/video/"]'))window.__departureY=scrollY;},true);
     const native=window.fetch.bind(window);
     window.fetch=async(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(req.url),mode=window.__returnMode;
      const selected=req.method==='GET'&&u.pathname==='/rest/v1/channel_updates'&&u.searchParams.get('id')==='eq.'+ID&&u.searchParams.get('channel')==='eq.or-geula';
      if(mode==='native'||!selected)return native(req);
      window.__returnFaults.push({mode,path:u.pathname,time:performance.now()});
      if(mode==='failed-readiness')return new Response(JSON.stringify({code:'XX000',message:'controlled_return_source_failure'}),{status:500,headers:{'content-type':'application/json'}});
      const response=await native(req);await new Promise(r=>setTimeout(r,2200));return response;
     };
    },{ID});
    page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>item.errors.push(String(e.message).slice(0,600)));
    await page.goto(cfg.origin+SERIES,{waitUntil:'domcontentloaded'});const card=page.locator(`[data-series-source="channel_updates:${ID}"]`);await expect(card).toBeVisible({timeout:30000});await card.scrollIntoViewIfNeeded();await page.waitForTimeout(300);item.before=await page.evaluate(()=>scrollY);assert.ok(item.before>1000);
    await card.locator('a').first().click();await expect(page.getByRole('button',{name:'נגן סרטון',exact:true})).toBeVisible({timeout:30000});item.departureY=await page.evaluate(()=>window.__departureY);assert.equal(item.departureY,item.before);
    await page.evaluate(mode=>window.__returnMode=mode,mode);await page.goBack();await page.waitForFunction(()=>window.__returnFaults.length>0);
    if(mode==='failed-readiness'){
     await expect(page.getByText('המקור הנוסף בסדרה לא זמין כרגע.',{exact:true})).toBeVisible();await expect(page.locator('[data-series-kind="post"]').first()).toBeVisible();await expect(card).toHaveCount(0);await page.waitForTimeout(600);item.after=await page.evaluate(()=>scrollY);assert.ok(Math.abs(item.after-item.before)<=2,'settled source failure still restores available catalog coordinate');item.checks.push('failure-settles/Posts-retained/no-fake-source/exact-coordinate');
    }else{
     await expect(page.getByText('טוען את המקור הנוסף בסדרה…',{exact:true})).toBeVisible();await page.mouse.move(190,450);await page.mouse.wheel(0,-10000);await page.waitForTimeout(350);item.firstStopY=await page.evaluate(()=>scrollY);item.firstWheel=await page.evaluate(()=>window.__returnScroll.find(row=>row.event==='wheel'));
     assert.equal(item.firstWheel?.deltaY,-10000,'first actual wheel received by page');assert.ok(Math.abs(item.firstStopY-item.firstWheel.y)<=2,'first wheel stops in-flight native restoration at actual event position');
     // Isolated Chromium evidence proves that its interrupting first wheel can
     // stop native smooth motion without applying that same event's delta.
     // Continued genuine wheel input, never JS delta simulation, must still work.
     for(let i=0;i<3;i++){await page.mouse.wheel(0,-400);await page.waitForTimeout(100);}
     await page.waitForTimeout(350);item.userSelectedY=await page.evaluate(()=>scrollY);assert.equal(item.userSelectedY,0,'continued actual wheel reaches the intended top position');
     await expect(card).toBeVisible({timeout:30000});await expect(page.getByText('טוען את המקור הנוסף בסדרה…',{exact:true})).toBeHidden();await page.waitForTimeout(600);item.after=await page.evaluate(()=>scrollY);item.scrollTimeline=await page.evaluate(()=>window.__returnScroll);assert.ok(Math.abs(item.after-item.userSelectedY)<=2,'late completion must not override real wheel intent');assert.notEqual(item.after,item.before);item.checks.push('first-wheel-stops/continued-wheel-reaches-top/no-late-jump');
    }
    assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,SERIES);await expect(page.locator('video,iframe')).toHaveCount(0);assert.deepEqual(item.errors,[]);item.snapshot=await page.evaluate(()=>({controller:navigator.serviceWorker.controller?.scriptURL?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__safetyDenied,faults:window.__returnFaults}));assert.match(item.snapshot.controller||'',/preview-readonly-sw/);assert.equal(item.snapshot.denied.length,0);await page.screenshot({path:`${out}/${mode}.png`});item.ok=true;
   }catch(e){item.ok=false;item.failure={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1300)};if(page)await page.screenshot({path:`${out}/failure-${mode}.png`}).catch(()=>{});}
   finally{await context?.close();flush();console.log(JSON.stringify(item));}
  }
 }catch(e){report.fatal={name:e.name,message:String(e.message).slice(0,700)};}
 finally{await browser?.close();report.ok=!report.fatal&&report.cases.length>0&&report.cases.every(item=>item.ok);flush();process.exitCode=report.ok?0:1;}
});
