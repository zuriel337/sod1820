// Affected public address and Number-source paths on the exact deployed client.
// Real public content + real SW, independent deny-only guard, no mock replies.
const {chromium,expect}=require('@playwright/test'),fs=require('fs'),assert=require('assert/strict');
const outDir=process.env.SOD_NATIVE_PERF_EVIDENCE;fs.mkdirSync(outDir,{recursive:true});
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{input.close();const cfg=JSON.parse(line),out={sha:cfg.sha,realSW:true,mockResponses:false,productWrites:0,modelCalls:0,cases:[]};let browser,page;
try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of[390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});await context.request.get(cfg.accessUrl);assert.equal((await(await context.request.get(cfg.origin+'/preview-identity.json')).json()).sha,cfg.sha);await require('./native-read-only-guard.cjs')(context,cfg.origin);page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push(e.message.slice(0,200));});
 const wp='/?p=34200&part=2&part=7#post-gematria';await page.goto(cfg.origin+wp);await expect(page.locator('.sod29-reading-source')).toBeVisible();await expect(page.locator('.h29-hero')).toHaveCount(0);assert.equal(page.url(),cfg.origin+wp);assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/preview-readonly-sw/);
 const oldCanonical=await page.locator('link[rel=canonical]').getAttribute('href');assert.ok(!new URL(oldCanonical).pathname.startsWith('/post/'));await page.reload();await expect(page.locator('.sod29-reading-source')).toBeVisible();assert.equal(page.url(),cfg.origin+wp);
 await page.goto(cfg.origin+'/number/1820');await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-material-state','ready');
 const section=page.locator('#number-content-live');await section.scrollIntoViewIfNeeded();await expect(section.getByText('טוען פרטי מקורות ציבוריים…',{exact:true})).toHaveCount(0);const before=await section.locator('[data-public-source-card]').count();const action=section.getByRole('button',{name:'הצגת ממצאים למספר',exact:true});await expect(action).toBeVisible();await action.click();await expect(action).toHaveCount(0);const publicEntry=page.getByRole('region',{name:'ממצאים ציבוריים למספר',exact:true});
 await expect(publicEntry.getByText('טוען ממצאים…',{exact:true})).toHaveCount(0);await expect(publicEntry.getByText('הממצאים אינם זמינים כרגע. אפשר לנסות שוב.',{exact:true})).toHaveCount(0);
 await expect(section.getByRole('alert')).toHaveCount(0);
 const findingCards=await publicEntry.locator('.zvi-research__card').count();
 const findingOutcome=findingCards?'public_findings':await publicEntry.innerText();
 const links=await section.locator('a[href]').evaluateAll(a=>a.map(e=>e.getAttribute('href')));assert.ok(links.every(h=>!/^javascript:|^\/\//.test(h)&&!h.includes('/2029/me')&&!h.includes('token=')));
 out.cases.push({width,wpAddress:wp,wordpressPreserved:true,oldCanonical,refresh:true,publicNumberSourceCards:before,explicitFindingEntryLoaded:true,findingCards,findingOutcome,sourceLinks:links,errors,denied:await page.evaluate(()=>window.__safetyDenied)});assert.deepEqual(errors,[]);await page.screenshot({path:outDir+'/number-sources-'+width+'.png'});await context.close();
 }out.ok=true;
}catch(e){out.ok=false;out.error={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1000)};if(page)await page.screenshot({path:outDir+'/failure.png'}).catch(()=>{});}
finally{await browser?.close();fs.writeFileSync(outDir+'/native-routes.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:out.ok,cases:out.cases.length,error:out.error}));process.exitCode=out.ok?0:1;}
});
