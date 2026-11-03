// Public reads only. Never logs a protection grant, JWT, email or private record.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BRAND_LOCKUP_2029} from '../../../src/lib/brandAssets2029.js';
const config=JSON.parse(await readFile(process.argv[2],'utf8')),out=process.argv[3]||'/tmp/personal-hosted';
await mkdir(out,{recursive:true});const origin=new URL(config.url).origin;
const report={kind:'hosted-public-readonly',origin,sourceSha:config.sha,cases:[],errors:[],network:[],liveWrites:0,realAccountAcceptance:'OPEN_USER_DEFERRED'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let page;
try{
const context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});page=await context.newPage();page.setDefaultTimeout(20000);
page.on('pageerror',e=>report.errors.push(e.message));
context.on('response',response=>{const url=new URL(response.url());if(url.origin===origin&&(url.pathname==='/sw.js'||response.status()>=400))report.network.push({path:url.pathname,status:response.status(),type:response.headers()['content-type']});});
context.on('requestfailed',request=>{const url=new URL(request.url());report.network.push({path:url.pathname,host:url.hostname,error:request.failure()?.errorText});});
await page.goto(config.shareUrl,{waitUntil:'domcontentloaded'});await page.goto(origin+'/login?returnTo=%2F2029%2Fme%2Fresearch');
await expect(page.getByRole('button',{name:'כניסה עם סיסמה',exact:true})).toBeVisible({timeout:30000});
await page.waitForFunction(()=>navigator.serviceWorker.controller);
report.cases.push({name:'existing-account entry, exact personal return, actual worker',passed:true});
const artifact=await page.evaluate(async()=>await(await fetch('/public-reading-artifact.json',{cache:'no-store'})).json());
assert.equal(artifact.sourceSha,config.sha);report.artifact={sourceSha:artifact.sourceSha,policy:artifact.policy||artifact.policyId,dirty:artifact.dirty};
if(!process.env.HOSTED_STARTUP_ONLY){
const manifest=await page.evaluate(async()=>await(await fetch('/site.webmanifest',{cache:'no-store'})).json());
assert.equal(manifest.icons[0].src,BRAND_LOCKUP_2029.src);assert.equal(manifest.start_url,'/');
const image=await page.evaluate(async src=>{const r=await fetch(src,{cache:'no-store'}),bytes=await r.arrayBuffer();return{status:r.status,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('')};},BRAND_LOCKUP_2029.src);assert.equal(image.status,200);assert.equal(image.sha256,BRAND_LOCKUP_2029.sha256);
report.cases.push({name:'candidate app manifest and complete existing brand asset hash',passed:true});
for(const width of [320,390,1440])for(const preset of ['dark','light','parchment']){
 await page.setViewportSize({width,height:900});await page.evaluate(p=>localStorage.setItem('sod-theme',p),preset);await page.goto(origin+'/');
 await page.locator('.sod29-header.closed-orientation').waitFor();await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset',preset);
 const metrics=await page.evaluate(()=>{const get=selector=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return{background:s.backgroundColor,backdrop:s.backdropFilter,width:r.width,left:r.left,right:r.right};};return{width:innerWidth,documentWidth:document.documentElement.scrollWidth,header:get('.sod29-header.closed-orientation'),dock:get('.sod29-command-island.is-unified-bar'),sw:!!navigator.serviceWorker.controller};});
 assert.ok(metrics.documentWidth<=width+1);assert.ok(metrics.dock.width<=(width===1440?600:width));
 for(const item of [metrics.header,metrics.dock]){assert.ok(item.backdrop.includes('blur(22px)'));assert.ok(item.background.includes('/ 0.06')||item.background.includes(', 0.06)'));}
 assert.ok(metrics.sw);await page.screenshot({path:out+'/glass-'+width+'-'+preset+'.png'});report.cases.push({name:'glass and contained layout',width,preset,passed:true,metrics});
}
await page.setViewportSize({width:390,height:900});await page.goto(origin+'/2029/me/notes');
await expect(page.getByRole('heading',{name:'צריך להתחבר כדי לראות את האזור האישי'})).toBeVisible();assert.equal(await page.getByLabel('ההערות שלי').count(),0);
report.cases.push({name:'anonymous direct private route never exposes notebook',passed:true});
for(const path of ['/number/1820','/number/'+encodeURIComponent('אחת ארבע שבע ושתיים')]){
 await page.goto(origin+path);await page.locator('[data-number-core-root]').waitFor({timeout:30000});
 if(!path.includes('1820'))await page.locator('[data-experience-capability="number-hidden-crossing"]').waitFor({timeout:30000});
 const source=await page.locator('[data-number-core-root]').innerText();
 report.cases.push({name:'public number/phrase hidden-crossing reader',path,passed:true,sourceExcerpt:source.slice(0,450)});
 await page.screenshot({path:out+'/number-'+(path.includes('1820')?'1820':'phrase')+'.png'});
}
}
report.passed=report.cases.length;assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error.message).replaceAll(config.shareUrl,'[private protection grant]').slice(0,1600);if(page&&new URL(page.url()).origin===origin){report.body=(await page.locator('body').innerText()).slice(0,2000);report.worker=await page.evaluate(async()=>({controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state}))}));await page.screenshot({path:out+'/failure.png'});}throw error;
}finally{await browser.close();report.finishedAt=new Date().toISOString();await writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}
