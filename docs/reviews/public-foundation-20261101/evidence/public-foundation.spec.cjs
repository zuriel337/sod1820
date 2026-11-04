const {test,expect}=require('./safe-local-fixture.cjs');
const posts=require('./live-posts.json');
const base='http://127.0.0.1:4185';
test.describe.configure({mode:'parallel'});
const old=posts.find(p=>p.id===92),modern=posts.find(p=>p.id===5112);
const oldPath=new URL(old.link).pathname,modernPath='/post/'+modern.slug;
async function fits(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);}
for(const width of [390,1440]){
 test('real public posts preserve historical/native URL, query, canonical and refresh at '+width,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  for(const [path,slug,canonical]of [[oldPath,old.slug,oldPath],[modernPath,modern.slug,modernPath],['/post/'+old.slug,old.slug,oldPath],['/'+modern.slug,modern.slug,modernPath]]){
   const response=await page.goto(base+path+'?from=public-foundation#post-story');expect(response.status()).toBe(200);
   await expect(page.locator('[data-experience-surface="post-reading"]')).toHaveAttribute('data-post-slug',slug,{timeout:30000});
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://sod1820.co.il'+canonical);
   expect(new URL(page.url()).search).toBe('?from=public-foundation');expect(new URL(page.url()).hash).toBe('#post-story');await fits(page);
  }
  await page.reload();await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible();
  await page.screenshot({path:info.outputPath('real-native-post.png'),fullPage:false});
 });
 test('real number and expression direct addresses and selected method at '+width,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  for(const path of ['/number/1820?source=post','/number/'+encodeURIComponent('בראשית')+'?method='+encodeURIComponent('רגיל')+'&source=post']){
   expect((await page.goto(base+path)).status()).toBe(200);
   await expect(page.locator('.sod29-number-page')).toBeVisible({timeout:30000});
   await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',path.startsWith('/number/1820')?'1820':'913');
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://sod1820.co.il'+new URL(page.url()).pathname);
   await expect(page.locator('body')).not.toContainText('הביטוי או השיטה לא נטענו');await fits(page);
  }
  await expect(page.locator('body')).toContainText('בראשית');await page.reload();await expect(page.locator('.sod29-number-page')).toBeVisible({timeout:30000});
  await page.screenshot({path:info.outputPath('real-expression.png'),fullPage:false});
 });
 test('home menu, public index, world and service navigation at '+width,async({page},info)=>{
  await page.setViewportSize({width,height:900});await page.goto(base+'/');await expect(page.locator('.h29-hero')).toBeVisible({timeout:30000});await expect(page.locator('.h29-hero')).not.toContainText('טוען',{timeout:30000});await page.screenshot({path:info.outputPath('home.png'),fullPage:false});
  if(width===390){await page.locator('.sod29-mobile-menu-trigger').click();await expect(page.locator('#sod29-mobile-navigation')).toBeVisible();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'פוסטים',exact:true}).click();}
  else await page.locator('a[href="/post"]').first().click();
  await expect(page).toHaveURL(base+'/post');await expect(page.locator('.sod29-library-post-card')).not.toHaveCount(0,{timeout:30000});
  const links=await page.locator('.sod29-library-post-card-link').evaluateAll(a=>a.map(x=>x.getAttribute('href')));expect(links.every(h=>h&&!h.includes('/post/post/'))).toBe(true);
  await page.goto(base+'/world');await expect(page.locator('body')).toContainText('העולם');await fits(page);
  for(const [path,title]of [['/map','מפת האתר'],['/privacy#data-deletion','מדיניות פרטיות'],['/unsubscribe','קישור לא תקין'],['/updates','עדכונים במייל']]){await page.goto(base+path);await expect(page.getByRole('heading',{name:title,exact:true}).first()).toBeVisible({timeout:20000});await fits(page);}
  await page.screenshot({path:info.outputPath('updates.png'),fullPage:false});
 });
 test('unknown and malformed direct routes return an honest missing state at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});let r=await page.goto(base+'/missing-public-foundation-20261101');expect(r.status()).toBe(404);await expect(page.locator('body')).toContainText('הפוסט לא נמצא');
  r=await page.goto(base+'/no/such/public-page');expect(r.status()).toBe(404);await expect(page.getByRole('heading',{name:'העמוד לא נמצא',exact:true})).toBeVisible();await fits(page);
 });
}
for(const width of [390,1440])test('real historical post to canonical Number and exact original address/query/anchor back at '+width,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.goto(base+oldPath+'?part=7#post-story');await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});
 const controls=page.locator('.sod29-reading-source [data-gem],.sod29-reading-source [data-contextual-number-focus="true"]');expect(await controls.count()).toBeGreaterThan(0);await controls.first().click();
 // The historical source omits a method: explicitly start a new calculation, never label it source verification.
 const explore=page.getByRole('button',{name:'בדיקה חדשה במנוע',exact:true});
 await expect(explore).toBeVisible({timeout:20000});await explore.click();
 const drawer=page.locator('.sod29-number-drawer2029');await expect(drawer).toBeVisible({timeout:30000});await drawer.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();
 await expect(page).toHaveURL(/\/number\/\d+/,{timeout:30000});await expect(page.locator('.sod29-number-page')).toBeVisible({timeout:30000});
 const back=page.locator('.sod29-number-page').getByRole('button',{name:/↩/}).first();await expect(back).toBeVisible();await back.click();
 await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});const u=new URL(page.url());expect(decodeURIComponent(u.pathname)).toBe(decodeURIComponent(oldPath));expect(u.search).toBe('?part=7');expect(u.hash).toMatch(/^#(?:source-region-|post-)/);await expect.poll(()=>page.evaluate(()=>{const node=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!node)return false;const box=node.getBoundingClientRect();return box.top>=0&&box.top<innerHeight;}),{timeout:15000}).toBe(true);await fits(page);await page.screenshot({path:info.outputPath('real-old-exact-return.png'),fullPage:false});
});
test('newsletter and signed unsubscribe UI use synthetic intercepted responses, never live delivery or subscriber writes',async({page})=>{
 let sends=0;await page.route('**/functions/v1/newsletter-signup*',async route=>{sends++;expect(route.request().postDataJSON().email).toBe('reader@example.invalid');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:'exists'})});});
 await page.goto(base+'/updates');const submit=page.getByRole('button',{name:'הרשמה לעדכונים',exact:true});await expect(submit).toBeDisabled();await page.getByRole('textbox',{name:'כתובת דוא״ל'}).fill('reader@example.invalid');await page.getByRole('checkbox').check();await submit.click();await expect(page.getByRole('status').filter({hasText:'הכתובת כבר קיימת'})).toBeVisible();expect(sends).toBe(1);
 await page.route('**/functions/v1/newsletter-unsubscribe*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,email:'reader@example.invalid'})}));
 await page.goto(base+'/unsubscribe?e=synthetic&t=synthetic');await expect(page.getByRole('heading',{name:'הוסרת מרשימת התפוצה'})).toBeVisible();await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://sod1820.co.il/unsubscribe');await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
});
test('expression loading failure and cancellation remain separate from an empty result',async({page})=>{
 await page.route('**/rest/v1/rpc/fn_method_profile*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic offline failure"}'}));
 await page.goto(base+'/number/'+encodeURIComponent('ביטוי בדיקה'));await expect(page.getByRole('alert').filter({hasText:'הביטוי או השיטה לא נטענו'})).toBeVisible();await expect(page.getByRole('button',{name:'לנסות שוב',exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('אין תוצאות');
 await page.goto(base+'/map');await expect(page.getByRole('heading',{name:'מפת האתר',exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('הביטוי או השיטה לא נטענו');
});

for(const width of [390,1440]) test('gallery filtering retains the native gallery view at '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto(base+'/gallery?flow=1');
 const input=page.locator('.g29-reading-controls input[type="search"]');await expect(input).toBeVisible({timeout:30000});await input.fill('1820');
 await expect(page).toHaveURL(/view=gallery/);await expect(input).toHaveValue('1820');await fits(page);
 await page.screenshot({path:info.outputPath('gallery-filter.png'),fullPage:false});
});

test('post copy uses its canonical address and exact reading context without sending a social message',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiedPublicUrl=text;}}});});
 await page.goto(base+'/'+modern.slug+'?part=7&_vercel_share=synthetic-access-grant#post-story');await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});
 await page.locator('.sod29-post-details summary').click();await page.locator('.sod29-post-details-body [data-action="copy"]').click();
 await expect.poll(()=>page.evaluate(()=>window.__copiedPublicUrl)).toBeTruthy();const result=new URL(await page.evaluate(()=>window.__copiedPublicUrl));expect(result.origin).toBe('https://sod1820.co.il');expect(result.pathname).toBe('/post/'+modern.slug);expect(result.searchParams.get('part')).toBe('7');expect(result.searchParams.has('_vercel_share')).toBe(false);expect(result.hash).toBe('#post-story');
});

test('real public post hidden from Home stays readable through its unchanged historical address',async({page})=>{
 const post=require('./live-hidden-post.json'),path=new URL(post.link).pathname;
 const response=await page.goto(base+path);expect(response.status()).toBe(200);
 await expect(page.locator('[data-experience-surface="post-reading"]')).toHaveAttribute('data-post-slug',post.slug,{timeout:30000});
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://sod1820.co.il'+path);
});
test('real WordPress numeric id address retains id, parameters and source document on refresh',async({page})=>{
 const response=await page.goto(base+'/?p='+old.wp_id+'&part=7#post-story');expect(response.status()).toBe(200);
 await expect(page.locator('[data-experience-surface="post-reading"]')).toHaveAttribute('data-post-slug',old.slug,{timeout:30000});
 expect(new URL(page.url()).searchParams.get('p')).toBe(String(old.wp_id));await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://sod1820.co.il'+oldPath);
 await page.reload();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});
});

test('synthetic in-flight expression read cannot replace the next document after cancellation',async({page})=>{
 await page.setViewportSize({width:1440,height:900});let release,started=false;
 const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/rest/v1/rpc/fn_method_profile*',async route=>{started=true;await gate;try{await route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic late failure"}'});}catch{}});
 await page.goto(base+'/number/'+encodeURIComponent('ביטוי ביטול סינתטי'));
 await expect.poll(()=>started).toBe(true);await expect(page.getByText('טוען את המספר והביטוי…',{exact:true})).toBeVisible();
 await page.locator('a[href="/map"]').first().click();await expect(page).toHaveURL(base+'/map');release();
 await expect(page.getByRole('heading',{name:'מפת האתר',exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('הביטוי או השיטה לא נטענו');
});
