const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors'] });
  for (const how of ['leave-site', 'tab-hidden']) for (const stay of [1200, 1800]) {
    const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
    const log = [];
    await ctx.route('**/*', async r => { const req = r.request(), u = new URL(req.url());
      if (u.hostname === 'example.org') return r.fulfill({ status: 200, contentType: 'text/html', body: 'away' });
      if (/google|facebook|doubleclick/.test(u.hostname) && !/fonts/.test(u.hostname)) return r.fulfill({ status: 204, body: '' });
      if (/rpc\/(track_visit|ingest_event)/.test(u.pathname)) { log.push('rpc:' + u.pathname.split('/').pop()); return r.fulfill({ status: 204, body: '' }); }
      if (/\/assets\/visits-/.test(u.pathname)) log.push('chunk:visits');
      return r.continue(); });
    const p = await ctx.newPage();
    await p.addInitScript(() => { addEventListener('pagehide', () => { window.__ph = 1; }); });
    const t0 = Date.now(); await p.goto('https://sod1820.co.il/', { waitUntil: 'commit' }); await wait(stay - (Date.now() - t0));
    const st = await p.evaluate(() => ({ rs: document.readyState, lead: document.querySelector('[data-home-pinned-lead]')?.getAttribute('data-home-pinned-lead'), hi: [...document.querySelectorAll('img[fetchpriority="high"]')].map(i => i.complete) }));
    if (how === 'leave-site') { await p.goto('https://example.org/').catch(() => {}); await wait(4000); }
    else { await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await wait(4000); }
    console.log(how, stay, JSON.stringify(st), log.join(','));
    await ctx.close();
  }
  await b.close();
})();
