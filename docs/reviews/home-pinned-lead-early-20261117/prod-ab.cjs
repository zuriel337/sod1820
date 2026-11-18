// Production A/B after release #1381: the previous production build (dpl_7HPjAYYN, cff521e86) vs the new one (dpl_6BM8mXr7, 736dd285b),
// each through its own deployment address (same pipeline, same database). Profiles: phone = 390x844 @2x, Slow 4G (150 ms, 1.6 Mbps down,
// 750 kbps up) + 4x CPU; desktop = 1440x900 @1, no throttling. Fresh profile each run, arms alternating.
// Also counts: posts reads, every request for the pinned cover's file (any width or the original), console and page errors.
// usage: node prod-ab.cjs <phone|desktop> <rounds> <out.json> [live]
const { chromium } = require('playwright');
const fs = require('fs');
const S = '/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad';
const [profile, roundsArg, out, live] = process.argv.slice(2);
const ARMS = live ? { live: { host: 'https://sod1820.co.il/', cookie: null } } : {
  before: { host: 'https://sod1820-opjtgg2zm-sod1820-s-projects.vercel.app/', cookie: `${S}/jwt-old.txt` },
  after: { host: 'https://sod1820-d2d15zy5y-sod1820-s-projects.vercel.app/', cookie: `${S}/jwt-new.txt` },
};
const rounds = Number(roundsArg || 6);
const PHONE = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const pct = (a, p) => { const s = a.filter(v => v != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };

async function once(browser, arm) {
  const { host, cookie } = ARMS[arm];
  const context = await browser.newContext({ ...(profile === 'phone' ? PHONE : DESKTOP), locale: 'he-IL' });
  if (cookie) {
    const jwt = fs.readFileSync(cookie, 'utf8').trim();
    await context.addCookies([{ name: '_vercel_jwt', value: jwt, domain: new URL(host).hostname, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
  }
  const page = await context.newPage();
  const consoleErrors = []; const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  if (profile === 'phone') {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.addInitScript(() => {
    try { performance.setResourceTimingBufferSize(2000); } catch {}
    window.__lab = { lcp: null, lcpEl: null, lead: null };
    new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lab.lcp = e.startTime; window.__lab.lcpEl = (e.element && e.element.tagName) || null; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    const sel = '[data-home-pinned-lead]:not([data-home-pinned-lead="loading"])';
    const check = () => { if (window.__lab.lead == null && document.querySelector(sel)) window.__lab.lead = performance.now(); };
    new MutationObserver(check).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-home-pinned-lead'] });
  });
  await page.goto(host, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('[data-home-pinned-lead]:not([data-home-pinned-lead="loading"])', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const posts = res.filter(r => /\/rest\/v1\/posts\?/.test(r.name));
    const catalog = posts.filter(r => /excerpt%2Cauthor%2Ccategories%2Ctags/.test(r.name));
    const img = document.querySelector('[data-home-pinned-lead] img');
    const current = img ? (img.currentSrc || img.src) : '';
    const base = (current.match(/\/public\/([^?]+)/) || [])[1] || '';
    const coverReqs = base ? res.filter(r => r.name.includes(base)) : [];
    const first = list => list.length ? Math.round(Math.min(...list.map(r => r.startTime))) : null;
    const last = list => list.length ? Math.round(Math.max(...list.map(r => r.responseEnd))) : null;
    const preload = document.querySelector('link[rel="preload"][data-home-pinned-cover]');
    return { ttfb: Math.round(nav.responseStart), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
      lead: Math.round(window.__lab.lead || 0), lcp: Math.round(window.__lab.lcp || 0), lcpEl: window.__lab.lcpEl,
      catalogStart: first(catalog), catalogEnd: last(catalog), postsReads: posts.length, postsUrlsUnique: new Set(posts.map(r => r.name)).size,
      coverFile: base.split('/').slice(-2).join('/'), coverRequests: coverReqs.length, coverUrls: [...new Set(coverReqs.map(r => r.name.replace(/^.*\/storage\/v1\//, '').slice(0, 140)))],
      coverStart: first(coverReqs), coverEnd: last(coverReqs), imgComplete: !!(img && img.complete && img.naturalWidth > 0),
      preload: !!preload, preloadMatches: !!(preload && img && preload.getAttribute('imagesrcset') === img.getAttribute('srcset') && preload.getAttribute('imagesizes') === img.getAttribute('sizes')) };
  });
  await context.close();
  return { arm, profile, ...m, consoleErrors: consoleErrors.length, consoleSample: consoleErrors.slice(0, 2), pageErrors: pageErrors.length, pageErrorSample: pageErrors.slice(0, 2) };
}

(async () => {
  const browser = await chromium.launch();
  const rows = []; const arms = Object.keys(ARMS);
  for (let i = 0; i < rounds; i++) {
    const order = i % 2 ? [...arms].reverse() : arms;
    for (const arm of order) { try { const r = await once(browser, arm); rows.push(r); console.log(JSON.stringify(r)); } catch (e) { console.log(JSON.stringify({ arm, error: String(e).slice(0, 160) })); } }
  }
  await browser.close();
  const summary = {};
  for (const arm of arms) {
    const a = rows.filter(r => r.arm === arm && !r.error);
    summary[arm] = { n: a.length };
    for (const k of ['ttfb', 'fcp', 'lead', 'lcp', 'catalogStart', 'catalogEnd', 'coverStart', 'coverEnd', 'postsReads', 'postsUrlsUnique', 'coverRequests', 'consoleErrors', 'pageErrors']) summary[arm][k] = { p50: pct(a.map(r => r[k]), 0.5), p75: pct(a.map(r => r[k]), 0.75), max: Math.max(...a.map(r => r[k] ?? 0)) };
    summary[arm].lcpEl = [...new Set(a.map(r => r.lcpEl))]; summary[arm].preload = [...new Set(a.map(r => r.preload))]; summary[arm].preloadMatches = [...new Set(a.map(r => r.preloadMatches))]; summary[arm].imgComplete = [...new Set(a.map(r => r.imgComplete))];
    summary[arm].coverFiles = [...new Set(a.map(r => r.coverFile))];
  }
  console.log('SUMMARY ' + JSON.stringify(summary));
  fs.writeFileSync(out, JSON.stringify({ profile, arms: ARMS && Object.fromEntries(Object.entries(ARMS).map(([k, v]) => [k, v.host])), rows, summary }, null, 2));
})();
