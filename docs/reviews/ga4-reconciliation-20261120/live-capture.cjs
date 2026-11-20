// Usage (from any directory, with the preinstalled Playwright): node live-capture.cjs
// Reads the live public site only; Google, Meta and first-party measurement writes are answered locally.
// Live-site GA page_view count. Every Google collect and every first-party measurement write
// is answered locally (204) and never reaches Google or Supabase. Read-only toward production data.
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--ignore-certificate-errors'] });
  const out = [];
  for (const sw of ['block', 'allow']) {
  const ctx = await browser.newContext({ serviceWorkers: sw, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
  let stage = 'load-home';
  const hits = [], fp = [], blocked = [];
  await ctx.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (/(^|\.)google-analytics\.com$|analytics\.google\.com$/.test(u.hostname) || /\/g\/collect$/.test(u.pathname)) {
      for (const line of ((route.request().postData() || '').split('\n'))) {
        const f = Object.fromEntries([...u.searchParams, ...new URLSearchParams(line)]);
        if (f.en) hits.push({ stage, en: f.en, dl: (f.dl||'').slice(0,90), dt: (f.dt||'').slice(0,40) });
      }
      return route.fulfill({ status: 204, body: '' });
    }
    if (u.hostname.endsWith('supabase.co') && /rpc\/(track_visit|ingest_event)|functions\/v1\/(ingest|events|track)/.test(u.pathname)) { fp.push({ stage, p: u.pathname.split('/').pop() }); return route.fulfill({ status: 204, body: '' }); }
    if (/facebook|doubleclick|googlesyndication|adtrafficquality/.test(u.hostname)) { blocked.push(u.hostname); return route.fulfill({ status: 204, body: '' }); }
    return route.continue();
  });
  const page = await ctx.newPage();
  const errs = []; page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,120)); });
  await page.goto('https://sod1820.co.il/', { waitUntil: 'load', timeout: 60000 }); await wait(15000);
  const links = await page.$$eval('a[href^="/"]', as => [...new Set(as.map(a => a.getAttribute('href')))].filter(h => /^\/(post|number|gematria|community)/.test(h)).slice(0, 6));
  for (const [i, href] of links.slice(0, 2).entries()) {
    stage = 'nav' + (i+1) + ' ' + href.slice(0, 40);
    await page.click(`a[href="${href}"]`).catch(async () => { await page.evaluate(h => { history.pushState({}, '', h); dispatchEvent(new PopStateEvent('popstate')); }, href); });
    await wait(12000);
  }
  stage = 'query-only replaceState';
  await page.evaluate(() => { history.replaceState(history.state, '', location.pathname + '?audit=1'); }); await wait(6000);
  stage = 'back';
  await page.goBack(); await wait(10000);
  stage = 'reload';
  await page.reload({ waitUntil: 'load' }); await wait(15000);
  stage = 'hebrew-address';
  await page.goto('https://sod1820.co.il/' + encodeURIComponent('חדש-עדויות-של-עשרות-אנשים-בארץ-ששמעו-קו'), { waitUntil: 'load' }).catch(e => errs.push('heb ' + e.message.slice(0,80))); await wait(15000);
  const swReg = await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).map(r => r.active?.scriptURL) : 'none')).catch(() => 'err');
  out.push({ sw, links, hits, fp, swReg, errs: errs.slice(0, 8) });
  await ctx.close();
  }
  console.log(JSON.stringify(out.map(o=>({sw:o.sw,hits:o.hits.map(h=>h.stage+" | "+h.en+" | "+h.dl.slice(22,60)),tv:o.fp.filter(f=>f.p==="track_visit").map(f=>f.stage),swReg:o.swReg,errs:o.errs})),null,1));
  await browser.close();
})();
