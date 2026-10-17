// READ-ONLY, isolated, loopback-only code-cost probe for a built 2029 bundle.
// Data input: NONE. Every Supabase REST call is answered instantly with an empty array (site_flags: lock_world/lock_number OFF).
// => This measures "static asset transfer + script parse/execute + route-graph waterfall" with data cost = 0.
// It is NOT a user-timing, LCP or READY claim.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/');
const { chromium } = require('playwright-core');

const [, , distDir, outFile, routesArg = '/', runsArg = '5', cpuArg = '4', mbpsArg = '1.6', rttArg = '150'] = process.argv;
const ROUTES = routesArg.split(',');
const RUNS = Number(runsArg);
const CPU = Number(cpuArg);
const MBPS = Number(mbpsArg);
const RTT = Number(rttArg);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain' };
const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel);
  let file = path.join(distDir, rel);
  let ext = path.extname(file);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { file = path.join(distDir, '2029.html'); ext = '.html'; }
  const raw = fs.readFileSync(file);
  const compressible = ['.html', '.js', '.css', '.json', '.svg', '.txt'].includes(ext);
  const body = compressible ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) : raw;
  const v = { body, ext, compressed: compressible, rawLen: raw.length };
  cache.set(rel, v);
  return v;
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const v = load(rel);
  const headers = { 'Content-Type': MIME[v.ext] || 'application/octet-stream', 'Content-Length': v.body.length, 'Cache-Control': 'no-store' };
  if (v.compressed) headers['Content-Encoding'] = 'br';
  res.writeHead(200, headers);
  res.end(v.body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
// Pre-compress every file once so that the first measured request never pays for server-side brotli.
(function warm(dir, rel = '') { for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) { const r = path.join(rel, e.name); if (e.isDirectory()) { if (e.name !== '.vite') warm(dir, r); } else load(r.split(path.sep).join('/')); } })(distDir);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', '--disable-background-networking', '--no-first-run'],
});

{ // one unmeasured warm-up load (browser process / disk cache), not throttled
  const wctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const wp = await wctx.newPage();
  await wp.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  try { await wp.goto(base + '/', { waitUntil: 'load', timeout: 30000 }); } catch {}
  await wctx.close();
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const results = [];
let stubbed = 0, aborted = 0;

for (const route of ROUTES) {
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await page.route('**/*', async (r) => {
      const url = new URL(r.request().url());
      if (url.hostname === '127.0.0.1') return r.continue();
      if (/\.supabase\.co$/.test(url.hostname)) {
        stubbed++;
        const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
        if (url.pathname.endsWith('/site_flags')) {
          const delay = Number(process.env.FLAGS_DELAY_MS || 0);
          if (delay > 0) await new Promise((res) => setTimeout(res, delay));
          return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify([{ key: 'lock_world', enabled: false, mode: 'all', message: '' }, { key: 'lock_number', enabled: false, mode: 'all', message: '' }]) });
        }
        return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json', 'content-range': '0-0/0' }, body: '[]' });
      }
      aborted++;
      return r.abort('blockedbyclient');
    });
    await page.addInitScript(() => {
      window.__m = { lcp: 0, longtasks: [], sel: {} };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true });
      const t0 = performance.now();
      const mark = (name, sel) => { const chk = () => { if (!window.__m.sel[name] && document.querySelector(sel)) window.__m.sel[name] = performance.now(); }; new MutationObserver(chk).observe(document, { childList: true, subtree: true }); chk(); };
      document.addEventListener('DOMContentLoaded', () => { mark('home_shell', '.h29'); mark('any_h1', 'h1'); mark('main', 'main'); });
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: RTT, downloadThroughput: (MBPS * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await browser.startTracing(page, { categories: ['devtools.timeline', 'v8', 'disabled-by-default-devtools.timeline', 'blink.user_timing'] });
    const t0 = Date.now();
    try { await page.goto(base + route, { waitUntil: 'load', timeout: 60000 }); } catch (e) { /* recorded below */ }
    await page.waitForTimeout(6000);
    const traceBuf = await browser.stopTracing();
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource').map((e) => ({ n: e.name.replace(/^https?:\/\/[^/]+/, ''), t: e.initiatorType, s: Math.round(e.startTime), re: Math.round(e.responseEnd), enc: e.encodedBodySize, tr: e.transferSize }));
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
      return { nav: { rs: Math.round(nav.responseStart), re: Math.round(nav.responseEnd), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) }, fcp: Math.round(fcp), lcp: Math.round(window.__m.lcp), longtasks: window.__m.longtasks, sel: Object.fromEntries(Object.entries(window.__m.sel).map(([k, v]) => [k, Math.round(v)])), res };
    });
    // Scripting time per script URL from the trace (main-thread compile + run), in throttled wall-clock ms.
    const trace = JSON.parse(traceBuf.toString());
    const events = trace.traceEvents || trace;
    const per = {};
    for (const e of events) {
      if (e.ph !== 'X' || !e.dur) continue;
      const a = e.args?.data || {};
      let url = null; let kind = null;
      if (e.name === 'v8.compile' || e.name === 'V8.CompileCode' ) { url = e.args?.fileName || a.url; kind = 'compile'; }
      else if (e.name === 'EvaluateScript') { url = a.url; kind = 'eval'; }
      else if (e.name === 'v8.evaluateModule' || e.name === 'v8.instantiateModule') { url = a.url || e.args?.fileName; kind = 'module'; }
      else if (e.name === 'FunctionCall') { url = a.url; kind = 'call'; }
      if (!url || !/127\.0\.0\.1/.test(url)) continue;
      const k = url.replace(/^https?:\/\/[^/]+/, '');
      per[k] = per[k] || { compile: 0, eval: 0, module: 0, call: 0 };
      per[k][kind] += e.dur / 1000;
    }
    const names = {};
    for (const e of events) names[e.name] = (names[e.name] || 0) + 1;
    const total = {};
    for (const v of Object.values(per)) for (const [k, x] of Object.entries(v)) total[k] = (total[k] || 0) + x;
    results.push({ route, run: i, wallMs: Date.now() - t0, ...m, scripting: per, scriptingTotal: Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.round(v)])), traceEventNames: i === 0 ? names : undefined });
    await ctx.close();
  }
}
await browser.close();
server.close();
fs.writeFileSync(outFile, JSON.stringify({ meta: { distDir, CPU, MBPS, RTT, stubbed, aborted, chromium: '141.0.7390.37' }, results }, null, 1));
for (const route of ROUTES) {
  const rs = results.filter((r) => r.route === route);
  const jsRes = (r) => r.res.filter((x) => /\.js$/.test(x.n));
  console.log(`\n== ${route}  runs=${rs.length}`);
  console.log(' htmlResponseEnd', median(rs.map((r) => r.nav.re)), ' FCP', median(rs.map((r) => r.fcp)), ' LCP(no data)', median(rs.map((r) => r.lcp)), ' load', median(rs.map((r) => r.nav.load)));
  console.log(' home_shell(.h29)', median(rs.filter((r) => r.sel.home_shell).map((r) => r.sel.home_shell)), 'present in', rs.filter((r) => r.sel.home_shell).length, 'runs');
  console.log(' js files', median(rs.map((r) => jsRes(r).length)), ' last js responseEnd', median(rs.map((r) => Math.max(...jsRes(r).map((x) => x.re)))), ' requests', median(rs.map((r) => r.res.length)), ' encodedBytes', median(rs.map((r) => r.res.reduce((a, x) => a + x.enc, 0))));
  console.log(' longtasks n', median(rs.map((r) => r.longtasks.length)), ' sum ms', median(rs.map((r) => r.longtasks.reduce((a, x) => a + x[1], 0))));
  console.log(' scripting total (throttled ms)', JSON.stringify(rs[0].scriptingTotal));
}
