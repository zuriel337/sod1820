// AUDIT EVIDENCE — where the time of a page load goes, per page type, device profile and cache state.
// Read-only towards the site. It reuses the capture rules of ../measurement-audit/capture-measurement-production.mjs:
//   - every request to Google / Meta / AdSense hosts is answered locally (the page gets an empty answer, nothing is delivered);
//   - every first-party WRITE (a non-GET request to the Supabase project or to the site) is answered locally;
//   - a first-party read that travels as POST (a Supabase RPC) goes through only when its name is on --allow (functions that
//     were checked in the live database to be STABLE and free of writes);
//   - requests made by the service worker are covered too (PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS).
// It can also run against a locally served artifact (--origin http://127.0.0.1:PORT, see serve-artifact.mjs).
//
// One measurement = one page type x one profile:
//   cold  = a new browser context: no service worker, empty HTTP cache;
//   warm  = a second navigation to the same address in a NEW tab of the same context (worker installed, HTTP cache filled);
//   visual (optional, --visual) = a third, separate cold load that only records what the screen shows while it waits
//           (status texts over time and screenshots); it is kept apart so that it cannot disturb the timings.
//
// Usage:
//   node speed-lab.mjs --out results.json [--origin https://sod1820.co.il] [--allow allow.json] [--profiles phone,desktop]
//                      [--pages home,post,old-post,number,chat] [--runs 3] [--cpu 4] [--rtt 0] [--visual DIR] [--insecure]
// --cpu N   : CPU slow-down factor of the phone profile (default 4; the desktop profile is never slowed down)
// --rtt MS  : adds MS to every request before it leaves (a round-trip model of a distant visitor; no bandwidth model)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const pw = createRequire(import.meta.url)('playwright');
const arg = (name, fallback = null) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const ORIGIN = arg('origin', 'https://sod1820.co.il');
const out = arg('out');
const allow = new Set(arg('allow') ? JSON.parse(readFileSync(arg('allow'), 'utf8')) : []);
const RUNS = Number(arg('runs', '3'));
const CPU = Number(arg('cpu', '4'));
const RTT = Number(arg('rtt', '0'));
const visualDir = arg('visual');
const SETTLE_MS = Number(arg('settle', '9000'));
const THIRD = /^https:\/\/([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com|facebook\.com|facebook\.net|googlesyndication\.com|adtrafficquality\.google|vercel-insights\.com|vercel-scripts\.com)\//;

const PAGES = {
  home: '/',
  post: '/post/eikh-yotzim-mehatat-moda-sefirot-yisrael-20261028',
  'old-post': '/' + encodeURIComponent('הגל-הראשון-של-הידיעה'),
  number: '/number/1820',
  chat: '/community/chat',
  unknown: '/no-such-page-audit-20261113',
};
const PROFILES = {
  phone: { ...pw.devices['Pixel 7'], locale: 'he-IL', timezoneId: 'Asia/Jerusalem', cpu: CPU },
  desktop: { viewport: { width: 1366, height: 768 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', cpu: 1,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
};
const pages = (arg('pages', 'home,post,old-post,number,chat')).split(',').filter((p) => PAGES[p]);
const profiles = (arg('profiles', 'phone,desktop')).split(',').filter((p) => PROFILES[p]);

// Runs in the page before any of its scripts.
function probe() {
  const lab = (window.__lab = { lcp: [], paints: [], shifts: 0, shiftList: [], long: [], opened: null, controllerAtStart: null, controllerAt: null, status: [] });
  const describe = (el) => {
    if (!el) return null;
    const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
    const r = el.getBoundingClientRect?.();
    return { tag: el.tagName?.toLowerCase(), cls: cls.slice(0, 140), inOpeningShell: !!el.closest?.('.sod29-opening'),
      text: (el.tagName === 'IMG' ? '' : (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70)),
      box: r ? [Math.round(r.width), Math.round(r.height)] : null,
      img: el.tagName === 'IMG' ? { loading: el.loading, fetchpriority: el.getAttribute('fetchpriority'), decoding: el.decoding, w: el.naturalWidth, h: el.naturalHeight } : null };
  };
  const watch = (type, fn) => { try { new PerformanceObserver((l) => { for (const e of l.getEntries()) fn(e); }).observe({ type, buffered: true }); } catch { /* not supported */ } };
  watch('largest-contentful-paint', (e) => lab.lcp.push({ t: Math.round(e.startTime), renderTime: Math.round(e.renderTime), loadTime: Math.round(e.loadTime), size: e.size, url: e.url || null, el: describe(e.element) }));
  watch('paint', (e) => lab.paints.push({ name: e.name, t: Math.round(e.startTime) }));
  watch('layout-shift', (e) => { if (e.hadRecentInput) return; lab.shifts += e.value;
    if (e.value >= 0.005) lab.shiftList.push({ t: Math.round(e.startTime), value: Math.round(e.value * 1000) / 1000,
      nodes: [...(e.sources || [])].slice(0, 4).map((x) => { const n = x.node; if (!n || n.nodeType !== 1) return null; const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''; return n.tagName.toLowerCase() + (cls ? '.' + cls : '') + ` y${Math.round(x.previousRect.y)}>${Math.round(x.currentRect.y)} h${Math.round(x.previousRect.height)}>${Math.round(x.currentRect.height)}`; }).filter(Boolean) }); });
  watch('longtask', (e) => lab.long.push([Math.round(e.startTime), Math.round(e.duration)]));
  try {
    lab.controllerAtStart = !!navigator.serviceWorker?.controller;
    navigator.serviceWorker?.addEventListener('controllerchange', () => { if (lab.controllerAt === null) lab.controllerAt = Math.round(performance.now()); });
  } catch { /* no worker support */ }
  const start = () => {
    const root = document.getElementById('root'); if (!root) return;
    const check = () => { if (lab.opened === null && root.children.length > 0 && !root.querySelector('.sod29-opening')) lab.opened = Math.round(performance.now()); };
    new MutationObserver(check).observe(root, { childList: true }); check();
    if (window.__labVisual) {
      let last = '';
      const sample = () => {
        const seen = [...document.querySelectorAll('[role=status],[role=progressbar],[aria-busy=true],[data-els-meter],[class*=skeleton],[class*=Skeleton],[class*=loading],[class*=Loading]')]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
          .map((el) => { const cls = typeof el.className === 'string' ? el.className : ''; const s = getComputedStyle(el);
            return [el.tagName.toLowerCase() + (cls ? '.' + cls.split(/\s+/).slice(0, 2).join('.') : ''), el.getAttribute('role') || '', (el.children.length > 6 ? '' : (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80)), s.position].join(' | '); }).slice(0, 12);
        const now = JSON.stringify(seen);
        if (now !== last) { last = now; lab.status.push({ t: Math.round(performance.now()), seen }); }
      };
      setInterval(sample, 100); sample();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}

function collect() {
  const nav = performance.getEntriesByType('navigation')[0];
  const r = (n) => (n == null ? null : Math.round(n));
  const res = performance.getEntriesByType('resource').map((e) => ({ url: e.name, type: e.initiatorType, start: r(e.startTime), reqStart: r(e.requestStart), respStart: r(e.responseStart), end: r(e.responseEnd),
    transfer: e.transferSize, encoded: e.encodedBodySize, decoded: e.decodedBodySize, blocking: e.renderBlockingStatus || null, delivery: e.deliveryType || '', workerStart: r(e.workerStart) }));
  const lcp = window.__lab.lcp; const last = lcp[lcp.length - 1] || null;
  const lcpImg = last?.url ? document.querySelector('img') && [...document.images].find((i) => i.currentSrc === last.url || i.src === last.url) : null;
  return {
    nav: nav && { type: nav.type, redirectCount: nav.redirectCount, redirect: r(nav.redirectEnd - nav.redirectStart), workerStart: r(nav.workerStart), fetchStart: r(nav.fetchStart), dns: r(nav.domainLookupEnd - nav.domainLookupStart),
      connect: r(nav.connectEnd - nav.connectStart), requestStart: r(nav.requestStart), ttfb: r(nav.responseStart), responseEnd: r(nav.responseEnd), domInteractive: r(nav.domInteractive), dcl: r(nav.domContentLoadedEventEnd), load: r(nav.loadEventEnd),
      transfer: nav.transferSize, encoded: nav.encodedBodySize, decoded: nav.decodedBodySize, protocol: nav.nextHopProtocol, delivery: nav.deliveryType || '' },
    marks: performance.getEntriesByType('mark').filter((m) => m.name.startsWith('sod2029:')).map((m) => [m.name.slice(8), r(m.startTime)]),
    fcp: window.__lab.paints.find((p) => p.name === 'first-contentful-paint')?.t ?? null,
    lcp: last, lcpCandidates: lcp.map((c) => ({ t: c.t, size: c.size, url: c.url, tag: c.el?.tag, cls: c.el?.cls, shell: c.el?.inOpeningShell, text: c.el?.text })),
    lcpImageLazy: lcpImg ? { loading: lcpImg.loading, fetchpriority: lcpImg.getAttribute('fetchpriority') } : null,
    cls: Math.round(window.__lab.shifts * 1000) / 1000, shifts: window.__lab.shiftList, longTasks: window.__lab.long, opened: window.__lab.opened,
    controllerAtStart: window.__lab.controllerAtStart, controllerAt: window.__lab.controllerAt, swControls: !!navigator.serviceWorker?.controller,
    title: document.title, h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80) || null,
    homePrimary: document.querySelector('[data-home-primary]')?.getAttribute('data-home-primary') || null,
    status: window.__lab.status, resources: res,
  };
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
// --insecure: only for the local fixture served over HTTP/2 with a throwaway self-signed certificate (serve-artifact.mjs --h2).
const INSECURE = process.argv.includes('--insecure');
const browser = await pw.chromium.launch({ headless: true, args: INSECURE ? ['--ignore-certificate-errors'] : [] });

async function newContext(profile, log) {
  const { cpu, ...options } = PROFILES[profile];
  const context = await browser.newContext({ ...options, serviceWorkers: 'allow', ignoreHTTPSErrors: INSECURE });
  await context.addInitScript(probe);
  await context.route(THIRD, async (route) => { log.push({ kind: 'third', url: route.request().url().split('?')[0], method: route.request().method(), t: Date.now() }); return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }); });
  await context.route((url) => url.hostname.endsWith('.supabase.co') || url.origin === ORIGIN, async (route) => {
    const req = route.request(); const u = new URL(req.url()); const method = req.method();
    if (RTT) await sleep(RTT);
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return route.continue();
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(u.pathname)?.[1] || null;
    if (rpc && allow.has(rpc)) return route.continue();
    log.push({ kind: 'blocked', host: u.hostname, path: u.pathname, method, viaWorker: !!req.serviceWorker(), bytes: (req.postData() || '').length, t: Date.now() });
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: rpc ? 'null' : '{}' });
  });
  const net = [];
  context.on('request', (req) => { net.push({ req, t0: Date.now() }); });
  return { context, cpu, net };
}

async function summarizeNet(net, navStartWall) {
  const rows = [];
  for (const { req, t0 } of net) {
    const res = await req.response().catch(() => null); const u = new URL(req.url());
    let sizes = null; try { sizes = res ? await req.sizes() : null; } catch { /* aborted */ }
    const h = res ? res.headers() : {};
    rows.push({ at: t0 - navStartWall, method: req.method(), host: u.host, path: u.pathname + (u.search ? '?' + u.search.slice(1, 80) : ''), type: req.resourceType(), viaWorker: !!req.serviceWorker(), status: res ? res.status() : null,
      fromWorkerResponse: res ? res.fromServiceWorker() : null, bodyBytes: sizes?.responseBodySize ?? null, requestBytes: sizes ? sizes.requestHeadersSize + sizes.requestBodySize : null,
      cacheControl: h['cache-control'] || null, vercelCache: h['x-vercel-cache'] || null, age: h.age || null, encoding: h['content-encoding'] || null, contentType: (h['content-type'] || '').split(';')[0] || null });
  }
  return rows;
}

async function load(context, cpu, net, url, { visual = null } = {}) {
  const page = await context.newPage();
  if (visual) await page.addInitScript(() => { window.__labVisual = true; });
  const cdp = await context.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  net.length = 0; const wall = Date.now(); let status = null; const shots = [];
  try {
    const nav = page.goto(url, { waitUntil: 'load', timeout: 60000 });
    if (visual) for (const at of [600, 1500, 3000, 6000]) { await sleep(Math.max(0, wall + at - Date.now())); const file = `${visual}-${at}ms.png`; await page.screenshot({ path: file }).then(() => shots.push(file)).catch(() => {}); }
    status = (await nav)?.status() ?? null;
  } catch (e) { status = 'error: ' + String(e).slice(0, 120); }
  await sleep(SETTLE_MS);
  const data = await page.evaluate(collect).catch((e) => ({ error: String(e).slice(0, 200) }));
  const requests = await summarizeNet([...net], wall);
  await page.close();
  return { status, ...data, shots, requests };
}

const results = [];
for (const name of pages) for (const profile of profiles) for (let run = 1; run <= RUNS; run++) {
  const log = []; const { context, cpu, net } = await newContext(profile, log);
  const url = ORIGIN + PAGES[name];
  const cold = await load(context, cpu, net, url);
  const warm = await load(context, cpu, net, url);
  await context.close();
  let visual = null;
  if (visualDir && run === 1) {
    mkdirSync(visualDir, { recursive: true });
    const v = await newContext(profile, log);
    visual = await load(v.context, v.cpu, v.net, url, { visual: `${visualDir}/${name}-${profile}` });
    await v.context.close();
    visual = { status: visual.status, statusTimeline: visual.status?.length ? visual.status : visual.status, shots: visual.shots, opened: visual.opened, lcp: visual.lcp?.t ?? null };
  }
  results.push({ page: name, path: PAGES[name], profile, run, cold, warm, visual, blocked: log.filter((x) => x.kind === 'blocked').map((x) => `${x.method} ${x.path}${x.viaWorker ? ' (worker)' : ''}`), third: [...new Set(log.filter((x) => x.kind === 'third').map((x) => x.method + ' ' + x.url))] });
  const line = (s) => s && !s.error ? `ttfb=${s.nav?.ttfb} fcp=${s.fcp} opened=${s.opened} lcp=${s.lcp?.t} [${s.lcp?.el?.tag}.${(s.lcp?.el?.cls || '').split(' ')[0]}${s.lcp?.url ? ' img' : ''}] sw=${s.controllerAtStart ? 'at-start' : s.controllerAt} req=${s.requests.length}` : JSON.stringify(s?.error || s?.status);
  console.log(`${name} ${profile} #${run}  cold: ${line(cold)}  |  warm: ${line(warm)}`);
}
await browser.close();
const report = { captured_at: new Date().toISOString(), origin: ORIGIN, cpu_slowdown_phone: CPU, added_rtt_ms: RTT, runs: RUNS,
  rpc_mode: allow.size ? `reads allowed for ${allow.size} verified read-only RPC names` : 'no RPC delivered', results };
if (out) writeFileSync(out, JSON.stringify(report) + '\n');
process.exit(0);
