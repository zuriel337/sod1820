// Diagnostic only: CPU sampling/precise coverage/trace add overhead. Never merge
// its latency into the separate unprofiled matched benchmark.
// Actual public responses and actual SW; deny-only guard. No credentials,
// headers, bodies, source text, mail, model, login or product writes persisted.
const { chromium, expect:baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout:45000 });
const fs = require('node:fs');
const assert = require('node:assert/strict');
const out = process.env.SOD_COLD_OUT;
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
function url(value) {
  if (!value) return '';
  try { const u = new URL(value); return u.protocol.startsWith('http') ? u.origin + u.pathname : u.protocol === 'file:' ? '[local]' : u.protocol; }
  catch { return String(value).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]').slice(0,160); }
}
const frame = f => ({ functionName:f.functionName, url:url(f.url), scriptId:f.scriptId, lineNumber:f.lineNumber, columnNumber:f.columnNumber });
function stack(s) { return s ? { callFrames:(s.callFrames || []).map(frame), parent:stack(s.parent) } : null; }
require('node:readline').createInterface({ input:process.stdin }).once('line', async line => {
 const cfg = JSON.parse(line), width = cfg.diagnosticWidth || 390;
 const report = { sha:cfg.sha, origin:cfg.origin, diagnostic:true, latencyComparable:false, actualSW:true, realPublicData:true, width, productWrites:0, modelCalls:0, playbackAttempts:0, network:[], scripts:[], trace:[], errors:[] };
 const flush = () => fs.writeFileSync(out + '/diagnostic.json', JSON.stringify(report,null,2)+'\n');
 let browser, context, cdp, tracing = false, profiling = false;
 try {
  browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:false, ...(process.env.HTTPS_PROXY ? { proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'} } : {}), args:['--no-sandbox','--disable-dev-shm-usage'] });
  context = await browser.newContext({ viewport:{width,height:900}, locale:'he-IL' });
  if (cfg.accessUrl) await context.request.get(cfg.accessUrl);
  const identity = await context.request.get(cfg.origin + '/preview-identity.json');
  assert.equal(identity.status(),200,'protected identity access'); assert.equal((await identity.json()).sha,cfg.sha);
  await require('../../home-light-reading-now-20261102/native-read-only-guard.cjs')(context,cfg.origin);
  await context.addInitScript(() => {
   window.__homeJS = { phases:[], fonts:[], longTasks:[] };
   const mark = (name,extra={}) => window.__homeJS.phases.push({name,time:performance.now(),...extra});
   mark('init'); document.addEventListener('DOMContentLoaded',()=>mark('dom-content-loaded')); addEventListener('load',()=>mark('window-load'));
   let last=''; const sample=()=>{const hero=document.querySelector('.h29-hero-img'); const state={shell:!!document.querySelector('.sod29-root'),primary:document.querySelector('[data-home-primary]')?.dataset.homePrimary || null,heroTitle:!!document.querySelector('.h29-hero2 h1'),heroImage:!!hero&&hero.complete&&hero.naturalWidth>0,series:!!document.querySelector('.h29-card-open')};const key=JSON.stringify(state);if(key!==last){last=key;mark('dom',state);}};
   new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});document.addEventListener('load',sample,true);
   const nativeLoad=document.fonts?.load.bind(document.fonts);if(nativeLoad)document.fonts.load=(...args)=>{const r={font:args[0],start:performance.now()};window.__homeJS.fonts.push(r);return nativeLoad(...args).then(x=>{r.end=performance.now();r.ok=true;return x;},e=>{r.end=performance.now();r.ok=false;throw e;});};
   try { new PerformanceObserver(list=>{for(const e of list.getEntries())window.__homeJS.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true}); } catch {}
  });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push({name:e.name,message:String(e.message).replace(/https?:\/\/[^\s)]+/g,url).slice(0,600)}));
  cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Performance.enable'); await cdp.send('Debugger.enable');
  await cdp.send('Network.setBlockedURLs',{urls:['*://*.google-analytics.com/*','*://*.googletagmanager.com/*','*://www.facebook.com/tr*','*://connect.facebook.net/*','*://*.clarity.ms/*']});
  if(width<=390) { await cdp.send('Emulation.setCPUThrottlingRate',{rate:4}); await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'}); }
  const rows=new Map();cdp.on('Network.requestWillBeSent',e=>{const row={id:e.requestId,url:url(e.request.url),method:e.request.method,type:e.type,at:e.timestamp,wallTime:e.wallTime,initiator:{type:e.initiator.type,url:url(e.initiator.url),lineNumber:e.initiator.lineNumber,stack:stack(e.initiator.stack)}};rows.set(e.requestId,row);report.network.push(row);});
  cdp.on('Network.responseReceived',e=>{const r=rows.get(e.requestId);if(r)Object.assign(r,{status:e.response.status,mime:e.response.mimeType,headersAt:e.timestamp,fromSW:e.response.fromServiceWorker,fromCache:e.response.fromDiskCache,protocol:e.response.protocol,timing:e.response.timing});});
  cdp.on('Network.loadingFinished',e=>{const r=rows.get(e.requestId);if(r)Object.assign(r,{end:e.timestamp,bytes:e.encodedDataLength});});
  cdp.on('Network.loadingFailed',e=>{const r=rows.get(e.requestId);if(r)Object.assign(r,{end:e.timestamp,error:e.errorText,canceled:e.canceled});});
  cdp.on('Debugger.scriptParsed',e=>report.scripts.push({scriptId:e.scriptId,url:url(e.url),hash:e.hash,length:e.length,sourceMapURL:url(e.sourceMapURL),isModule:e.isModule,scriptLanguage:e.scriptLanguage}));
  const keepTrace = new Set(['EvaluateScript','FunctionCall','v8.compile','v8.compileModule','v8.evaluateModule','RunMicrotasks','TimerFire','FireAnimationFrame','UpdateLayoutTree','Layout','Paint','RunTask','ParseHTML','MarkDOMContent','MarkLoad']);
  cdp.on('Tracing.dataCollected',e=>{for(const t of e.value){if(!keepTrace.has(t.name))continue;const d=t.args?.data||{};report.trace.push({name:t.name,cat:t.cat,ph:t.ph,ts:t.ts,dur:t.dur,pid:t.pid,tid:t.tid,data:{url:url(d.url||d.scriptName),functionName:d.functionName,scriptId:d.scriptId,lineNumber:d.lineNumber,columnNumber:d.columnNumber}});}});
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval',{interval:1000});
  await cdp.send('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
  await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing',transferMode:'ReportEvents'});tracing=true;
  await cdp.send('Profiler.start');profiling=true;
  const response=await page.goto(cfg.origin+'/?home-js-diagnostic=1',{waitUntil:'commit'});assert.equal(response.status(),200);
  await expect(page.locator('[data-home-primary="ready"]')).toBeVisible();await expect(page.locator('.h29-hero2 h1')).toBeVisible();
  report.usefulAt=await page.evaluate(()=>performance.now());
  report.usefulMetrics=(await cdp.send('Performance.getMetrics')).metrics;
  const profile=(await cdp.send('Profiler.stop')).profile;profiling=false;
  report.cpuProfile={...profile,nodes:profile.nodes.map(n=>({...n,callFrame:frame(n.callFrame)}))};
  const coverage=await cdp.send('Profiler.takePreciseCoverage');
  report.coverage=coverage.result.filter(x=>x.url.startsWith(cfg.origin+'/assets/')).map(x=>({scriptId:x.scriptId,url:url(x.url),functions:x.functions}));
  await cdp.send('Profiler.stopPreciseCoverage');
  const traceDone=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');tracing=false;await traceDone;
  await page.waitForFunction(()=>{const rows=(window.__safetyReads||[]).filter(r=>r.path.startsWith('/rest/v1/'));return rows.every(r=>r.end!=null)&&performance.now()-Math.max(0,...rows.map(r=>r.end||r.start))>=250;},null,{timeout:45000});
  report.snapshot=await page.evaluate(()=>({timeOrigin:performance.timeOrigin,now:performance.now(),observer:window.__homeJS,controller:navigator.serviceWorker.controller?.scriptURL?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,denied:window.__safetyDenied,reads:window.__safetyReads,shifts:window.__nativeShifts,marks:performance.getEntriesByType('mark').filter(m=>m.name.startsWith('sod2029:')).map(m=>({name:m.name,time:m.startTime})),resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,start:r.startTime,end:r.responseEnd,type:r.initiatorType,bytes:r.encodedBodySize,decodedBytes:r.decodedBodySize,transferBytes:r.transferSize})),links:[...document.querySelectorAll('link[rel]')].map(l=>({rel:l.rel,path:new URL(l.href).pathname,as:l.as})),scriptElements:[...document.scripts].filter(s=>s.src).map(s=>({path:new URL(s.src).pathname,type:s.type,async:s.async,defer:s.defer}))}));
  assert.match(report.snapshot.controller || '',/preview-readonly-sw/);assert.deepEqual(report.errors,[]);assert.deepEqual(report.snapshot.denied,[]);
  await page.screenshot({path:out+'/home.png'});report.ok=true;
 } catch(e) {report.ok=false;report.failure={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,1200)};}
 finally {if(profiling)await cdp?.send('Profiler.stop').catch(()=>{});if(tracing)await cdp?.send('Tracing.end').catch(()=>{});await context?.close();await browser?.close();flush();console.log(JSON.stringify({ok:report.ok,usefulAt:report.usefulAt,requests:report.network.length,scripts:report.scripts.length,traceEvents:report.trace.length,failure:report.failure}));process.exitCode=report.ok?0:1;}
});
