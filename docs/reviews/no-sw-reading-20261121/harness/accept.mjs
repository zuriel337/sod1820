// Acceptance: the live document with this branch's bootstrap (publicReadingBootstrap from the working tree) swapped in.
// Every measurement write and third-party request is answered locally.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { publicReadingBootstrap } = await import(process.env.TRANSPORT);
const wait = ms => new Promise(r => setTimeout(r, ms));
const ORIGIN = 'https://sod1820.co.il';
const PAGES = { oldPost: '/' + encodeURIComponent('חדש-עדויות-של-עשרות-אנשים-בארץ-ששמעו-קו'), home: '/' };
const MODES = (process.env.MODES || 'normal,noSwApi,swBlocked,swSlow12s,handshakeBroken').split(',');
const DEV = { mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  desktop: { viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' } };
const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors'] });
const rows = [];
for (const mode of MODES) for (const [dev, opt] of Object.entries(DEV)) for (const [pname, path] of Object.entries(PAGES)) {
  const ctx = await browser.newContext({ ...opt, ignoreHTTPSErrors: true, serviceWorkers: mode === 'swBlocked' ? 'block' : 'allow' });
  if (mode === 'noSwApi') await ctx.addInitScript(() => { try { delete Navigator.prototype.serviceWorker; } catch {} });
  const c = { ga: 0, visit: 0, event: 0, docs: 0, swapped: 0 };
  await ctx.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (/google-analytics|analytics\.google|facebook|doubleclick|googlesyndication|adtrafficquality/.test(u.hostname)) { if (/collect/.test(u.pathname)) c.ga++; return route.fulfill({ status: 204, body: '' }); }
    if (/rpc\/track_visit/.test(u.pathname)) { c.visit++; return route.fulfill({ status: 204, body: '' }); }
    if (/rpc\/ingest_event/.test(u.pathname)) { c.event++; return route.fulfill({ status: 204, body: '' }); }
    if (u.pathname === '/sw.js' && mode === 'swSlow12s') { await wait(12000); return route.continue(); }
    if (u.pathname === '/sw.js' && mode === 'handshakeBroken') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));' });
    if (req.resourceType() === 'document' && u.hostname === 'sod1820.co.il') {
      c.docs++;
      const res = await route.fetch(); let html = await res.text();
      const m = /<script type="module">\(async function startPublicReading[\s\S]*?<\/script>/.exec(html);
      const cfg = /\{"entry":"(\/assets\/[^"]+\.js)","sourceSha":"([a-f0-9]{40})"/.exec(m?.[0] || '');
      if (m && cfg) { html = html.replace(m[0], publicReadingBootstrap(cfg[1], cfg[2])); c.swapped++; }
      return route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(html)) } });
    }
    return route.continue();
  });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  let cls = 0;
  await page.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {} });
  const t0 = Date.now();
  await page.goto(ORIGIN + path, { waitUntil: 'commit', timeout: 60000 });
  const tl = [];
  for (const at of [3000, 14000, 28000]) {
    await wait(Math.max(0, at - (Date.now() - t0)));
    const s = await page.evaluate(() => ({ words: (document.body?.innerText || '').split(/\s+/).filter(Boolean).length,
      err: (document.body?.innerText || '').includes('העמוד לא נפתח'), bar: !!document.querySelector('[data-sod-reading-only]'),
      barVisible: (() => { const b = document.querySelector('[data-sod-reading-only]'); if (!b) return false; const r = b.getBoundingClientRect(); return r.height > 0 && r.bottom <= innerHeight + 1; })(),
      app: !document.querySelector('#root .sod29-opening') && !!document.querySelector('#root > *'), cls: window.__cls })).catch(() => ({ nav: true }));
    tl.push(s.nav ? `${at / 1000}s:navigating` : `${at / 1000}s:${s.words}w${s.err ? '/ERR' : ''}${s.bar ? (s.barVisible ? '/bar' : '/bar-hidden') : ''}${s.app ? '/app' : ''}`);
    cls = s.cls ?? cls;
  }
  if (process.env.SHOTS && dev === 'mobile' && pname === 'oldPost' && mode !== 'normal') await page.screenshot({ path: `accept-${mode}.png` });
  rows.push({ mode, dev, page: pname, timeline: tl.join(' '), docs: c.docs, swapped: c.swapped, ga: c.ga, visit: c.visit, event: c.event, cls: Number(cls.toFixed(3)), errs: errs.slice(0, 2).join(' | ') });
  console.error(JSON.stringify(rows.at(-1))); await ctx.close();
}
await browser.close();
