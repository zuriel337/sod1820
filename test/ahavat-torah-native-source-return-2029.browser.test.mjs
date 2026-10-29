import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {ahavatReaderUnitHref} from '../src/data/ahavatTorahReaderUnits2029.js';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url));
const sourcePath=process.env.AHAVAT_SOURCE_PDF||'/tmp/books-wide-ahavat-source-20261028.pdf';
const bytes=existsSync(sourcePath)?readFileSync(sourcePath):null;
const click=async b=>{await b.focus();await b.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await b.click();};
async function native(page,physical){
 for(let i=0;i<100;i++){
  for(const f of page.frames())try{if(await f.evaluate(p=>{const v=document.querySelector('pdf-viewer');if(!v||v.loadState_!=='success'||v.documentDimensions?.pageDimensions?.length!==99)return false;const roots=[document];for(let n=0;n<roots.length;n++)for(const e of roots[n].querySelectorAll('*')){if(e.shadowRoot)roots.push(e.shadowRoot);if(e.id==='pageSelector'&&e.value===String(p))return true;}return false;},physical))return;}catch{}
  await page.waitForTimeout(100);
 }
 assert.fail(`native PDF did not open physical ${physical}`);
}
// Like the existing two-book native fixture, a lightweight checkout without the
// verified witness cannot claim native acceptance. Acceptance requires no skips.
test('actual PDF fullscreen exit returns stable focus to both new source-bound sections in six display contexts',{skip:!bytes,timeout:180000},async()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b');
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';mkdirSync('/tmp/ahavat-native-source-return-20261029',{recursive:true});
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [390,1440])for(const theme of ['light','parchment','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin&&route.request().isNavigationRequest()&&u.pathname==='/2029/control'){const r=await context.request.get(`${origin}/2029.html`);return route.fulfill({status:200,contentType:'text/html',body:await r.body()});}if(u.pathname.endsWith('Hebrewbooks_org_5635.pdf'))return route.fulfill({status:200,contentType:'application/pdf',body:bytes,headers:{'content-disposition':'inline','access-control-allow-origin':'*'}});if(u.pathname.startsWith('/functions/')||u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return route.abort();if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return route.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [id,physical] of [['ahavat-novellae-p099-03',99],['ahavat-migdal-p016-03',16]]){
   await page.goto(`${origin}${ahavatReaderUnitHref(id)}`,{waitUntil:'domcontentloaded'});const unit=page.locator(`[data-reader-unit="${id}"]`),source=page.locator('#ahavat29-source');await unit.waitFor();
   await click(unit.getByRole('button',{name:`פתח מקור היחידה · PDF ${physical}`,exact:true}));await native(page,physical);
   await click(source.getByRole('button',{name:'מסך מלא',exact:true}));await native(page,physical);assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
   await click(source.getByRole('button',{name:'יציאה ממסך מלא',exact:true}));await page.waitForFunction(()=>!document.fullscreenElement);
   await click(source.getByRole('link',{name:'חזור ליחידת הקריאה',exact:true}));
   await page.waitForFunction(expected=>document.activeElement?.closest('[data-reader-unit]')?.dataset.readerUnit===expected,id,{timeout:10000});
   await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-reader-unit]')?.dataset.readerUnit),id,'focus stays at the unit after the plugin transition');
   assert.equal(new URL(page.url()).searchParams.get('readerUnit'),id);assert.equal(await unit.evaluate(e=>e.open),true);assert.equal(await page.locator('canvas').count(),0);
   if(theme==='parchment')await page.screenshot({path:`/tmp/ahavat-native-source-return-20261029/p${physical}-${width}.png`});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);await context.close();console.log(JSON.stringify({width,theme,nativePages:[99,16],fullscreen:true,stableReturnFocus:true,status:'pass'}));
 }}finally{await browser.close();await server.close();}
});
