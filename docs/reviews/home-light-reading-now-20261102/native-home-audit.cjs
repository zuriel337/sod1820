const {chromium,expect}=require('@playwright/test'),fs=require('fs'),assert=require('assert/strict');
const out=process.env.SOD_HOME_AUDIT;fs.mkdirSync(out,{recursive:true});
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{input.close();const cfg=JSON.parse(line),report={sha:cfg.sha,realSW:true,modelCalls:0,productWrites:0,cases:[]};let browser,page;
try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of cfg.widths||[390,1440,1920]){
 const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});if(cfg.accessUrl)await context.request.get(cfg.accessUrl);assert.equal((await(await context.request.get(cfg.origin+'/preview-identity.json')).json()).sha,cfg.sha);await require('./native-read-only-guard.cjs')(context,cfg.origin);await context.addInitScript(theme=>localStorage.setItem('sod-theme',theme),cfg.theme||'dark');page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>{if(!e.message.includes('independent_read_only_guard'))errors.push(e.message.slice(0,200));});
 await page.goto(cfg.origin+'/?home-audit=light-reading',{waitUntil:'domcontentloaded'});await expect(page.locator('.h29-hero h1')).toBeVisible();await expect(page.locator('.h29-card-open').first()).toBeVisible();await page.waitForTimeout(800);
 const measure=()=>page.evaluate(()=>{const dock=document.querySelector('.sod29-command-island'),s=getComputedStyle(dock),hero=document.querySelector('.h29-hero');return{viewport:innerWidth,dock:dock.getBoundingClientRect().toJSON(),width:s.width,minWidth:s.minWidth,maxWidth:s.maxWidth,inlineSize:s.inlineSize,minInlineSize:s.minInlineSize,position:s.position,left:s.left,right:s.right,transform:s.transform,overflow:document.documentElement.scrollWidth-innerWidth,hero:hero.getBoundingClientRect().toJSON(),heroTitle:hero.querySelector('h1')?.textContent,bodyBackground:getComputedStyle(document.querySelector('.sod29-root')).backgroundImage};});
 const geometry=await measure();await page.screenshot({path:out+'/home-'+width+'.png',fullPage:false});
 assert.match(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),/\/preview-readonly-sw\.js$/);assert.equal(geometry.overflow,0);assert.ok(geometry.dock.width<=340);assert.ok(Math.abs(geometry.dock.x+geometry.dock.width/2-width/2)<1);
 await page.locator('.sod29-command-island').getByRole('button',{name:/^עכשיו/}).click();const panel=page.getByRole('dialog',{name:'עכשיו',exact:true});await expect(panel).toBeVisible();await page.waitForTimeout(900);
 let sources=null;
 if(cfg.extraSources){
  await expect(panel.getByText('קורא עדכונים ציבוריים נוספים…',{exact:true})).toHaveCount(0,{timeout:60000});
  await expect(panel.getByText('חלק ממקורות העדכון לא נקראו.',{exact:false})).toHaveCount(0);
  const filters=panel.getByRole('group',{name:'מקורות העדכונים'}),names=await filters.getByRole('button').allTextContents(),counts=[];
  for(const name of names){await filters.getByRole('button',{name,exact:true}).click();const rows=panel.locator('.sod29-now-source-row');counts.push({source:name,details:await rows.count()});if(await rows.count()){if(!await rows.first().evaluate(e=>e.open))await rows.first().locator('summary').click();await expect(rows.first().locator('.sod29-now-source-detail')).toBeVisible();}}
  await filters.getByRole('button',{name:'הכול',exact:true}).click();
  const reads=await page.evaluate(()=>window.__safetyReads.filter(r=>r.path==='/rest/v1/channel_updates'&&/channel=eq\.(?:gilui-yomi|site-news|reality-code|sod-hachashmal|or-geula)(?:&|$)/.test(r.query)).map(r=>({method:r.method,status:r.status,query:r.query,ms:r.ms})));assert.equal(reads.length,5);assert.ok(reads.every(r=>r.method==='GET'&&r.status===200));
  const dock=page.locator('.sod29-command-island'),more=dock.getByRole('button',{name:/^עוד/});assert.ok(await more.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  sources={counts,reads};await more.click();await expect(panel).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(1);await dock.getByRole('button',{name:/^עכשיו/}).click();await expect(panel).toBeVisible();
 }
 const now=await page.locator('.sod29-attention-projection').evaluate(e=>({rows:e.querySelectorAll('.sod29-now-source-row').length||e.querySelectorAll('button').length,text:e.innerText}));await page.screenshot({path:out+'/now-'+width+'.png'});
 const background=await page.evaluate(()=>{const h=document.querySelector('.h29-home-cosmos');return h?{image:getComputedStyle(h,'::before').backgroundImage,height:getComputedStyle(h,'::before').height,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/backgrounds/2029/')).map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize}))}:null;});
 let galleryJourney=null;
 if(cfg.followGallery){
  await panel.getByRole('group',{name:'מקורות העדכונים'}).getByRole('button',{name:'זרם המציאות',exact:true}).click();const row=panel.locator('.sod29-now-source-row').first();if(!await row.evaluate(e=>e.open))await row.locator('summary').click();const open=row.getByRole('button',{name:'פתח את המקור',exact:true});
  if(await open.count()){
   await open.click();await expect(page).toHaveURL(/\/world\?view=gallery&gallery=/);const address=new URL(page.url()),image=address.searchParams.get('image');assert.ok(image);assert.equal(address.hash,'#gallery-source-'+image);await expect(page.locator('[data-gallery-selected="'+image+'"]')).toBeVisible();const exact=address.pathname+address.search+address.hash;await page.reload();await expect(page.locator('[data-gallery-selected="'+image+'"]')).toBeVisible();await page.goBack();await expect(page).toHaveURL(cfg.origin+'/?home-audit=light-reading');await expect(page.locator('.h29-card-open').first()).toBeVisible();galleryJourney={status:'real_public_source_refresh_and_exact_back_pass',address:exact};
  }else galleryJourney={status:'no_exact_link_available_no_fake_action'};
 }
 report.cases.push({width,theme:cfg.theme||'dark',geometry,now,sources,background,galleryJourney,errors,denied:await page.evaluate(()=>window.__safetyDenied)});assert.deepEqual(errors,[]);await context.close();console.log(JSON.stringify({width,dockWidth:geometry.dock.width,dockCenter:geometry.dock.x+geometry.dock.width/2,viewportCenter:width/2,nowRows:now.rows}));
 }report.ok=true;
}catch(e){report.ok=false;report.error={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1100)};if(page)await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await browser?.close();fs.writeFileSync(out+'/audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,error:report.error}));process.exitCode=report.ok?0:1;}
});
