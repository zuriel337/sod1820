const {test,expect}=require('./public-world-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const width of[390,1440])test('actual Home river opens the exact public gallery image and returns '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const address='/?source=river&part=2&part=7#reality-stream';await page.goto(origin+address);
 // The near-section admission replaces its loading component. Scroll the
 // current DOM synchronously, then wait on the real admitted picture.
 const river=page.locator('[data-reality-river]');await page.waitForFunction(()=>{const node=document.querySelector('[data-reality-river]');if(!node)return false;node.scrollIntoView({block:'start',behavior:'instant'});return true;});const first=river.locator('.r29-picture-frame').first();await expect(first).toBeVisible({timeout:60000});
 const imageId=await first.locator('..').getAttribute('data-river-image'),href=await first.getAttribute('href');expect(imageId).toBeTruthy();expect(new URL(href,origin).searchParams.get('image')).toBe(imageId);
 await first.click();const image=page.locator('[data-gallery-image-id="'+imageId+'"]');await expect(image).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+href);
 await page.reload();await expect(image).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+href);
 await page.goBack();await expect(page).toHaveURL(origin+address);await expect(river.locator('.r29-picture-frame').first()).toBeVisible({timeout:60000});await page.goForward();await expect(image).toBeVisible({timeout:60000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath('real-gallery-'+width+'.png')});fs.writeFileSync(info.outputPath('river-gallery.json'),JSON.stringify({width,data:'actual public Home river and gallery image',imageId,href,homeReturn:address,reloadBackForward:true,errors,productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');
});
for(const width of[390,1440])test('actual Post Number full page and exact source-region return '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});
 const address='/post/flydubai-fz1073-363-14000-remzei-geula?source=reading&part=2&part=7#post-gematria';await page.goto(origin+address);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
 const signal=page.locator('.sod29-reading-number-signal').first();await expect(signal).toBeVisible();const root=Number((await signal.locator('strong').textContent()).replace(/,/g,''));await signal.click();
 const drawer=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});await expect(drawer.locator('[data-number-core-root="'+root+'"]')).toBeVisible({timeout:60000});await drawer.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();
 await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(root),{timeout:60000});
 const context=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null')),target=context?.returnTo?.href;expect(target).toBeTruthy();const expected=new URL(target,origin);expect(expected.pathname).toBe(new URL(address,origin).pathname);expect(expected.search).toBe('?source=reading&part=2&part=7');expect(expected.hash).toMatch(/^#(?:source-region-|post-)/);
 if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
 await expect(page).toHaveURL(origin+target);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});await expect(page.locator('[id="'+decodeURIComponent(expected.hash.slice(1))+'"]')).toBeVisible({timeout:30000});
 await page.reload();await expect(page).toHaveURL(origin+target);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 fs.writeFileSync(info.outputPath('post-number-return.json'),JSON.stringify({width,data:'actual public modern Post and canonical Number reader',address,root,exactReturn:target,existingPostNumberDrawer:'explicitly opened before full-page action',productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');
});
