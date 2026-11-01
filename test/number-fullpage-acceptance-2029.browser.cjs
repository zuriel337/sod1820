// Actual compiled client, actual public data through the existing independent
// GET-only barrier. No login, product writes, model or automatic sharing.
const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4231';
for(const width of[390,1440])test('Number full-page methods, precise return and informative public sources '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});
 const errors=[],profileReads=[];page.on('pageerror',e=>errors.push(e.name));page.on('request',r=>{if(r.url().includes('/rpc/fn_method_profile'))profileReads.push(r.postDataJSON()?.p_phrase);});
 const address='/number/1820?source=post&part=2&part=7#number-essential';
 await page.goto(origin+address);await expect(page.locator('.sod29-number-page[data-number-root="1820"]')).toBeVisible({timeout:60000});
 const milui=()=>page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();
 await expect(milui()).toBeEnabled({timeout:30000});
 const result=Number((await milui().locator('strong').textContent()).replace(/,/g,''));
 const expression=await page.locator('.sod29-number-v10-expression-line>strong').textContent();
 expect(result).toBe(3928); // Recorded from the canonical public profile in the dbbe baseline.
 const miluiStarted=Date.now();await milui().click();
 await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(result),{timeout:60000});
 await expect(page.locator('.sod29-number-core2029.is-page')).toHaveAttribute('data-number-core-root',String(result));
 const miluiMs=Date.now()-miluiStarted;
 let url=new URL(page.url());expect(url.pathname).toBe('/number/'+result);expect(url.searchParams.get('focus')).toBe(expression);expect(url.searchParams.get('method')).toBe('מילוי');
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.sod29-number-drawer2029')).toHaveCount(0);
 await expect(page.locator('.sod29-number-v10-method-card.is-active').locator('span').first()).toHaveText('מילוי');
 await page.goBack();await expect(page).toHaveURL(origin+address);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 await expect(milui()).toBeEnabled({timeout:30000});await milui().click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','3928',{timeout:60000});
 await page.getByRole('region',{name:'מיקוד ביטוי פעיל',exact:true}).getByRole('button',{name:'↩ דף 1820',exact:true}).click();
 await expect(page).toHaveURL(origin+address);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 const rail=page.locator('.sod29-number-v11-regular-track button').first();await expect(rail).toBeVisible({timeout:30000});const phrase=await rail.locator('strong').textContent();
 await rail.click();await expect.poll(()=>new URL(page.url()).searchParams.get('focus')).toBe(phrase);expect(new URL(page.url()).searchParams.get('method')).toBe('רגיל');
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(origin+address);
 const sourceList=page.locator('.sod29-lw-source-list');await sourceList.scrollIntoViewIfNeeded();
 await expect(sourceList.getByRole('status')).toHaveCount(0,{timeout:60000});
 await expect(sourceList.getByRole('alert')).toHaveCount(0);
 const cards=await sourceList.locator(':scope>article').evaluateAll(nodes=>nodes.map(e=>({text:e.querySelector('strong')?.textContent,href:e.querySelector('a')?.getAttribute('href')||null,buttonCount:e.querySelectorAll('button').length})));
 for(const card of cards){expect(card.text).toBeTruthy();expect(card.text).not.toBe('הודעות מקור');expect(card.buttonCount).toBe(0);if(card.href)expect(card.href).toMatch(/^(?:\/(?!\/)|https?:\/\/)/);}
 if(width===390&&cards.some(card=>card.href?.startsWith('/'))){
  const href=cards.find(card=>card.href?.startsWith('/')).href;
  await sourceList.locator('a').first().click();await expect(page).toHaveURL(origin+href);
  const anchor=new URL(page.url()).hash.slice(1);if(anchor)await expect(page.locator('[id="'+anchor+'"]')).toBeVisible({timeout:30000});
  await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
  await expect(page).toHaveURL(origin+'/number/1820?source=post&part=2&part=7#number-content-live');
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 await page.screenshot({path:info.outputPath('sources-'+width+'.png')});
 fs.writeFileSync(info.outputPath('accepted-number.json'),JSON.stringify({width,data:'real public read-only',canonicalExample:{expression,regular:1820,milui:3928},miluiMs,preciseReturn:address,fullPageNoDrawer:true,cards,profileReads,errors,productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');
 expect(errors).toEqual([]);
});
