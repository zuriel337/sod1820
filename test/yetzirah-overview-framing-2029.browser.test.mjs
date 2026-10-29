import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {overviewBounds} from './fixtures/yetzirah-overview-framing.mjs';
import {viewportFov} from '../src/components/books2029/yetzirahModels/sourceModels.js';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),screens='/tmp/yetzirah-overview-framing';
const click=async button=>{await button.focus();await button.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await button.click();};
async function fitted(page){
 await page.waitForFunction(()=>{const c=document.querySelector('.yetzirah29-canvas canvas');if(!c||c.dataset.viewportFit!=='ready')return false;const r=c.getBoundingClientRect();return r.width>0&&r.height>0&&Math.abs(Number(c.dataset.cameraAspect)-r.width/r.height)<.01;});
 const values=await page.locator('.yetzirah29-canvas canvas').evaluate(c=>{const r=c.getBoundingClientRect();return {width:r.width,height:r.height,fov:Number(c.dataset.cameraFov)};});
 assert.ok(Math.abs(values.fov-viewportFov(values.width,values.height,54))<.01,JSON.stringify(values));const bounds=overviewBounds(values.width,values.height,values.fov);assert.ok(bounds.x<1&&bounds.y<1,JSON.stringify({values,bounds}));return {values,bounds};
}
test('all 22 overview nodes fit nine viewport/theme contexts, selection and resize without initial GPU',{timeout:480000},async()=>{
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';mkdirSync(screens,{recursive:true});
 const server=await createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']});
 try{for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await context.addInitScript(t=>{if(location.hostname==='127.0.0.1')localStorage.setItem('sod-theme',t);},theme);
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin&&route.request().isNavigationRequest()&&u.pathname==='/2029/control'){const response=await context.request.get(`${origin}/2029.html`);return route.fulfill({status:200,contentType:'text/html',body:await response.body()});}if(u.pathname.endsWith('.pdf')||u.pathname.startsWith('/functions/'))return route.abort();if(u.hostname==='linswmnnkjxvweumprav.supabase.co')return route.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return route.abort();return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/2029/control?surface=sefer-yetzirah-world&pairs=open&letter=ש&partner=ת&page=203`,{waitUntil:'domcontentloaded'});await page.waitForFunction(t=>document.documentElement.dataset.themePreset===t,theme);assert.equal(await page.locator('canvas').count(),0);
  await click(page.getByRole('button',{name:'פתח את המבנה התלת־ממדי',exact:true}));let result=await fitted(page);assert.equal(await page.locator('.yetzirah29-canvas').getAttribute('data-active-pair'),'שת');
  const letter=page.locator('.yetzirah29-spatial .yetzirah29-letter-picker').getByRole('button',{name:'מ',exact:true});await letter.focus();await page.keyboard.press('Enter');await fitted(page);assert.equal(await page.locator('.yetzirah29-canvas').getAttribute('data-active-pair'),'מ');
  await page.setViewportSize({width:width===1440?320:1440,height:1000});await fitted(page);await page.setViewportSize({width,height:1000});result=await fitted(page);
  await page.locator('.yetzirah29-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));if(theme==='parchment')await page.locator('.yetzirah29-stage').screenshot({path:`${screens}/framing-${width}.png`});
  await click(page.getByRole('button',{name:'סגור את המבנה התלת־ממדי',exact:true}));assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);console.log(JSON.stringify({width,theme,...result,status:'all-22-marker-envelopes-in-frustum',resize:true,selection:true}));await context.close();
 }}finally{await browser.close();await server.close();}
});
