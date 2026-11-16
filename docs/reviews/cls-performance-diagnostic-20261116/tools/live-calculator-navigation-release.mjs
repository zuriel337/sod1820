import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/dev/shm/sod-calculator-review-1369/package.json')('playwright');
const out=new URL('../data/calculator-navigation-release/',import.meta.url);
const origin='https://sod1820.co.il';
const readRpcs=new Set(['fn_method_value','fn_method_values','fn_method_profile','fn_methods_list','convergence_meter']);
const report={sha:'ea7257598a5217b9a8de308cca1194ec4a027fbf',startedAt:new Date().toISOString(),mode:'live public reads; service workers blocked to enforce write guard; third parties and newsletter suppressed; not a speed measurement',rows:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],env:{...process.env,TMPDIR:'/dev/shm'}});
try{
 for(const width of [390,1280]){
  const row={width,steps:[],errors:[],blocked:[],badResponses:[]};report.rows.push(row);
  const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL',timezoneId:'Asia/Jerusalem',serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000)));
  await context.route('**/*',r=>{
   const req=r.request(),u=new URL(req.url()),method=req.method();
   const site=['sod1820.co.il','www.sod1820.co.il'].includes(u.hostname);
   const db=u.hostname==='linswmnnkjxvweumprav.supabase.co';
   const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)/)?.[1];
   const read=site&&['GET','HEAD'].includes(method)&&!/^\/(api\/(track|events|collect)|_vercel\/)/.test(u.pathname)
     || db&&((rpc&&readRpcs.has(rpc)&&['GET','POST','HEAD','OPTIONS'].includes(method))||(!rpc&&['GET','HEAD','OPTIONS'].includes(method)&&/^\/(rest\/v1\/|storage\/v1\/(object|render)\/)/.test(u.pathname)))
     || ['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)&&method==='GET';
   if(read)return r.continue();
   row.blocked.push({method,host:u.hostname,path:u.pathname});return r.abort('blockedbyclient');
  });
  const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)row.badResponses.push({status:r.status(),path:new URL(r.url()).pathname});});
  const snapshot=()=>page.evaluate(()=>({path:location.pathname+location.search,robots:document.querySelector('meta[name=robots]')?.content,canonical:document.querySelector('link[rel=canonical]')?.href,title:document.title,y:scrollY,heading:document.querySelector('h1')?.textContent,methods:document.querySelectorAll('.sod29-community-calc-method').length,structured:document.querySelectorAll('script[type="application/ld+json"]').length,values:[...document.querySelectorAll('.sod29-community-calc-result-link strong')].map(n=>n.textContent)}));
  try{
   await page.goto(origin+'/community/calculator',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#community-calculator-name').waitFor({timeout:40000});
   const bare=await snapshot();row.steps.push({name:'bare',...bare});
   assert.match(bare.title,/מחשבון גימטריה חינם/);assert.equal(bare.robots,'index, follow');assert.equal(bare.structured,1);
   assert.equal(await page.locator('main.sod29-community-calc.r29').count(),1);
   assert.equal(await page.locator('.sod29-community-calc-faq h3').count(),6);
   await page.screenshot({path:new URL('live-calculator-'+width+'.png',out).pathname});
   await page.locator('#community-calculator-name').fill('אור');
   await page.waitForFunction(()=>document.querySelector('.sod29-community-calc-result-link strong')?.textContent==='207'&&document.querySelector('meta[name=robots]')?.content==='noindex, follow',null,{timeout:30000});
   const typed=await snapshot();row.steps.push({name:'typed',...typed});assert.ok(typed.methods>=20);assert.equal(typed.structured,0);assert.equal(typed.canonical,origin+'/community/calculator');
   await page.getByRole('button',{name:'השוואת שמות',exact:true}).click();await page.locator('#community-calculator-other').fill('רז');
   await page.waitForFunction(()=>[...document.querySelectorAll('.sod29-community-calc-result-link strong')].map(n=>n.textContent).join(',')==='207,207');
   row.steps.push({name:'compare',...await snapshot()});
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#community-calculator-other').waitFor({timeout:30000});
   const reload=await snapshot();row.steps.push({name:'reload',...reload});assert.deepEqual(reload.values,['207','207']);assert.equal(reload.robots,'noindex, follow');
   await page.goto(origin+'/tag/'+encodeURIComponent('אריק-נווה'),{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('.f29 a[href="/contact"]').first().waitFor({timeout:40000});
   await page.waitForTimeout(2000);
   const link=page.locator('.f29 a[href="/contact"]').first();await link.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
   const before=await snapshot();assert.ok(before.y>300);row.steps.push({name:'tag-footer',...before});
   await link.click();await page.waitForURL('**/contact');await page.waitForTimeout(1800);
   const forward=await snapshot();row.steps.push({name:'footer-to-contact',...forward});assert.equal(forward.y,0);
   await page.goBack();await page.waitForURL('**/tag/**');await page.waitForTimeout(2500);
   const back=await snapshot();row.steps.push({name:'back-to-tag',...back});assert.ok(Math.abs(back.y-before.y)<120,'Back restores recorded position');
   await page.screenshot({path:new URL('live-navigation-back-'+width+'.png',out).pathname});
  }catch(e){row.failure=e.stack;}
  await context.close();writeFileSync(new URL('live-browser.json',out),JSON.stringify(report,null,2));
  console.log(JSON.stringify({width,steps:row.steps.map(x=>({name:x.name,y:x.y,methods:x.methods,robots:x.robots})),failure:row.failure,errors:row.errors,badResponses:row.badResponses}));
 }
}finally{report.finishedAt=new Date().toISOString();writeFileSync(new URL('live-browser.json',out),JSON.stringify(report,null,2));await browser.close();}
if(report.rows.some(x=>x.failure||x.errors.length))process.exitCode=1;
