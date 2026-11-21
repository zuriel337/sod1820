// Built artifact and real worker; first words use the production server helper.
// No external traffic. Missing worker is an explicit browser capability fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {startFixture} from './helpers/authBrowserFixture.mjs';
import {firstWordsHtml2029,withFirstWords2029} from '../public-reading-deploy/first-words.js';
const {chromium}=createRequire(import.meta.url)('playwright');
for(const width of [320,390,1440])for(const unavailable of [false,true])test(`Home ${width}: worker ${unavailable?'unavailable keeps public words':'admitted replaces first words once'}`,{timeout:60000},async()=>{
 const fixture=await startFixture({documentFor:({path,template})=>path==='/'?withFirstWords2029(template,firstWordsHtml2029({kind:'home'})).html:null});
 let browser;
 try{
  browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:fixture.chromiumArgs,env:fixture.browserEnv});
  const context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true});
  if(unavailable)await context.addInitScript(()=>Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(fixture.origin+'/',{waitUntil:'domcontentloaded'});
  if(unavailable){
   const words=page.locator('[data-first-words="home"]');await words.waitFor();
   await page.locator('[data-sod-reading-only]').waitFor();
   assert.match(await words.innerText(),/מפת המציאות/);assert.equal(await words.locator('h1').count(),1);
   assert.equal(await words.locator('a').count(),5);assert.equal(await page.locator('#root .sod29-root').count(),0,'unsafe app never starts without its worker');
   assert.equal(await page.locator('#root [aria-busy]').count(),0);
  }else{
   await page.locator('#root .sod29-root').first().waitFor({timeout:40000});
   assert.equal(await page.locator('[data-first-words]').count(),0,'normal hydration leaves no duplicate introduction');
   assert.equal(await page.locator('[data-sod-reading-only]').count(),0);
  }
  assert.equal(await page.locator('body').innerText().then(t=>t.trim()==='העמוד לא נפתח. אפשר לרענן ולנסות שוב.'),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);assert.deepEqual(errors,[]);
  if(process.env.HOME_FALLBACK_EVIDENCE_DIR){await mkdir(process.env.HOME_FALLBACK_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:join(process.env.HOME_FALLBACK_EVIDENCE_DIR,`home-${width}-${unavailable?'reading-only':'normal'}.png`)});}
  await context.close();
 }finally{await browser?.close();await fixture.close();}
});
