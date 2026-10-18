// Safe guest measurement of the Home cold opening against a locally served build.
// - serves <dist> (brotli, immutable assets, SPA fallback to 2029.html) on 127.0.0.1
// - every non-GET/HEAD/OPTIONS request, beacon and analytics-looking request is recorded and ABORTED before it leaves the browser
// - GET reads (Supabase anon REST, images) pass through unmodified
// - no scrolling, no clicks: the opening window is observed as-is
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools') + '/node_modules/');
const { chromium } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith('--') ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), []));
const dist = path.resolve(args.dist);
const label = args.label || 'run';
const profile = args.profile || 'mobile';
const runs = Number(args.runs || 3);
const windowMs = Number(args.window || 10000);
const out = args.out;
const scenario = args.scenario || 'cold';          // cold | scroll-approach
const noIO = args.noio === '1';
const abortRe = args.abort ? new RegExp(args.abort) : null;                    // run with IntersectionObserver removed

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4' };
const cache = new Map();
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(dist, p);
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, '2029.html');
  const ext = path.extname(f);
  const h = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate' };
  let e = cache.get(f); if (!e) { e = { raw: fs.readFileSync(f) }; cache.set(f, e); }
  let body = e.raw;
  const ae = req.headers['accept-encoding'] || '';
  if (['.js', '.css', '.html', '.json', '.svg'].includes(ext) && ae.includes('br')) { e.br ??= zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); body = e.br; h['content-encoding'] = 'br'; }
  h['content-length'] = body.length; res.writeHead(200, h); res.end(body);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${srv.address().port}`;

const ANALYTICS = /google-analytics|googletagmanager|gtag\/js|clarity\.ms|hotjar|connect\.facebook|facebook\.net|doubleclick|plausible|mixpanel|segment\.(io|com)|\/api\/(track|analytics|collect|event|events|rum|beacon|log)\b|\/collect(\?|$)|\/rum(\?|$)|\/beacon/i;
const desktop = profile === 'desktop';
const cfg = desktop
  ? { viewport: { width: 1366, height: 768 }, dpr: 1, cpu: 1, rtt: 40, down: 10 * 1024 * 1024 / 8, up: 5000 * 1024 / 8 }
  : { viewport: { width: 390, height: 844 }, dpr: 2, cpu: 4, rtt: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8 };

const browser = await chromium.launch({ headless: true, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
const result = { label, scenario, profile, runs, windowMs, noIO, dist, browser: browser.version(), cfg, samples: [] };

const INIT = `(() => {
  window.__m = { ready: null, readyHero: null, lcp: [], fcp: null, cls: [], long: [], beacons: [], iocount: 0 };
  ${noIO ? 'delete window.IntersectionObserver; window.IntersectionObserver = undefined;' : `const IO = window.IntersectionObserver; if (IO) { window.IntersectionObserver = class extends IO { constructor(cb, o) { super(cb, o); window.__m.iocount++; } }; }`}
  const nb = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  navigator.sendBeacon = (url, data) => { window.__m.beacons.push(String(url)); return false; };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp.push({ t: e.startTime, size: e.size, tag: e.element && e.element.tagName, url: e.url, id: e.id }); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.cls.push({ t: e.startTime, v: e.value, input: e.hadRecentInput }); }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.long.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {}
  const check = () => {
    const home = document.querySelector('[data-experience-capability="home-composition"]');
    if (home && window.__m.ready === null && home.getAttribute('data-h29-primary') === 'ready') window.__m.ready = performance.now();
    const h1 = home && home.querySelector('.h29-hero h1');
    if (h1 && window.__m.readyHero === null && !home.querySelector('.h29-hero.is-loading') && h1.textContent.trim() && h1.getClientRects().length) window.__m.readyHero = performance.now();
  };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
})();`;

function classify(url, type) {
  const u = new URL(url);
  if (u.origin === origin) {
    if (u.pathname.startsWith('/assets/') && u.pathname.endsWith('.js')) return 'js';
    if (u.pathname.startsWith('/assets/') && u.pathname.endsWith('.css')) return 'css';
    if (type === 'Document') return 'html';
    return 'local-other';
  }
  if (u.hostname.endsWith('supabase.co')) {
    if (u.pathname.startsWith('/rest/v1/rpc/')) return 'supabase-rpc:' + u.pathname.split('/').pop();
    if (u.pathname.startsWith('/rest/v1/')) return 'supabase-rest:' + u.pathname.split('/').pop();
    if (u.pathname.startsWith('/storage/')) return 'supabase-storage';
    if (u.pathname.startsWith('/realtime/') || u.pathname.startsWith('/auth/')) return 'supabase-' + u.pathname.split('/')[1];
    return 'supabase-other';
  }
  return 'external:' + u.hostname;
}

for (let run = 0; run < runs; run++) {
  const context = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: cfg.dpr, isMobile: !desktop, hasTouch: !desktop, serviceWorkers: 'block', locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await context.addInitScript(INIT);
  const reqs = new Map(); const blocked = [];
  await context.route('**/*', async (route) => {
    const r = route.request(); const m = r.method(); const url = r.url();
    const isLocal = url.startsWith(origin);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(m) || (!isLocal && ANALYTICS.test(url))) {
      blocked.push({ method: m, url, kind: classify(url, r.resourceType()), reason: ['GET', 'HEAD', 'OPTIONS'].includes(m) ? 'analytics' : 'write-method' });
      return route.abort('blockedbyclient');
    }
    if (abortRe && abortRe.test(url)) { blocked.push({ method: m, url, kind: 'injected-module-failure', reason: 'test-abort' }); return route.abort('failed'); }
    return route.continue();
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: cfg.rtt, downloadThroughput: cfg.down, uploadThroughput: cfg.up });
  if (cfg.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cfg.cpu });
  cdp.on('Network.requestWillBeSent', (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, method: e.request.method, type: e.type, t0: e.timestamp, wall: e.wallTime }); });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.fromCache = e.response.fromDiskCache || e.response.fromServiceWorker || false; r.enc = e.response.headers['content-encoding'] || e.response.headers['Content-Encoding'] || ''; r.tResp = e.timestamp; } });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.tEnd = e.timestamp; } });
  cdp.on('Network.loadingFailed', (e) => { const r = reqs.get(e.requestId); if (r) { r.failed = e.errorText; r.tEnd = e.timestamp; } });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

  const nav0 = Date.now();
  await page.goto(origin + '/', { waitUntil: 'commit' });
  const startTs = [...reqs.values()][0]?.t0;
  const deadline = nav0 + windowMs;
  while (Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));

  let approach = null;
  if (scenario === 'scroll-approach') {
    // Scroll in steps toward the world preview section; record request growth per step (after the cold window)
    approach = [];
    let last = reqs.size; const mark = () => { const all = [...reqs.values()]; const added = all.slice(last).map((r) => r.method + ' ' + r.url.replace(origin, '').slice(0, 110)); last = all.length; return added; };
    const trigger = await page.evaluate(() => !!document.querySelector('.h29-world-preview, [data-h29-world-preview], .h29-stream'));
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    approach.push({ step: 'cold-end', y: 0, added: mark(), total });
    for (let y = 400; y < total + 400; y += 400) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await new Promise((r) => setTimeout(r, 500));
      approach.push({ step: 'down', y, added: mark() });
    }
    await new Promise((r) => setTimeout(r, 1500));
    approach.push({ step: 'bottom-settled', added: mark() });
    await page.evaluate(() => window.scrollTo(0, 0)); await new Promise((r) => setTimeout(r, 800));
    approach.push({ step: 'back-top', added: mark() });
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.floor(total * 0.7)); await new Promise((r) => setTimeout(r, 800));
    approach.push({ step: 'return-to-zone', added: mark() });
  }

  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const jsRes = performance.getEntriesByType('resource').filter((e) => e.name.includes('/assets/') && e.name.endsWith('.js')).map((e) => e.name.split('/assets/')[1]);
    return { m: window.__m, nav: nav ? { dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, resp: nav.responseEnd } : null, jsRes, h1: document.querySelector('.h29-hero h1')?.textContent?.trim()?.slice(0, 80), primary: document.querySelector('[data-experience-capability="home-composition"]')?.getAttribute('data-h29-primary'), bodyText: document.body.innerText, bodyTail: document.body.innerText.slice(-600), homeSections: [...document.querySelectorAll('.h29 > section, .h29 > div')].map((n) => (n.getAttribute('aria-label') || n.className).slice(0, 40)), scrollY: window.scrollY };
  });
  const rel = (t) => (t - startTs) * 1000;
  const list = [...reqs.values()].map((r) => ({ kind: classify(r.url, r.type), method: r.method, status: r.status ?? null, failed: r.failed || null, bytes: r.bytes ?? 0, start: Math.round(rel(r.t0)), end: r.tEnd ? Math.round(rel(r.tEnd)) : null, url: r.url.replace(origin, '').slice(0, 220) }));
  let clsWin = 0, cur = 0, first = 0, prev = 0;
  for (const e of m.m.cls.filter((e) => !e.input).sort((a, b) => a.t - b.t)) { if (cur > 0 && e.t - prev < 1000 && e.t - first < 5000) cur += e.v; else { first = e.t; cur = e.v; } prev = e.t; clsWin = Math.max(clsWin, cur); }
  const longs = m.m.long;
  const lcp = m.m.lcp.at(-1) || null;
  const sum = (arr, f) => arr.reduce((n, x) => n + f(x), 0);
  const jsReqs = list.filter((r) => r.kind === 'js');
  result.samples.push({
    run,
    ready: m.m.ready, readyHero: m.m.readyHero, fcp: m.m.fcp, lcp: lcp && lcp.t, lcpEl: lcp && { tag: lcp.tag, url: lcp.url && lcp.url.slice(0, 160) },
    cls: clsWin, longTasks: longs.length, longTaskTotalMs: Math.round(sum(longs, (x) => x.d)), tbtMs: Math.round(sum(longs, (x) => Math.max(0, x.d - 50))), longTaskMaxMs: Math.round(Math.max(0, ...longs.map((x) => x.d))),
    dcl: m.nav?.dcl, load: m.nav?.load,
    requests: list.length, totalBytes: sum(list, (r) => r.bytes), jsRequests: jsReqs.length, jsBytes: sum(jsReqs, (r) => r.bytes),
    jsFiles: jsReqs.map((r) => r.url.replace('/assets/', '')).sort(),
    blocked, beacons: m.m.beacons, ioCount: m.m.iocount, h1: m.h1, primary: m.primary, scrollY: m.scrollY,
    forbidden: list.filter((r) => /fn_method_value|gematria_words|\/nodes|research_contributions|timeFlow|dayContext|hebcal/i.test(r.url)).map((r) => r.url),
    worldish: list.filter((r) => /World2029Page|worldDiscoveryStream|curationProjection2029|worldContributorLens|home2029Projection|explorerFacets|entityHubProjection|worldContextualProminence/i.test(r.url)).map((r) => r.url),
    textHasNow: /העת עכשיו|מספר העת/.test(m.bodyText),
    consoleErrors: consoleErrors.slice(0, 6), bodyTail: m.bodyTail, homeSections: m.homeSections, approach, list,
  });
  await context.close();
}
await browser.close(); srv.close();
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const S = result.samples;
console.log(JSON.stringify({ label, profile, scenario, noIO, runs,
  requests: S.map((s) => s.requests), totalKB: S.map((s) => +(s.totalBytes / 1024).toFixed(1)), jsReq: S.map((s) => s.jsRequests), jsKB: S.map((s) => +(s.jsBytes / 1024).toFixed(1)),
  fcp: S.map((s) => Math.round(s.fcp)), lcp: S.map((s) => Math.round(s.lcp)), ready: S.map((s) => Math.round(s.ready)), readyHero: S.map((s) => Math.round(s.readyHero)),
  tbt: S.map((s) => s.tbtMs), longTasks: S.map((s) => s.longTasks), cls: S.map((s) => +s.cls.toFixed(3)),
  blocked: S.map((s) => s.blocked.length), forbidden: S.map((s) => s.forbidden.length), worldish: S.map((s) => s.worldish.length), nowText: S.map((s) => s.textHasNow), medLcp: med(S.map((s) => s.lcp)), medReady: med(S.map((s) => s.ready)) }));
