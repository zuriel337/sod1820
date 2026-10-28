import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('..',import.meta.url)),{chromium}=createRequire(import.meta.url)('playwright');
const pdf=process.env.SEFER_YETZIRAH_SOURCE_PDF;
const ids=['six-seals-synoptic','six-seals-gra-edition','twelve-boundaries-gra','mothers-world-year-soul','doubles-synoptic','doubles-gra-distinction','stones-houses','five-mouth-groups','five-against-five','three-kings'];
async function viewer(page){for(const frame of page.frames()){try{const state=await frame.evaluate(()=>{const v=document.querySelector('pdf-viewer');if(!v)return null;const roots=[document],inputs=[];for(let i=0;i<roots.length;i++)for(const e of roots[i].querySelectorAll('*')){if(e.shadowRoot)roots.push(e.shadowRoot);if(e.tagName==='INPUT')inputs.push(e);}return {pages:v.documentDimensions?.pageDimensions?.length,page:inputs.find(e=>e.id==='pageSelector')?.value,loaded:v.initialLoadComplete_===true&&v.loadState_==='success'};});if(state)return state;}catch{}}return null;}
test('each deep learning route opens its precise page in the actual 220-page PDF and returns to its selection',{skip:!pdf||!existsSync(pdf),timeout:300000},async()=>{
 const bytes=readFileSync(pdf),hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,'2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a');
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
 const specs=JSON.parse(readFileSync(`${root}/public/book-data/sefer-yetzirah.structures.json`)).structures;
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{const context=await browser.newContext({viewport:{width:390,height:1000}});await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===origin&&r.request().isNavigationRequest()&&u.pathname==='/2029/control'){const res=await context.request.get(`${origin}/2029.html`);return r.fulfill({status:res.status(),contentType:'text/html',body:await res.body()});}if(u.pathname.endsWith('.pdf'))return r.fulfill({status:200,contentType:'application/pdf',body:bytes});if(u.pathname.startsWith('/functions/'))return r.abort();if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return r.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return r.abort();return r.continue();});const page=await context.newPage();
 for(const key of ids){const spec=specs.find(x=>x.id===`sy-structure:${key}`),part=spec.components[0];await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&structure=${encodeURIComponent(spec.id)}&component=${encodeURIComponent(part.stable_id)}&page=${part.source.pdf_page}`,{waitUntil:'domcontentloaded'});const guide=page.locator('.ssl-guide');await guide.waitFor();await guide.locator('.ssl-current').getByRole('button',{name:/פתחו את/}).click();let state;for(let i=0;i<40;i++){state=await viewer(page);if(state?.pages===220&&state.page===String(part.source.pdf_page)&&state.loaded)break;await page.waitForTimeout(500);}assert.equal(state?.pages,220,key);assert.equal(state.page,String(part.source.pdf_page),key);assert.equal(state.loaded,true,key);await page.getByRole('button',{name:'חזרה למבנה הנבחר'}).click();assert.equal(new URL(page.url()).searchParams.get('component'),part.stable_id);console.log(`${key} real PDF page ${part.source.pdf_page} and return passed`);}
 await context.close();}finally{await browser.close();await server.close();}
});
