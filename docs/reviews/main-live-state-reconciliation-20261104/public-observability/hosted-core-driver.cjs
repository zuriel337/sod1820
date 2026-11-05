const {chromium,expect}=require('@playwright/test'),fs=require('node:fs'),assert=require('node:assert/strict');
const cfg=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),out='/tmp/sod-observability-hosted-core';fs.mkdirSync(out,{recursive:true});
const agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 SOD1820-RELEASE-ACCEPTANCE';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--user-agent='+agent],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});const report={sha:cfg.sha,origin:cfg.origin,realSW:true,responseMocks:false,intentionalProductWrites:0,rows:[]};
try{for(const width of [390,1440]){const context=await browser.newContext({viewport:{width,height:950},userAgent:agent,locale:'he-IL'});
 if(cfg.accessUrl)await context.request.get(cfg.accessUrl);
 await require('/workspace/sod1820-bd-approved/docs/reviews/public-launch-useful-loading-20261102/native-read-only-guard.cjs')(context,cfg.origin);
 await context.addInitScript(()=>{try{localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000));}catch(e){window.__harnessSeedDenied=e.name;}});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
 for(const [path,selector,root] of [['/','[data-home-primary="ready"]'],['/world','.sod29-root h1'],['/number/1820','.sod29-number-page','1820'],['/number/משיח','.sod29-number-page','358']]){
  const start=Date.now(),response=await page.goto(cfg.origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await page.locator(selector).first().waitFor({state:'visible'});
  if(root)await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',root);
  if(path==='/')await expect(page.locator('[data-home-top-updates]')).toHaveAttribute('data-home-top-updates','public-closed');
  if(path==='/world')assert.ok((await page.locator('.sod29-root h1').first().textContent()).includes('עולם'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  const row={path,width,status:response.status(),usefulContentMs:Date.now()-start,numberRoot:root||null,canonical:await page.locator('link[rel="canonical"]').getAttribute('href'),errors:[...errors],pass:true};
  row.harnessSeedScopes=await Promise.all(page.frames().map(f=>f.evaluate(()=>({top:window===window.top,seedDenied:window.__harnessSeedDenied||null,opaqueOrigin:location.origin==='null'})).catch(()=>({frameDetached:true}))));assert.deepEqual(errors,[]);report.rows.push(row);await page.screenshot({path:out+'/'+width+'-'+(root||path.replaceAll('/','')||'home')+'.png'});
 }
 const exact=page.url();await page.goBack();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820');await page.goForward();assert.equal(page.url(),exact);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','358');
 assert.equal(new URL(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).pathname,'/sw.js');
 report.rows.push({width,exactNumberPhraseBackForward:true,workerVerified:true,pass:true});
 fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');await context.close();}
 console.log(JSON.stringify({rows:report.rows.length,pass:report.rows.every(x=>x.pass)}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
