// D1 evidence: when does the Home route graph arrive, with and without the document-time hint?
// Two prebuilt dist directories (A = base, B = candidate) are served from loopback; every other host is aborted.
// Measures request/transfer facts of the JS+CSS graph and the moment the Home route renders (".h29" present).
// It does NOT measure content readiness, images or LCP: no data is served, so it is a route-code timeline only.
// usage: node measure-route-graph.mjs --A dist-A --B dist-B --pairs 10 --out result.json [--width 390 --height 844 --cpu 4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const { serve } = await import(path.join(repo, 'scripts/perf-execution-2029/serve.mjs'));
const require = createRequire('/opt/node-tools/');
const { chromium } = require('playwright-core');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const pairs = Number(args.pairs || 10), width = Number(args.width || 390), height = Number(args.height || 844), cpu = Number(args.cpu || 4);
const mobile = width < 700;
const dists = { A: path.resolve(args.A), B: path.resolve(args.B) };
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const servers = {};
for (const arm of ['A', 'B']) servers[arm] = await serve(dists[arm]);
const executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--disable-background-networking', '--disable-component-update', '--disable-features=AutofillServerCommunication,OptimizationHints,Translate'] });

async function one(arm) {
  const origin = `http://127.0.0.1:${servers[arm].port}`;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  await context.route((url) => !['127.0.0.1', 'localhost'].includes(url.hostname), (route) => route.abort('blockedbyclient'));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const req = new Map();
  let t0 = null;
  cdp.on('Network.requestWillBeSent', (e) => { if (t0 === null) t0 = e.timestamp; if (!req.has(e.requestId)) req.set(e.requestId, { url: e.request.url, start: (e.timestamp - t0) * 1000, initiator: e.initiator.type, priority: e.request.initialPriority }); });
  cdp.on('Network.responseReceived', (e) => { const r = req.get(e.requestId); if (r) { r.responseAt = (e.timestamp - t0) * 1000; r.fromCache = e.response.fromDiskCache || e.response.fromPrefetchCache || false; r.type = e.type; } });
  cdp.on('Network.loadingFinished', (e) => { const r = req.get(e.requestId); if (r) { r.done = (e.timestamp - t0) * 1000; r.bytes = e.encodedDataLength; } });
  await page.addInitScript(() => {
    window.__homeAt = null;
    const check = () => { if (!window.__homeAt && document.querySelector('.h29')) window.__homeAt = performance.now(); };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
  });
  await page.goto(`${origin}/`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__homeAt !== null, null, { timeout: 60000, polling: 50 });
  await page.waitForTimeout(1500);
  const homeAt = await page.evaluate(() => window.__homeAt);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { responseStart: n.responseStart, domContentLoaded: n.domContentLoadedEventEnd }; });
  const html = fs.readFileSync(path.join(dists[arm], '2029.html'), 'utf8');
  const hint = html.match(/\}\)\(\{after:\[.*?\],js:(\[.*?\]),css:(\[.*?\])\}\)<\/script>/s);
  const routeFiles = new Set(hint ? [...JSON.parse(hint[1]), ...JSON.parse(hint[2])] : []);
  await context.close();
  const rows = [...req.values()].filter((r) => r.url.startsWith(origin));
  const rel = (r) => new URL(r.url).pathname;
  return { arm, rows, rel, homeAt, nav, routeFiles };
}

function summarize(run, routeSet) {
  const { rows, rel } = run;
  const assets = rows.filter((r) => /\.(js|css)$/.test(rel(r)));
  const entry = assets.find((r) => /\/assets\/2029-[^/]+\.js$/.test(rel(r)));
  const route = assets.filter((r) => routeSet.has(rel(r)));
  const seen = new Map();
  for (const r of assets) seen.set(rel(r), (seen.get(rel(r)) || 0) + 1);
  const dup = [...seen.values()].filter((n) => n > 1).length;
  return {
    entryDone: entry?.done ?? null,
    routeFirstRequest: route.length ? Math.min(...route.map((r) => r.start)) : null,
    routeAllDone: route.length ? Math.max(...route.map((r) => r.done ?? Infinity)) : null,
    routeFiles: route.length,
    routeBytes: route.reduce((s, r) => s + (r.bytes || 0), 0),
    jsCssRequests: assets.length,
    totalBytes: rows.reduce((s, r) => s + (r.bytes || 0), 0),
    duplicatedAssetUrls: dup,
    homeRendered: run.homeAt,
  };
}

// The route file set is the same for both arms (the 34 files of the Home graph beyond the entry); derive it from B's hint.
const hintB = fs.readFileSync(path.join(path.resolve(args.routes || args.B), '2029.html'), 'utf8').match(/\}\)\(\{after:\[.*?\],js:(\[.*?\]),css:(\[.*?\])\}\)<\/script>/s);
if (!hintB) throw new Error('route-set source carries no hint');
const routeSet = new Set([...JSON.parse(hintB[1]), ...JSON.parse(hintB[2])]);
const hintA = fs.readFileSync(path.join(dists.A, '2029.html'), 'utf8').includes('sod2029-home-route-preload');

const results = { A: [], B: [] };
for (let i = 0; i < pairs; i++) {
  for (const arm of (i % 2 ? ['B', 'A'] : ['A', 'B'])) {
    try { const run = await one(arm); results[arm].push(summarize(run, routeSet)); }
    catch (e) { results[arm].push({ invalid: String(e.message || e).slice(0, 200) }); }
  }
}
await browser.close();
for (const arm of ['A', 'B']) servers[arm].srv.close();
const med = (xs) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const keys = ['entryDone', 'routeFirstRequest', 'routeAllDone', 'homeRendered', 'routeFiles', 'routeBytes', 'jsCssRequests', 'totalBytes', 'duplicatedAssetUrls'];
const valid = (arm) => results[arm].filter((r) => !r.invalid);
const summary = Object.fromEntries(['A', 'B'].map((arm) => [arm, Object.fromEntries(keys.map((k) => [k, med(valid(arm).map((r) => r[k]))]))]));
const paired = [];
for (let i = 0; i < pairs; i++) { const a = results.A[i], b = results.B[i]; if (a && b && !a.invalid && !b.invalid) paired.push({ routeAllDone: b.routeAllDone - a.routeAllDone, homeRendered: b.homeRendered - a.homeRendered, entryDone: b.entryDone - a.entryDone }); }
const out = {
  tool: 'measure-route-graph.mjs v1', profile: { width, height, dpr: mobile ? 2 : 1, touch: mobile, cpuThrottle: cpu, network: '1.6 Mbps down / 750 kbps up / 150 ms RTT (CDP)' },
  input: 'NONE — no data served; every non-loopback host aborted; route-code timeline only', cacheState: 'cold (fresh context per run)', browser: 'Chromium 141 (playwright-core 1.56.1)',
  arms: { A: { dist: path.basename(dists.A), indexHtmlSha256: sha(path.join(dists.A, '2029.html')), hasHint: hintA }, B: { dist: path.basename(dists.B), indexHtmlSha256: sha(path.join(dists.B, '2029.html')), hasHint: fs.readFileSync(path.join(dists.B, '2029.html'), 'utf8').includes('sod2029-home-route-preload') } },
  routeFileCount: routeSet.size, pairs, validPairs: paired.length, summaryMedianMs: summary, pairedDeltaB_minus_A_ms: { median: Object.fromEntries(['routeAllDone', 'homeRendered', 'entryDone'].map((k) => [k, med(paired.map((p) => p[k]))])), perPair: paired },
  raw: results,
};
fs.writeFileSync(args.out, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ validPairs: paired.length, summaryMedianMs: summary, pairedDelta: out.pairedDeltaB_minus_A_ms.median }, null, 1));
