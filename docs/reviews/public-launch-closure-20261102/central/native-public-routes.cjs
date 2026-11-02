// Exact protected Preview; real public data, real worker, deny-only independent
// guard. No signed unsubscribe token, OAuth, model, account or test data write.
const {chromium,expect}=require('@playwright/test');
const fs=require('fs'),assert=require('assert/strict');
require('readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line),out=process.env.SOD_COLD_OUT,report={sha:cfg.sha,realData:true,realSW:true,productWrites:0,modelCalls:0,cases:[]};let browser;
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 try{
  const rows=require('../../public-foundation-20261101/evidence/live-posts.json');
  const old=rows.find(r=>r.id===92),modern=rows.find(r=>r.id===5112);
  const oldPath=new URL(old.link).pathname;
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,
   ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of[390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});await context.request.get(cfg.accessUrl);
   assert.equal((await(await context.request.get(cfg.origin+'/preview-identity.json')).json()).sha,cfg.sha);
   await require('./native-read-only-guard.cjs')(context,cfg.origin);
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.name+':'+e.message.slice(0,200)));
   for(const entry of[{path:oldPath,canonical:'https://sod1820.co.il'+oldPath},{path:'/post/'+modern.slug,canonical:'https://sod1820.co.il/post/'+modern.slug},{path:'/',query:'p='+old.wp_id+'&',canonical:'https://sod1820.co.il'+oldPath}]){
    const url=cfg.origin+entry.path+'?'+(entry.query||'')+'keep=one&keep=two#legacy-return';
    const response=await page.goto(url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});
    assert.equal(page.url(),url);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',entry.canonical);
    await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});assert.equal(page.url(),url);
    assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/preview-readonly-sw/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    report.cases.push({width,path:entry.path,wordpressAlias:Boolean(entry.query),status:200,exactQueryHashAndRefresh:true,canonical:entry.canonical});
   }
   for(const path of['/map','/privacy','/updates','/unsubscribe','/login','/code']){
    const response=await page.goto(cfg.origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await expect(page.locator('main.sod29-content')).toBeVisible({timeout:30000});
    if(['/updates','/unsubscribe'].includes(path))await expect(page.locator('main')).toContainText('פעולות הדיוור אינן פעילות');
    if(['/login','/code'].includes(path))await expect(page.locator('main')).toContainText('האזור ייפתח בהמשך');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    report.cases.push({width,path,status:200,serviceClosureChecked:true});
   }
   const robots=await context.request.get(cfg.origin+'/robots.txt');assert.equal(robots.status(),200);assert.match(await robots.text(),/Disallow:\s*\//);
   const xml=await context.request.get(cfg.origin+'/sitemap.xml');assert.equal(xml.status(),200);const body=await xml.text();assert.match(body,/<urlset/);assert.ok(body.includes('/gematria'));assert.ok(body.includes('/gallery'));
   assert.equal((await context.request.get(cfg.origin+'/api/preview-raziel')).status(),404);
   assert.equal((await context.request.get(cfg.origin+'/api/preview-capabilities')).status(),404);
   assert.equal((await context.request.get(cfg.origin+'/__sod_public_launch_missing_979c')).status(),404);
   assert.deepEqual(errors,[]);await page.screenshot({path:out+'/closed-service-'+width+'.png'});await context.close();
  }
  report.ok=true;
 }catch(e){report.ok=false;report.error={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1200)};}
 finally{await browser?.close();fs.writeFileSync(out+'/routes.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,cases:report.cases.length,error:report.error}));process.exit(report.ok?0:1);}
});
