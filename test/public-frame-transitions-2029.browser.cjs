const {test,expect}=require('../docs/reviews/public-foundation-20261101/evidence/safe-local-fixture.cjs');
const fs=require('node:fs');
const before='http://127.0.0.1:4195',after=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4196';
const now=()=>Number(process.hrtime.bigint())/1e6;
async function worldMenu(page,width){
 if(width<=980){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'העולם',exact:true}).click();}
 else await page.locator('.sod29-sidebar a[href="/world"]').click();
 await expect(page.locator('.sod29-world-entry')).toBeVisible({timeout:30000});
}
async function run(page,origin,width){
 const steps=[],requests=[];const onRequest=req=>requests.push({path:new URL(req.url()).pathname,method:req.method()});page.on('request',onRequest);
 const step=async(name,fn)=>{fs.writeFileSync('/tmp/public-frame-context-20261101/current-measurement-step.json',JSON.stringify({origin,width,step:name}));const count=requests.length,start=now();await fn();steps.push({name,ms:Math.round(now()-start),requests:requests.length-count});};
 let postHref;
 await step('entry-home',async()=>{await page.goto(origin+'/?measure=route-cycle');await expect(page.locator('.h29-hero')).not.toContainText('טוען',{timeout:30000});await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:30000});});
 await step('home-post',async()=>{const link=page.locator('.h29-card-open').first();postHref=await link.getAttribute('href');await link.click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});});
 await step('post-world',()=>worldMenu(page,width));
 await step('world-number-via-existing-drawer',async()=>{
  await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const drawer=page.locator('.sod29-number-drawer2029');await expect(drawer).toBeVisible({timeout:30000});
  await drawer.locator('input').first().fill('1820');await drawer.locator('input').first().press('Enter');await expect(drawer.locator('[data-number-core-root="1820"]')).toBeVisible({timeout:30000});
  await drawer.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await expect(page.locator('.sod29-number-page[data-number-root="1820"]')).toBeVisible({timeout:30000});
 });
 await step('back-number-world',async()=>{await page.goBack();await expect(page.locator('.sod29-world-entry')).toBeVisible({timeout:30000});});
 await step('back-world-post',async()=>{await page.goBack();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});expect(new URL(page.url()).pathname).toBe(new URL(postHref,origin).pathname);});
 await step('back-post-home',async()=>{await page.goBack();await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:30000});expect(new URL(page.url()).search).toBe('?measure=route-cycle');});
 const sideEffects=requests.filter(r=>/ai-analyze|preview-raziel|newsletter|els-search-bridge/.test(r.path));expect(sideEffects).toEqual([]);
 page.off('request',onRequest);return {steps,postHref,totalMs:steps.reduce((s,x)=>s+x.ms,0),requests:requests.length,sideEffects};
}
test('counterbalanced matched public route cycles; real reads, no model or product write',async({page},info)=>{
 test.setTimeout(900000);page.setDefaultTimeout(30000);await page.route(before+'/**',r=>r.request().method()==='GET'?r.continue():r.abort());
 const results=[];for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  // Warm the same immutable public-read transport and both routes first. The
  // read fixture caches responses; these are local interaction measurements.
  for(const origin of [before,after])await run(page,origin,width);
  for(let pair=1;pair<=4;pair++){
   const order=pair%2?[['before',before],['after',after]]:[['after',after],['before',before]];
   for(const [version,origin]of order)results.push({version,width,pair,...await run(page,origin,width)});
   fs.writeFileSync(info.outputPath('matched-transitions.json'),JSON.stringify({baselineSha:'4987d7a12167fbcdc37467b21930f18156438908',viewportHeight:900,throttling:'none',publicTransport:'reviewed GET/HEAD and read-only RPC-to-GET; first response cached per worker',definition:'click to visible primary reader/World entry; Number includes existing drawer; browser history return',results},null,2));
  }
 }
});
