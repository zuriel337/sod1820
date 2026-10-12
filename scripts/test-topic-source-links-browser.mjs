// Read-only browser acceptance against fresh public readers. No product writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {chromium}=pw.default || pw;
const base=process.env.SOURCE_CONTEXT_BASE_URL || 'http://127.0.0.1:4192';
const out=process.env.SOURCE_CONTEXT_ARTIFACTS || '/tmp/topic-source-links';
await fs.mkdir(out,{recursive:true});
// The site's public middleware rejects Headless UAs. Identify this authorized browser
// acceptance run explicitly; Vercel protection still requires the scoped access link.
const acceptanceAgent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 SOD1820Acceptance/1.0';
const receipt={base,userAgent:acceptanceAgent,at:new Date().toISOString(),cases:[],errors:[],blocked:[]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
let page;
try {
 for (const width of (process.env.TEST_WIDTHS || '1440,390').split(',').map(Number)) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',userAgent:acceptanceAgent});
  page=await context.newPage();
  page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(45000);
  page.on("framenavigated",frame=>{if(frame===page.mainFrame())console.log("NAV",new URL(frame.url()).origin+new URL(frame.url()).pathname+new URL(frame.url()).hash)});
  page.on('pageerror',e=>receipt.errors.push(e.message));
  await context.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());
   if(!['GET','HEAD','OPTIONS'].includes(r.method()) && !(u.hostname==='linswmnnkjxvweumprav.supabase.co' && ['/rest/v1/rpc/gematria_api','/rest/v1/rpc/gematria_method_trace','/rest/v1/rpc/fn_zero_scale'].includes(u.pathname))) {
    receipt.blocked.push({method:r.method(),path:u.pathname});return route.fulfill({status:403,body:'Read-only browser test'});
   }
   if(u.origin===new URL(base).origin && r.isNavigationRequest() && /^(127\.0\.0\.1|localhost)$/.test(u.hostname) && /^\/(topic|post)\//.test(u.pathname)) {
    const response=await context.request.get(`${base}/2029.html`);return route.fulfill({status:response.status(),contentType:'text/html',body:await response.body()});
   }
   return route.continue();
  });
  if(process.env.SOURCE_PREVIEW_ACCESS_FILE) {
   const access=(await fs.readFile(process.env.SOURCE_PREVIEW_ACCESS_FILE,'utf8')).trim();
   assert.equal(new URL(access).origin,new URL(base).origin,'preview access is origin scoped');
   await page.goto(access,{waitUntil:'domcontentloaded'});
  }
  for (const [from,to,count] of (process.env.SOURCE_SKIP_SHARED ? [] : [['hodu','india-axis',1],['india-axis','1237',1],['trump','424-mashiach-ben-david',1],['45-frequency','meron',2]])) {
   await page.goto(`${base}/topic/${from}`,{waitUntil:'domcontentloaded'});
   const link=page.locator(`#topic-related a[href^="/topic/${to}#topic-source-"]`);
   await link.waitFor({timeout:45000});
   assert.match(await link.innerText(),count===1 ? /אותה תמונת מקור/ : /2 תמונות מקור/);
   const destination=await link.getAttribute('href');
   console.log('CLICK',from,to,destination);
   await link.click();
   await page.waitForURL(`${base}${destination}`);
   await page.locator('[data-source-selected="true"]').waitFor({timeout:45000});
   assert.equal(await page.locator('[data-source-selected="true"]').getAttribute('id'),destination.split('#')[1]);
   await page.goBack({waitUntil:'domcontentloaded'});
   await page.locator('[data-source-selected="true"]').waitFor({timeout:45000});
   assert.match(page.url(),new RegExp(`/topic/${from}#topic-source-`));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   receipt.cases.push({width,from,to,exactBack:true,sourceCount:count});
   console.log('PASS shared-source',width,from,to);
   if(from==='hodu')await page.screenshot({path:path.join(out,`hodu-return-${width}.png`)});
  }
  const indiaSource='/topic/india-axis#topic-source-media-post-5112-source-region-smit-machchhar';
  await page.goto(`${base}/topic/india-axis`,{waitUntil:'domcontentloaded'});
  const postLink=page.locator('#topic-posts a[href$="#source-region-smit-machchhar"]');
  await postLink.waitFor({timeout:45000});
  assert.match(await postLink.innerText(),/אזרח הודי/);
  await postLink.click();
  await page.waitForURL(/\/post\/flydubai.*#source-region-smit-machchhar$/);
  const heading=page.locator('#source-region-smit-machchhar');
  await heading.waitFor({timeout:45000});
  await page.waitForFunction(()=>{const e=document.getElementById('source-region-smit-machchhar');if(!e)return false;const r=e.getBoundingClientRect();return r.top>=0&&r.top<innerHeight;},{},{timeout:5000});
  await page.screenshot({path:path.join(out,`captain-original-${width}.png`)});
  let reverse=page.locator(`a[href="${indiaSource}"]`).filter({visible:true}).first();
  if(!await reverse.count()) {
   // Main exposes connections through its existing context rail / mobile sheet.
   let choice=page.getByRole('button',{name:'הציר ההודי · קפטן סמיט מאצ׳הר',exact:true});
   if(!await choice.isVisible()) {
    const openContext=page.locator('.sod29-glass-locator-core,.sod29-surface-context-mobile-cue').filter({visible:true}).first();
    await openContext.click();
    choice=page.getByRole('button',{name:'הציר ההודי · קפטן סמיט מאצ׳הר',exact:true});
   }
   await choice.click();
   reverse=page.locator(`a[href="${indiaSource}"]`).filter({visible:true}).first();
  }
  await reverse.waitFor();
  receipt.cases.push({width,postSourceVisible:true,publicReverseConnection:true});
  await page.screenshot({path:path.join(out,`captain-connection-${width}.png`)});
  await reverse.click();await page.waitForURL(`${base}${indiaSource}`);
  await page.locator('[data-source-selected="true"]').waitFor({timeout:45000});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-source-selected="true"]').waitFor({timeout:45000});
  assert.equal(page.url(),`${base}${indiaSource}`);
  receipt.cases.push({width,topicPostTopicReload:true});
  console.log('PASS captain round-trip',width);
  await context.close();
 }
 assert.deepEqual(receipt.errors,[]);
 receipt.status='PASS';
} catch(error) {receipt.status='FAIL';receipt.failure=error.stack;console.error(error);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally {await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));await browser.close();console.log(JSON.stringify(receipt));}
