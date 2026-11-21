// Reproduce public-reading behaviour without a working service worker, against a given origin.
// Google/Meta/AdSense and first-party measurement writes are answered locally (204) and counted.
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
const ORIGIN = process.env.ORIGIN || 'https://sod1820.co.il';
const PAGES = { oldPost: '/' + encodeURIComponent('חדש-עדויות-של-עשרות-אנשים-בארץ-ששמעו-קו'), home: '/', number: '/number/26' };
const MODES = (process.env.MODES || 'normal,noSwApi,swBlocked,swSlow12s,handshakeBroken,slowNet').split(',');
const DEVICES = { mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  desktop: { viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' } };
(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY && !ORIGIN.startsWith('http://') ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--ignore-certificate-errors'] });
  const rows = [];
  for (const mode of MODES) for (const [dev, devOpt] of Object.entries(DEVICES)) for (const [pname, path] of Object.entries(process.env.PAGES ? Object.fromEntries(Object.entries(PAGES).filter(([k]) => process.env.PAGES.split(',').includes(k))) : PAGES)) {
    const ctx = await browser.newContext({ ...devOpt, ignoreHTTPSErrors: true, serviceWorkers: mode === 'swBlocked' ? 'block' : 'allow' });
    if (mode === 'noSwApi') await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'serviceWorker', { get: () => undefined, configurable: true }); try { delete Navigator.prototype.serviceWorker; } catch {} });
    const counts = { ga: 0, visit: 0, event: 0, docs: 0 };
    await ctx.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      if (/google-analytics|analytics\.google|facebook|doubleclick|googlesyndication|adtrafficquality/.test(u.hostname)) { if (/collect/.test(u.pathname)) counts.ga++; return route.fulfill({ status: 204, body: '' }); }
      if (/rpc\/track_visit/.test(u.pathname)) { counts.visit++; return route.fulfill({ status: 204, body: '' }); }
      if (/rpc\/ingest_event/.test(u.pathname)) { counts.event++; return route.fulfill({ status: 204, body: '' }); }
      if (req.resourceType() === 'document' && req.frame() === req.frame()?.page()?.mainFrame()) counts.docs++;
      if (u.pathname === '/sw.js' && mode === 'swSlow12s') { await wait(12000); return route.continue(); }
      if (u.pathname === '/sw.js' && mode === 'handshakeBroken') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));' });
      if (mode === 'slowNet' && u.origin === new URL(ORIGIN).origin) await wait(400);
      return route.continue();
    });
    const page = await ctx.newPage();
    if (mode === 'slowNet') { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 }); }
    const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 100)));
    const t0 = Date.now(); let gotoErr = '';
    await page.goto(ORIGIN + path, { waitUntil: 'commit', timeout: 90000 }).catch(e => gotoErr = e.message.slice(0, 80));
    const samples = [];
    for (const at of [3000, 8000, 14000, 26000]) {
      await wait(Math.max(0, at - (Date.now() - t0)));
      const s = await page.evaluate(() => ({ words: (document.body?.innerText || '').split(/\s+/).filter(Boolean).length,
        failed: (document.body?.innerText || '').includes('העמוד לא נפתח'), opening: !!document.querySelector('#root .sod29-opening'),
        article: !!document.getElementById('sod29-ssr-article'), app: !!document.querySelector('#root [class*="sod29-root"], #root main') })).catch(e => ({ err: e.message.slice(0, 50) }));
      samples.push(`${at / 1000}s:${s.err ? 'navigating' : `${s.words}w${s.failed ? '/ERR' : ''}${s.opening ? '/opening' : ''}${s.article ? '/article' : ''}${s.app ? '/app' : ''}`}`);
    }
    rows.push({ mode, dev, page: pname, timeline: samples.join(' '), docs: counts.docs, ga: counts.ga, visit: counts.visit, event: counts.event, errs: [gotoErr, ...errs].filter(Boolean).slice(0, 2).join(' | ') });
    console.error(JSON.stringify(rows.at(-1)));
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(rows));
})();
