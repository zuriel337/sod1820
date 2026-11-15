// Lab harness for post-page loading (Chromium via Playwright + CDP). Read-only: never sends analytics, ad or tracking requests.
//   node lab.mjs <config.json> <out.jsonl>
// config: { label, mode:'live'|'fixture', origin, device:'mobile'|'desktop', thirdParty:'blocked'|'scripts-only', scenarios:['cold','warm','nav'],
//           runs, gapMs, cpuProfile:bool, posts:[{key,path,expect_title,expect_snippet}], fixture:{root, documentDelayMs, supabase:{...}} }
// Every run is one fresh browser context. Results are one JSON object per line.
import { createRequire } from 'node:module';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [cfgPath, outPath] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const MOBILE = { cpu: 4, latency: 150, down: 1.6e6 / 8, up: 750e3 / 8 };    // Lighthouse "Slow 4G" + 4x CPU slowdown
const DESKTOP = { cpu: 1, latency: 40, down: 10e6 / 8, up: 5e6 / 8 };       // fast broadband
const MOBILE_FAST = { cpu: 4, latency: 60, down: 9e6 / 8, up: 1.5e6 / 8 }; // 'Regular 4G' + 4x CPU slowdown (second lab profile)
const prof = cfg.device === 'mobile' ? (cfg.net === 'fast4g' ? MOBILE_FAST : MOBILE) : DESKTOP;
const UA_TAG = ' SOD1820-Post-Speed-Audit/1.0';

// --- hosts: scripts of third parties may load (scripts-only) so their CPU cost is measurable; every beacon/ad/tracking request is aborted.
const THIRD_PARTY_SCRIPT = /^https:\/\/(www\.googletagmanager\.com\/(gtag|gtm)\/?|connect\.facebook\.net\/|pagead2\.googlesyndication\.com\/pagead\/(js|managed\/js)\/)/i;
const ALWAYS_BLOCK = [
  /google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net|doubleclick\.net|googleadservices\.com|adtrafficquality\.google|googlesyndication\.com\/(pagead\/(ads|gen_204|viewthroughconversion|sodar)|safeframe)|tpc\.googlesyndication\.com|googleads\./i,
  /facebook\.com\/tr|facebook\.com\/privacy_sandbox|connect\.facebook\.net\/.*\/(sdk|signals)/i,
  /clarity\.ms|hotjar|segment\.io|mixpanel/i,
  /\/rest\/v1\/rpc\/(track_|log_|record_|beacon)/i,
  /\/functions\/v1\/(meta-capi|track|log)/i,
];
const THIRD_KINDS = { gtag: /googletagmanager\.com\/(gtag|gtm)/i, fb: /connect\.facebook\.net\/.*fbevents/i, ads: /pagead2\.googlesyndication\.com\/pagead\/(js|managed\/js)\//i };
const isThirdPartyHost = u => { try { const h = new URL(u).hostname; return !/(^|\.)sod1820\.co\.il$/.test(h) && !/\.supabase\.co$/.test(h) && !/^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(h) && h !== 'localhost' && h !== '127.0.0.1'; } catch { return false; } };

const INIT = () => {
  const m = window.__perf = { lcp: [], shifts: [], long: [], paints: [], content: null, expect: null, nav: null, errors: [] };
  const po = (type, fn) => { try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch { /* unsupported */ } };
  po('largest-contentful-paint', e => m.lcp.push({ t: Math.round(e.startTime), size: e.size, url: e.url || null, id: e.id || null,
    el: e.element ? (e.element.tagName + (e.element.id ? '#' + e.element.id : '') + (e.element.className && typeof e.element.className === 'string' ? '.' + e.element.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) : null,
    load: Math.round(e.loadTime), render: Math.round(e.renderTime) }));
  po('layout-shift', e => { if (!e.hadRecentInput) m.shifts.push({ t: Math.round(e.startTime), v: e.value }); });
  po('longtask', e => m.long.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }));
  po('paint', e => m.paints.push({ n: e.name, t: Math.round(e.startTime) }));
  window.addEventListener('error', e => m.errors.push(String(e.message).slice(0, 120)));
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const check = () => {
    if (m.content || !m.expect) return;
    const art = document.querySelector('article') || document.querySelector('main');
    if (!art) return;
    const text = norm(art.textContent);
    if (!text.includes(m.expect.title) || !text.includes(m.expect.snippet)) return;
    const h1 = art.querySelector('h1');
    const r = (h1 || art).getBoundingClientRect(); // one layout read once the text is present
    if (!(r.height > 0 && r.width > 0)) return;
    requestAnimationFrame(() => { if (!m.content) m.content = { t: Math.round(performance.now()), len: text.length, h1: !!h1 }; });
  };
  let queued = false;
  const schedule = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; check(); }, 0); };
  const start = () => { new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true }); schedule(); };
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  window.__setExpect = e => { m.expect = e; schedule(); };
};

function summariseProfile(profile, windowEndMs) {
  // self time per script URL; samples are in microseconds. Only samples before windowEndMs (from profile start) are counted.
  const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const out = {}; let t = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i] / 1000;
    if (windowEndMs && t > windowEndMs) break;
    const n = byId.get(profile.samples[i]); if (!n) continue;
    const cf = n.callFrame; const key = cf.url ? cf.url.replace(/^https?:\/\/[^/]+/, m => m.includes('sod1820.co.il') || m.includes('127.0.0.1') ? '' : m) : '(' + (cf.functionName || 'native') + ')';
    out[key] = (out[key] || 0) + (profile.timeDeltas[i] / 1000);
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k.slice(0, 140), Math.round(v)]));
}

async function newSession(browser, opts = {}) {
  const base = cfg.device === 'mobile' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' };
  const context = await browser.newContext({ ...base, userAgent: base.userAgent + UA_TAG, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', ignoreHTTPSErrors: true, serviceWorkers: 'allow' });
  // In production the edge middleware answers a human browser with cookie vb=browser (bot verdict); without it the client falls back to navigator.webdriver (=true under automation) and silently skips ads/tracking.
  if (cfg.mode === 'fixture') await context.addCookies([{ name: 'vb', value: 'browser', domain: 'sod1820.co.il', path: '/' }]);
  const blocked = [], tp = [], writes = [];
  // Request interception disables Chromium's HTTP cache, so a repeat visit would be measured without it. In fixture mode every host is the local lab server, which
  // already refuses everything that is not a read (writes get 204) and serves third-party scripts from its replay cache; `noRoute` therefore skips the interception.
  if (!(cfg.noRoute && cfg.mode === 'fixture')) await context.route('**/*', route => {
    const req = route.request(), url = req.url(), method = req.method();
    if (ALWAYS_BLOCK.some(rx => rx.test(url))) { blocked.push({ m: method, u: url.slice(0, 150) }); return route.abort('blockedbyclient'); }
    if (isThirdPartyHost(url)) {
      tp.push({ m: method, u: url.slice(0, 150) });
      if (cfg.thirdParty === 'scripts-only' && method === 'GET' && THIRD_PARTY_SCRIPT.test(url) && (!cfg.thirdPartyAllow || cfg.thirdPartyAllow.some(k => THIRD_KINDS[k]?.test(url)))) return route.continue();
      blocked.push({ m: method, u: url.slice(0, 150), why: 'third-party' }); return route.abort('blockedbyclient');
    }
    // Deny by default: an RPC may run only if it is on the read-only allow-list (verified STABLE/IMMUTABLE in pg_proc). Anything that could
    // write (analytics ingestion, visit tracking, edge functions, REST writes, first-party /api writes) is refused and logged by name.
    const rpc = /\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/.exec(url);
    if (rpc) {
      if ((cfg.readRpc || []).includes(rpc[1])) { writes.push({ m: method, u: url.slice(0, 150), allowed: true, rpc: rpc[1] }); return route.continue(); }
      writes.push({ m: method, u: url.slice(0, 150), allowed: false, rpc: rpc[1] }); return route.abort('blockedbyclient');
    }
    if (/\/functions\/v1\//.test(url)) { writes.push({ m: method, u: url.slice(0, 150), allowed: false, fn: true }); return route.abort('blockedbyclient'); }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) { writes.push({ m: method, u: url.slice(0, 150), allowed: false }); return route.abort('blockedbyclient'); }
    return cfg.fixture?.route ? cfg.fixture.route(route) : route.continue();
  });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: prof.latency, downloadThroughput: prof.down, uploadThroughput: prof.up });
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  const net = new Map();
  cdp.on('Network.requestWillBeSent', e => { net.set(e.requestId, { id: e.requestId, url: e.request.url, method: e.request.method, type: e.type, t0: e.timestamp, wall: e.wallTime, init: e.initiator?.type, initUrl: (e.initiator?.url || e.initiator?.stack?.callFrames?.[0]?.url || '').slice(0, 100), prio: e.request.initialPriority }); });
  cdp.on('Network.responseReceived', e => { const r = net.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; r.tResp = e.timestamp; r.timing = e.response.timing ? { connectStart: e.response.timing.connectStart, connectEnd: e.response.timing.connectEnd, sslStart: e.response.timing.sslStart, sslEnd: e.response.timing.sslEnd, sendEnd: e.response.timing.sendEnd, receiveHeadersEnd: e.response.timing.receiveHeadersEnd, requestTime: e.response.timing.requestTime } : null; r.fromCache = e.response.fromDiskCache || e.response.fromPrefetchCache || false; r.fromSW = !!e.response.fromServiceWorker; r.proto = e.response.protocol; r.mitigated = e.response.headers?.['x-vercel-mitigated'] || null; } });
  cdp.on('Network.loadingFinished', e => { const r = net.get(e.requestId); if (r) { r.tEnd = e.timestamp; r.bytes = e.encodedDataLength; } });
  cdp.on('Network.loadingFailed', e => { const r = net.get(e.requestId); if (r) { r.tEnd = e.timestamp; r.failed = e.errorText; } });
  return { context, page, cdp, net, blocked, tp, writes };
}

async function collect(s, post, scenario, t0Wall, extra = {}) {
  const { page, cdp, net } = s;
  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]?.toJSON?.() || null;
    return { origin: performance.timeOrigin, now: performance.now(), nav, perf: window.__perf, ua: navigator.userAgent.slice(0, 80) };
  });
  const base = t0Wall;  // epoch seconds of the measured navigation start
  const rel = (t, tMono0) => t == null ? null : Math.round((t - tMono0) * 1000);
  const docReq = [...net.values()].find(r => r.type === 'Document' && r.wall != null && Math.abs(r.wall * 1000 - data.origin) < 5000) || [...net.values()].find(r => r.type === 'Document');
  const mono0 = docReq ? docReq.t0 : 0;
  const reqs = [...net.values()].filter(r => r.wall != null && (r.wall - base) > -0.2).map(r => ({
    u: r.url.length > 150 ? r.url.slice(0, 150) : r.url, ty: r.type, m: r.method, st: r.status ?? null, s: rel(r.t0, mono0), h: rel(r.tResp, mono0), e: rel(r.tEnd, mono0), b: r.bytes ?? null, i: r.init, iu: r.initUrl || undefined, p: r.proto, sw: r.fromSW || undefined, c: r.fromCache || undefined, f: r.failed || undefined,
    tm: r.timing ? { con: Math.round(r.timing.connectEnd - r.timing.connectStart), ssl: r.timing.sslEnd > 0 ? Math.round(r.timing.sslEnd - r.timing.sslStart) : 0, ttfb: Math.round(r.timing.receiveHeadersEnd - r.timing.sendEnd) } : undefined }));
  const res = await page.evaluate(() => performance.getEntriesByType('resource').map(e => ({ n: e.name.slice(0, 150), s: Math.round(e.startTime), re: Math.round(e.responseEnd), ts: e.transferSize, eb: e.encodedBodySize, db: e.decodedBodySize, it: e.initiatorType })));
  return { ...extra, post: post.key, scenario, device: cfg.device, mode: cfg.mode, label: cfg.label, thirdParty: cfg.thirdParty, nav: data.nav && { rs: Math.round(data.nav.responseStart), re: Math.round(data.nav.responseEnd), fs: Math.round(data.nav.fetchStart), cs: Math.round(data.nav.connectStart), ce: Math.round(data.nav.connectEnd), rq: Math.round(data.nav.requestStart), dcl: Math.round(data.nav.domContentLoadedEventEnd), load: Math.round(data.nav.loadEventEnd), size: data.nav.encodedBodySize },
    perf: data.perf, now: Math.round(data.now), requests: reqs, resources: res, mitigated: [...net.values()].some(r => r.mitigated), };
}

const results = [];
let lab = null;
if (cfg.mode === 'fixture') {
  const { startLabServer } = await import('./labserver2.mjs');
  const anon = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(cfg.fixture.root + '/src/lib/supabase.js', 'utf8'))[1];
  const d = cfg.fixture.docDelayMs || {};
  lab = await startLabServer({ root: cfg.fixture.root, cacheDir: cfg.fixture.cacheDir, readRpc: cfg.readRpc || [], anon, supabaseExtraMs: cfg.fixture.supabaseExtraMs ?? 120,
    docDelayFor: p => p === '/' ? (d.home ?? 500) : p.startsWith('/post/') ? (d.new ?? 600) : (d.old ?? 1000), record: cfg.fixture.record !== false,
    staticCacheControl: cfg.fixture.staticCacheControl || null, inject: cfg.fixture.inject || {}, docCacheControl: cfg.fixture.docCacheControl || null });
  cfg.origin = lab.origin;
}
const browser = await chromium.launch({ proxy: cfg.mode === 'live' && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  args: lab ? lab.chromiumArgs : ['--disable-dev-shm-usage'], env: lab ? lab.browserEnv : process.env });
console.error('chromium', browser.version(), 'device', cfg.device, 'mode', cfg.mode, 'tp', cfg.thirdParty);
const t_start = Date.now();
outer: for (let run = 1; run <= cfg.runs; run++) {
  for (const post of cfg.posts) {
    for (const scenario of cfg.scenarios) {
      const s = await newSession(browser);
      let rec;
      try {
        const url = cfg.origin + post.path;
        const expect = { title: post.expect_title, snippet: post.expect_snippet };
        let tNavMono0 = 0, wall0;
        if (scenario === 'cold') {
          wall0 = Date.now() / 1000;
          if (cfg.cpuProfile) { await s.cdp.send('Profiler.enable'); await s.cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await s.cdp.send('Profiler.start'); }
          await s.page.goto(url, { waitUntil: 'commit', timeout: 60000 });
        } else if (scenario === 'warm') {
          await s.page.goto(url, { waitUntil: 'load', timeout: 60000 }); await s.page.waitForFunction(() => window.__perf?.expect === null || true); await sleep(4500);  // prime HTTP cache + service worker
          await s.page.goto('about:blank'); s.net.clear();
          wall0 = Date.now() / 1000;
          if (cfg.cpuProfile) { await s.cdp.send('Profiler.enable'); await s.cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await s.cdp.send('Profiler.start'); }
          await s.page.goto(url, { waitUntil: 'commit', timeout: 60000 });
        } else if (scenario === 'nav') {
          await s.page.goto(cfg.origin + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(5000);
          s.net.clear();
          if (cfg.cpuProfile) { await s.cdp.send('Profiler.enable'); await s.cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await s.cdp.send('Profiler.start'); }
          wall0 = Date.now() / 1000;
        }
        await s.page.evaluate(e => window.__setExpect(e), expect);
        if (scenario === 'nav') {
          // programmatic SPA navigation (router listens to popstate); measured from this instant
          await s.page.evaluate(path => { window.__perf.nav = performance.now(); window.__perf.content = null; window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, post.path);
        }
        const ok = await s.page.waitForFunction(() => window.__perf?.content, null, { timeout: 45000, polling: 100 }).then(() => true).catch(() => false);
        await sleep(cfg.settleMs ?? 3500);  // let LCP/long tasks settle (cfg.settleMs: a longer window for runs whose largest image finishes late; the LCP of a run that ends before it is censored)
        let profile = null;
        if (cfg.cpuProfile) { const { profile: p } = await s.cdp.send('Profiler.stop'); profile = p; }
        rec = await collect(s, post, scenario, wall0, { run, contentSeen: ok });
        if (profile) { const navStart = rec.perf?.nav ?? 0; rec.cpu = summariseProfile(profile, null); rec.cpuNote = 'self time (ms, throttled wall time) by script url over the whole run'; }
        rec.blocked = s.blocked.length; rec.blockedList = [...new Set(s.blocked.map(b => b.u.replace(/\?.*$/, '').slice(0, 110)))].slice(0, 25);
        rec.thirdPartyAttempts = [...new Set(s.tp.map(b => b.u.replace(/\?.*$/, '').slice(0, 110)))].slice(0, 25);
        rec.writesRefused = [...new Set(s.writes.filter(w => !w.allowed).map(w => (w.rpc ? 'rpc/' + w.rpc : w.fn ? 'fn:' + w.u.replace(/^https:\/\/[^/]+/, '').split('?')[0] : w.m + ' ' + w.u.replace(/^https:\/\/[^/]+/, '').split('?')[0])))]; rec.rpcAllowed = [...new Set(s.writes.filter(w => w.allowed).map(w => w.rpc))];
        appendFileSync(outPath, JSON.stringify(rec) + '\n'); results.push(rec);
        const c = rec.perf?.content?.t, l = rec.perf?.lcp?.at(-1);
        console.error(`run ${run} ${scenario.padEnd(4)} ${post.key.padEnd(4)} ttfb=${rec.nav?.rs} content=${c ?? 'NONE'} lcp=${l?.t ?? '-'} (${l?.el ?? ''}) blocked=${rec.blocked}${rec.mitigated ? ' MITIGATED' : ''}`);
        if (rec.mitigated) { console.error('platform mitigation header seen - stopping all runs'); await s.context.close(); break outer; }
      } catch (e) {
        console.error('run failed', post.key, scenario, String(e.message || e).slice(0, 160));
        appendFileSync(outPath, JSON.stringify({ run, post: post.key, scenario, device: cfg.device, label: cfg.label, error: String(e.message || e).slice(0, 300) }) + '\n');
      } finally { await s.context.close().catch(() => {}); }
      await sleep(cfg.gapMs ?? 6000);
    }
  }
}
await browser.close();
if (lab) { console.error('lab server', JSON.stringify({ documents: lab.state.documents, static: lab.state.static, supabase: lab.state.supabase.length, beacons: lab.state.beacons, misses: lab.state.misses.length })); await lab.close(); }
console.error('done', results.length, 'runs in', Math.round((Date.now() - t_start) / 1000), 's');
