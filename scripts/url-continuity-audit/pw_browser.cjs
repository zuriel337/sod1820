// Browser pass: loads each sample URL in real Chromium (analytics blocked), records the hydrated DOM state.
const { chromium } = require('playwright');
const fs = require('fs');
const [,, inFile, outFile, concArg] = process.argv;
const SITE = 'https://sod1820.co.il';
const sample = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const CONC = parseInt(concArg || '3', 10);
(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, locale: 'he-IL',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 SOD1820-URL-Continuity-Audit/1.0' });
  if (process.env.LIGHT === '1') await ctx.route('**/*', r => ['image', 'font', 'media'].includes(r.request().resourceType()) ? r.abort() : r.fallback());
  await ctx.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|\/rest\/v1\/rpc\/track_|\/rest\/v1\/rpc\/log_|connect\.facebook\.net|facebook\.com\/tr|clarity\.ms/i, r => r.abort());
  const out = fs.createWriteStream(outFile, { flags: 'w' });
  let idx = 0, done = 0;
  async function worker() {
    const page = await ctx.newPage();
    while (true) {
      const i = idx++; if (i >= sample.length) break;
      const s = sample[i];
      const rec = { group: s.group, path: s.path, key: s.key, expect_title: s.expect_title || null };
      const t0 = Date.now();
      const bad = [], cons = [];
      const onResp = r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(SITE, '').slice(0, 120)); };
      const onCons = m => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); };
      page.on('response', onResp); page.on('console', onCons);
      try {
        const resp = await page.goto(SITE + s.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
        // wait for real content (SPA hydration + data), then let hydrated SEO tags settle
        await page.waitForFunction(() => (document.body.innerText || '').length > 200 || !!document.querySelector('h1'), null, { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(800);
        const chain = [];
        let rq = resp.request();
        while (rq) { chain.unshift({ url: rq.url(), method: rq.method() }); rq = rq.redirectedFrom(); }
        rec.httpStatus = resp.status();
        rec.redirects = chain.length - 1;
        rec.docUrl = resp.url();
        rec.finalUrl = page.url();
        const info = await page.evaluate(() => {
          const q = s => document.querySelector(s);
          const h1 = q('h1');
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/') && !h.startsWith('//'));
          return {
            title: document.title,
            h1: h1 ? h1.innerText.trim().slice(0, 200) : null,
            canonicalDom: q('link[rel=canonical]') ? q('link[rel=canonical]').href : null,
            nCanonicalDom: document.querySelectorAll('link[rel=canonical]').length,
            robotsDom: q('meta[name=robots]') ? q('meta[name=robots]').content : null,
            ogUrl: q('meta[property="og:url"]') ? q('meta[property="og:url"]').content : null,
            textLen: (document.body.innerText || '').length,
            textHead: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
            notFoundMarker: /404 · SOD1820/.test(document.body.innerText || '') || (h1 && /העמוד לא נמצא/.test(h1.innerText)),
            links: Array.from(new Set(links)).slice(0, 400),
          };
        });
        Object.assign(rec, info);
        rec.nLinks = rec.links.length;
        if (!(s.keepLinks)) rec.links = rec.links.slice(0, 60);
      } catch (e) { rec.error = String(e.message || e).slice(0, 200); }
      page.off('response', onResp); page.off('console', onCons);
      rec.badResponses = bad.slice(0, 10); rec.consoleErrors = cons.slice(0, 5);
      rec.ms = Date.now() - t0;
      out.write(JSON.stringify(rec) + '\n');
      done++; if (done % 20 === 0) console.error('browser', done + '/' + sample.length);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  out.end(); await browser.close();
  console.error('browser done', done);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
