// Real static 2029 build + live anonymous public readers. No product writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream,existsSync,statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
let origin=process.env.PREVIEW_ORIGIN,server;
if(!origin){
  const dist=resolve('preview-deploy/dist');
  server=createServer((req,res)=>{
    let file=resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!file.startsWith(dist+sep)){res.writeHead(403).end();return;}
    if(!existsSync(file)||statSync(file).isDirectory())file=resolve(dist,'index.html');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');createReadStream(file).pipe(res);
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));origin=`http://127.0.0.1:${server.address().port}`;
}
origin=new URL(origin).origin;
let accessUrl;
if(process.env.PREVIEW_ACCESS_STDIN==='true'){
  console.log('Waiting for scoped Preview access via stdin (not logged).');
  const input=createInterface({input:process.stdin});for await(const line of input){accessUrl=line.trim();input.close();break;}
  assert.equal(new URL(accessUrl).origin,origin);
}
const output=process.env.PREVIEW_EVIDENCE_DIR||'/tmp/reality-river-live';await mkdir(output,{recursive:true});
const rpcReads=new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','fn_verses_by_gematria','lang_links_list','number_neighbors','fn_all_methods','world_group_source_arrivals_v2','rd_is_admin','fn_list_family','fn_name_protocol','fn_cross_research']);
const report={widths:[],blocked:[],modelRequests:[],readPaths:[],errors:[]};
const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy}:{})});
try{
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},locale:'he-IL',reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const req=route.request(),url=new URL(req.url()),method=req.method();
      if(url.origin===origin)return route.continue();
      if(/\/functions\/v1\/(ai-analyze|research-run|ask-raziel)/.test(url.pathname))report.modelRequests.push(url.pathname);
      if(url.hostname==='linswmnnkjxvweumprav.supabase.co'){
        const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
        if((rpc&&rpcReads.has(rpc))||(!rpc&&!url.pathname.startsWith('/functions/')&&['GET','HEAD','OPTIONS'].includes(method))){report.readPaths.push(url.pathname);return route.continue();}
      }else if(['GET','HEAD'].includes(method)&&['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();
      report.blocked.push({method,path:url.pathname});return route.abort();
    });
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('sod-theme','dark'));
    if(accessUrl)await page.goto(accessUrl,{waitUntil:'domcontentloaded',timeout:60000});
    await page.goto(origin+'/2029#arrivals',{waitUntil:'domcontentloaded',timeout:60000});
    const river=page.locator('[data-reality-river]');await river.waitFor({timeout:45000});await river.scrollIntoViewIfNeeded();
    await river.locator('[data-river-image]').first().waitFor({timeout:45000});
    const image=river.locator('.r29-picture img').first();await image.evaluate(im=>im.decode());
    // Compare selection after independent font/preference loading has settled.
    // A pending follow-state read is not a source-selection layout change.
    await page.evaluate(()=>document.fonts.ready);
    await river.locator('.sod29-watch:not([data-state="loading"])').waitFor({timeout:30000});
    const itemCount=await river.locator('[data-river-image]').count();assert.ok(itemCount>2);
    assert.equal(await river.locator('.r29-image-date time').count(),itemCount,'every current admitted stream photo has a typed date');
    const firstDate=await river.locator('.r29-image-date').first().innerText();
    assert.match(firstDate,/\d{2}\.\d{2}\.\d{4}/);assert.match(firstDate,/נוסף לזרם|עדכון/);
    const gallery=await river.locator('.r29-gallery-name').first().innerText();assert.match(gallery,/מתוך:/);
    const initialBounds=await river.boundingBox(),riverHeight=initialBounds.height;
    const initialGeometry=await river.evaluate(el=>[...el.children].map(c=>({part:c.className,height:c.getBoundingClientRect().height})));
    const exact=await river.locator('.r29-open').getAttribute('href');assert.match(exact,/^\/world\?view=gallery&gallery=\d+&image=[a-f0-9-]+#gallery-source-/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const slider=river.getByRole('slider');await slider.focus();await slider.press('End');
    await page.waitForFunction(()=>document.querySelector('.r29-window').scrollTop>300);
    const afterHeight=(await river.boundingBox()).height;
    assert.ok(Math.abs((await river.boundingBox()).width-initialBounds.width)<2,'thumbnail arrivals cannot widen Home river');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(Math.abs(afterHeight-riverHeight)>=2){
      console.log(JSON.stringify({width,riverHeight,afterHeight,initialGeometry,afterGeometry:await river.evaluate(el=>[...el.children].map(c=>({part:c.className,height:c.getBoundingClientRect().height})))}));
      await river.screenshot({path:`${output}/height-diagnostic-${width}.png`});
    }
    assert.ok(Math.abs(afterHeight-riverHeight)<2,'source selection does not resize river');
    await river.getByRole('button',{name:'חזרה לתמונה 1',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.r29-window').scrollTop<20);
    await river.screenshot({path:`${output}/home-river-${width}.png`});
    await river.locator('.r29-open').click();
    await page.locator('[data-gallery-selected]').waitFor({timeout:45000});
    const selected=new URL(exact,origin).searchParams.get('image');
    assert.equal(await page.locator('[data-gallery-selected]').getAttribute('data-gallery-selected'),selected);
    await page.goBack({waitUntil:'domcontentloaded'});await page.locator('[data-reality-river]').waitFor();
    const identity=await page.evaluate(()=>fetch('/preview-identity.json').then(r=>r.json()));
    await page.locator('[data-river-image]').first().waitFor({timeout:45000});
    report.widths.push({width,items:itemCount,firstDate,gallery,selected,identity});
    await context.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.modelRequests,[]);
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();if(server)await new Promise(done=>server.close(done));}
