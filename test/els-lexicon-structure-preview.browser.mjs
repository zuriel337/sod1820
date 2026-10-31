// Hosted smoke only: never submits searches, AI, auth, saves or live writes.
// Full scan/replay behavior is covered by the real-tool Native browser suite.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

const supplied = new URL(process.env.ELS_PREVIEW_URL);
assert.match(supplied.hostname, /^sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.equal(supplied.protocol, 'https:');
const expectedSha = process.env.ELS_PREVIEW_SHA;
assert.match(expectedSha || '', /^[a-f0-9]{40}$/);
const expectedBranch = process.env.ELS_PREVIEW_BRANCH || 'gpt/els-lexicon-structure-preview-20261030';
const researchArea = expectedBranch === 'gpt/els-research-area-preview-20261031';
const searchOrder = expectedBranch === 'gpt/els-search-order-preview-20261031';
const planners = searchOrder || expectedBranch === 'gpt/els-search-planners-preview-20261031';
assert.ok(researchArea || ['gpt/els-lexicon-structure-preview-20261030','gpt/els-search-clarity-preview-20261030','gpt/els-unified-research-preview-20261031','gpt/els-search-planners-preview-20261031','gpt/els-search-order-preview-20261031'].includes(expectedBranch));
const unified = researchArea || planners || expectedBranch === 'gpt/els-unified-research-preview-20261031';
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
    if(researchArea)await page.getByRole('navigation',{name:'מצבי הצופן התנ״כי'}).getByRole('button',{name:'מחקר',exact:true}).click();
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
      if(searchOrder){
        const search=page.locator('#els29-query');
        for(const name of ['חיפוש רגיל','הצלבה בין צירים','חיפוש מתקדם'])assert.ok(await search.getByRole('button',{name,exact:true}).isVisible());
        assert.equal(await search.getByRole('button',{name:'כל הכלים',exact:true}).count(),0);
        await search.getByRole('button',{name:'חיפוש מתקדם',exact:true}).click();
        assert.ok(await search.getByRole('textbox',{name:'מונח לחיפוש מתקדם',exact:true}).isVisible());
        assert.ok(await search.getByRole('button',{name:'בדוק גם היפוכים וסדר מילים',exact:true}).isVisible());
        assert.equal(await search.locator('form form').count(),0);
        await search.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
        const third=search.getByRole('textbox',{name:'מונח שלישי',exact:true});
        const required=search.getByRole('checkbox',{name:'חובה למצוא גם את המונח השלישי'});
        assert.equal(await required.isChecked(),false);
        await third.fill('שלום');await required.check();assert.equal(await required.isChecked(),true);
        await required.uncheck();assert.ok(await search.getByText(/זוג יישאר בתוצאות גם בלעדיו/).isVisible());
        assert.equal(await search.locator('button[type=submit]:visible').count(),1);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(process.env.ELS_PREVIEW_SCREENSHOTS){mkdirSync(process.env.ELS_PREVIEW_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.ELS_PREVIEW_SCREENSHOTS+`/cross-${width}-${theme}.png`});}
        await search.getByRole('button',{name:'חיפוש רגיל',exact:true}).click();
      }
      if(planners){
        const prepare=page.getByText('הכנת זוגות לחיפוש',{exact:true});
        await prepare.click();
        const planner=page.getByRole('region',{name:'הכנת זוגות לחיפוש',exact:true});
        await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('שלום');
        await planner.getByRole('textbox').fill('תורה\nברכה');
        await planner.getByRole('button',{name:'הכן זוגות לחיפוש',exact:true}).click();
        assert.equal(await planner.getByRole('radio').count(),2);
        assert.ok(await planner.getByRole('button',{name:'חפש את הזוג שנבחר',exact:true}).isEnabled());
        // Preparation is local only; never submit a search on the live backend.
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(process.env.ELS_PREVIEW_SCREENSHOTS){mkdirSync(process.env.ELS_PREVIEW_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.ELS_PREVIEW_SCREENSHOTS+`/planner-${width}-${theme}.png`});}
        await prepare.click();
      }
      const words=page.getByText(unified?'גילוי וקשרים במטריצה · ללא AI':'מילים במטריצה · ללא AI',{exact:true});
      const structures=page.getByText(unified?'בדיקת הסימונים והשוואת מופעים':'מבנים והשוואת מופעים · ללא AI',{exact:true});
      assert.ok(await words.isVisible());
      if(researchArea){
        const entry=page.getByRole('button',{name:'כלי מחקר',exact:true});
        assert.deepEqual(await page.locator('.els29-native-toolstrip > button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),['סריקה וממצאים','תוצאות','שמירה','גילוי עם AI']);
        const geometry=await page.locator('.els29-native-structure-entry').evaluate(el=>{
          const area=el.getBoundingClientRect(),stage=el.parentElement.querySelector('.els29-native-stage-column').getBoundingClientRect();
          return {top:area.top,stageBottom:stage.bottom,inInspector:!!el.closest('.els29-native-panel-wrap')};
        });
        assert.equal(geometry.inInspector,false);assert.ok(geometry.top>=geometry.stageBottom-1,JSON.stringify(geometry));
        if(await entry.getAttribute('aria-expanded')!=='true')await entry.click();
      }else if(!await words.evaluate(n=>n.parentElement.open))await words.click();
      const workspace=page.getByRole('region',{name:unified?'גילוי וקשרים במטריצה':'מילים במטריצה',exact:true});
      await workspace.waitFor();
      if(unified){
        assert.equal(await page.locator('.els29-native-structure-entry:visible').count(),1);
        assert.ok(await workspace.getByRole('button',{name:'גלה מילים ומבנים',exact:true}).isVisible());
        assert.ok(await workspace.getByRole('button',{name:'חפש מילה מסוימת',exact:true}).isVisible());
        assert.equal(await workspace.getByText('בדיקת הסימונים והשוואת מופעים',{exact:true}).count(),1);
      }
      assert.ok(await structures.isVisible());
      if(!await structures.evaluate(n=>n.parentElement.open))await structures.click();
      await page.getByRole('region',{name:'מבנים והשוואת מופעים',exact:true}).waitFor();
      if(expectedBranch==='gpt/els-search-clarity-preview-20261030'||unified){
        const panel=page.getByRole('region',{name:'מבנים והשוואת מופעים',exact:true});
        assert.ok(await panel.getByText('איך מוצאים זוגות?',{exact:true}).isVisible());
        assert.ok(await panel.getByRole('button',{name:'חפש והוסף מילה למטריצה',exact:true}).isVisible());
        assert.ok(await panel.getByText(/עדיין לא הוספתם תמונות מצב להשוואה/).isVisible());
      }
      const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(size.scroll<=size.client+1,JSON.stringify({width,theme,size}));
      if(researchArea){
        if(process.env.ELS_PREVIEW_SCREENSHOTS){mkdirSync(process.env.ELS_PREVIEW_SCREENSHOTS,{recursive:true});await page.locator('.els29-native-structure-entry').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.ELS_PREVIEW_SCREENSHOTS+`/research-${width}-${theme}.png`});}
        const modes=page.getByRole('navigation',{name:'מצבי הצופן התנ״כי'});
        await modes.getByRole('button',{name:'קלאסי',exact:true}).click();
        assert.equal(await page.locator('.els29-native-structure-entry').isVisible(),false);
        await modes.getByRole('button',{name:'מחקר',exact:true}).click();
        assert.equal(await page.getByRole('button',{name:'כלי מחקר',exact:true}).getAttribute('aria-expanded'),'true');
      }
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
