// Controlled UI acceptance of the real compiled public-reading client. The
// baseline mode observes the existing live empty page with a deny-only guard.
// Local responses are explicitly synthetic; no request is sent to a live DB.
const { chromium, expect } = require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const baseline=process.env.SOD_IDLE_BASELINE==='true',out=process.env.SOD_IDLE_OUT||'/tmp/sod-calculator-idle';
fs.mkdirSync(out,{recursive:true});
const db='https://linswmnnkjxvweumprav.supabase.co';
const dist=process.env.SOD_IDLE_DIST||'/tmp/sod-calculator-idle-browser-dist';
const allowed=new Set(require('../docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x=>x.proname));
const report={baseline,syntheticResponses:!baseline,productWrites:0,modelCalls:0,rows:[]};
const save=()=>fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');
let server,browser,active;
const mime={'.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'};
async function run(name,fn){const row={name};report.rows.push(row);try{row.evidence=await fn();row.pass=true;}catch(e){row.pass=false;row.error={name:e.name,message:e.message.slice(0,1200)};await active?.screenshot({path:out+'/'+name+'-failure.png',timeout:5000}).catch(()=>{});}save();console.log(JSON.stringify({name,pass:row.pass,error:row.error}));}
async function empty(page){
 await expect(page.locator('.sod29-calcpro')).toHaveAttribute('data-input-state','empty');
 const tiles=page.locator('.sod29-calcpro-classic .sod29-calcpro-tile');await expect(tiles).toHaveCount(9);
 assert.deepEqual(await tiles.locator('strong').allTextContents(),Array(9).fill('0'));
 assert.equal(await page.locator('a.sod29-calcpro-tile,.sod29-calcpro-hero,[data-calculation-selection]').count(),0);
 assert.equal(await tiles.filter({has:page.locator('[href]')}).count(),0);
 assert.ok((await tiles.evaluateAll(nodes=>nodes.every(e=>e.disabled&&e.dataset.previewState==='empty'&&!e.classList.contains('is-active')))));
 assert.ok(!(await page.locator('#calculator-pro-status').innerText()).includes('מאומת'));
 return tiles;
}
(async()=>{try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 SOD1820-CALCULATOR-IDLE-ACCEPTANCE'],...(baseline&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 let origin='https://sod1820.co.il';
 if(!baseline){
  const html=fs.readFileSync(path.join(dist,'2029.html'));
  server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local'),file=path.resolve(dist,'.'+u.pathname);
   if(!file.startsWith(path.resolve(dist)+path.sep)&&file!==path.resolve(dist))return res.writeHead(403).end();
   if(fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');return res.end(fs.readFileSync(file));}
   res.setHeader('Content-Type','text/html');res.end(html);
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 }
 for(const width of [320,390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'he-IL',serviceWorkers:baseline?'allow':'block'}),requests=[],errors=[];
  await ctx.addInitScript(()=>localStorage.setItem('sod-theme','dark'));
  if(baseline){await require('../docs/reviews/public-launch-useful-loading-20261102/native-read-only-guard.cjs')(ctx,origin);report.sourceSha=(await (await ctx.request.get(origin+'/public-reading-artifact.json')).json()).sourceSha;}
  else await ctx.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===origin&&['GET','HEAD'].includes(req.method()))return route.continue();
   if(u.origin!==db)return route.abort();
   if(!u.pathname.startsWith('/rest/v1/'))return route.fulfill({status:403,body:'controlled: not a data read'});
   const name=u.pathname.split('/').pop(),rpc=u.pathname.includes('/rpc/');let body={};try{body=req.postDataJSON()||{};}catch{}
   const record={name,method:req.method(),phrase:body.p_phrase||null};requests.push(record);
   if(!['GET','HEAD'].includes(req.method())&&!(rpc&&allowed.has(name)))return route.fulfill({status:403,body:'controlled: write denied'});
   if(name==='fn_method_profile'){
    if(body.p_phrase==='בדיקתכשל')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'controlled profile outage',code:'controlled'})});
    if(body.p_phrase==='תגובהמאוחרת')await new Promise(r=>setTimeout(r,650));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{method_key:'רגיל',display_label:'רגיל',category:'base',computed_value:358,lifecycle_active:true}])});
   }
   let data=name==='gematria_methods'?[{method_key:'רגיל',display_label:'רגיל',category:'base',sort_order:1,execution_kind:'atomic'}]:[];
   if(name==='gematria_method_trace')data=null;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=active=await ctx.newPage();page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push(e.message)});page.setDefaultTimeout(20000);
  if(baseline){
   await run('baseline-'+width,async()=>{await page.goto(origin+'/gematria',{waitUntil:'domcontentloaded'});await page.locator('.sod29-calcpro').waitFor();const tiles=await page.locator('.sod29-calcpro-tile').count();await page.screenshot({path:out+'/'+width+'-before.png'});assert.equal(tiles,0,'the former empty calculator is reproduced');return {width,tiles};});
  }else{
   await run('idle-and-search-'+width,async()=>{
    await page.goto(origin+'/gematria',{waitUntil:'domcontentloaded'});await empty(page);await page.waitForTimeout(500);
    assert.equal(requests.filter(r=>['fn_method_profile','gematria_method_trace','fn_number_lookup'].includes(r.name)).length,0,'idle tiles must not start calculation/lookup/trace requests');
    const search=page.getByRole('button',{name:'חיפוש באתר',exact:true});await expect(search).toBeVisible();
    const geometry=await search.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,radius:s.borderRadius,border:s.borderTopWidth,background:s.backgroundColor,blur:s.backdropFilter,animation:s.animationName,overflow:document.documentElement.scrollWidth>innerWidth+1};});
    assert.equal(geometry.width,44);assert.equal(geometry.height,44);assert.equal(geometry.radius,'50%');assert.equal(geometry.border,'1px');assert.equal(geometry.animation,'none');assert.equal(geometry.overflow,false);
    await search.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
    await search.evaluate(e=>e.blur());await page.mouse.move(1,1);
    await page.screenshot({path:out+'/'+width+'-after.png'});return {width,idleTiles:9,calculationRequests:0,search:geometry};
   });
   await run('typing-and-clear-'+width,async()=>{
    const input=page.locator('#calculator-pro-input');await input.fill('משיח');const link=page.locator('a.sod29-calcpro-tile[data-method="רגיל"]');await expect(link).toBeVisible();await expect(link.locator('strong')).toHaveText('358');assert.ok((await link.getAttribute('href')).startsWith('/number/358?'));
    await input.fill('');await empty(page);const before=requests.filter(r=>r.name==='fn_method_profile').length;await page.waitForTimeout(500);assert.equal(requests.filter(r=>r.name==='fn_method_profile').length,before);
    await input.fill('תגובהמאוחרת');await expect.poll(()=>requests.some(r=>r.name==='fn_method_profile'&&r.phrase==='תגובהמאוחרת')).toBe(true);await input.fill('');await page.waitForTimeout(800);await empty(page);return {lateResponseIgnored:true,zeroNeverBecameSelection:true};
   });
   await run('failure-and-nonhebrew-'+width,async()=>{
    const input=page.locator('#calculator-pro-input');await input.fill('בדיקתכשל');await expect(page.locator('#calculator-pro-status')).toContainText('לא ניתן לקבל');assert.equal(await page.locator('.sod29-calcpro-tile.is-idle').count(),0);assert.equal(await page.locator('a.sod29-calcpro-tile').count(),0);
    await input.fill('ABC');await expect(page.locator('.sod29-calcpro')).toHaveAttribute('data-input-state','active');assert.equal(await page.locator('.sod29-calcpro-tile.is-idle').count(),0);assert.equal(await page.locator('.sod29-calcpro-tile[data-method="רגיל"]').count(),0);
    await input.fill('');await empty(page);return {failureNotReportedAsZero:true,nonHebrewNotReportedAsHebrewZero:true};
   });
   if(width===1440)await run('empty-deep-link-views',async()=>{for(const q of ['tab=ledger','tab=tiles','view=wide&m='+encodeURIComponent('רגיל')]){await page.goto(origin+'/gematria?'+q,{waitUntil:'domcontentloaded'});await empty(page);}return {views:3};});
   assert.deepEqual(errors,[]);
  }
  await ctx.close();
 }
 report.ok=report.rows.every(r=>r.pass);save();
}catch(e){report.ok=false;report.error={name:e.name,message:e.message.slice(0,1200)};save();}
finally{await browser?.close();if(server)server.close();console.log(JSON.stringify({ok:report.ok,cases:report.rows.length}));process.exitCode=report.ok?0:1;}
})();
