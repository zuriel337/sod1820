const { chromium } = require('playwright');
(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 SOD1820-URL-Continuity-Audit/1.0' });
  const blocked = [];
  await ctx.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|\/rest\/v1\/rpc\/track_|connect\.facebook\.net|facebook\.com\/tr/i, r => { blocked.push(r.request().url().slice(0, 90)); r.abort(); });
  const page = await ctx.newPage();
  for (const u of ['https://sod1820.co.il/', 'https://sod1820.co.il/number/358', 'https://sod1820.co.il/תפילה-לרפואה-של-רבי-שלמה-יהודה-הינוקא']) {
    const t0 = Date.now();
    const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const info = await page.evaluate(() => ({ title: document.title, h1: (document.querySelector('h1') || {}).innerText, canonical: (document.querySelector('link[rel=canonical]') || {}).href, robots: (document.querySelector('meta[name=robots]') || {}).content, textLen: document.body.innerText.length, links: document.querySelectorAll('a[href^="/"]').length }));
    console.log(JSON.stringify({ u: decodeURIComponent(u).slice(0, 60), status: resp.status(), final: decodeURIComponent(page.url()).slice(0, 70), ms: Date.now() - t0, ...info }));
  }
  console.log('blocked analytics requests:', blocked.length, blocked.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
