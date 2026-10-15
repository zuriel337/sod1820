// Child program deliberately swallows forbidden I/O. The outer runner must fail.
import fs from 'node:fs';
import http from 'node:http';
import dgram from 'node:dgram';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import isolation from '../../scripts/ci-isolation/policy.cjs';
const [kind,trap]=process.argv.slice(2);
if(kind==='fetch')await fetch(trap+'/rest/v1/op_trace_roots',{method:'POST',body:'{}'}).catch(()=>{});
else if(kind==='http')await new Promise(resolve=>http.get(trap+'/rest/v1/rpc/unknown',()=>resolve()).on('error',resolve));
else if(kind==='udp'){
 const socket=dgram.createSocket('udp4'),u=new URL(trap);
 await new Promise(resolve=>socket.send('forbidden',Number(u.port),'127.0.0.1',()=>{socket.close();resolve();}));
}
else if(kind==='curl')spawnSync('curl',['--noproxy','*','--connect-timeout','2','-sS','-X','POST',trap+'/rest/v1/op_trace_spans']);
else if(kind==='child-node')spawnSync(process.execPath,['--input-type=module','-e',`import http from 'node:http';
import dgram from 'node:dgram';http.get(${JSON.stringify(trap+'/functions/v1/research-run')}).on('error',()=>{});`],{env:process.env});
else if(kind==='permitted'){
 const server=http.createServer((_,res)=>res.end('{"safe":true}'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=isolation.permitLocalServer(server);const out=await fetch(origin);if((await out.json()).safe!==true)throw Error('Local fixture failed');await new Promise(r=>server.close(r));
}else if(kind.startsWith('browser-')){
 const require=createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`),{chromium}=require('playwright');
 const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><title>isolated probe</title><main>Representative local test</main>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=isolation.permitLocalServer(server);
 const browser=await chromium.launch({executablePath:process.env.PERF_CHROME,args:isolation.browserArgs});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const rows=[{id:'representative-source',title:'מקור בדיקה מייצג',value:878}];
  const fixtureUrl=trap+'/read';
  await isolation.installBrowserBoundary(context,{origin,fixtures:kind==='browser-replay'?{['GET '+fixtureUrl+' ']:{status:200,type:'application/json',body:Buffer.from(JSON.stringify(rows)).toString('base64')}}:{}});
  const page=await context.newPage();
  // Installed before any navigation or init script, including early and teardown effects.
  if(kind==='browser-early')await context.addInitScript(url=>{fetch(url+'/rest/v1/op_trace_roots',{method:'POST'}).catch(()=>{});},trap);
  await page.goto(origin);
  if(kind==='browser-replay'){const actual=await page.evaluate(url=>fetch(url).then(r=>r.json()),fixtureUrl);if(JSON.stringify(actual)!==JSON.stringify(rows))throw new Error('Representative fixture changed');}
  if(kind==='browser-write')await page.evaluate(url=>fetch(url+'/rest/v1/op_trace_spans',{method:'POST',body:'{}'}).catch(()=>{}),trap);
  if(kind==='browser-rpc')await page.evaluate(url=>fetch(url+'/rest/v1/rpc/unknown').catch(()=>{}),trap);
  if(kind==='browser-research')await page.evaluate(url=>fetch(url+'/functions/v1/research-run',{method:'POST',body:'{}'}).catch(()=>{}),trap);
  if(kind==='browser-beacon')await page.evaluate(url=>{navigator.sendBeacon(url+'/beacon','write');},trap);
  if(kind==='browser-teardown'){
   await page.evaluate(url=>{addEventListener('pagehide',()=>navigator.sendBeacon(url+'/exit','write'));},trap);
   await page.goto(origin+'/next');
  }
  if(kind==='browser-close'){await page.locator('main').click();await page.evaluate(url=>{addEventListener('beforeunload',()=>navigator.sendBeacon(url+'/closing','write'));},trap);await page.close({runBeforeUnload:true});}
  if(kind==='browser-worker')await page.evaluate(url=>new Promise(resolve=>{
    const worker=new Worker(URL.createObjectURL(new Blob([`fetch(${JSON.stringify(url+'/worker-write')},{method:'POST'}).catch(()=>{}).finally(()=>postMessage('done'));`],{type:'text/javascript'})));
    worker.onmessage=()=>{worker.terminate();resolve();};
  }),trap);
  if(kind==='browser-websocket')await page.evaluate(url=>{new WebSocket(url.replace('http:','ws:')+'/socket');},trap);
  if(kind==='browser-sw'){
   const result=await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js').catch(()=>{});return (await navigator.serviceWorker.getRegistrations()).length>0||!!navigator.serviceWorker.controller;});
   if(result)throw new Error('Service Worker registration escaped isolation');
  }
  await new Promise(r=>setTimeout(r,200));await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}else throw new Error('Unknown probe');
console.log('Child completed; any forbidden attempt must still fail the outer runner');
