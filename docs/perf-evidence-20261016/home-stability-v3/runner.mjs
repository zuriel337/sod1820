// CLAUDE_PERF_HOME_STABILITY_V3_20261016 — Home readiness + return-stability runner (evidence tool; READ_ONLY on product code).
// Derived from docs/perf-evidence-20261015/home-stability-v2/runner.mjs @ 1270d1fa (never part of the base). Changes vs v2:
//  * usable content = a REAL hero and/or REAL update card: visible, not .is-loading, not aria-hidden, not aria-busy, not hidden,
//    non-zero box, meaningful title (>= 4 chars after removing whitespace/NBSP) and an actual /post/ destination. Loading slots,
//    the loading hero and NBSP text never count. Discovery readiness is separate (populated a.dg29-* links, or an explicit empty/error marker).
//  * the product's own markers (data-h29-primary, data-dg29-state) are recorded next to the structural predicate, never used instead of it.
//  * cls = standard session-window maximum inside the observed window (gaps < 1000 ms, span < 5000 ms); v2's sum is kept as actionWindowShiftSum.
//  * scenarios: --gateDelay MS (the lock_world flag read answers late in the Back phase), --gate closed (guest, world gate closed),
//    --gate closed applies from the Back phase only (the world gate was open on the first visit and is closed on the return)
//    --resize W (viewport width change 800 ms after Back while holds are applied), --mode load (cold Home load, normal|empty|error).
// usage: node runner.mjs --arms A=DIST_A,B=DIST_B --pairs 7 --out out.json [--mode back|load] [--late 150|900|1800|3200] [--interrupt 1]
//        [--width 390 --height 844 --theme dark|light|parchment --reduced 1 --fx fixtures.json.gz --post /post/slug --state normal|empty|error]
//        [--gateDelay 2500] [--gate closed] [--resize 320]
// Method (kept from v2): route handlers never await the renderer; controller wall stamps around real commands; observers installed before
// any navigation; no scrollIntoView; fixed wall horizon after Back; strict fixture-miss gate (a miss is answered 404 and invalidates the sample).
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import path from 'node:path';
import { serve } from '../../../scripts/perf/serve.mjs';
import { READINESS_SRC } from './readiness.mjs';
const require = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools') + '/node_modules/'); const { chromium } = require('playwright');
const argv = process.argv.slice(2);
const A = Object.fromEntries(argv.reduce((a, v, i, arr) => v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a, []));
const PAIRS = +(A.pairs || 1), THEME = A.theme || 'dark', DELAY = 150, LATE = A.late ? +A.late : null, HORIZON_MS = A.horizon ? +A.horizon : (LATE && LATE >= 3200 ? 9000 : 7000);
const TRACE_DIR = A.traceDir || null;
const MODE = A.mode || 'back', GATE_DELAY = +(A.gateDelay || 0), GATE_CLOSED = A.gate === 'closed', RESIZE_TO = A.resize ? +A.resize : null;
const W = +(A.width || 390), H = +(A.height || 844), STATE = A.state || 'normal', INTERRUPT = A.interrupt === '1', REDUCED = A.reduced === '1';
const FX = path.resolve(A.fx || new URL('../../perf-evidence-20261015/scroll-integration/fixtures-combined.json.gz', import.meta.url).pathname);
const fxBuf = fs.readFileSync(FX); const FX_SHA = crypto.createHash('sha256').update(fxBuf).digest('hex');
const fixtures = JSON.parse(zlib.gunzipSync(fxBuf));
const SBHOST = '.supabase.co';
const READ_RPC = new Set(['convergence_meter', 'fn_method_value', 'fn_number_dossier', 'fn_number_journey', 'fn_number_lookup', 'fn_zero_scale', 'gematria_api', 'gematria_method_trace', 'get_category_videos', 'number_neighbors', 'posts_by_number_strict', 'world_group_source_arrivals_v3', 'world_group_source_arrivals_v2', 'notification_prefs_guest_get_v1', 'public_enrichment_batch']);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const keyOf = (req) => { const u = norm(req.url()); if (req.method() === 'GET') return 'GET ' + u; const b = /notification_prefs_guest_get_v1/.test(u) ? '' : (req.postData() || '').replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS'); return 'POST ' + u + ' ' + crypto.createHash('md5').update(b).digest('hex'); };
const shortKey = (k) => { const m = /rest\/v1\/(rpc\/[a-z_0-9]+|[a-z_0-9]+)\?([^&]{0,60})/.exec(k) || /rest\/v1\/(rpc\/[a-z_0-9]+)/.exec(k); return m ? (m[1] + (m[2] ? '?' + m[2] : '')) : k.slice(0, 90); };
const arms = Object.fromEntries((A.arms || '').split(',').filter(Boolean).map(s => s.split('=')));
const armNames = Object.keys(arms); if (!armNames.length) { console.error('--arms A=dist,B=dist required'); process.exit(2); }
const servers = {}; for (const n of armNames) { const s = await serve(path.resolve(arms[n])); servers[n] = { ...s, origin: `http://127.0.0.1:${s.port}` }; }
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const med = a => { const s = a.filter(x => x != null && !Number.isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

// ---- in-page instrumentation (installed before any navigation) -------------------------------------------------------
const INIT = `(()=>{const m=window.__r={cs:[],mut:[],geo:[],lt:[],ev:[],t0:performance.timeOrigin};
const D=n=>{if(!n||!n.tagName)return String(n&&n.nodeName);let s=n.tagName.toLowerCase();if(typeof n.className==='string'&&n.className)s+='.'+n.className.trim().split(/\\s+/).slice(0,2).join('.');const l=n.getAttribute&&n.getAttribute('aria-label');if(l)s+='['+l.slice(0,14)+']';return s};
const ep=t=>Math.round((performance.timeOrigin+t)*10)/10;
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)m.cs.push({t:ep(e.startTime),v:e.value,src:(e.sources||[]).slice(0,5).map(s=>({n:D(s.node),py:Math.round(s.previousRect.y),cy:Math.round(s.currentRect.y),ph:Math.round(s.previousRect.height),ch:Math.round(s.currentRect.height)}))})}).observe({type:'layout-shift',buffered:true});
try{new PerformanceObserver(l=>{for(const e of l.getEntries())m.lt.push({t:ep(e.startTime),d:Math.round(e.duration)})}).observe({type:'longtask',buffered:true})}catch(_){}
try{new PerformanceObserver(l=>{for(const e of l.getEntries())m.ev.push({n:e.name,t:ep(e.startTime),dur:Math.round(e.duration),inDelay:Math.round(e.processingStart-e.startTime)})}).observe({type:'event',buffered:true,durationThreshold:16})}catch(_){}
const SEL='.h29-sec,.dg29,.h29-notable,.h29-updates > *,.dg29-source,.dg29-empty,.dg29-gateway,.dg29-dimension,.h29-skel,.h29-hero,.h29-card,.sod29-watch-icon-wrap,.h29-notable-card';
const mo=new MutationObserver(l=>{const t=ep(performance.now());for(const r of l){if(m.mut.length>1500)return;if(r.type==='childList'){for(const n of [...r.addedNodes,...r.removedNodes]){if(n.nodeType===1&&(n.matches&&(n.matches(SEL)||n.querySelector&&n.querySelector(SEL))))m.mut.push({t,k:r.addedNodes.length&&[...r.addedNodes].includes(n)?'add':'rm',n:D(n),p:D(r.target)})}}else if(r.type==='attributes'&&r.target.matches&&r.target.matches('.dg29,.h29-hero,.h29-sec,.dg29-gateway,.k29-reveal')&&(r.attributeName==='class'||r.attributeName==='data-reveal'||r.attributeName==='aria-busy'))m.mut.push({t,k:'attr:'+r.attributeName,n:D(r.target),v:String(r.target.getAttribute(r.attributeName)).slice(0,40)})}});
const startMo=()=>mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-reveal','aria-busy']});
if(document.documentElement)startMo();else document.addEventListener('DOMContentLoaded',startMo);
// per-frame geometry of every direct block of the Home composition (doc-absolute top/height), recorded only when something changed
let last='';const loop=()=>{const root=document.querySelector("[data-experience-capability='home-composition'] .h29")||document.querySelector('.h29');
 if(root){const kids=[...root.children].map((c,i)=>{const r=c.getBoundingClientRect();return [i,D(c),Math.round(r.top+scrollY),Math.round(r.height)]});
  const rh=e=>Math.round(e.getBoundingClientRect().height);
  const det={upd:[...document.querySelectorAll('.h29-updates > *')].map(e=>rh(e)),
   nota:[...document.querySelectorAll('.h29-notable > *')].map(e=>rh(e)),
   gw:[...document.querySelectorAll('.dg29-gateway')].map(e=>[rh(e),e.querySelectorAll('a.dg29-source,a.dg29-language-preview').length,rh(e.querySelector('.dg29-sources')||e),!!e.querySelector('[role=status]')]),
   dim:[...document.querySelectorAll('.dg29-dimension')].map(e=>[rh(e),e.querySelectorAll('.dg29-dimension-source').length,!!e.querySelector('[role=status]')]),
   heroKids:[...document.querySelectorAll('.h29-hero > *')].map(e=>[D(e),rh(e)])};
  const key=JSON.stringify(kids)+JSON.stringify(det)+Math.round(scrollY)+document.documentElement.scrollHeight;
  if(key!==last){last=key;if(m.geo.length<4000)m.geo.push({t:ep(performance.now()),y:Math.round(scrollY),dh:document.documentElement.scrollHeight,k:kids,det})}}
 requestAnimationFrame(loop)};requestAnimationFrame(loop);
${READINESS_SRC}
// paint / LCP
new PerformanceObserver(l=>{for(const e of l.getEntries())m.lcp={t:ep(e.startTime),size:e.size,el:D(e.element),url:(e.url||'').slice(-60)}}).observe({type:'largest-contentful-paint',buffered:true});
window.__post=()=>{const e=document.querySelector("[data-experience-capability='post-master-reading-stage']");return !!(e&&e.innerText.length>800)};
window.__wait=(kind,ms=30000)=>new Promise(res=>{let done=false;const chk=()=>kind==='post'?window.__post():(window.__ready()||{})[kind];
 const fin=v=>{if(done)return;done=true;mo2.disconnect();clearInterval(iv);res({ok:v,t:ep(performance.now())})};
 const mo2=new MutationObserver(()=>{if(chk())fin(true)});mo2.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true});
 const iv=setInterval(()=>{if(chk())fin(true)},50);if(chk())fin(true);setTimeout(()=>fin(false),ms)});
// ready observer: records the first epoch time each predicate becomes true (installed pre-navigation, always running)
m.ready={};const rd=()=>{const r=window.__ready();if(r){for(const k of ['heroReal','usable','both','dgReady','dgSettled'])if(r[k]&&m.ready[k]==null)m.ready[k]=ep(performance.now());if(r.prMarker==='ready'&&m.ready.markerPrimary==null)m.ready.markerPrimary=ep(performance.now());if(r.dgMarker==='ready'&&m.ready.markerDg==null)m.ready.markerDg=ep(performance.now());if(r.prMarker&&m.ready.markerSeen==null)m.ready.markerSeen=r.prMarker}};
const mo3=new MutationObserver(rd);const st3=()=>mo3.observe(document.documentElement,{childList:true,subtree:true,attributes:true});if(document.documentElement)st3();else document.addEventListener('DOMContentLoaded',st3);
window.__resetReady=()=>{m.ready={}};
window.__anchor=(key)=>{const out={};const els=[...document.querySelectorAll('h1,h2,h3,h4,a,p,li,button,span,strong,b,small')].filter(e=>e.children.length===0);
 if(key){const el=els.find(e=>(e.innerText||'').trim().slice(0,80)===key);out.found=!!el;out.top=el?Math.round(el.getBoundingClientRect().top):null;return out}
 return out};
})()`;

// ---- sample ----------------------------------------------------------------------------------------------------------
async function newSample(origin, ctl) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(INIT); await ctx.addInitScript(`try{localStorage.setItem('sod-theme','${THEME}')}catch(_){}`);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const st = { misses: new Set(), errors: [], blockedWrites: 0, blockedWriteKeys: [], reqLog: [], consoleErrors: 0 };
  page.on('pageerror', e => st.errors.push(String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') st.consoleErrors++; });
  await page.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(origin)) { const p = new URL(u).pathname; if (p.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); return route.continue(); }
    if (u.includes(SBHOST)) {
      const rpc = (/\/rest\/v1\/rpc\/([^?]+)/.exec(u) || [])[1];
      const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: hdr, body: '' });
      const isRead = req.method() === 'GET' || (req.method() === 'POST' && rpc && READ_RPC.has(rpc));
      if (!isRead) { st.blockedWrites++; st.blockedWriteKeys.push(req.method() + ' ' + shortKey(norm(u))); return route.fulfill({ status: 204, body: '', headers: hdr }); }
      const k = keyOf(req); let f = fixtures[k];
      const isGate = /rest\/v1\/site_flags/.test(k);
      if (isGate && GATE_CLOSED && ctl.phase === 'back' && f) { const rows = JSON.parse(f.body).filter(r => r.key !== 'lock_world'); rows.push({ key: 'lock_world', enabled: true, message: 'fixture: world gate closed', mode: 'all' }); f = { ...f, body: JSON.stringify(rows) }; }
      const sk = shortKey(k); const tReq = Date.now();
      if (STATE === 'empty' && /rest\/v1\/posts|get_category_videos|els_records/.test(k) && !/storage/.test(k)) f = { status: 200, body: '[]', ct: 'application/json', cr: null };
      if (STATE === 'error' && /rest\/v1\/posts|get_category_videos|els_records/.test(k) && !/storage/.test(k)) f = { status: 500, body: '{"message":"fixture injected failure"}', ct: 'application/json', cr: null };
      const missing = !f; if (missing) st.misses.add(k.slice(0, 160));
      // delay uses Node timers only; never waits on the renderer
      const d = ((ctl.phase === 'back' && LATE != null) ? LATE : DELAY) + ((isGate && ctl.phase === 'back') ? GATE_DELAY : 0);
      await new Promise(r => setTimeout(r, d));
      st.reqLog.push({ k: sk, phase: ctl.phase, tReq, tFulfil: Date.now(), delay: d, miss: missing });
      if (missing) return route.fulfill({ status: 404, body: '', headers: hdr });   // flagged miss: sample will be invalid; NOT silently synthesised
      return route.fulfill({ status: f.status, body: f.body, headers: { ...hdr, 'content-type': f.ct || 'application/json', ...(f.cr ? { 'content-range': f.cr } : {}) } });
    }
    await new Promise(r => setTimeout(r, 400));
    return route.fulfill({ status: 200, body: '', contentType: u.includes('css') ? 'text/css' : 'text/javascript' });
  });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { ctx, page, cdp, st };
}
async function swipe(cdp, dist) { const x = Math.round(W / 2); let y = H - 90; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); const n = 24;
  for (let i = 0; i < n; i++) { y -= dist / n; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await new Promise(r => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function sessionWindowMax(entries) { let best = 0, cur = 0, start = null, last = null;
  for (const e of [...entries].sort((a, b) => a.t - b.t)) { if (start != null && (e.t - last >= 1000 || e.t - start >= 5000)) { cur = 0; start = null; } if (start == null) start = e.t; cur += e.v; last = e.t; best = Math.max(best, cur); }
  return +best.toFixed(4); }
const HOME_POST = "[data-experience-capability='home-composition'] a[href^='/post/']";
// find the first Home post link that is fully inside the viewport (no programmatic scroll)
async function visibleLink(page) {
  return page.evaluate(([sel, vh]) => { const els = [...document.querySelectorAll(sel)]; for (const e of els) { const r = e.getBoundingClientRect(); if (r.top >= 90 && r.bottom <= vh - 90 && r.width > 20 && r.height > 12 && getComputedStyle(e).visibility !== 'hidden') {
    const leafs = [...e.querySelectorAll('*')].filter(c => c.children.length === 0 && (c.innerText || '').trim().length >= 6); const lf = leafs[0] || e;
    return { href: e.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2, top: Math.round(r.top), anchorText: ((lf.innerText || e.innerText || '').trim().slice(0, 80)), anchorTop: Math.round(lf.getBoundingClientRect().top) }; } } return null; }, [HOME_POST, H]);
}
async function oneSample(arm, idx) {
  const { origin } = servers[arm]; const ctl = { phase: 'depart' };
  const { ctx, page, cdp, st } = await newSample(origin, ctl);
  const o = { arm, idx, invalid: [], late: LATE, interrupt: INTERRUPT, state: STATE };
  try {
    const nav0 = Date.now();
    await page.goto(origin + '/', { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    const rdy = await page.evaluate(() => window.__wait('dgSettled')); if (!rdy.ok) o.invalid.push('Home discovery never settled');
    o.homeReadyEpoch = { usable: await page.evaluate(() => window.__r.ready.usable), dgSettled: await page.evaluate(() => window.__r.ready.dgSettled), navStart: nav0 };
    await sleep(2200);   // explicit setup settle (not part of measured action)
    // reach the departure position by real touch swipes (same fixed script for every arm)
    for (let i = 0; i < 3; i++) { await swipe(cdp, 600); await sleep(250); } await sleep(500);
    let link = null; for (let i = 0; i < 10 && !link; i++) { link = await visibleLink(page); if (!link) { await swipe(cdp, 300); await sleep(350); } }
    await sleep(800);
    link = await visibleLink(page);
    if (!link) { o.invalid.push('no really-visible Home post control for departure'); throw new Error('no visible control'); }
    if (A.post && link.href !== A.post) o.invalid.push(`departure post ${link.href} != required ${A.post}`);
    o.depart = { href: link.href, anchorText: link.anchorText, anchorTopBefore: link.anchorTop, linkTop: link.top, scrollY: await page.evaluate(() => Math.round(scrollY)), docH: await page.evaluate(() => document.documentElement.scrollHeight), blocksBefore: (await page.evaluate(() => { const g = window.__r.geo; return g.length ? g[g.length - 1].k : null; })) };
    // REAL tap (touch) at the control; controller timestamps immediately around the command
    const tapMono0 = performance.now(), tapWall0 = Date.now();
    await page.touchscreen.tap(link.x, link.y);
    const tapMono1 = performance.now(), tapWall1 = Date.now();
    await page.waitForFunction(() => location.pathname.startsWith('/post/'), null, { timeout: 15000 }).catch(() => o.invalid.push('no navigation to /post/ after tap'));
    const pr = await page.evaluate(() => window.__wait('post')); if (!pr.ok) o.invalid.push('post never became readable');
    o.postRoute = { path: decodeURIComponent(await page.evaluate(() => location.pathname)), tapCmdMs: Math.round(tapMono1 - tapMono0), tapToPostReadyMs: Math.round(pr.t - tapWall0), postTextLen: await page.evaluate(() => (document.querySelector("[data-experience-capability='post-master-reading-stage']") || { innerText: '' }).innerText.length), postDocH: await page.evaluate(() => document.documentElement.scrollHeight) };
    await sleep(3000);   // explicit settle on the Post
    for (let i = 0; i < 2; i++) { await swipe(cdp, 700); await sleep(300); } await sleep(600);
    o.postY = await page.evaluate(() => Math.round(scrollY));
    // ---- measured action: actual browser Back ----
    ctl.phase = 'back'; await page.evaluate(() => window.__resetReady());
    if (TRACE_DIR) await browser.startTracing(page, { categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute'] });
    const bMono0 = performance.now(), bWall0 = Date.now();
    await page.goBack({ waitUntil: 'commit' });
    const bMono1 = performance.now(), bWall1 = Date.now();
    o.back = { cmdWallStart: bWall0, cmdWallEnd: bWall1, cmdDurMs: Math.round(bMono1 - bMono0) };
    let resize = null;
    if (RESIZE_TO) { await sleep(800); const before = await page.evaluate(() => window.__holds()); await page.setViewportSize({ width: RESIZE_TO, height: H }); await sleep(600); const after = await page.evaluate(() => window.__holds()); resize = { from: W, to: RESIZE_TO, before, after, staleVars: after.filter(h => h.v !== '').length, excess: after.map(h => h.h - h.nat) }; }
    o.resize = resize;
    let interrupt = null;
    if (INTERRUPT) { await sleep(900); const yb = await page.evaluate(() => Math.round(scrollY)); await swipe(cdp, 400); await sleep(400); interrupt = { atMsAfterBack: Date.now() - bWall0, yBefore: yb, yAfterSwipe: await page.evaluate(() => Math.round(scrollY)) }; }
    // poll the visible content anchor through the whole horizon
    const traj = []; const deadline = bWall0 + HORIZON_MS;
    while (Date.now() < deadline) { const p = await page.evaluate((k) => ({ y: Math.round(scrollY), dh: document.documentElement.scrollHeight, a: window.__anchor(k) }), link.anchorText).catch(() => null); if (p) traj.push([Date.now() - bWall0, p.y, p.dh, p.a.found ? p.a.top : null]); await sleep(120); }
    if (TRACE_DIR) { const buf = await browser.stopTracing(); fs.mkdirSync(TRACE_DIR, { recursive: true }); fs.writeFileSync(path.join(TRACE_DIR, `${arm}-${idx}.trace.json.gz`), zlib.gzipSync(buf)); }
    const rec = await page.evaluate(([w0, w1]) => { const m = window.__r; const inW = x => x.t >= w0 && x.t <= w1 + 300; return { cs: m.cs.filter(inW), mut: m.mut.filter(inW), geo: m.geo.filter(inW), lt: m.lt.filter(inW), ev: m.ev.filter(x => x.t >= w0 - 100 && x.t <= w1), ready: m.ready, geoPre: m.geo.filter(x => x.t < w0).slice(-1) }; }, [bWall0, bWall0 + HORIZON_MS]);
    const sum = rec.cs.reduce((s, x) => s + x.v, 0);
    o.actionWindowShiftSum = +sum.toFixed(4); o.cls = sessionWindowMax(rec.cs); o.shifts = rec.cs; o.mut = rec.mut; o.geo = rec.geo; o.geoPre = rec.geoPre; o.longTasks = rec.lt; o.events = rec.ev;
    const ms = (v) => v != null ? Math.round(v - bWall0) : null;
    o.readyAfterBack = { usable: ms(rec.ready.usable), hero: ms(rec.ready.heroReal), both: ms(rec.ready.both), dgReady: ms(rec.ready.dgReady), dgSettled: ms(rec.ready.dgSettled), markerPrimary: ms(rec.ready.markerPrimary), markerDg: ms(rec.ready.markerDg), markerSeen: rec.ready.markerSeen ?? null,
      usableFromCmdEnd: rec.ready.usable != null ? Math.round(rec.ready.usable - bWall1) : null };
    o.interrupt = interrupt; o.traj = traj.filter((_, i) => i % 3 === 0);
    const lastT = traj[traj.length - 1] || []; const found = traj.filter(t => t[3] != null);
    const afterAnchor = found.length ? found[found.length - 1][3] : null; o.anchor = { text: link.anchorText, topBefore: link.anchorTop, topFinal: afterAnchor, finalDisp: afterAnchor == null ? null : Math.abs(afterAnchor - link.anchorTop), yFinal: lastT[1], docHFinal: lastT[2] };
    // stability: after the anchor first lands within 120px, max displacement thereafter
    const first = found.findIndex(t => Math.abs(t[3] - link.anchorTop) <= 120);
    o.anchor.firstWithin120Ms = first >= 0 ? found[first][0] : null; o.anchor.maxDispAfter = first >= 0 ? found.slice(first).reduce((m, t) => Math.max(m, Math.abs(t[3] - link.anchorTop)), 0) : null;
    o.anchor.within120Final = o.anchor.finalDisp != null && o.anchor.finalDisp <= 120;
    o.anchor.sampledFound = found.length + '/' + traj.length;
    if (interrupt) { const afterSw = traj.filter(t => t[0] > interrupt.atMsAfterBack + 450); const ys = afterSw.map(t => t[1]); o.pullbackAfterInput = ys.length ? (Math.abs(ys[ys.length - 1] - o.depart.scrollY) <= 120 && Math.abs(interrupt.yAfterSwipe - o.depart.scrollY) > 200) : null; o.postInputYRange = ys.length ? [Math.min(...ys), Math.max(...ys)] : null; }
    o.reqLog = st.reqLog.filter(r => r.phase === 'back').map(r => ({ k: r.k, tReq: r.tReq - bWall0, tFulfil: r.tFulfil - bWall0, delay: r.delay }));
    o.reqCount = { depart: st.reqLog.filter(r => r.phase === 'depart').length, back: st.reqLog.filter(r => r.phase === 'back').length };
    o.finalDocH = lastT[2];
  } catch (e) { o.error = String(e.message).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300); }
  o.pageErrors = st.errors; o.consoleErrors = st.consoleErrors; o.misses = st.misses.size; o.missKeys = [...st.misses]; o.blockedWrites = st.blockedWrites; o.blockedWriteKeys = [...new Set(st.blockedWriteKeys)].slice(0, 8);
  if (A.shot) { try { await page.screenshot({ path: `${A.shot}-${arm}-${idx}.png` }); } catch (_) {} }
  o.valid = !o.error && !o.invalid.length && o.misses === 0 && o.pageErrors.length === 0;
  await ctx.close(); return o;
}

// Cold Home load (no navigation away): readiness, CLS (session-window max over the whole load), LCP, skeleton residue, markers.
async function loadSample(arm, idx) {
  const { origin } = servers[arm]; const ctl = { phase: 'depart' };
  const { ctx, page, cdp, st } = await newSample(origin, ctl);
  const o = { arm, idx, invalid: [], mode: 'load', state: STATE, width: W };
  try {
    await page.goto(origin + '/', { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    const settled = await page.waitForFunction(() => { const r = window.__ready(); if (!r) return false; const sk = window.__skeletons(); return sk.loading + sk.busy + sk.status === 0; }, null, { timeout: 40000 }).then(() => true).catch(() => false);
    if (!settled) o.invalid.push('Home never left its loading state');
    await sleep(1500);
    const rec = await page.evaluate(() => { const m = window.__r, r = window.__ready(); return { cs: m.cs, ready: m.ready, lcp: m.lcp || null, t0: m.t0, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime ?? null, ready0: r, sk: window.__skeletons(), holds: window.__holds(), emptyText: (document.querySelector('.h29-empty') || {}).textContent || null, heroText: (document.querySelector('.h29-hero h1') || {}).textContent || null }; });
    const rel = (v) => v != null ? Math.round(v - rec.t0) : null;
    o.cls = sessionWindowMax(rec.cs); o.shiftSum = +rec.cs.reduce((s, x) => s + x.v, 0).toFixed(4); o.shifts = rec.cs.map(x => ({ t: rel(x.t), v: +x.v.toFixed(4), src: x.src && x.src.slice(0, 2) }));
    o.fcp = rec.fcp != null ? Math.round(rec.fcp) : null; o.lcp = rec.lcp ? { t: rel(rec.lcp.t), el: rec.lcp.el, size: rec.lcp.size } : null;
    o.readyMs = { usable: rel(rec.ready.usable), hero: rel(rec.ready.heroReal), dgSettled: rel(rec.ready.dgSettled), markerPrimary: rel(rec.ready.markerPrimary), markerDg: rel(rec.ready.markerDg), markerSeen: rec.ready.markerSeen ?? null };
    o.final = rec.ready0; o.skeletonResidue = rec.sk; o.holds = rec.holds; o.emptyText = rec.emptyText; o.heroText = rec.heroText;
    o.reqCount = st.reqLog.length;
  } catch (e) { o.error = String(e.message).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300); }
  o.pageErrors = st.errors; o.consoleErrors = st.consoleErrors; o.misses = st.misses.size; o.missKeys = [...st.misses].slice(0, 12); o.blockedWrites = st.blockedWrites;
  if (A.shot) { try { await page.screenshot({ path: `${A.shot}-${arm}-${idx}.png` }); } catch (_) {} }
  o.valid = !o.error && !o.invalid.length && o.misses === 0 && o.pageErrors.length === 0;
  await ctx.close(); return o;
}
const runs = []; const t0 = new Date().toISOString();
for (let i = 0; i < PAIRS; i++) {
  const order = i % 2 === 0 ? armNames : [...armNames].reverse();   // interleaved A/B, alternating who goes first
  for (const arm of order) { const r = MODE === 'load' ? await loadSample(arm, i + 1) : await oneSample(arm, i + 1); runs.push(r); process.stderr.write(`${arm}#${i + 1} valid=${r.valid} cls=${r.cls} miss=${r.misses} ${MODE === 'load' ? `usable=${r.readyMs?.usable} lcp=${r.lcp?.t} residue=${JSON.stringify(r.skeletonResidue)}` : `anchor=${r.anchor?.finalDisp} usable=${r.readyAfterBack?.usable} dg=${r.readyAfterBack?.dgSettled}`} ${r.error || r.invalid.join(';')}\n`); }
}
const profile = { viewport: `${W}x${H}`, dpr: 2, touch: true, cpuThrottle: 4, network: '1.6Mbps down / 750kbps up / 150ms RTT (CDP)', supabaseReplayDelayMs: DELAY, backPhaseDelayMs: LATE, horizonMs: HORIZON_MS, theme: THEME, reducedMotion: REDUCED, state: STATE, interrupt: INTERRUPT, mode: MODE, gateDelayMs: GATE_DELAY, gateClosed: GATE_CLOSED, resizeTo: RESIZE_TO, definitions: 'v3: real hero/card (visible, not loading/busy/hidden, meaningful title, /post/ link); cls = session-window max',
  browser: 'Chromium ' + browser.version(), fixtureSha256: FX_SHA, fixtureKeys: Object.keys(fixtures).length, node: process.version, cpus: (await import('node:os')).cpus().length, startedAt: t0, finishedAt: new Date().toISOString() };
fs.writeFileSync(A.out, JSON.stringify({ profile, arms, runs }, null, 1));
for (const n of armNames) { const r = runs.filter(x => x.arm === n); const v = r.filter(x => x.valid); console.log(n, 'attempts', r.length, 'valid', v.length, 'CLS valid:', v.map(x => x.cls).join(' '), 'median', med(v.map(x => x.cls))); }
await browser.close(); for (const n of armNames) servers[n].srv.close();
