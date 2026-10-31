const http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {installGuard,newAudit}=require('./tests/safe-preview-fixture.cjs');
const fs=require('node:fs');
(async()=>{
  let receivedWrites=0;
  const server=http.createServer((req,res)=>{
    if(req.method!=='GET')receivedWrites++;
    if(req.url==='/sw.js'){res.setHeader('content-type','application/javascript');return res.end("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('message',e=>{fetch('/forbidden-write',{method:'POST',body:'synthetic-local-only'}).catch(()=>{});});");}
    res.setHeader('content-type','text/html');res.end('<!doctype html><title>local guard preflight</title>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const local='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    const context=await browser.newContext();const audit=newAudit();await installGuard(context,audit,{localOrigin:local});
    const page=await context.newPage();await page.goto(local);
    await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;await new Promise(r=>navigator.serviceWorker.controller?r():navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
    await page.evaluate(()=>{fetch('/forbidden-write',{method:'POST',body:'synthetic-page-only'}).catch(()=>{});navigator.serviceWorker.controller.postMessage('probe');});
    await pwait(()=>audit.blocked.filter(x=>x.path==='/forbidden-write').length===2);
    assert.equal(receivedWrites,0);assert.ok(audit.blocked.some(x=>x.serviceWorker));assert.ok(audit.blocked.some(x=>!x.serviceWorker));
    fs.writeFileSync('/tmp/ci1185-protected-entry-world/results/guard-preflight.json',JSON.stringify({passed:true,receivedWrites,audit},null,2));
    console.log('Guard preflight PASS: page and actual Service Worker POSTs blocked; local sink received zero writes');await context.close();
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(()=>{console.error('Guard preflight FAILED; hosted navigation is forbidden');process.exitCode=1;});
async function pwait(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Local interception timeout');}
