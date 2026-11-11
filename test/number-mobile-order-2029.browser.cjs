// Actual compiled client/public data. Existing deny-default GET-only barrier.
const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4231';
const before=process.env.SOD_NUMBER_MOBILE_PHASE==='before';
const widths=before?[360,390,1440]:[320,360,390,768,1440];
for(const width of widths)test('Number mobile geometry and inherited public order '+width,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:900});
 const reads=[],publicOrder=[];page.on('response',async response=>{
  const req=response.request(),url=new URL(response.url());
  reads.push({path:url.pathname,ms:req.timing().responseEnd,status:response.status()});
  if(url.pathname==='/rest/v1/gematria_words'&&url.searchParams.get('ragil')==='eq.1820'&&url.searchParams.get('order')?.startsWith('lead_rank')&&response.ok()){
   const rows=await response.json().catch(()=>[]);if(rows.length&&!publicOrder.length)publicOrder.push(...rows.map(row=>({phrase:row.phrase,rank:row.lead_rank})));
  }
 });
 const started=Date.now();await page.goto(origin+'/number/1820?source=mobile-acceptance#number-essential');
 const core=page.locator('.sod29-number-core2029.is-page');await expect(core).toBeVisible({timeout:60000});
 const method=page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();await expect(method).toBeEnabled({timeout:30000});await expect(method.locator('strong')).toHaveText(/[0-9]/);
 const readyMs=Date.now()-started;await expect(page.locator('.sod29-number-v11-regular-track button').first()).toBeVisible();
 await expect.poll(()=>publicOrder.length).toBeGreaterThan(0);
 const expression=await page.locator('.sod29-number-v10-expression-line>:is(h1,strong)').textContent();
 const displayedOrder=await page.locator('.sod29-number-v11-regular-track .sod29-number-v11-regular-select strong').allTextContents();
 const geometry=await page.locator('.sod29-number-v10-identity').evaluate(header=>{
  const box=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const expression=header.querySelector('.sod29-number-v10-expression'),text=expression.querySelector('h1,strong');
  const root=header.querySelector('.sod29-number-value'),life=header.querySelector('.sod29-number-v10-life-seal');
  return {header:box(header),expression:box(expression),text:box(text),number:box(root),life:box(life),fontSize:getComputedStyle(root).fontSize,overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
 const result={phase:before?'before':'after',width,readyMs,expression,publicOrder:publicOrder.slice(0,8),displayedOrder:displayedOrder.slice(0,8),geometry,overlap:{textNumber:overlap(geometry.text,geometry.number),textLife:overlap(geometry.text,geometry.life)},reads};
 await page.screenshot({path:info.outputPath('number-'+width+'.png')});fs.writeFileSync(info.outputPath('mobile-order.json'),JSON.stringify(result,null,2)+'\n');
 if(!before){
  expect(expression).toBe(publicOrder[0].phrase);expect(displayedOrder.slice(0,3)).toEqual(publicOrder.slice(0,3).map(row=>row.phrase));expect(geometry.overflow).toBe(false);
  expect(result.overlap.textNumber).toBe(0);expect(result.overlap.textLife).toBe(0);
  if(geometry.header.width<=620)expect(geometry.expression.width/geometry.header.width).toBeGreaterThan(.8);
  expect(geometry.text.height).toBeLessThan(150);
 }
});
