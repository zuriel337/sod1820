// Short view: open a page, leave the site after N ms (navigation to another origin = pagehide). Count measurement requests issued and finished.
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
const ORIGIN = process.env.ORIGIN || 'https://sod1820.co.il';
(async () => {
  const b = await chromium.launch({ proxy: ORIGIN.startsWith('https') ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--ignore-certificate-errors'] });
  const out = [];
  for (const warm of [false, true]) for (const path of ['/' + encodeURIComponent('חדש-עדויות-של-עשרות-אנשים-בארץ-ששמעו-קו'), '/']) for (const stay of [1500, 3000, 6000]) {
    const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
    const seen = { visit: 0, pageView: 0, ga: 0 };
    await ctx.route('**/*', async r => { const req = r.request(), u = new URL(req.url());
      if (u.hostname === 'example.org') return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>away</p>' });
      if (/google-analytics|analytics\.google/.test(u.hostname)) { if ((req.postData() || '').includes('en=page_view') || u.search.includes('en=page_view')) seen.ga++; return r.fulfill({ status: 204, body: '' }); }
      if (/facebook|doubleclick|googlesyndication|adtrafficquality/.test(u.hostname)) return r.fulfill({ status: 204, body: '' });
      if (/rpc\/track_visit/.test(u.pathname)) { seen.visit++; return r.fulfill({ status: 204, body: '' }); }
      if (/rpc\/ingest_event/.test(u.pathname)) { if (/"p_event_type":"view"/.test(req.postData() || '') && /"p_surface":"page"/.test(req.postData() || '')) seen.pageView++; return r.fulfill({ status: 204, body: '' }); }
      return r.continue(); });
    const p = await ctx.newPage();
    if (warm) { await p.goto(ORIGIN + '/privacy'); await wait(12000); for (const k of Object.keys(seen)) seen[k] = 0; }
    const t0 = Date.now(); await p.goto(ORIGIN + path, { waitUntil: 'commit' });
    await wait(Math.max(0, stay - (Date.now() - t0)));
    const state = await p.evaluate(() => ({ ready: document.readyState, app: !!document.querySelector('#root [class*="sod29-root"], #root main'), opening: !!document.querySelector('#root .sod29-opening') })).catch(() => ({}));
    await p.goto('https://example.org/').catch(() => {}); await wait(4000);
    out.push({ warm, path: path.length > 10 ? 'oldPost' : 'home', stay, atLeave: `${state.ready}${state.app ? '/app' : ''}${state.opening ? '/opening' : ''}`, ...seen });
    console.error(JSON.stringify(out.at(-1))); await ctx.close();
  }
  await b.close();
})();
