// Before/after measurement of the Number page (docs/reviews/number-page-speed-20261105).
//
//   # 1. build the two variants with the production reading profile (same command for both checkouts)
//   SOD_BUILD_TARGET=2029 VITE_PUBLIC_READING_RELEASE=public-reading-20261101 npx vite build --outDir /tmp/dist-before   # e.g. origin/main
//   SOD_BUILD_TARGET=2029 VITE_PUBLIC_READING_RELEASE=public-reading-20261101 npx vite build --outDir /tmp/dist-after    # the branch
//   # 2. serve them (SPA fallback to 2029.html)
//   node tools/perf/serve-dist.cjs /tmp/dist-before 4181 &   node tools/perf/serve-dist.cjs /tmp/dist-after 4182 &
//   # 3. measure (alternating runs, cold cache each, phone = 390x844 with CPU x4, desktop = 1440x900)
//   node tools/perf/number-page-measure.cjs --before http://127.0.0.1:4181 --after http://127.0.0.1:4182 --route /number/878 --runs 5 --profiles 390,1440
//
// What it is: the real site code against the LIVE Supabase project, read-only (the in-page guard refuses every write that is not an
// allow-listed read RPC). The network is the machine's own, so absolute times vary; read the alternating medians, not single runs.
// CDP supplies wire (encoded) and decoded bytes per request. CORS preflights (OPTIONS) are counted by CDP, so "db_requests" is about
// twice the number of reads; "data_ready" is the moment the projection resolved (the first request issued after it), "full_load" the end
// of the last database response. It is not a RUM and it does not measure the document TTFB of the deployed site.
// Before/after measurement of the Number page: local production-profile builds (before = main, after = branch) served on
// localhost, LIVE Supabase data (read-only: every non-allowlisted write is refused inside the page), cold cache per run,
// alternating A/B. CDP gives wire (encoded) and decoded bytes per request. Not a RUM: the network is this sandbox's.
const fs = require('fs');
const { chromium } = require('playwright');
const { READ_RPCS } = require('../../tests/fixtures/public-readonly-egress.cjs');
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const BASES = { before: arg('before', 'http://127.0.0.1:4181'), after: arg('after', 'http://127.0.0.1:4182') };
const ROUTE = arg('route', '/number/878');
const RUNS = Number(arg('runs', 5));
const OUT = arg('out', 'perf-out');
const WAIT = Number(arg('wait', 10000));
const PROFILES = arg('profiles', '390,1440').split(',');
fs.mkdirSync(OUT, { recursive: true });
const P = {
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, cpu: 4, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  1440: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1, cpu: 1, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
};
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

async function one(browser, variant, profile) {
  const prof = P[profile];
  const ctx = await browser.newContext({ viewport: prof.viewport, isMobile: prof.isMobile, hasTouch: prof.hasTouch, deviceScaleFactor: prof.deviceScaleFactor, userAgent: prof.ua, locale: 'he-IL', serviceWorkers: 'block' });
  await ctx.addInitScript((reads) => {
    try { sessionStorage.setItem('sod_guest_signup_popup_dismissed', '1'); } catch {}
    try { navigator.sendBeacon = () => false; } catch {}
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => { try { const req = typeof Request !== 'undefined' && input instanceof Request ? input : null; const url = new URL(req ? req.url : String(input), location.href); const method = String((init && init.method) || (req && req.method) || 'GET').toUpperCase(); if (/\.supabase\.co$/.test(url.hostname) && !['GET', 'HEAD', 'OPTIONS'].includes(method)) { const m = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(url.pathname); if (!(m && reads.includes(m[1]) && method === 'POST')) return Promise.resolve(new Response('{"error":"probe_read_only"}', { status: 403 })); } } catch {} return realFetch(input, init); };
    window.__m = { cls: 0, lcp: null, marks: {} };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    const watch = [['root', '.sod29-root'], ['numberValue', '.sod29-number-value']];
    const check = () => { for (const [k, sel] of watch) if (!(k in window.__m.marks)) { try { if (document.querySelector(sel)) window.__m.marks[k] = Math.round(performance.now()); } catch {} } };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
  }, [...READ_RPCS, 'lang_links_list']);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  const reqs = new Map();
  const t0 = { v: null };
  cdp.on('Network.requestWillBeSent', (e) => { if (t0.v == null) t0.v = e.timestamp; reqs.set(e.requestId, { url: e.request.url, method: e.request.method, start: e.timestamp, decoded: 0, encoded: 0, end: null, status: null }); });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.status = e.response.status; });
  cdp.on('Network.dataReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.decoded += e.dataLength; });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.encoded = e.encodedDataLength; r.end = e.timestamp; } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
  let rendered = true;
  try {
    await page.goto(BASES[variant] + ROUTE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.sod29-root').first().waitFor({ timeout: 40000 });
  } catch (e) { rendered = false; errs.push('NAV ' + String(e.message).slice(0, 100)); }
  await page.waitForTimeout(WAIT);
  const info = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
    const el = document.querySelector('.sod29-number-value');
    const r = el ? el.getBoundingClientRect() : null;
    const topOf = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
    const core = document.querySelector('.sod29-number-core2029'); const cr = core ? core.getBoundingClientRect() : null;
    const visibleCore = cr ? Math.round(Math.max(0, Math.min(cr.bottom, innerHeight) - Math.max(cr.top, 0))) : null;
    const railTop = topOf('.sod29-number-v11-regular-rail'); const switcherTop = topOf('.sod29-number-v10-method-switcher');
    return { fcp: paints['first-contentful-paint'] || null, lcp: window.__m.lcp, cls: +window.__m.cls.toFixed(4), marks: window.__m.marks, dcl: Math.round(nav.domContentLoadedEventEnd || 0), numberTop: r ? Math.round(r.top + window.scrollY) : null, railTop, switcherTop, visibleCore, vh: innerHeight, ...(() => { const t = document.body.innerText.slice(0, 2500); const m = /נעול|ייפתח בהמשך/.exec(t); return { closed: !!m, closedContext: m ? t.slice(Math.max(0, m.index - 70), m.index + 70).replace(/\s+/g, ' ') : null }; })(), title: document.title.slice(0, 40) };
  }).catch((e) => ({ evalError: String(e.message).slice(0, 80) }));
  const all = [...reqs.values()].filter((r) => r.end != null);
  const sb = all.filter((r) => /\.supabase\.co$/.test(new URL(r.url).hostname));
  const own = all.filter((r) => new URL(r.url).origin === BASES[variant]);
  const js = own.filter((r) => /\.js(\?|$)/.test(new URL(r.url).pathname));
  const rel = (t) => Math.round((t - t0.v) * 1000);
  const rpcName = (u) => { const m = /\/rest\/v1\/(rpc\/)?([a-z_0-9]+)/.exec(new URL(u).pathname); return m ? (m[1] ? 'rpc:' : 'rest:') + m[2] : 'other'; };
  const verses = sb.find((r) => rpcName(r.url) === 'rpc:fn_verses_by_gematria');
  const lookups = sb.filter((r) => rpcName(r.url) === 'rpc:fn_number_lookup');
  const row = {
    variant, profile, route: ROUTE, rendered, errs: errs.slice(0, 3), ...info,
    db_requests: sb.length, db_decoded_kb: +(sb.reduce((a, r) => a + r.decoded, 0) / 1024).toFixed(1), db_wire_kb: +(sb.reduce((a, r) => a + r.encoded, 0) / 1024).toFixed(1),
    lookup_calls: lookups.length, lookup_decoded_kb: +(lookups.reduce((a, r) => a + r.decoded, 0) / 1024).toFixed(1),
    js_files: js.length, js_wire_kb: +(js.reduce((a, r) => a + r.encoded, 0) / 1024).toFixed(1),
    total_wire_kb: +(all.reduce((a, r) => a + r.encoded, 0) / 1024).toFixed(1), total_requests: all.length,
    first_db_start: sb.length ? Math.min(...sb.map((r) => rel(r.start))) : null,
    data_ready: verses ? rel(verses.start) : null,
    full_load: sb.length ? Math.max(...sb.map((r) => rel(r.end))) : null,
  };
  await ctx.close();
  return row;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'], proxy: PROXY ? { server: PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const rows = [];
  for (const profile of PROFILES) {
    for (let i = 0; i < RUNS; i++) {
      for (const variant of (i % 2 ? ['after', 'before'] : ['before', 'after'])) {
        const row = await one(browser, variant, profile);
        rows.push(row);
        process.stderr.write(`${profile} ${variant} run ${i + 1}: db=${row.db_requests} decoded=${row.db_decoded_kb}KB lcp=${row.lcp} data_ready=${row.data_ready} full=${row.full_load}${row.closed ? ' CLOSED-TEXT: ' + row.closedContext : ''}\n`);
      }
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/rows-${ROUTE.replace(/[^a-z0-9]+/gi, '_')}.json`, JSON.stringify(rows, null, 1));
  const metrics = ['db_requests', 'db_decoded_kb', 'db_wire_kb', 'lookup_calls', 'js_files', 'total_wire_kb', 'fcp', 'lcp', 'first_db_start', 'data_ready', 'full_load', 'cls', 'numberTop', 'railTop', 'switcherTop', 'visibleCore'];
  for (const profile of PROFILES) {
    console.log(`\n== ${ROUTE} · ${profile === '390' ? 'mobile 390x844 (CPU x4)' : 'desktop 1440x900'} · ${RUNS} runs each, medians ==`);
    console.log('metric'.padEnd(16) + 'before'.padStart(10) + 'after'.padStart(10) + 'delta'.padStart(10));
    for (const m of metrics) {
      const b = median(rows.filter((r) => r.profile === profile && r.variant === 'before').map((r) => r[m]));
      const a = median(rows.filter((r) => r.profile === profile && r.variant === 'after').map((r) => r[m]));
      console.log(m.padEnd(16) + String(b).padStart(10) + String(a).padStart(10) + String(b != null && a != null ? +(a - b).toFixed(1) : '').padStart(10));
    }
    const ok = rows.filter((r) => r.profile === profile).every((r) => r.rendered && !r.closed);
    console.log('all runs rendered, no closed notice:', ok);
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
