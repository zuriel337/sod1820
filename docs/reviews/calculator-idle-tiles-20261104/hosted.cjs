// Real protected artifact, real public canonical calculation; no response mocks,
// login, model, content/account writes or production operation.
const {chromium,expect}=require('@playwright/test'),fs=require('node:fs'),assert=require('node:assert/strict');
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),out=process.env.SOD_IDLE_HOSTED_OUT||'/tmp/sod-idle-hosted';fs.mkdirSync(out,{recursive:true});
const report={sourceSha:config.sha,origin:config.origin,realServiceWorker:true,syntheticResponses:false,productWrites:0,modelCalls:0,rows:[]};
const save=()=>fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');
const agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 SOD1820-CALCULATOR-IDLE-ACCEPTANCE';
let browser,active;
async function idle(page){
 await expect(page.locator('.sod29-calcpro')).toHaveAttribute('data-input-state','empty');const tiles=page.locator('.sod29-calcpro-tile');await expect(tiles).toHaveCount(9);
 assert.deepEqual(await tiles.locator('strong').allTextContents(),Array(9).fill('0'));assert.ok(await tiles.evaluateAll(nodes=>nodes.every(e=>e.disabled&&e.dataset.previewState==='empty')));
 assert.equal(await page.locator('a.sod29-calcpro-tile,.sod29-calcpro-hero,[data-calculation-selection],.sod29-calcpro-share').count(),0);
}
(async()=>{try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--user-agent='+agent],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL',userAgent:agent});
  if(config.accessUrl)await context.request.get(config.accessUrl,{timeout:30000});
  assert.equal((await (await context.request.get(config.origin+'/public-reading-artifact.json')).json()).sourceSha,config.sha);
  await require(process.cwd()+'/docs/reviews/public-launch-useful-loading-20261102/native-read-only-guard.cjs')(context,config.origin);
  const page=active=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push(e.message)});
  await page.addLocatorHandler(page.locator('.sod29-frame-panel[data-panel-kind="newsletter"]'),async()=>{(report.invitationDismissals ||= []).push(width);await page.keyboard.press('Escape');});
  const row={width};report.rows.push(row);
  try{
   const response=await page.goto(config.origin+'/gematria',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await idle(page);
   const reads=await page.evaluate(()=>window.__safetyReads||[]);assert.equal(reads.filter(x=>/\/(fn_method_profile|gematria_method_trace|fn_number_lookup)$/.test(x.path)).length,0);
   const search=page.getByRole('button',{name:'חיפוש באתר',exact:true});const shape=await search.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,radius:s.borderRadius,border:s.borderTopWidth,blur:s.backdropFilter,animation:s.animationName,overflow:document.documentElement.scrollWidth>innerWidth+1}});
   assert.equal(shape.width,44);assert.equal(shape.height,44);assert.equal(shape.radius,'50%');assert.equal(shape.border,'1px');assert.equal(shape.animation,'none');assert.equal(shape.overflow,false);
   await search.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await search.evaluate(e=>e.blur());
   await page.screenshot({path:out+'/'+width+'-idle.png'});
   const input=page.locator('#calculator-pro-input');await input.fill('משיח');const tile=page.locator('a.sod29-calcpro-tile[data-method="רגיל"]');await expect(tile).toBeVisible();await expect(tile.locator('strong')).toHaveText('358');const href=await tile.getAttribute('href');assert.ok(href.startsWith('/number/358?'));
   const exact=page.url();await tile.click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','358');await expect(page.getByRole('dialog')).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(exact);
   await page.locator('#calculator-pro-input').fill('');await idle(page);assert.ok((await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).endsWith('/sw.js'));
   row.evidence={idleTiles:9,idleCalculationReads:0,shape,actualCanonicalRegularValue:358,fullNumberHref:href,exactReturn:true,clearRestoresIdle:true};
   if(width===1440){row.themes=[];for(const [label,id] of [['יום','light'],['קלף','parchment'],['לילה','dark']]){
    await page.locator('.sod29-header .sod29-theme-options').getByTitle(label,{exact:true}).click();await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset',id);await idle(page);
    row.themes.push({theme:id,shape:await search.evaluate(e=>({blur:getComputedStyle(e).backdropFilter,background:getComputedStyle(e).backgroundColor}))});await page.screenshot({path:out+'/1440-'+id+'.png'});
   }}
   assert.deepEqual(errors,[]);row.pass=true;
  }catch(e){row.pass=false;row.error={name:e.name,message:e.message.replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1600)};await page.screenshot({path:out+'/'+width+'-failure.png',timeout:5000}).catch(()=>{});}
  save();console.log(JSON.stringify({width,pass:row.pass,error:row.error}));await context.close();
 }
 report.ok=report.rows.every(r=>r.pass);save();
}catch(e){report.ok=false;report.error={name:e.name,message:e.message.slice(0,1200)};save();}
finally{await browser?.close();console.log(JSON.stringify({ok:report.ok,cases:report.rows.length}));process.exitCode=report.ok?0:1;}})();
