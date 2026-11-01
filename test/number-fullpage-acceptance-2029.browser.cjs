// Actual compiled client, actual public data through the existing independent
// GET-only barrier. No login, product writes, model or automatic sharing.
const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4231';
for(const width of[390,1440])test('Number full-page methods, precise return and informative public sources '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});
 const errors=[],profileReads=[];page.on('pageerror',e=>errors.push(e.name));page.on('request',r=>{if(r.url().includes('/rpc/fn_method_profile'))profileReads.push(r.postDataJSON()?.p_phrase);});
 // Default reading now follows the user's saved Legacy order. This scenario
 // deliberately selects the original canonical operand to retain its exact
 // 1820 -> 3928 assertion, independently of that editorial default.
 const address='/number/1820?focus='+encodeURIComponent('אחת ארבע שבע ושתיים')+'&method='+encodeURIComponent('רגיל')+'&source=post&part=2&part=7#number-essential';
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
 const focusedResultUrl=page.url();await page.locator('.sod29-number-v10-stage-result-open').click();await expect(page).toHaveURL(focusedResultUrl);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goBack();await expect(page).toHaveURL(origin+address);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 await expect(milui()).toBeEnabled({timeout:30000});await milui().click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','3928',{timeout:60000});
 await page.getByRole('region',{name:'מיקוד ביטוי פעיל',exact:true}).getByRole('button',{name:'↩ '+expression+' · 1820',exact:true}).click();
 await expect(page).toHaveURL(origin+address);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 const rail=page.locator('.sod29-number-v11-regular-track button').first();await expect(rail).toBeVisible({timeout:30000});const phrase=await rail.locator('strong').textContent();
 await rail.click();await expect.poll(()=>new URL(page.url()).searchParams.get('focus')).toBe(phrase);expect(new URL(page.url()).searchParams.get('method')).toBe('רגיל');
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(origin+address);
 await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText(expression);
 await page.locator('.sod29-number-root-open').click();expect(new URL(page.url()).pathname).toBe('/number/1820');expect(new URL(page.url()).searchParams.get('focus')).toBe(expression);expect(new URL(page.url()).searchParams.get('method')).toBe('רגיל');await expect(page.getByRole('dialog')).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(origin+address);
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
  await expect(page).toHaveURL(origin+address.replace('#number-essential','#number-content-live'));
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 await page.screenshot({path:info.outputPath('sources-'+width+'.png')});
 fs.writeFileSync(info.outputPath('accepted-number.json'),JSON.stringify({width,data:'real public read-only',canonicalExample:{expression,regular:1820,milui:3928},miluiMs,preciseReturn:address,fullPageNoDrawer:true,cards,profileReads,errors,productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');
 expect(errors).toEqual([]);
});

test('synthetic profile failure preserves the prior page, retry opens the canonical page, and late resolution cannot hijack Home',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:900});
 const original=origin+'/number/1820?source=failure-negative#number-essential';
 await page.goto(original);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 let mode='fail',release,seen;const observed=new Promise(resolve=>{seen=resolve;});const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/rest/v1/rpc/fn_method_profile',async route=>{
  if(route.request().postDataJSON()?.p_phrase!=='בראשית')return route.fallback();
  if(mode==='fail')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'synthetic profile outage'})});
  if(mode==='delay'){seen();await gate;}return route.fallback();
 });
 const query=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await query.fill('בראשית');await query.press('Enter');
 await expect(page.getByText('לא הצלחנו לפתוח את הביטוי. הדף והבחירה הקודמים נשמרו; אפשר לנסות שוב.',{exact:true})).toBeVisible();
 await expect(page).toHaveURL(original);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820');
 mode='delay';await query.press('Enter');await observed;
 await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'בית',exact:true}).click();
 const home=page.url();const done=page.waitForResponse(response=>response.url().includes('/rpc/fn_method_profile')&&response.request().postDataJSON()?.p_phrase==='בראשית');release();await done;
 await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:60000});await expect(page).toHaveURL(home);
 mode='pass';await page.goto(original);await expect(query).toBeVisible({timeout:60000});await query.fill('בראשית');await query.press('Enter');
 await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','913',{timeout:60000});await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('direct phrase with exact method survives reload; legacy and new Post addresses retain canonical links',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:900});
 const direct=origin+'/number/'+encodeURIComponent('אחת ארבע שבע ושתיים')+'?method='+encodeURIComponent('מילוי')+'&source=direct#number-essential';
 for(const reload of[false,true]){
  if(reload)await page.reload();else await page.goto(direct);
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','3928',{timeout:60000});
  await expect(page.locator('.sod29-number-v10-expression-line>strong')).toHaveText('אחת ארבע שבע ושתיים');
  await expect(page.locator('.sod29-number-v10-method-card.is-active span').first()).toHaveText('מילוי',{timeout:30000});
  await expect(page).toHaveURL(direct);await expect(page.getByRole('dialog')).toHaveCount(0);
 }
 const posts=require('../docs/reviews/public-foundation-20261101/evidence/live-posts.json');
 for(const post of posts){const href=new URL(post.link,'https://sod1820.co.il').pathname+'?source=number-regression#post-content';
  await page.goto(origin+href);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
  await expect(page).toHaveURL(origin+href);const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');expect(canonical).toBe(new URL(post.link,'https://sod1820.co.il').href);
 }
});

test('synthetic public-source outage stays an error, never empty success, and retry reads public data',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:900});let fail=true;
 await page.route('**/rest/v1/world_contributor_research_v1*',route=>fail?route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic public-source outage"}'}):route.fallback());
 await page.goto(origin+'/number/1820');const list=page.locator('.sod29-lw-source-list');await list.scrollIntoViewIfNeeded({timeout:60000});
 await expect(list.getByRole('alert')).toBeVisible({timeout:30000});await expect(list.getByText('אין כרגע פרטי מקור ציבוריים מספיקים להצגה.',{exact:true})).toHaveCount(0);
 fail=false;await list.getByRole('button',{name:'ניסיון נוסף',exact:true}).click();await expect(list.locator(':scope>article').first()).toBeVisible({timeout:60000});await expect(list.getByRole('alert')).toHaveCount(0);
});
