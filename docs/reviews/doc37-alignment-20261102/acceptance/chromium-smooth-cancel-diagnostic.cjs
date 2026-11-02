// Isolated platform experiment: about:blank, no SOD code/data/SW/network.
// No wheel-delta simulation: real Chromium wheel input owns all user movement.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.SOD_COLD_OUT;if(!out)throw Error('SOD_COLD_OUT required');fs.mkdirSync(out,{recursive:true,mode:0o700});
(async()=>{const report={kind:'isolated-Chromium-platform-diagnostic',productCode:false,productData:false,network:false,modelCalls:0,cases:[]};let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:false,args:['--no-sandbox','--disable-dev-shm-usage']});
  report.browserVersion=browser.version();
  for(const interrupt of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage(),item={interruptAtCurrentPosition:interrupt};report.cases.push(item);
   try{
    await page.setContent('<!doctype html><html dir="rtl"><head><style>html{scroll-behavior:smooth}body{margin:0;min-height:8000px;background:linear-gradient(#123,#456);color:white}</style></head><body>Isolated scrolling control</body></html>');
    await page.evaluate(interrupt=>{window.__control=[];let last=-1;const mark=(type,extra={})=>window.__control.push({type,time:performance.now(),y:scrollY,...extra});setInterval(()=>{if(scrollY!==last){mark('scroll');last=scrollY;}},30);addEventListener('wheel',event=>mark('wheel',{deltaY:event.deltaY,defaultPrevented:event.defaultPrevented}),{capture:true,passive:true});if(interrupt)addEventListener('wheel',()=>scrollTo({left:scrollX,top:scrollY,behavior:'instant'}),{capture:true,passive:true,once:true});scrollTo({top:925,behavior:'smooth'});},interrupt);
    await page.waitForFunction(()=>scrollY>20&&scrollY<800);await page.mouse.move(190,450);item.beforeWheel=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,-10000);await page.waitForTimeout(650);item.afterFirstWheel=await page.evaluate(()=>scrollY);
    for(let i=0;i<3;i++){await page.mouse.wheel(0,-400);await page.waitForTimeout(100);}
    await page.waitForTimeout(350);item.afterContinuedWheel=await page.evaluate(()=>scrollY);item.timeline=await page.evaluate(()=>window.__control);assert.equal(item.afterContinuedWheel,0,'subsequent genuine input remains usable');item.ok=true;await page.screenshot({path:`${out}/${interrupt?'interrupt-current':'native-smooth'}.png`});
   }catch(e){item.ok=false;item.error={name:e.name,message:String(e.message).slice(0,1000)};}
   finally{await context.close();}
  }
 }catch(e){report.fatal={name:e.name,message:String(e.message).slice(0,1000)};}
 finally{await browser?.close();report.ok=!report.fatal&&report.cases.every(c=>c.ok);fs.writeFileSync(out+'/control.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=report.ok?0:1;}
})();
