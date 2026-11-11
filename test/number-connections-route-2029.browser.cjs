const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const width of[390,1440])test('public connection opens its canonical Number/method and returns to the same row '+width,async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width,height:900});const modelAttempts=[];
 page.on('request',request=>{if(/\/api\/preview-raziel|\/functions\/v1\/(?:ai-analyze|research-run|els-matrix-reading)/.test(request.url()))modelAttempts.push(new URL(request.url()).pathname);});
 const original='/number/1820?source=connection&part=2&part=7#number-essential';await page.goto(origin+original);
 const row=page.locator('[data-experience-action="number-connection-page"][data-number-method="מילוי"]').first();await expect(row).toBeEnabled({timeout:60000});
 const label=await row.locator('strong').textContent(),method=await row.getAttribute('data-number-method'),locator=await row.getAttribute('id');
 const response=page.waitForResponse(response=>response.url().includes('/rpc/fn_method_profile')&&response.request().postDataJSON()?.p_phrase===label);
 await row.click();const profile=await(await response).json();const actual=profile.find(item=>item.method_key===method);expect(actual).toBeTruthy();const value=Number(actual.computed_value);expect(Number.isSafeInteger(value)).toBe(true);
 await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(value),{timeout:60000});
 await expect(page.locator('.sod29-number-v10-expression-line>:is(h1,strong)')).toHaveText(label);expect(new URL(page.url()).searchParams.get('focus')).toBe(label);expect(new URL(page.url()).searchParams.get('method')).toBe(method);
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(modelAttempts).toEqual([]);
 await page.goBack();const returned=origin+original.replace('#number-essential','#'+locator);await expect(page).toHaveURL(returned);
 await expect(page.locator('[id="'+locator+'"]')).toBeVisible({timeout:60000});expect(modelAttempts).toEqual([]);
 fs.writeFileSync(info.outputPath('connection.json'),JSON.stringify({width,label,method,value,returnHref:returned,source:'actual canonical public profile',modelAttempts,productWritesForwarded:0},null,2)+'\n');
});

for(const width of[320,390])test('Number prose at 150 percent remains readable '+width,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:900});await page.goto(origin+'/number/1820');
 const header=page.locator('.sod29-number-v10-identity');await expect(header).toBeVisible({timeout:60000});
 await header.locator('.sod29-number-v10-expression :is(strong,h1,small,span)').evaluateAll(elements=>{for(const element of elements)element.style.fontSize=(parseFloat(getComputedStyle(element).fontSize)*1.5)+'px';});
 const geometry=await header.evaluate(header=>{const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};return {header:rect(header),text:rect(header.querySelector('.sod29-number-v10-expression h1, .sod29-number-v10-expression strong')),number:rect(header.querySelector('.sod29-number-value')),life:rect(header.querySelector('.sod29-number-v10-life-seal')),overflow:document.documentElement.scrollWidth>innerWidth+1};});
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
 expect(geometry.overflow).toBe(false);expect(overlap(geometry.text,geometry.number)).toBe(0);expect(overlap(geometry.text,geometry.life)).toBe(0);expect(geometry.text.height).toBeLessThan(240);expect(geometry.number.right).toBeLessThanOrEqual(geometry.header.right+1);expect(geometry.number.x).toBeGreaterThanOrEqual(geometry.header.x-1);
 await page.screenshot({path:info.outputPath('large-prose-'+width+'.png')});
});
