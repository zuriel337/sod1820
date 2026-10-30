// Hosted smoke only: never submits searches, AI, auth, saves or live writes.
// Full scan/replay behavior is covered by the real-tool Native browser suite.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const supplied = new URL(process.env.ELS_PREVIEW_URL);
assert.match(supplied.hostname, /^sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.equal(supplied.protocol, 'https:');
const expectedSha = process.env.ELS_PREVIEW_SHA;
assert.match(expectedSha || '', /^[a-f0-9]{40}$/);
const expectedBranch = process.env.ELS_PREVIEW_BRANCH || 'gpt/els-lexicon-structure-preview-20261030';
assert.ok(['gpt/els-lexicon-structure-preview-20261030','gpt/els-search-clarity-preview-20261030'].includes(expectedBranch));
const browser = await chromium.launch({ headless:true,
  executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath(),
  args:['--no-sandbox'] });
const evidence = [], errors = [], modelRequests = [], dictionaryRequests = [], denied = [];
try {
  for (const theme of ['light','parchment','dark']) {
    const context = await browser.newContext({viewport:{width:320,height:900},reducedMotion:'reduce'});
    await context.addInitScript(t=>localStorage.setItem('sod-theme',t),theme);
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.pathname.includes('ai-analyze'))modelRequests.push(url.pathname);
      if(/els-dynamic-lexicon|tanakh-verses/.test(url.pathname))dictionaryRequests.push(url.pathname);
      if(!['GET','HEAD','OPTIONS'].includes(request.method())){
        denied.push({method:request.method(),path:url.pathname});
        return route.fulfill({status:403,contentType:'application/json',body:'{"error":"hosted_smoke_read_only"}'});
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(supplied.href,{waitUntil:'domcontentloaded'});
    await page.getByRole('navigation',{name:'מצבי הצופן התנ״כי'}).waitFor({timeout:60000});
    const identity=await page.evaluate(async()=>{
      const response=await fetch('/preview-identity.json');
      if(!response.ok)throw new Error('preview_identity_unavailable');
      return response.json();
    });
    assert.equal(identity.sha,expectedSha);assert.equal(identity.branch,expectedBranch);
    assert.equal(identity.transport,'existing-raziel-submit-and-private-research-sync');
    assert.equal(identity.edge_deploy,false);
    for(const width of [320,390,1440]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.locator('html').getAttribute('data-theme-preset'),theme);
      const words=page.getByText('מילים במטריצה · ללא AI',{exact:true});
      const structures=page.getByText('מבנים והשוואת מופעים · ללא AI',{exact:true});
      assert.ok(await words.isVisible());assert.ok(await structures.isVisible());
      if(!await words.evaluate(n=>n.parentElement.open))await words.click();
      await page.getByRole('region',{name:'מילים במטריצה',exact:true}).waitFor();
      if(!await structures.evaluate(n=>n.parentElement.open))await structures.click();
      await page.getByRole('region',{name:'מבנים והשוואת מופעים',exact:true}).waitFor();
      if(expectedBranch==='gpt/els-search-clarity-preview-20261030'){
        const panel=page.getByRole('region',{name:'מבנים והשוואת מופעים',exact:true});
        assert.ok(await panel.getByText('איך מוצאים זוגות?',{exact:true}).isVisible());
        assert.ok(await panel.getByRole('button',{name:'חפש והוסף מילה למטריצה',exact:true}).isVisible());
        assert.ok(await panel.getByText(/עדיין לא הוספתם תמונות מצב להשוואה/).isVisible());
      }
      const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(size.scroll<=size.client+1,JSON.stringify({width,theme,size}));
      await page.locator('.sod29-command-island .sod29-raziel-orb').click();
      const chat=page.locator(width>=1000?'[data-raziel-companion-view="open"] [data-raziel-native-chat="true"]':'.sod29-frame-panel [data-raziel-native-chat="true"]');
      await chat.waitFor();
      const box=await chat.boundingBox();assert.ok(box.x>=-1&&box.x+box.width<=width+1);
      if(process.env.ELS_PREVIEW_SCREENSHOTS){mkdirSync(process.env.ELS_PREVIEW_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.ELS_PREVIEW_SCREENSHOTS+`/preview-${width}-${theme}.png`});}
      evidence.push({width,theme,pageOverflow:false,chatWithinViewport:true});
      // Reload restores the actual Preview page and closes any responsive sheet.
      await page.reload({waitUntil:'domcontentloaded'});
      await words.waitFor({timeout:30000});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(modelRequests,[]);assert.deepEqual(dictionaryRequests,[]);
  console.log(JSON.stringify({sha:expectedSha,branch:expectedBranch,layouts:evidence,errors,modelRequests,dictionaryRequests,blockedNonReadRequests:denied},null,2));
} catch(error) {
  // Playwright call logs can include protection cookies; never print them.
  console.error(error.name, String(error.message).split('Call log:')[0].replaceAll(supplied.href,'[preview URL]'));
  process.exitCode=1;
} finally {await browser.close();}
