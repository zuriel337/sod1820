// Public readers only. Runs against the guarded static Preview, never publishes or saves an account.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.POSTS_PREVIEW_BASE || 'http://127.0.0.1:4178';
const out = process.env.POSTS_PREVIEW_ARTIFACTS || '/workspace/artifacts/2029-integrated-preview/posts-local';
const access = process.env.POSTS_SHARE_FILE ? JSON.parse(await fs.readFile(process.env.POSTS_SHARE_FILE,'utf8')) : null;
const harnessSha = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const receipt = { sha: process.env.POSTS_DEPLOYMENT_SHA || harnessSha, harnessSha, workingTree: Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()), base, at:new Date().toISOString(), cases:[] };
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let page;
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    page = await context.newPage(); page.setDefaultTimeout(60000);
    const errors=[],writes=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method())&&!new URL(r.url()).pathname.startsWith('/rest/v1/rpc/'))writes.push({method:r.method(),path:new URL(r.url()).pathname});});
    if(access) {await page.goto(access.shareableUrl,{waitUntil:'domcontentloaded'});await page.waitForURL(u=>u.origin===base&&!u.searchParams.has('_vercel_share'));}
    // The share URL already opens Posts. A second navigation during the guard's
    // cold bootstrap can interrupt controller acquisition before App imports.
    else await page.goto(base+'/2029/posts',{waitUntil:'domcontentloaded'});
    const cards=page.locator('[data-experience-capability="post-index-card"]');
    await cards.first().waitFor();
    assert.ok(await cards.count()>1);
    assert.ok(await page.locator('.sod29-library-post-meta').filter({hasText:'עודכן'}).count()>0);
    assert.equal(await page.getByText('מומלץ',{exact:true}).count(),0);
    const election=page.locator('.sod29-library-post-card-link[href="/post/sharshar-elections-redemption-hints-draft"]');
    await election.waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`${out}/posts-${width}.png`});
    await election.click();
    await page.locator('#netanyahu-77-title').waitFor();
    assert.match(await page.locator('#netanyahu-77-title').innerText(),/77.*מזל/);
    for(const slug of ['sharshar-elections-redemption-hints-draft','flydubai-fz1073-363-14000-remzei-geula','bennett-melach-631-78']){
      await page.goto(base+'/post/'+slug,{waitUntil:'domcontentloaded'});
      await page.locator(`[data-post-slug="${slug}"]`).waitFor();
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,slug);
      const fits=await page.locator('.sod29-reading-number-signal').evaluateAll(es=>es.every(e=>{const n=e.querySelector('strong').getBoundingClientRect(),b=e.getBoundingClientRect();return n.left>=b.left&&n.right<=b.right;}));
      assert.equal(fits,true,slug+' signal text containment');
      await page.screenshot({path:`${out}/${slug}-${width}.png`});
    }
    // Same-Post hash navigation and reload must reach the actual source, including its nested <br> heading.
    const path='/post/flydubai-fz1073-363-14000-remzei-geula#source-region-trust-axis';
    await page.goto(base+path,{waitUntil:'domcontentloaded'});
    for(let reload=0;reload<2;reload++){
      await page.locator('#source-region-trust-axis').waitFor();
      await page.waitForFunction(()=>{const r=document.getElementById('source-region-trust-axis')?.getBoundingClientRect();return r&&r.top>=80&&r.bottom<innerHeight-100;});
      const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')));
      assert.equal(saved.subject.id,'5112');assert.equal(saved.selection.locator,'#source-region-trust-axis');
      assert.match(await page.locator('#source-region-trust-axis').innerText(),/75.*750.*7500/);
      if(!reload)await page.reload({waitUntil:'domcontentloaded'});
    }
    await page.screenshot({path:`${out}/native-return-${width}.png`});
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    receipt.cases.push({width,publicIndex:true,elections77Preserved:true,posts:['5107','5112','5113'],signalTextFits:true,nativeTrustRegionAndReload:true,noOverflow:true,errors,writes});
    await context.close();
  }
} catch(e) {receipt.failure=e.stack;await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}
finally {await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify(receipt));
