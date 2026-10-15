// Bounded current-route A/B. Reuses the causal experiment's calibrated transport
// and selectors, not its historical timings. No product writes reach upstream.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { serve } from '../../../scripts/perf-execution-2029/serve.mjs';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR || '/opt/codex/cua_node/lib'}/node_modules/`);
const { chromium } = require('playwright');
const exec = promisify(execFile);
const args = Object.fromEntries(process.argv.slice(2).filter((_, i) => i % 2 === 0).map((k, i) => [k.slice(2), process.argv[3 + i * 2]]));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const norm = value => decodeURIComponent(value).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g, 'TS');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const readRpc = new Set(['convergence_meter','fn_method_value','fn_zero_scale','gematria_api','gematria_method_trace','get_category_videos','number_neighbors','posts_by_number_strict','world_group_source_arrivals_v2','fn_number_lookup','fn_number_dossier','fn_number_journey']);
const fixture = fs.existsSync(args.fixtures) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(args.fixtures))) : {};
const fixturesBefore = hash(JSON.stringify(fixture));
const captures = new Map();
let captureCount = 0;
const sampleErrors = [];
async function capture(req, key) {
  if (fixture[key]) return fixture[key];
  if (captures.has(key)) return captures.get(key);
  const promise = (async () => {
    if (++captureCount > 200) throw new Error('Capture ceiling exceeded');
    const headers = req.headers();
    if (headers.authorization && headers.authorization !== `Bearer ${headers.apikey}`) throw new Error('Only anonymous public capture allowed');
    const argv = ['--silent','--show-error','--compressed','--max-time','30','--request',req.method(),req.url()];
    for (const [k,v] of Object.entries(headers)) if (['apikey','authorization','accept','accept-profile','range','prefer','content-type'].includes(k)) argv.push('-H', `${k}: ${v}`);
    if (req.postData()) argv.push('--data-binary',req.postData());
    argv.push('--write-out','\n__META__%{http_code}|%{content_type}|%header{content-range}');
    const { stdout } = await exec('curl', argv, { encoding: 'buffer', maxBuffer: 24 * 1024 * 1024 });
    const at = stdout.lastIndexOf(Buffer.from('\n__META__'));
    const [status,type,range] = stdout.subarray(at + 9).toString().split('|');
    if (!Number(status)) throw new Error('No upstream status');
    return fixture[key] = { status: Number(status), type, range, body: stdout.subarray(0,at).toString('base64') };
  })();
  captures.set(key,promise); return promise;
}
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const servers = {};
for (const arm of ['base','candidate']) if (args[arm]) servers[arm] = await serve(args[arm]);
const report = { base: '5c147e4a2db97ac035227f7c6d15787849f61f6e', candidate:args.sha, mode: args.mode || 'replay', browser: browser.version(), playwright: require('playwright/package.json').version,
  instrumentation:'host-clock-v2; no page evaluation in fixture response path; trusted-click navigation',
  fixedWallTime:args.fixedtime?Number(args.fixedtime):null,
  functionalGate:args.gate?{state:args.gate,siteFlagsDelayMs:2000,localFixtureOnly:true}:null,
  conditions: { viewport: '390x844', dpr:2, cpu:4, staticRtt:150, staticDownload:209715.2, apiDelay:150, externalDelay:400, note:'Brotli static HTTP; API/image bodies fulfilled with explicit delay, their bandwidth not modeled. Anonymous real public response fixture. No real member/admin sessions.' }, samples: [] };
const paths = (args.paths || '/,/world,/post/seventh-to-tenth-sefirot-2027').split(',');
async function one(arm, pathname, iteration) {
  const origin = `http://127.0.0.1:${servers[arm].port}`;
  const context = await browser.newContext({ viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'he-IL',timezoneId:'Asia/Jerusalem' });
  if(args.fixedtime) await context.addInitScript(now=>{
    const OriginalDate=Date;
    window.Date=class extends OriginalDate { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} };
  },Number(args.fixedtime));
  await context.addInitScript(() => {
    localStorage.setItem('sod-theme','dark');
    window.__boot = { ready: {}, firstRoot:null, lcp:0, cls:0, clicks:[] };
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__boot.lcp = e.startTime; }).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__boot.cls += e.value; }).observe({type:'layout-shift',buffered:true});
    document.addEventListener('click', e => window.__boot.clicks.push({ at:performance.now(), trusted:e.isTrusted }), true);
    window.__isReady = () => {
      const p = location.pathname;
      return p === '/' ? !!document.querySelector('[data-experience-capability="home-composition"] a[href^="/post/"]')
        : p === '/world' ? !!document.querySelector('[data-flight-story="world"] .sod29-flight-feature')
        : p.startsWith('/post/') && (document.querySelector('[data-experience-capability="post-master-reading-stage"]')?.innerText.length || 0) > 800;
    };
    const tick = () => {
      if (window.__boot.firstRoot === null && document.getElementById('root')?.childElementCount) window.__boot.firstRoot = performance.now();
      if (window.__isReady() && !window.__boot.ready[location.pathname]) window.__boot.ready[location.pathname] = performance.now();
      requestAnimationFrame(tick);
    }; requestAnimationFrame(tick);
  });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  const errors=[],misses=[],reads=[],blocked=[];
  page.on('pageerror', e => errors.push(e.message));
  const clock = () => page.evaluate(() => performance.now()).catch(() => null);
  await page.route('**/*', async route => {
    const req=route.request(), u=new URL(req.url()), method=req.method();
    if (req.url().startsWith(origin)) return u.pathname.startsWith('/api/') ? route.fulfill({status:200,body:'{}',contentType:'application/json'}) : route.continue();
    const sb=u.hostname==='linswmnnkjxvweumprav.supabase.co', rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
    if (/link_identity|track_visit|ingest_event|analytics|clarity|googletagmanager|facebook|doubleclick|openweb|spot\.im/.test(req.url()) || u.pathname.startsWith('/auth/') || (sb && rpc && !readRpc.has(rpc) && rpc !== 'world_group_source_arrivals_v3') || (!['GET','HEAD'].includes(method) && !(sb && readRpc.has(rpc)))) {
      blocked.push(`${method} ${u.pathname}`); return route.fulfill({status:204,body:''});
    }
    let body=req.postData() || '';
    try { body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b)))); } catch {}
    // Never evaluate page JS in an interception callback: a busy renderer would
    // then delay the synthetic network response and feed CPU cost back into RTT.
    const key=`${method} ${norm(req.url())} ${body}`, at=Date.now();
    try {
      let row = report.mode === 'record' ? await capture(req,key) : fixture[key];
      if (!row) { misses.push(key); return route.abort(); }
      if (report.mode !== 'record') await delay(u.pathname==='/rest/v1/site_flags' && args.gate ? 2000 : sb ? 150 : 400);
      let payload=Buffer.from(row.body,'base64');
      if (u.pathname === '/rest/v1/site_flags' && args.gate === 'deny') {
        const flags=JSON.parse(payload); const lock=flags.find(f=>f.key==='lock_world');
        if (lock) Object.assign(lock,{enabled:true,mode:'all'}); else flags.push({key:'lock_world',enabled:true,mode:'all'});
        payload=Buffer.from(JSON.stringify(flags));
      }
      const released=Date.now();
      if (sb && u.pathname.startsWith('/rest/')) reads.push({key,at,released,status:row.status,bytes:payload.length,bodyHash:hash(payload)});
      await route.fulfill({status:row.status,body:method==='HEAD'?'':payload,headers:{'content-type':row.type||'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range',...(row.range?{'content-range':row.range}:{})}});
    } catch (e) { errors.push(`${u.pathname}: ${e.message}`); await route.abort().catch(()=>{}); }
  });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:209715.2,uploadThroughput:96000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const sample = {arm,pathname,iteration,errors,misses,reads,blocked};
  async function snapshot() {
    return page.evaluate(() => {
      const stage=document.querySelector('[data-experience-capability="post-master-reading-stage"]') || document.querySelector('[data-flight-story="world"]') || document.querySelector('[data-experience-capability="home-composition"]');
      return {...window.__boot, timeOrigin:performance.timeOrigin, fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime, path:location.pathname,
        resources:performance.getEntriesByType('resource').map(r=>({url:r.name.replace(location.origin,''),start:r.startTime,end:r.responseEnd,wire:r.encodedBodySize,size:r.decodedBodySize,initiator:r.initiatorType})),
        text:stage?.innerText.replace(/\s+/g,' ').trim()||'',links:[...document.querySelectorAll('main a[href]')].map(a=>a.getAttribute('href')),
      preloads:[...document.querySelectorAll('link[rel="modulepreload"]')].map(l=>l.getAttribute('href')),denied:!!document.querySelector('.mlock')};
    });
  }
  try {
    await page.goto(origin+pathname,{waitUntil:'load',timeout:60000});
    if (args.gate==='deny') await page.waitForSelector('.mlock',{timeout:30000});
    else await page.waitForFunction(()=>window.__isReady(),null,{timeout:45000});
    await page.waitForLoadState('networkidle',{timeout:30000}); await delay(1000);
    sample.cold=await snapshot();
    if (args.nav==='1' && !args.gate) {
      const target = pathname === '/world' ? '/' : pathname.startsWith('/post/') ? '/world' : await page.locator('main a[href^="/post/"]').filter({visible:true}).first().getAttribute('href');
      if(pathname !== '/') await page.getByRole('button',{name:'פתח ניווט',exact:true}).click();
      const link=page.locator(pathname === '/' ? `a[href="${target}"]` : `#sod29-mobile-navigation a[href="${target}"]`).filter({visible:true}).first();
      await link.scrollIntoViewIfNeeded();
      const start=await clock(), count=reads.length;
      await link.click();
      await page.waitForFunction(target=>location.pathname===target && window.__isReady(),target,{timeout:45000});
      sample.next={target,toolMs:(await clock())-start,readStart:count};
      await page.waitForLoadState('networkidle',{timeout:30000}); await delay(800);
      sample.next.snapshot=await snapshot();
      const ready=sample.next.snapshot.ready[target];
      const click=sample.next.snapshot.clicks.filter(e=>e.trusted&&e.at<=ready).at(-1);
      sample.next.ms=ready-click.at;
      const backStart=await clock();
      await page.goBack();
      await page.waitForFunction(path=>location.pathname===path && window.__isReady(),pathname,{timeout:45000});
      sample.back={ms:(await clock())-backStart};
      await page.waitForLoadState('networkidle',{timeout:30000}); await delay(800);
      sample.back.snapshot=await snapshot();
    }
  } catch(e) { errors.push(e.message); sample.terminal=(await page.locator('body').innerText()).slice(0,500); }
  if(sample.cold) for(const r of reads){r.at-=sample.cold.timeOrigin;r.released-=sample.cold.timeOrigin;}
  for (const snap of [sample.cold,sample.next?.snapshot,sample.back?.snapshot].filter(Boolean)) { snap.textHash=hash(snap.text);snap.textLength=snap.text.length;if(args.text!=='1')delete snap.text; }
  await context.close(); return sample;
}
try {
  for(let i=0;i<Number(args.runs||1);i++) for(const pathname of paths) {
    const arms=Object.keys(servers); if(i%2) arms.reverse();
    for(const arm of arms) {
      const sample=await one(arm,pathname,i);report.samples.push(sample);
      console.log(JSON.stringify({arm,pathname,i,ready:sample.cold?.ready[pathname],next:sample.next?.ms,errors:sample.errors.length,misses:sample.misses.length}));
      fs.writeFileSync(args.out,JSON.stringify(report,null,2));
      if(sample.errors.length||sample.misses.length) sampleErrors.push(`${arm} ${pathname}`);
    }
  }
} finally {
  if(report.mode==='record') fs.writeFileSync(args.fixtures,zlib.gzipSync(JSON.stringify(fixture)));
  report.fixtureSha256=hash(fs.readFileSync(args.fixtures));report.fixturesBefore=fixturesBefore;
  fs.writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');
  await browser.close();for(const {srv} of Object.values(servers)) srv.close();
}
if(sampleErrors.length) process.exitCode=1;
