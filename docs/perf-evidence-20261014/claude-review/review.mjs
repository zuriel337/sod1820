// CLAUDE_REVIEW_2029_PERF_20261014 — interaction review harness (READ_ONLY on product code).
// modes:  probe  : list tappable controls on a route (to choose real selectors)
//         record : run the flow against live public data once; store GET + allow-listed READ RPC bodies
//         run    : replay fixtures (fixed delay), N samples of the flow with REAL taps / back / touch scroll
// usage:  node review.mjs <mode> --dist DIR --label L [--runs 7] [--theme dark|light|parchment] [--route /] [--fx file.gz] [--out file.json] [--fail 1]
// Conditions (same as lane A): mobile 390x844 DPR2 touch, CPU x4, 1.6Mbps/750kbps/150ms RTT, cold context per sample,
// Supabase GET + allow-listed read-RPC POST replayed at a fixed 150ms, every other write answered 204 and never sent.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { execFile } from 'node:child_process'; import { promisify } from 'node:util'; const execFileP = promisify(execFile); import path from 'node:path';
import { serve } from '../../../scripts/perf/serve.mjs';
const require = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools') + '/node_modules/'); const { chromium } = require('playwright');
const argv = process.argv.slice(2); const mode = argv[0];
const A = Object.fromEntries(argv.slice(1).reduce((a, v, i, arr) => v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a, []));
const RUNS = +(A.runs || 7), THEME = A.theme || 'dark', DELAY = 150;
const FX = A.fx || new URL('./fixtures-review.json.gz', import.meta.url).pathname;
const SB = 'https://linswmnnkjxvweumprav.supabase.co', ANON = (fs.readFileSync(new URL('../../../src/lib/supabase.js', import.meta.url), 'utf8').match(/eyJ[A-Za-z0-9._-]+/) || [])[0];
// read-only RPCs a visitor's browser calls (writes/telemetry deliberately absent)
const READ_RPC = new Set(['convergence_meter', 'fn_method_value', 'fn_number_dossier', 'fn_number_journey', 'fn_number_lookup', 'fn_zero_scale', 'gematria_api', 'gematria_method_trace', 'get_category_videos', 'number_neighbors', 'posts_by_number_strict', 'world_group_source_arrivals_v3', 'world_group_source_arrivals_v2', 'notification_prefs_guest_get_v1', 'public_enrichment_batch']);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const fixtures = fs.existsSync(FX) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(FX))) : {};
const keyOf = (req) => { const u = norm(req.url()); if (req.method() === 'GET') return 'GET ' + u; const b = /notification_prefs_guest_get_v1/.test(u) ? '' : (req.postData() || '').replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS'); return 'POST ' + u + ' ' + crypto.createHash('md5').update(b).digest('hex'); };
const { srv, port } = await serve(path.resolve(A.dist)); const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const med = a => { const s = a.filter(x => x != null && !Number.isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const rng = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? [Math.round(s[0]), Math.round(s[s.length - 1])] : null; };

// ---- in-page instrumentation -------------------------------------------------------------------------------------------
const INIT = `(()=>{const m=window.__r={lt:[],cls:[],ev:[],frames:[],t:{}};
new PerformanceObserver(l=>{for(const e of l.getEntries())m.lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)m.cls.push([e.startTime,e.value])}).observe({type:'layout-shift',buffered:true});
try{new PerformanceObserver(l=>{for(const e of l.getEntries())m.ev.push([e.name,e.startTime,e.duration,e.processingStart-e.startTime,e.processingEnd-e.processingStart])}).observe({type:'event',buffered:true,durationThreshold:16})}catch(_){}
const R={home:()=>document.querySelector("[data-experience-capability='home-composition'] a[href^='/post/']"),
 world:()=>document.querySelector('[data-world-topic],[data-world-discovery-door]'),
 worldlead:()=>document.querySelector("[data-experience-capability*='world'] h1, main h1"),
 post:()=>{const e=document.querySelector("[data-experience-capability='post-master-reading-stage']");return e&&e.innerText.length>800}};
window.__wait=(key,ms=30000)=>new Promise(res=>{const t0=performance.now();let done=false;const fin=v=>{if(done)return;done=true;mo.disconnect();res({ok:v,t0,t1:performance.now()})};
 const mo=new MutationObserver(()=>{if(R[key]())fin(true)});mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
 if(R[key]())fin(true);setTimeout(()=>fin(false),ms)});
window.__frames=(on)=>{if(on){m.frames=[];let last=performance.now();const loop=t=>{m.frames.push(t-last);last=t;if(m.fr)requestAnimationFrame(loop)};m.fr=true;requestAnimationFrame(loop)}else m.fr=false};
window.__mark=()=>performance.now();
window.__win=(t0,t1)=>{const lt=m.lt.filter(x=>x[0]+x[1]>=t0&&x[0]<=t1);const res=performance.getEntriesByType('resource').filter(r=>r.startTime>=t0&&r.startTime<=t1+500&&!r.name.includes('127.0.0.1')===false||(r.startTime>=t0&&r.startTime<=t1+500));
 const kind=n=>/\\.js(\\?|$)/.test(n)?'js':/\\.css(\\?|$)/.test(n)?'css':/supabase\\.co\\/rest/.test(n)?'rest':/\\.(png|jpe?g|webp|avif|svg|gif)(\\?|$)/.test(n)||/storage\\/v1/.test(n)?'img':'other';
 const rc={};for(const r of res){const k=kind(r.name);rc[k]=(rc[k]||0)+1}
 const ev=m.ev.filter(x=>x[1]>=t0-50&&x[1]<=t1);
 return {block:lt.reduce((s,x)=>s+Math.max(0,Math.min(x[0]+x[1],t1)-Math.max(x[0],t0)-50),0),longTasks:lt.length,maxTask:lt.reduce((s,x)=>Math.max(s,x[1]),0),cls:m.cls.filter(x=>x[0]>=t0&&x[0]<=t1+300).reduce((s,x)=>s+x[1],0),
  evMax:ev.reduce((s,x)=>Math.max(s,x[2]),0),evInputDelay:ev.reduce((s,x)=>Math.max(s,x[3]),0),req:rc}};
})()`;

// ---- helpers -----------------------------------------------------------------------------------------------------------
async function newSample(extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await ctx.addInitScript(INIT); await ctx.addInitScript(`try{localStorage.setItem('sod-theme','${THEME}')}catch(_){}`);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); const st = { misses: new Set(), errors: [], unmappedRpc: new Set(), blockedWrites: 0, console: [] };
  page.on('pageerror', e => st.errors.push(String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') st.console.push(m.text().slice(0, 160)); });
  await page.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(origin)) {
      const p = new URL(u).pathname;
      if (p.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (extra.abortAsset && extra.abortAsset.test(p) && extra.armed?.on) return route.abort('failed');
      return route.continue();
    }
    if (u.includes('.supabase.co')) {
      const isRpc = /\/rest\/v1\/rpc\/([^?]+)/.exec(u); const rpc = isRpc && isRpc[1];
      const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: hdr, body: '' });
      const isRead = req.method() === 'GET' || (req.method() === 'POST' && rpc && READ_RPC.has(rpc));
      if (!isRead) { st.blockedWrites++; return route.fulfill({ status: 204, body: '', headers: hdr }); }
      const k = keyOf(req);
      if (mode === 'record' || mode === 'probe') {
        try {
          const a = ['-s', '-m', '30', '-D', '-', '-X', req.method(), u, '-H', 'apikey: ' + ANON, '-H', 'Authorization: Bearer ' + ANON, '-H', 'content-type: application/json'];
          for (const h of ['accept-profile', 'content-profile', 'prefer', 'range']) if (req.headers()[h]) a.push('-H', `${h}: ${req.headers()[h]}`);
          if (req.method() === 'POST') a.push('--data-binary', req.postData() || '');
          const o = (await execFileP('curl', a, { maxBuffer: 1 << 28, encoding: 'utf8' })).stdout; const i = o.lastIndexOf('\r\n\r\n'); const head = o.slice(0, i), body = o.slice(i + 4);
          const hv = n => (head.match(new RegExp('^' + n + ': (.*)$', 'mi')) || [])[1]?.trim() || null; const status = +head.split(' ')[1];
          fixtures[k] = { status, body, ct: hv('content-type'), cr: hv('content-range') };
          return route.fulfill({ status, body, headers: { ...hdr, 'content-type': fixtures[k].ct || 'application/json', ...(fixtures[k].cr ? { 'content-range': fixtures[k].cr } : {}) } });
        } catch (e) { return route.abort(); }
      }
      const f = fixtures[k]; if (!f) { st.misses.add(k.slice(0, 140)); if (rpc) st.unmappedRpc.add(rpc); }
      await new Promise(r => setTimeout(r, DELAY));
      return route.fulfill({ status: f ? f.status : 200, body: f ? f.body : (req.method() === 'GET' ? '[]' : 'null'), headers: { ...hdr, 'content-type': f?.ct || 'application/json', ...(f?.cr ? { 'content-range': f.cr } : {}) } });
    }
    if (mode === 'run') await new Promise(r => setTimeout(r, 400));
    return route.fulfill({ status: 200, body: '', contentType: u.includes('css') ? 'text/css' : 'text/javascript' });
  });
  if (mode !== 'record' && mode !== 'probe') {
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  return { ctx, page, cdp, st };
}
const settle = (page, ms = 2200) => page.waitForTimeout(ms);
// Tap like a user: prefer a matching control that is ALREADY inside the viewport (no programmatic scroll).
// Playwright's scrollIntoViewIfNeeded would scroll the page to the first match and silently change the
// position the user "left" (this made an earlier review read Home as restored to 33px — a harness artifact).
async function tap(page, sel) {
  const loc = page.locator(sel); const n = Math.min(await loc.count(), 80); const vh = await page.evaluate(() => innerHeight);
  for (let i = 0; i < n; i++) { const bb = await loc.nth(i).boundingBox().catch(() => null); if (bb && bb.y >= 90 && bb.y + bb.height <= vh - 90) { await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); return 'inview'; } }
  const el = loc.first(); await el.scrollIntoViewIfNeeded().catch(() => {}); await el.tap({ timeout: 8000 }); return 'scrolled';
}
// real touch swipe (touchStart/Move/End with momentum) — Input.synthesizeScrollGesture did not scroll in this mobile context
async function swipe(cdp, dist) { const x = 195; let y = 760; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); const n = 24;
  for (let i = 0; i < n; i++) { y -= dist / n; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await new Promise(r => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
async function scrollBy(page, cdp, dist, steps = 3) {
  await page.evaluate(() => window.__frames(true)); const t0 = await page.evaluate(() => window.__mark());
  for (let i = 0; i < steps; i++) { await swipe(cdp, dist / steps); await page.waitForTimeout(250); }
  await page.waitForTimeout(500); const t1 = await page.evaluate(() => { window.__frames(false); return window.__mark(); });
  const w = await page.evaluate(([a, b]) => ({ ...window.__win(a, b), frames: window.__r.frames.slice(1) }), [t0, t1]);
  const fr = w.frames.filter(x => x > 0).sort((a, b) => a - b); const y = await page.evaluate(() => Math.round(scrollY));
  return { y, block: w.block, longTasks: w.longTasks, cls: w.cls, req: w.req, frames: fr.length, p95: fr.length ? fr[Math.floor(fr.length * .95)] : null, jank50: fr.filter(x => x > 50).length, jank100: fr.filter(x => x > 100).length };
}
// one interaction: tap a real control, wait for the target READY, report window metrics
async function go(page, selector, key, how = 'tap') {
  let out_tap = null; const t0 = await page.evaluate(() => window.__mark());
  if (how === 'back') await page.goBack({ waitUntil: 'commit' }); else if (how === 'forward') await page.goForward({ waitUntil: 'commit' }); else out_tap = await tap(page, selector);
  const r = await page.evaluate(k => window.__wait(k), key); await page.waitForTimeout(900);
  const w = await page.evaluate(([a, b]) => window.__win(a, b), [t0, r.t1]);
  return { tapMode: out_tap, ok: r.ok, ms: r.ok ? Math.round(r.t1 - t0) : null, block: Math.round(w.block), maxTask: Math.round(w.maxTask), cls: +w.cls.toFixed(3), evMax: Math.round(w.evMax), evInputDelay: Math.round(w.evInputDelay), req: w.req };
}
const MENU = '.sod29-mobile-menu-trigger', NAV_WORLD = "#sod29-mobile-navigation a[href='/world']", NAV_HOME = "#sod29-mobile-navigation a[href='/']", POST_LINK = "a[href^='/post/']:visible";
// open the real mobile navigation drawer, then tap the destination (menu open/close cost reported separately)
async function viaMenu(page, selector, key) {
  const t0 = await page.evaluate(() => window.__mark()); await page.locator(MENU).first().tap({ timeout: 8000 }); await page.waitForTimeout(500);
  const opened = await page.locator(MENU).first().getAttribute('aria-expanded');
  const m = await page.evaluate(a => window.__win(a, performance.now()), t0);
  const r = await go(page, selector, key); r.menuOpenEvMax = Math.round(m.evMax); r.menuExpanded = opened; return r; }

// ---- flow ------------------------------------------------------------------------------------------------------------
async function flow(extra = {}) {
  const { ctx, page, cdp, st } = await newSample(extra); const out = { steps: {} };
  try {
    await page.goto(origin + '/', { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    const h = await page.evaluate(() => window.__wait('home')); out.coldHome = h.ok ? Math.round(h.t1) : null; await settle(page);
    out.steps.scrollHome = await scrollBy(page, cdp, 1800, 3); const homeY = out.steps.scrollHome.y; await settle(page, 800);
    out.steps.toPost = await go(page, POST_LINK, 'post'); await settle(page);                       // real tap on a Home post card
    out.steps.scrollPost = await scrollBy(page, cdp, 1600, 3); await settle(page, 800);
    out.steps.backHome = await go(page, null, 'home', 'back'); await settle(page, 1200);          // browser back: Home READY + scroll restoration
    out.steps.backHome.yRestored = await page.evaluate(() => Math.round(scrollY)); out.steps.backHome.yBefore = homeY;
    out.steps.toWorld = await viaMenu(page, NAV_WORLD, 'world'); await settle(page);               // real drawer open + tap
    out.steps.scrollWorld = await scrollBy(page, cdp, 2400, 4); const worldY = out.steps.scrollWorld.y; await settle(page, 800);
    out.steps.backFromWorld = await go(page, null, 'home', 'back'); out.steps.backFromWorld.yRestored = await page.evaluate(() => Math.round(scrollY)); await settle(page, 800);
    out.steps.forwardWorld = await go(page, null, 'world', 'forward'); out.steps.forwardWorld.yRestored = await page.evaluate(() => Math.round(scrollY)); out.steps.forwardWorld.yBefore = worldY; await settle(page, 800);
    out.steps.rootHasContent = await page.evaluate(() => document.getElementById('root').innerText.length);
    out.overflowX = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  } catch (e) { out.error = String(e.message).replace(/\u001b\[[0-9;]*m/g,'').slice(0, 900); }
  out.pageErrors = st.errors; out.consoleErrors = st.console.length; out.misses = [...st.misses]; out.unmappedRpc = [...st.unmappedRpc]; out.blockedWrites = st.blockedWrites;
  await ctx.close(); return out;
}
// panel open/close + injected chunk-load failure
async function failureFlow() {
  const extra = { abortAsset: /Post2029Page|post2029/i, armed: { on: false } }; const { ctx, page, st } = await newSample(extra); const out = {};
  try {
    await page.goto(origin + '/world', { waitUntil: 'load', timeout: 120000 }).catch(() => {}); await page.evaluate(() => window.__wait('world')); await settle(page);
    const before = await page.evaluate(() => document.getElementById('root').innerText.length);
    extra.armed.on = true;
    const link = page.locator(POST_LINK).first(); await link.scrollIntoViewIfNeeded().catch(() => {}); await link.tap({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(4000);
    out.afterFailedChunk = { url: new URL(page.url()).pathname, rootText: await page.evaluate(() => document.getElementById('root').innerText.length), rootTextBefore: before, blankPage: await page.evaluate(() => !document.getElementById('root').children.length), hasRetryOrMessage: await page.evaluate(() => /נסה|שגיאה|לא הצליח|טוען|רענון/.test(document.body.innerText)) };
    extra.armed.on = false;
  } catch (e) { out.error = String(e.message).replace(/\u001b\[[0-9;]*m/g,'').slice(0, 900); }
  out.pageErrors = st.errors; await ctx.close(); return out;
}

// ---- modes -----------------------------------------------------------------------------------------------------------
if (mode === 'probe') {
  const { ctx, page } = await newSample(); await page.goto(origin + (A.route || '/'), { waitUntil: 'load' }); await page.waitForTimeout(6000);
  console.log(JSON.stringify(await page.evaluate(() => ({ url: location.pathname, links: [...document.querySelectorAll('a[href]')].slice(0, 60).map(a => [a.getAttribute('href'), (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 30), a.getBoundingClientRect().width > 0 && a.getBoundingClientRect().top < innerHeight * 4]), buttons: [...document.querySelectorAll('button')].slice(0, 40).map(b => [(b.innerText || b.getAttribute('aria-label') || b.title || '').trim().slice(0, 30), b.getAttribute('aria-expanded'), b.className.slice(0, 40)]), caps: [...document.querySelectorAll('[data-experience-capability]')].map(e => e.getAttribute('data-experience-capability')) })), null, 0));
  await ctx.close();
} else if (mode === 'record' || mode === 'probe') {
  const o = await flow(); console.log(JSON.stringify(o).slice(0, 1500));
  const f2 = await failureFlow(); console.log(JSON.stringify(f2));
  fs.writeFileSync(FX, zlib.gzipSync(JSON.stringify(fixtures))); console.log('fixtures', Object.keys(fixtures).length);
} else {
  const all = []; for (let i = 0; i < RUNS; i++) { all.push(await flow()); process.stderr.write(`${A.label} sample ${i + 1}/${RUNS}\n`); }
  const fail = await failureFlow();
  const steps = ['scrollHome', 'toPost', 'scrollPost', 'backHome', 'toWorld', 'scrollWorld', 'backFromWorld', 'forwardWorld']; const res = { label: A.label, theme: THEME, runs: RUNS, stages: {}, failure: fail };
  res.coldHome = { med: med(all.map(a => a.coldHome)), range: rng(all.map(a => a.coldHome)) };
  for (const s of steps) { const g = f => all.map(a => a.steps[s]?.[f]); res.stages[s] = {}; for (const f of Object.keys(all.find(a => a.steps[s])?.steps[s] || {})) { if (f === 'req') continue; if (typeof (all.find(a => a.steps[s])?.steps[s]?.[f]) === 'number') res.stages[s][f] = { med: med(g(f)), range: rng(g(f)) }; }
    res.stages[s].okRuns = all.filter(a => a.steps[s]?.ok !== false && a.steps[s]).length; res.stages[s].req = all.find(a => a.steps[s])?.steps[s]?.req; }
  res.errors = { runsWithError: all.filter(a => a.error).length, pageErrors: all.flatMap(a => a.pageErrors).length, unmappedRpc: [...new Set(all.flatMap(a => a.unmappedRpc))], missesPerRun: all.map(a => a.misses.length), overflowRuns: all.filter(a => a.overflowX).length, blockedWrites: med(all.map(a => a.blockedWrites)) };
  res.raw = all; if (A.out) fs.writeFileSync(A.out, JSON.stringify(res, null, 1));
  const f = (s, k) => { const v = res.stages[s]?.[k]; return v ? `${v.med ?? '-'} [${v.range ?? '-'}]` : '-'; };
  console.log(`\n## ${A.label} theme=${THEME} n=${RUNS} coldHomeREADY ${res.coldHome.med} [${res.coldHome.range}] errors=${JSON.stringify(res.errors)}`);
  console.log('step | tap/back->READY ms | block ms | evMax | CLS | scroll restore (after vs before)');
  for (const x of ['toPost', 'backHome', 'toWorld', 'backFromWorld', 'forwardWorld']) console.log([x, f(x, 'ms'), f(x, 'block'), f(x, 'evMax'), f(x, 'cls')].join(' | ') + (res.stages[x]?.yRestored ? ` | y ${f(x, 'yRestored')} vs ${f(x, 'yBefore')}` : ''));
  for (const x of ['scrollHome', 'scrollPost', 'scrollWorld']) console.log([x, 'jank>50 ' + f(x, 'jank50'), 'p95 ' + f(x, 'p95'), 'block ' + f(x, 'block'), 'cls ' + f(x, 'cls'), 'y ' + f(x, 'y')].join(' | '));
  console.log('failure:', JSON.stringify(fail));
}
await browser.close(); srv.close();
