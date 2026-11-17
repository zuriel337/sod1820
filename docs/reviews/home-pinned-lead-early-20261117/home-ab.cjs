// A/B on two protected Previews of the Home (control = main, treatment = main + the early start). Phone profile: 390x844 @2x, Slow 4G
// (150 ms RTT, 1.6 Mbps down, 750 kbps up) + 4x CPU, a fresh profile each run, arms alternating. Records: first byte, FCP, the pinned card
// (not "loading"), LCP and its element, when the catalog reads start/end, when the cover request starts/ends.
// usage: node home-ab.cjs <rounds> <out.json>   (hosts and cookie files below)
const { chromium } = require('playwright');
const fs = require('fs');
const S = process.env.LAB_DIR || '.'; // the Vercel share cookies of the two protected Previews (not committed)
const ARMS = {
  control: { host: 'https://sod1820-b2kxk03jx-sod1820-s-projects.vercel.app/', cookie: `${S}/jwt-ctl.txt` },
  treatment: { host: 'https://sod1820-j2kwf20uu-sod1820-s-projects.vercel.app/', cookie: `${S}/jwt-trt.txt` },
};
const [roundsArg, out] = process.argv.slice(2);
const rounds = Number(roundsArg || 6);
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const pct = (a, p) => { const s = a.filter(v => v != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };

async function once(browser, arm) {
  const { host, cookie } = ARMS[arm];
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const jwt = fs.readFileSync(cookie, 'utf8').trim().replace(/^_vercel_jwt=/, '');
  await context.addCookies([{ name: '_vercel_jwt', value: jwt, domain: new URL(host).hostname, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__lab = { lcp: null, lcpEl: null, lead: null };
    new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lab.lcp = e.startTime; window.__lab.lcpEl = (e.element && e.element.tagName) || null; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    const sel = '[data-home-pinned-lead]:not([data-home-pinned-lead="loading"])';
    const check = () => { if (window.__lab.lead == null && document.querySelector(sel)) window.__lab.lead = performance.now(); };
    new MutationObserver(check).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-home-pinned-lead'] });
  });
  await page.goto(host, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('[data-home-pinned-lead]:not([data-home-pinned-lead="loading"])', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const posts = res.filter(r => /\/rest\/v1\/posts\?/.test(r.name));
    const catalog = posts.filter(r => /excerpt%2Cauthor%2Ccategories%2Ctags/.test(r.name));
    const cover = res.filter(r => /\/storage\/v1\/render\/image\/public\/.*width=(480|768)&quality=80/.test(r.name));
    const first = list => list.length ? Math.round(Math.min(...list.map(r => r.startTime))) : null;
    const last = list => list.length ? Math.round(Math.max(...list.map(r => r.responseEnd))) : null;
    return { ttfb: Math.round(nav.responseStart), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
      lead: Math.round(window.__lab.lead || 0), lcp: Math.round(window.__lab.lcp || 0), lcpEl: window.__lab.lcpEl,
      catalogStart: first(catalog), catalogEnd: last(catalog), catalogReads: catalog.length, postsReads: posts.length,
      coverStart: first(cover), coverEnd: last(cover), coverRequests: cover.length,
      preload: !!document.querySelector('link[rel="preload"][data-home-pinned-cover]') };
  });
  await context.close();
  return { arm, ...m };
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (let i = 0; i < rounds; i++) {
    const order = i % 2 ? ['treatment', 'control'] : ['control', 'treatment'];
    for (const arm of order) { try { const r = await once(browser, arm); rows.push(r); console.log(JSON.stringify(r)); } catch (e) { console.log(JSON.stringify({ arm, error: String(e).slice(0, 160) })); } }
  }
  await browser.close();
  const summary = {};
  for (const arm of Object.keys(ARMS)) {
    const a = rows.filter(r => r.arm === arm && !r.error);
    summary[arm] = { n: a.length };
    for (const k of ['ttfb', 'fcp', 'lead', 'lcp', 'catalogStart', 'catalogEnd', 'coverStart', 'coverEnd', 'postsReads', 'coverRequests']) summary[arm][k] = { p50: pct(a.map(r => r[k]), 0.5), p75: pct(a.map(r => r[k]), 0.75) };
    summary[arm].lcpEl = [...new Set(a.map(r => r.lcpEl))];
    summary[arm].preload = [...new Set(a.map(r => r.preload))];
  }
  console.log('SUMMARY ' + JSON.stringify(summary));
  fs.writeFileSync(out, JSON.stringify({ profile: 'phone 390x844@2x, Slow 4G 150ms/1.6Mbps/750kbps + 4x CPU, fresh profile, alternating', rows, summary }, null, 2));
})();
