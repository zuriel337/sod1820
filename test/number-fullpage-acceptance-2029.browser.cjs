const scenarios=require('./public-world-scenarios.cjs');
// Actual compiled client, actual public data through the existing independent
// GET-only barrier. No login, product writes, model or automatic sharing.
const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4231';
for(const width of[390,1440])test('Number full-page methods, precise return and informative public sources '+width,async({page},info)=>{
 test.setTimeout(180000);await scenarios.numberFullPage(page,width,info,origin);
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

test('direct phrase with exact method survives reload; legacy and new Post addresses retain canonical links',async({page},info)=>{
 test.setTimeout(120000);await scenarios.directPublicAddresses(page,1440,info,origin);
});

test('synthetic public-source outage stays an error, never empty success, and retry reads public data',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:900});let fail=true;
 await page.route('**/rest/v1/world_contributor_research_v1*',route=>fail?route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic public-source outage"}'}):route.fallback());
 await page.goto(origin+'/number/1820');const list=page.locator('.sod29-lw-source-list');await list.scrollIntoViewIfNeeded({timeout:60000});
 await expect(list.getByRole('alert')).toBeVisible({timeout:30000});await expect(list.getByText('אין כרגע פרטי מקור ציבוריים מספיקים להצגה.',{exact:true})).toHaveCount(0);
 fail=false;await list.getByRole('button',{name:'ניסיון נוסף',exact:true}).click();await expect(list.locator(':scope>article').first()).toBeVisible({timeout:60000});await expect(list.getByRole('alert')).toHaveCount(0);
});
