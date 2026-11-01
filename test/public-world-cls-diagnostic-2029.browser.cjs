const {test,expect}=require('./public-world-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const width of[390,1440])test('attribute actual public Home/Post/World/Number layout shifts '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>{
  window.__publicShifts=[];window.__publicPhase='initial';
  const path=node=>{if(!node)return null;return [node.tagName,node.id,node.className, node.parentElement?.className].map(String).join(' ').slice(0,350);};
  new PerformanceObserver(list=>{for(const row of list.getEntries())window.__publicShifts.push({phase:window.__publicPhase,time:row.startTime,value:row.value,hadRecentInput:row.hadRecentInput,url:location.pathname,sources:row.sources.map(source=>({node:path(source.node),previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
 });
 const steps=[];const step=async(name,action)=>{
  await page.evaluate(name=>{window.__publicPhase=name;},name).catch(()=>{});await action();
  // Diagnostic observation window, not a navigation speed metric.
  await page.waitForTimeout(1600);steps.push({name,url:page.url(),shifts:await page.evaluate(()=>window.__publicShifts.splice(0))});
 };
 await step('cold-home',async()=>{await page.goto(origin+'/?measure=cls');await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});});
 await step('home-post',async()=>{await page.locator('.h29-card-open').first().click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});});
 await step('post-world',async()=>{if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'העולם',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('link',{name:'העולם',exact:true}).click();await expect(page.locator('.sod29-world-entry')).toBeVisible({timeout:60000});});
 await step('world-number',async()=>{await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const panel=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});const input=panel.locator('input').first();await input.fill('1820');await input.press('Enter');await expect(panel.locator('[data-number-core-root="1820"]')).toBeVisible({timeout:60000});await panel.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});});
 await step('number-back-world',async()=>{await page.goBack();await expect(page.locator('.sod29-world-entry')).toBeVisible();});
 await step('world-back-post',async()=>{await page.goBack();await expect(page.locator('.sod29-reading-source')).toBeVisible();});
 await step('post-back-home',async()=>{await page.goBack();await expect(page.locator('.h29-card-open').first()).toBeVisible();});
 fs.writeFileSync(info.outputPath('layout-shifts.json'),JSON.stringify({width,steps,threshold:0.1,diagnosticOnly:true},null,2)+'\n');
 await page.screenshot({path:info.outputPath('home.png')});
});
