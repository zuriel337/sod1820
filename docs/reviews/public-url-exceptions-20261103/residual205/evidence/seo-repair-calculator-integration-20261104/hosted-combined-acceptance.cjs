// Actual protected public-reading artifact and public data. Deny-only guard;
// no login, test writes, model, media upload, mocked replies or server changes.
const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {chromium, expect} = require('@playwright/test');
const guard = require(process.cwd()+'/docs/reviews/public-launch-useful-loading-20261102/native-read-only-guard.cjs');
const output = process.env.SOD_ACCEPTANCE_OUT || '/tmp/sod-hosted-combined'; fs.mkdirSync(output,{recursive:true});
const report={actualPublicData:true,mockResponses:false,productWrites:0,modelCalls:0,performanceMeasurement:false,rows:[]};
const save=()=>fs.writeFileSync(output+'/results.json',JSON.stringify(report,null,2)+'\n');
const meta=(html,name)=>{const tag=html.match(name==='canonical'?/<link\b[^>]*rel="canonical"[^>]*>/i:new RegExp('<meta\\b[^>]*(?:name|property)="'+name+'"[^>]*>','i'))?.[0]||'';return tag.match(/(?:href|content)="([^"]*)"/)?.[1]?.replaceAll('&amp;','&')||null;};
require('readline').createInterface({input:process.stdin}).once('line',async line=>{
 const cfg=JSON.parse(line), c=cfg.after; let browser;
 try{
  console.log(JSON.stringify({stage:'browser-launch'}));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
   console.log(JSON.stringify({stage:'access-cookie',width}));
   if(c.accessUrl)await context.request.get(c.accessUrl,{timeout:30000});
   console.log(JSON.stringify({stage:'artifact-identity',width}));
   assert.equal((await (await context.request.get(c.origin+'/public-reading-artifact.json',{timeout:30000})).json()).sourceSha,c.sha);
   await guard(context,c.origin); const page=await context.newPage(); page.setDefaultTimeout(45000);
   const errors=[];page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push(e.message.slice(0,350));});
   await page.addLocatorHandler(page.locator('.sod29-frame-panel[data-panel-kind="newsletter"]'),async()=>{
    (report.guestInvitationDismissals ||= []).push({width,reason:'existing invitation on scroll or 22-second timer; dismissed using its normal close action'});
    await page.keyboard.press('Escape');
   });
   async function run(name,action){const row={name,width};report.rows.push(row);try{row.evidence=await action();row.pass=true;}catch(e){row.pass=false;row.error={name:e.name,message:e.message.replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1500)};await page.screenshot({path:output+'/'+width+'-'+name+'-failure.png'}).catch(()=>{});}save();console.log(JSON.stringify({name,width,pass:row.pass,error:row.error}));}
   await run('home-header-scroll',async()=>{
    const response=await page.goto(c.origin+'/?acceptance=combined',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200); await expect(page.locator('.h29-card-open').first()).toBeVisible();
    const header=page.locator('.sod29-header');await expect(header).toBeVisible();
    assert.ok(!/\b2029\b/.test(await header.innerText()),'header must not show a transient year');
    const initial=await header.boundingBox();await page.evaluate(()=>scrollTo(0,1000));await page.waitForTimeout(350);
    const geometry=await page.evaluate(()=>{const h=document.querySelector('.sod29-header'),r=document.querySelector('.sod29-living-ribbon'),b=document.querySelector('.sod29-command-island');return {scrollY,header:h.getBoundingClientRect().toJSON(),headerTop:parseFloat(getComputedStyle(h).top),headerPosition:getComputedStyle(h).position,ribbon:r?.getBoundingClientRect().toJSON(),ribbonPosition:r&&getComputedStyle(r).position,bar:b.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1};});
    assert.ok(geometry.scrollY>500);assert.equal(geometry.headerPosition,'sticky');assert.ok(Math.abs(geometry.header.top-geometry.headerTop)<2,'header remains at its computed sticky top');
    assert.ok(geometry.ribbon.top<0,'ticker must scroll away');assert.ok(!['fixed','sticky'].includes(geometry.ribbonPosition));assert.equal(geometry.overflow,false);
    if(width===1440){assert.ok(geometry.bar.width<800);const body=await page.locator('body').boundingBox();assert.ok(Math.abs(geometry.bar.x+geometry.bar.width/2-(body.x+body.width/2))<3,'compact dock is centered in the actual page box, excluding the reserved scrollbar gutter');}
    await header.getByRole('button',{name:'חיפוש באתר',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
    await page.screenshot({path:output+'/'+width+'-sticky-header.png'});
    return {initial,geometry,worker:await page.evaluate(()=>new URL(navigator.serviceWorker.controller.scriptURL).pathname)};
   });
   await run('now-real-public-feed',async()=>{
    await page.locator('.sod29-command-island').getByRole('button',{name:/^עכשיו/}).click();const panel=page.getByRole('dialog',{name:'עכשיו',exact:true});
    await expect(panel.locator('.sod29-nowpub-row').first()).toBeVisible();
    await expect(panel.locator('[role="status"]').filter({hasText:'קורא פרסומים נוספים'})).toHaveCount(0,{timeout:45000});
    const source=panel.locator('.sod29-nowpub-row.is-source');const sourceCount=await source.count();
    assert.ok(sourceCount>0);assert.equal(await source.locator('.sod29-nowpub-preview,.sod29-nowpub-excerpt').count(),0);
    const sources=await source.evaluateAll(rows=>rows.map(e=>{const t=e.querySelector('.sod29-nowpub-title');return {height:e.getBoundingClientRect().height,titleLines:t.getBoundingClientRect().height/parseFloat(getComputedStyle(t).lineHeight)};}));assert.ok(sources.every(e=>e.titleLines<=2.2),'source opening words remain limited to two lines with credit/time retained');
    const initialRows=await panel.locator('.sod29-nowpub-row').count();
    const unverifiedLabels=await panel.getByText('מקור · טרם נבדק',{exact:true}).count();
    // First page is chronological and can legitimately contain only recent
    // sources. Select the existing series lens to inspect older real media.
    await panel.getByRole('button',{name:'סדרות',exact:true}).click();
    const mediaCount=await panel.locator('.sod29-nowpub-preview').count();assert.ok(mediaCount>0,'real series lens contains media previews');
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('video')].some(v=>!v.paused)),false);
    const result={initialRows,seriesRows:await panel.locator('.sod29-nowpub-row').count(),sourceCount,mediaCount,sourceMaxHeight:Math.max(...sources.map(s=>s.height)),sourceMaxTitleLines:Math.max(...sources.map(s=>s.titleLines)),unverifiedLabels};
    await page.screenshot({path:output+'/'+width+'-now-real-feed.png'});await page.keyboard.press('Escape');return result;
   });
   await run('calculator-classic-number-return',async()=>{
    await page.goto(c.origin+'/gematria?q='+encodeURIComponent('משיח')+'#calculator-return',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.sod29-calcpro')).toHaveAttribute('data-calculator-view','classic');
    const tile=page.locator('a.sod29-calcpro-tile[data-method="רגיל"],a.sod29-calcpro-tile[data-method="regular"]').first();await expect(tile).toBeVisible();
    await expect(tile.locator('strong')).toHaveText('358');const href=await tile.getAttribute('href');assert.ok(href.startsWith('/number/358?'));assert.equal(new URL(href,c.origin).searchParams.get('focus'),'משיח');
    const exact=page.url();await tile.click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','358');await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goBack();await expect(page).toHaveURL(exact);await expect(page.locator('.sod29-calcpro')).toBeVisible();return {href,exactReturn:true};
   });
   await run('calculator-numeric-entry-return',async()=>{
    await page.goto(c.origin+'/gematria?q=1820#numeric-return',{waitUntil:'domcontentloaded'});
    const link=page.locator('.sod29-calcpro-empty a');await expect(link).toBeVisible();const href=await link.getAttribute('href');assert.equal(href,'/number/1820');
    const exact=page.url();await link.click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820');await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goBack();await expect(page).toHaveURL(exact);return {href,exactReturn:true};
   });
   await run('metadata-alias-parity',async()=>{
    const paths=['/2029/calculator?q='+encodeURIComponent('משיח'),'/2029/gematria?q='+encodeURIComponent('משיח'),'/2029/gematria/viral?q='+encodeURIComponent('משיח'),'/2029/number/1820','/2029/number/'+encodeURIComponent('משיח'),'/post','/gallery'];const rows=[];
    for(const path of paths){const r=await page.goto(c.origin+path,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200,path);const html=await r.text(),server=meta(html,'canonical');await expect(page.locator('.sod29-header')).toBeVisible();await page.waitForTimeout(700);const client=await page.locator('link[rel="canonical"]').getAttribute('href');assert.equal(server,client,path);assert.ok(!new URL(client).pathname.startsWith('/2029/'),path);rows.push({path,status:r.status(),server,client,robots:r.headers()['x-robots-tag']});}
    return rows;
   });
   await run('installed-app-manifest',async()=>{
    const manifestResponse=await context.request.get(c.origin+'/site.webmanifest');assert.equal(manifestResponse.status(),200);const m=await manifestResponse.json();assert.equal(m.start_url,'/');assert.equal(m.id,'/');assert.equal(m.short_name,'SOD1820');
    assert.equal(m.icons[0].src,'/brand/2029/app-icon-3f8a2a2fdc0a.png');const icon=await context.request.get(c.origin+m.icons[0].src);assert.equal(icon.status(),200);const hash=crypto.createHash('sha256').update(await icon.body()).digest('hex');assert.equal(hash,'3f8a2a2fdc0a5a141d10b63bc633eefbd9ba2bfe7dbf7521f3984c21830dcd18');
    const r=await context.request.get(c.origin+'/');assert.equal(new URL(meta(await r.text(),'canonical')).href,'https://sod1820.co.il/');return {name:m.name,id:m.id,startUrl:m.start_url,icon:m.icons[0],sha256:hash};
   });
   report.rows.push({name:'page-errors',width,pass:errors.length===0,errors});save();await context.close();
  }
  report.ok=report.rows.every(r=>r.pass);report.sourceSha=c.sha;report.origin=c.origin;save();
 }catch(e){report.ok=false;report.runnerError={name:e.name,message:e.message.replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1500)};save();}
 finally{await browser?.close();console.log(JSON.stringify({ok:report.ok,cases:report.rows.length}));process.exit(report.ok?0:1);}
});
