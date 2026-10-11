import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.POSTS_PREVIEW_BASE||'http://127.0.0.1:4178';
const out=process.env.POSTS_PREVIEW_ARTIFACTS||'/workspace/artifacts/2029-integrated-preview/posts-continuation-local';
const access=process.env.POSTS_SHARE_FILE?JSON.parse(await fs.readFile(process.env.POSTS_SHARE_FILE,'utf8')):null;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const receipt={sha:process.env.POSTS_DEPLOYMENT_SHA||sha,harnessSha:sha,workingTree:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),base,at:new Date().toISOString(),cases:[]};
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let page;
try{
for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(60000);const errors=[],legacyRequests=[],orders=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/rest/v1/posts'&&u.searchParams.has('order'))orders.push(u.searchParams.get('order'));if(r.isNavigationRequest()&&u.origin===base&&!/^\/(2029|post|world|topic)/.test(u.pathname))legacyRequests.push(u.pathname);});
  const current=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')));
  const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const returnFrame=async()=>{const b=page.getByRole('button',{name:'חזרה מדויקת',exact:true}).filter({visible:true});if(!await b.count())await page.getByRole('button',{name:'פתח ניווט',exact:true}).click();await page.getByRole('button',{name:'חזרה מדויקת',exact:true}).filter({visible:true}).first().click();};
  const cards=()=>page.locator('[data-experience-capability="post-index-card"]');
  if(access){await page.goto(access.shareableUrl,{waitUntil:'domcontentloaded'});await page.waitForURL(u=>u.origin===base&&!u.searchParams.has('_vercel_share'));}
  else await page.goto(base+'/2029/posts',{waitUntil:'domcontentloaded'});
  await cards().first().waitFor();assert.equal(await cards().count(),24);
  const first=await cards().locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
  await page.getByRole('button',{name:'פוסטים קודמים',exact:true}).click();
  await page.waitForURL(/page=2/);await page.locator('[data-posts-page="2"]').waitFor();await cards().first().waitFor();assert.equal(await cards().count(),24);
  const second=await cards().locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
  assert.equal(new Set([...first,...second]).size,48);assert.ok(orders.some(order=>order.includes('modified.desc')&&order.includes('id.desc')));
  await fit();await page.screenshot({path:`${out}/archive-page2-${width}.png`});
  await page.reload({waitUntil:'domcontentloaded'});await cards().first().waitFor();
  assert.deepEqual(await cards().locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),second);
  await cards().first().locator('a').click();await page.locator('[data-post-slug]').waitFor();
  await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-posts-page="2"]').waitFor();await cards().first().waitFor();assert.match(page.url(),/page=2/);
  assert.deepEqual(await cards().locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),second);
  await page.goto(base+'/2029/posts?page=9999',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'חזרה לפוסטים האחרונים',exact:true}).click();await cards().first().waitFor();assert.equal(new URL(page.url()).searchParams.get('page'),null);

  const flight='/post/flydubai-fz1073-363-14000-remzei-geula';
  await page.goto(base+flight,{waitUntil:'domcontentloaded'});
  const connections=page.locator('[data-experience-capability="post-connected-continuations"]');await connections.waitFor();
  const hrefs=await connections.locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
  assert.equal(hrefs.length,8);assert.ok(hrefs.every(h=>/^\/(post|topic|2029\/number)\//.test(h)));
  const tabs=page.getByRole('navigation',{name:'בתוך הפוסט',exact:true});
  for(const label of ['הסיפור','גימטריות','חיבורים','מקורות','המשך'])assert.equal(await tabs.getByRole('button',{name:label,exact:true}).count(),1);
  await tabs.getByRole('button',{name:'חיבורים',exact:true}).click();
  await page.waitForFunction(()=>{const r=document.getElementById('source-region-post-connections')?.getBoundingClientRect();return r&&r.top>=80&&r.top<innerHeight-150;});
  await page.screenshot({path:`${out}/flight-connections-${width}.png`});
  assert.equal((await current()).journey,null);
  for(const [id,expected] of [['oct-710-post','7'],['topic-718','gapfill-718'],['number-1073','1073']]){
    await connections.locator(`[data-post-connection="${id}"]`).click();
    if(expected==='7'){
      await page.locator('[data-post-slug]').waitFor();
      await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.subject?.id==='7');
      // The historical source is a picture, not an article of 200+ text characters.
      const original=page.locator('.sod29-reading-source img');
      assert.equal(await original.count(),1);
      assert.equal(await original.getAttribute('src'),'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2026/04/428fc3fa11603296.jpg');
      await original.evaluate(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(Error('Historical source image unavailable')),{once:true});}));
      assert.equal((await current()).subject.type,'post');assert.ok(await page.locator('#source-region-post-story').count());
      assert.ok(!await page.locator('.sod29-reading-hero h1').innerText().then(t=>t.includes('&#')));
      await page.screenshot({path:`${out}/historical-710-${width}.png`});
    }else if(expected==='gapfill-718'){
      await page.waitForURL(/\/topic\/gapfill-718/);await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.subject?.type==='topic');
    }else{
      await page.waitForURL(/\/2029\/number\/1073/);await page.locator('[data-number-path-continuation]').waitFor();
    }
    const target=(await current()).returnTo;assert.equal(target.subject.id,'5112');assert.equal(target.selection.locator,'#source-region-post-connections');
    assert.equal((await current()).journey,null);await fit();await returnFrame();
    await page.waitForURL(u=>u.pathname===flight&&u.hash==='#source-region-post-connections');
    await page.locator('#source-region-post-connections').waitFor();
    await page.waitForFunction(()=>{const c=JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'));const r=document.getElementById('source-region-post-connections')?.getBoundingClientRect();return c?.subject?.id==='5112'&&c?.selection?.locator==='#source-region-post-connections'&&r&&r.top>=80&&r.bottom<innerHeight-100;});
    await page.reload({waitUntil:'domcontentloaded'});await page.locator('#source-region-post-connections').waitFor();
    await page.waitForFunction(()=>{const r=document.getElementById('source-region-post-connections')?.getBoundingClientRect();return r&&r.top>=80&&r.bottom<innerHeight-100;});
    assert.equal((await current()).selection.locator,'#source-region-post-connections');
  }
  await fit();assert.deepEqual(errors,[]);assert.deepEqual(legacyRequests,[]);
  receipt.cases.push({width,archive24plus24Unique:true,stableOrder:true,page2ReloadAndBack:true,outOfRangePageRecovery:true,declaredConnections:hrefs.length,post7Identity:true,topic718:true,number1073:true,nativeConnectionReturnAndReload:true,implicitJourney:false,noOverflow:true,errors,legacyDocumentNavigations:legacyRequests});
  await context.close();
}
}catch(e){receipt.failure=e.stack;if(page){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure-body.txt',await page.locator('body').innerText().catch(()=>''));receipt.context=await page.evaluate(()=>sessionStorage.getItem('sod_research_context_v2:guest')).catch(()=>null);}throw e;}
finally{await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify(receipt));
