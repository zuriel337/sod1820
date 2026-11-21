// Where does the 10 s go on a slow link? The live document, its own bootstrap, with phase timing written to the console.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors'] });
for (const [name, lat, mbps] of [['slow3g', 400, 0.4], ['3g', 300, 0.75]]) for (const path of ['/', '/number/26']) {
  const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
  const t0 = Date.now(), log = [];
  await ctx.route('**/*', async r => { const req = r.request(), u = new URL(req.url());
    if (/google|facebook|doubleclick|adtraffic/.test(u.hostname) && !/fonts/.test(u.hostname)) return r.fulfill({ status: 204, body: '' });
    if (/rpc\/(track_visit|ingest_event)/.test(u.pathname)) return r.fulfill({ status: 204, body: '' });
    if (u.pathname === '/sw.js') log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s sw.js requested`);
    if (req.resourceType() === 'document' && u.hostname === 'sod1820.co.il') {
      const res = await r.fetch(); let html = await res.text();
      // Log each phase change and the final error, without changing the logic.
      html = html.replace('{navigator,document,MessageChannel', '{onFailure:e=>console.log("BOOTFAIL "+e.message+" @"+Math.round(performance.now())),navigator,document,MessageChannel');
      const preloads = (html.match(/<link rel="(?:modulepreload|preload)"/g) || []).length;
      log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s document (${preloads} preload hints, ${Math.round(html.length / 1024)}KB)`);
      return r.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(html)) } });
    }
    return r.continue(); });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.text().startsWith('BOOTFAIL')) log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${m.text()}`); });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: lat, downloadThroughput: mbps * 1e6 / 8, uploadThroughput: mbps * 1e6 / 8 });
  let bytesBeforeFail = 0; cdp.on('Network.loadingFinished', e => { bytesBeforeFail += e.encodedDataLength; });
  await p.goto('https://sod1820.co.il' + path, { waitUntil: 'commit', timeout: 60000 });
  let res = 'pending';
  while (Date.now() - t0 < 30000) { await wait(500); const s = await p.evaluate(() => ({ err: document.body?.innerText.includes('העמוד לא נפתח'), app: !document.querySelector('#root .sod29-opening') && !!document.querySelector('#root > *'), ctl: !!navigator.serviceWorker?.controller })).catch(() => ({})); if (s.err || s.app) { res = s.err ? 'ERROR' : 'app'; log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${res}`); break; } }
  console.log(name, path, '| page bytes', Math.round(bytesBeforeFail / 1024) + 'KB |', log.join(' · '));
  await ctx.close();
}
await b.close();
