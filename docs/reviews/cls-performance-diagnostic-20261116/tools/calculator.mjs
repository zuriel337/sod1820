// Browser audit of the real built calculator. All navigation is loopback;
// optional record mode admits only anonymous public reads through labserver.
import { createRequire } from 'node:module';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { startLabServer } from './labserver.mjs';
const root=process.env.CLS_BUILD_ROOT,cacheDir=process.env.CLS_FIXTURE_CACHE,out=process.env.CLS_RESULTS;
if(!root||!cacheDir||!out)throw Error('explicit roots required');
mkdirSync(out,{recursive:true});
const {chromium}=createRequire(root+'/package.json')('playwright');
const anon=readFileSync(root+'/src/lib/supabase.js','utf8').match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
const lab=await startLabServer({root,cacheDir,anon,record:process.env.CLS_RECORD==='public-reads',trustCert:true,
 readRpc:['fn_method_value','fn_method_values','fn_method_profile','fn_methods_list','convergence_meter'],docDelayFor:()=>100});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:lab.chromiumArgs,env:lab.browserEnv});
const results={source:JSON.parse(readFileSync(root+'/public-reading-deploy/dist/public-reading-artifact.json')).sourceSha,rows:[]};
try{
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:844},timezoneId:'Asia/Jerusalem',locale:'he-IL',serviceWorkers:'allow'});
  await ctx.addCookies([{name:'vb',value:'browser',url:lab.origin}]);
  await ctx.addInitScript(()=>localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000)));
  await ctx.route('**/*',r=>['sod1820.co.il','www.sod1820.co.il','linswmnnkjxvweumprav.supabase.co'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await ctx.newPage(),errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));
  const snap=()=>page.evaluate(()=>({url:location.pathname+location.search+location.hash,title:document.title,
   canonical:document.querySelector('link[rel="canonical"]')?.href,robots:document.querySelector('meta[name="robots"]')?.content,
   values:[...document.querySelectorAll('.sod29-community-calc-result-link strong')].map(n=>n.textContent),
   resultLinks:[...document.querySelectorAll('.sod29-community-calc-result-link')].map(n=>n.getAttribute('href')),
   width:innerWidth,documentWidth:document.documentElement.scrollWidth}));
  const row={width,steps:[],errors,failures};results.rows.push(row);
  try{
   await page.goto(lab.origin+'/community/calculator');await page.locator('#community-calculator-name').waitFor();await page.waitForTimeout(1800);
   row.steps.push({name:'bare',...await snap()});if(process.env.CLS_ASSERT_SEO==='1')assert.equal(row.steps.at(-1).robots,'index, follow');
   await page.locator('#community-calculator-name').fill('אור');await page.waitForFunction(()=>document.querySelector('.sod29-community-calc-result-link strong')?.textContent==='207');
   await page.waitForTimeout(1600);row.steps.push({name:'typed',...await snap()});
   assert.equal(row.steps.at(-1).values[0],'207');if(process.env.CLS_ASSERT_SEO==='1'){assert.equal(row.steps.at(-1).robots,'noindex, follow');assert.equal(row.steps.at(-1).canonical,'https://sod1820.co.il/community/calculator');}
   await page.getByRole('button',{name:'השוואת שמות',exact:true}).click();
   await page.locator('#community-calculator-other').fill('רז');await page.waitForTimeout(1600);
   row.steps.push({name:'compare',...await snap()});assert.deepEqual(row.steps.at(-1).values,['207','207']);
   const stateUrl=page.url();await page.reload();await page.locator('#community-calculator-other').waitFor();await page.waitForTimeout(1600);
   row.steps.push({name:'reload',...await snap()});if(process.env.CLS_ASSERT_SEO==='1')assert.equal(row.steps.at(-1).robots,'noindex, follow');assert.equal(page.url(),stateUrl);assert.deepEqual(row.steps.at(-1).values,['207','207']);
   await page.locator('.sod29-community-calc-result-link').first().click();await page.waitForTimeout(2000);
   row.steps.push({name:'number-link',...await snap()});assert.equal(new URL(page.url()).pathname,'/number/207');
   await page.goBack();await page.locator('#community-calculator-other').waitFor();await page.waitForTimeout(1000);
   row.steps.push({name:'back',...await snap()});assert.deepEqual(row.steps.at(-1).values,['207','207']);
   await page.goto(lab.origin+'/community/calculator?mode=date&date=2024-04-22&afterSunset=1');
   await page.locator('.sod29-community-calc').waitFor();await page.waitForTimeout(1000);
   row.steps.push({name:'date',...await snap()});assert.ok((await page.locator('.sod29-community-calc').innerText()).includes('ט״ו'));
   await page.goto(lab.origin+'/community/calculator?mode=baby&babyName=אור&babyName=שלום&family=לוי&birthDate=2024-04-22');
   await page.locator('.sod29-community-calc-baby-results').waitFor();await page.waitForTimeout(1000);
   row.steps.push({name:'baby',...await snap()});assert.equal(await page.locator('.sod29-community-calc-baby-results article').count(),2);
   await page.screenshot({path:out+'/calculator-'+width+'.png'});
  }catch(e){failures.push(e.message);}
  await ctx.close();writeFileSync(out+'/calculator.json',JSON.stringify(results,null,2));
 }
 results.cacheMisses=lab.state.misses;results.requests=lab.state.supabase.map(x=>({method:x.m,path:x.p,readable:x.ok}));
}finally{writeFileSync(out+'/calculator.json',JSON.stringify(results,null,2));await browser.close();await lab.close();}
if(results.rows.some(x=>x.failures.length||x.errors.length)||results.cacheMisses.length)process.exitCode=1;
console.log(JSON.stringify(results.rows.map(x=>({width:x.width,steps:x.steps.length,failures:x.failures,errors:x.errors}))));
