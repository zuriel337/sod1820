// Attribution only. Real public replies and real SW, with an explicitly
// controlled1200ms delay on Topic reply consumption. No fake responses/writes.
const {chromium,expect}=require('@playwright/test');const fs=require('fs'),assert=require('assert/strict');
const outDir=process.env.SOD_NATIVE_PERF_EVIDENCE;fs.mkdirSync(outDir,{recursive:true});
require('readline').createInterface({input:process.stdin}).once('line',async line=>{const c=JSON.parse(line);let browser;const out={sha:c.sha,controlledTopicDelayMs:1200,mockResponses:false,realServiceWorker:true,productWrites:0,modelCalls:0,cases:[]};try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});await context.request.get(c.accessUrl);assert.equal((await(await context.request.get(c.origin+'/preview-identity.json')).json()).sha,c.sha);await require('./native-read-only-guard.cjs')(context,c.origin);
 await context.addInitScript(()=>{const read=window.fetch;window.fetch=async(...args)=>{const response=await read(...args);const url=new URL(args[0] instanceof Request?args[0].url:args[0],location.href);if(url.pathname==='/rest/v1/topic_cards_public')await new Promise(r=>setTimeout(r,1200));return response;};});
 const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});
 await page.goto(c.origin+'/?measure=controlled-topic-return');await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});
 for(let i=0;i<4;i++){
  await page.locator('.h29-card-open').first().click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
  await page.goBack();await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});
  const before=await page.evaluate(()=>({now:performance.now(),y:scrollY,geometry:[...document.querySelector('.h29').children].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON()}))}));
  await page.waitForTimeout(2200);
  const after=await page.evaluate(()=>({y:scrollY,shifts:window.__nativeShifts,geometry:[...document.querySelector('.h29').children].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON()})),denied:window.__safetyDenied}));out.cases.push({iteration:i,before,after});
 }
 assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/preview-readonly-sw/);out.ok=true;
}catch(e){out.ok=false;out.error=String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,600);}finally{await browser?.close();fs.writeFileSync(outDir+'/home-return-diagnostic.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:out.ok,error:out.error}));process.exit(out.ok?0:1);}});
