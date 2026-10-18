// CPU profile of the Home cold opening (mobile throttle). Read-only: writes blocked, no scrolling.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools') + '/node_modules/'); const { chromium } = require('playwright');
const dist = path.resolve(process.argv[2]); const runs = Number(process.argv[3] || 3); const cpuRate = Number(process.argv[4] || 4);
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const cache = new Map();
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(dist, p);
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, '2029.html');
  const ext = path.extname(f); let e = cache.get(f); if (!e) { e = { raw: fs.readFileSync(f) }; cache.set(f, e); }
  const h = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
  let body = e.raw; if (['.js', '.css', '.html', '.json', '.svg'].includes(ext) && (req.headers['accept-encoding'] || '').includes('br')) { e.br ??= zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); body = e.br; h['content-encoding'] = 'br'; }
  h['content-length'] = body.length; res.writeHead(200, h); res.end(body);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const origin = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ headless: true });
const agg = { byUrl: new Map(), byFn: new Map(), total: 0, special: new Map() };
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'he-IL' });
  await ctx.route('**/*', (route) => { const r = route.request(); return ['GET', 'HEAD', 'OPTIONS'].includes(r.method()) ? route.continue() : route.abort('blockedbyclient'); });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  await page.goto(origin + '/', { waitUntil: 'commit' });
  await new Promise((r) => setTimeout(r, 8000));
  const { profile } = await cdp.send('Profiler.stop');
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; let t = 0;
  for (let k = 0; k < profile.samples.length; k++) {
    const n = nodes.get(profile.samples[k]); const d = (dt[k] || 0) / 1000; agg.total += d;
    const u = n.callFrame.url ? n.callFrame.url.replace(origin, '') : '';
    const key = u || `(${n.callFrame.functionName || 'native'})`;
    agg.byUrl.set(key, (agg.byUrl.get(key) || 0) + d);
    const fk = `${n.callFrame.functionName || '(anon)'} @ ${u.split('/').pop() || 'native'}:${n.callFrame.lineNumber}`;
    agg.byFn.set(fk, (agg.byFn.get(fk) || 0) + d);
  }
  await ctx.close();
}
await browser.close(); srv.close();
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(`runs=${runs} cpu=${cpuRate}x total sampled ${(agg.total / runs).toFixed(0)} ms/run`);
console.log('--- self time by script (ms/run)');
for (const [k, v] of top(agg.byUrl, 18)) console.log((v / runs).toFixed(0).padStart(6), k);
console.log('--- top functions (ms/run)');
for (const [k, v] of top(agg.byFn, 18)) console.log((v / runs).toFixed(0).padStart(6), k);
