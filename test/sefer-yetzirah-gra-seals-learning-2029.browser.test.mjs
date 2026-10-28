import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('..',import.meta.url)),{chromium}=createRequire(import.meta.url)('playwright');
test('Gra seals guided pairs preserve selection and printed commentary source in the existing reader',{timeout:120000},async()=>{
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'});await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===origin&&r.request().isNavigationRequest()&&u.pathname==='/2029/control'){const res=await page.request.get(`${origin}/2029.html`);return r.fulfill({status:res.status(),contentType:'text/html',body:await res.body()});}if(u.pathname.endsWith('.pdf')||u.pathname.startsWith('/functions/'))return r.abort();if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return r.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return r.abort();return r.continue();});
  const id='sy-structure:six-seals-gra-edition';await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&structure=${encodeURIComponent(id)}&component=${encodeURIComponent(id+':component:up')}&page=175`,{waitUntil:'domcontentloaded'});
  const guide=page.locator('.ssl-guide');await guide.waitFor();assert.equal(await guide.locator('nav button').count(),3);assert.match(await guide.locator('blockquote').textContent(),/בסוד שלש אמות/);assert.equal(await page.locator('canvas').count(),0);
  const station=guide.getByRole('button',{name:/תחנה 2/});await station.focus();await page.keyboard.press('Enter');const component=id+':component:east';await page.waitForFunction(x=>new URL(location.href).searchParams.get('component')===x,component);assert.match(await guide.locator('.ssl-current').textContent(),/מזרח/);
  await guide.getByRole('button',{name:'פתחו את פירוש הגר״א · PDF 175'}).click();await page.waitForFunction(()=>document.querySelector('#yetzirah29-source iframe')?.getAttribute('src').includes('#page=175&'));await page.getByRole('button',{name:'חזרה למבנה הנבחר'}).click();assert.equal(new URL(page.url()).searchParams.get('component'),component);
  await page.reload({waitUntil:'domcontentloaded'});await guide.waitFor();assert.equal(await guide.getByRole('button',{name:/תחנה 2/}).getAttribute('aria-pressed'),'true');assert.match(await guide.locator('.ssl-current').textContent(),/מזרח/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 }finally{await browser.close();await server.close();}
});
