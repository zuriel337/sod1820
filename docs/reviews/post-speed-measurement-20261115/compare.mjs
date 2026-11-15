import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const [before, after, output] = process.argv.slice(2);
if (!before || !after || !output) throw new Error('Usage: node compare.mjs <absolute baseline worktree> <absolute candidate worktree> <output.json>');
const require=createRequire(join(after,'package.json'));
const {chromium}=require('playwright');
const roots={before,after};
const row={id:90001,slug:'remzei-geula-ai-sod-hashir',title:'מאמר בדיקה ראשון',content:'<p>תוכן ציבורי מקורי.</p>',source:'sod1820',categories:['סוד החשמל'],tags:[]};
const results=[];
for(const width of [390,1280])for(let run=1;run<=3;run++)for(const [version,root] of Object.entries(roots)){
  const {startFixture,dist}=await import(pathToFileURL(root+'/test/helpers/authBrowserFixture.mjs'));
  let rpcStarted=false,rpcFinished=false;
  const fixture=await startFixture({supabase:async({url})=>{
    if(url.pathname==='/rest/v1/posts'){await delay(100);return{body:(url.searchParams.get('slug')||'').includes(row.slug)?[row]:[]};}
    if(url.pathname==='/rest/v1/rpc/fn_method_value'){rpcStarted=true;await delay(600);rpcFinished=true;return{body:787};}
    return null;
  }});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:fixture.chromiumArgs,env:fixture.browserEnv});
  try{
    const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:900},locale:'he-IL',serviceWorkers:'allow'});
    const requests=[];
    await context.route('https://sod1820.co.il/*.webp',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(!path.startsWith('/sod-hashmal-night-'))return route.continue();
      requests.push({path,rpcStarted,rpcFinished});await delay(300);
      await route.fulfill({status:200,contentType:'image/webp',headers:{'cache-control':'public, max-age=3600'},body:readFileSync(join(dist,path))});
    });
    await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
    await context.addInitScript(()=>{window.__lcp=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lcp.push({at:e.startTime,url:e.url,tag:e.element?.tagName});}).observe({type:'largest-contentful-paint',buffered:true});});
    const page=await context.newPage();
    await page.goto(fixture.origin+'/post/'+row.slug+'?utm_source=fixture&utm_medium=email',{waitUntil:'domcontentloaded'});
    await page.locator('article').waitFor({timeout:20000});await delay(1400);
    const result=await page.evaluate(()=>({title:document.title,lcp:window.__lcp.at(-1),resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('sod-hashmal-night-')||e.name.includes('/rpc/fn_method_value')).map(e=>({url:e.name,start:e.startTime,end:e.responseEnd,duration:e.duration})),views:(window.dataLayer||[]).map(x=>Array.from(x)).filter(x=>x[0]==='event'&&x[1]==='page_view').map(x=>x[2])}));
    results.push({version,width,run,requests,...result});console.log(JSON.stringify(results.at(-1)));
  }finally{await browser.close();await fixture.close();}
}
writeFileSync(output,JSON.stringify({method:'local fixture: source 100ms, canonical RPC 600ms, existing image 300ms; cold contexts; alternating before/after; no live writes',baseline:'4b9a8687eea94afcf2466046708903b512d44f38',results},null,2));
