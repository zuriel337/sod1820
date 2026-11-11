const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const [mode,width]of[['delay',390],['delay',1440],['failed',390]])test('root action preserves the restored operand while its profile is '+mode+' '+width,async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width,height:900});
 // This historically named reader has a side-effecting log path: never forward it.
 await page.route('**/rest/v1/rpc/lang_links_list',route=>route.abort());
 // Missing trace is controlled; every successful profile remains the actual
 // canonical public response. This isolates the profile/Back race.
 await page.route('**/rest/v1/rpc/gematria_method_trace',route=>route.fulfill({status:200,contentType:'application/json',body:'null'}));
 const expression='אחת ארבע שבע ושתיים',address='/number/1820?focus='+encodeURIComponent(expression)+'&method='+encodeURIComponent('רגיל')+'&source=root-race&part=2&part=7#number-essential';
 await page.goto(origin+address);const root=page.locator('.sod29-number-root-open');await expect(root).toBeEnabled({timeout:60000});
 const rail=page.locator('.sod29-number-v11-regular-track button').first();const other=await rail.locator('strong').textContent();expect(other).not.toBe(expression);await rail.click();
 await expect(page.locator('.sod29-number-v10-expression-line>:is(h1,strong)')).toHaveText(other);await expect(root).toBeEnabled({timeout:60000});
 let release,arrive,failed=mode==='failed';const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{arrive=resolve;});
 await page.route('**/rest/v1/rpc/fn_method_profile',async route=>{
  if(route.request().postDataJSON()?.p_phrase!==expression)return route.fallback();arrive();await gate;
  if(failed)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'controlled profile failure'})});return route.fallback();
 });
 // Expire the bounded canonical reuse window so the original delayed/failed
 // response checks still exercise an actual read rather than a cached result.
 await page.evaluate(()=>{const actualNow=Date.now;Date.now=()=>actualNow()+31_000;});
 await page.goBack();await seen;await expect(page.locator('.sod29-number-v10-expression-line>:is(h1,strong)')).toHaveText(expression);await expect(root).toBeDisabled();await expect(root).toHaveAttribute('aria-busy','true');
 await root.evaluate(button=>button.click());await expect(page).toHaveURL(origin+address);await expect(page.getByRole('dialog')).toHaveCount(0);
 release();
 if(mode==='failed'){
  await expect(root).toHaveAttribute('title','תוצאת השיטה אינה זמינה; הביטוי נשמר',{timeout:30000});await expect(root).toBeDisabled();await expect(page).toHaveURL(origin+address);
  await expect(page.getByText('0 שיטות זמינות · 6 גלויות מיד',{exact:true})).toHaveCount(0);
  failed=false;await page.getByRole('button',{name:'נסה שוב את השיטות',exact:true}).click();await expect(root).toBeEnabled({timeout:60000});await expect(page).toHaveURL(origin+address);
 }else{
  await expect(root).toBeEnabled({timeout:60000});await root.click();await expect.poll(()=>new URL(page.url()).searchParams.has('source')).toBe(false);
  expect(new URL(page.url()).searchParams.get('focus')).toBe(expression);expect(new URL(page.url()).searchParams.get('method')).toBe('רגיל');await page.goBack();await expect(page).toHaveURL(origin+address);
 }
 fs.writeFileSync(info.outputPath('root-profile-race.json'),JSON.stringify({mode,width,controlled:'profile response delayed or failed; trace unavailable',successfulProfileData:'actual public canonical response',address,operandAndMethodPreserved:true,productWritesForwarded:0,modelsForwarded:0},null,2)+'\n');
});
