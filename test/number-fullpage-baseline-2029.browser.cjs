const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4197';
test('read-only Number1820 baseline: method destination, source cards and first-load waterfall',async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:390,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.name));
 const start=Date.now();await page.goto(origin+'/number/1820?source=number-acceptance#number-essential');
 await expect(page.locator('.sod29-number-page[data-number-root="1820"]')).toBeVisible({timeout:60000});const pageMs=Date.now()-start;
 await expect(page.locator('.sod29-number-v10-method-card').first()).toBeEnabled({timeout:60000});
 const methods=await page.locator('.sod29-number-v10-method-card').allTextContents();
 const before=page.url();const milui=page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();
 let method=null;if(await milui.count()){
  const label=await milui.innerText();await milui.click();await page.waitForTimeout(1200);
  method={label,before,after:page.url(),pageRoot:await page.locator('.sod29-number-page').getAttribute('data-number-root'),dialogs:await page.getByRole('dialog').count()};
 }
 const sourceList=page.locator('.sod29-lw-source-list');await sourceList.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 const sources=await sourceList.locator('button,a,article').evaluateAll(nodes=>nodes.map(e=>({tag:e.tagName,text:e.textContent.trim(),href:e.getAttribute('href')})));
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,ms:Math.round(r.duration),bytes:r.decodedBodySize})).sort((a,b)=>b.ms-a.ms));
 const result={baselineSha:'dbbe91de46d21a37110664dc732473de6d9cc6ca',actualCompiledClient:true,transport:'existing independent allowlisted RPC-to-GET public read barrier, fresh worker; no live write/model/Auth operation',pageMs,method,methods,sources,resources,errors};
 fs.writeFileSync(info.outputPath('number-baseline.json'),JSON.stringify(result,null,2)+'\n');await page.screenshot({path:info.outputPath('source-cards-before.png')});
 expect(errors).toEqual([]);
});
