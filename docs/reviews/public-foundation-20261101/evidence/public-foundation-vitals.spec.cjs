const {test,expect}=require('./safe-local-fixture.cjs');
const fs=require('node:fs');
test.describe.configure({mode:'parallel'});
for(const width of [390,1440])for(let repetition=1;repetition<=4;repetition++)test(`matched Home vitals ${width} pair ${repetition}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 await page.route('http://127.0.0.1:4186/**',route=>route.request().method()==='GET'?route.continue():route.abort());
 await page.addInitScript(()=>{
  window.__foundationVitals={cls:0,lcp:0};let sum=0,first=0,last=0;
  new PerformanceObserver(list=>{for(const e of list.getEntries()){if(e.hadRecentInput)continue;if(e.startTime-last>1000||e.startTime-first>5000){sum=0;first=e.startTime;}sum+=e.value;last=e.startTime;window.__foundationVitals.cls=Math.max(window.__foundationVitals.cls,sum);}}).observe({type:'layout-shift',buffered:true});
  new PerformanceObserver(list=>{for(const e of list.getEntries())window.__foundationVitals.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
 });
 const results=[];
 const order=[['before','http://127.0.0.1:4186/2029'],['after','http://127.0.0.1:4185/']];if(repetition%2===0)order.reverse();
 for(const [version,url]of order){
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});expect(response.status()).toBe(200);await expect(page.locator('.h29-hero')).toBeVisible({timeout:30000});
  await page.waitForTimeout(6500);
  const values=await page.evaluate(()=>({...window.__foundationVitals,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}));
  results.push({version,width,repetition,windowMs:6500,...values});expect(values.overflow).toBe(false);
  if(version==='after')expect(values.cls).toBeLessThanOrEqual(.1);
 }
 fs.writeFileSync(info.outputPath('matched-vitals.json'),JSON.stringify(results,null,2)+'\n');
});
