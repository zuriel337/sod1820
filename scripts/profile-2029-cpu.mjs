// CPU attribution: V8 sampling profile (0.5 ms) during a cold load at mobile CPUx4, mapped back to original modules with source maps.
// usage: DIR=var-base-sm SCEN=home,post REPS=3 node cpuprof.mjs   -> cpuprof-<scen>.json
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/unif/package.json'); const { SourceMapConsumer } = require('source-map-js');
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const DIR = process.env.DIR || 'var-base-sm'; const SC = process.cwd(); const dir = `${SC}/${DIR}`; const PORT = Number(process.env.PORT || 5300);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json' };
http.createServer((q, rs) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = path.join(dir, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, '2029.html');
  const ext = path.extname(f); const h = { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-cache' };
  if (types[ext]) { const b = zlib.gzipSync(fs.readFileSync(f)); h['content-encoding'] = 'gzip'; rs.writeHead(200, h); rs.end(b); } else { rs.writeHead(200, h); fs.createReadStream(f).pipe(rs); } }).listen(PORT);
const routes = { home: '/', post: '/post/flydubai-fz1073-363-14000-remzei-geula', world: '/world' };
const READY = { home: `document.querySelector('[data-experience-capability="home-composition"] a[href^="/post/"]')`, post: `(()=>{const e=document.querySelector('[data-experience-capability="post-master-reading-stage"]');return e&&e.innerText.length>800})()`, world: `document.querySelector('[data-world-topic],[data-world-discovery-door]')` };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const maps = new Map();
function getMap(url) { if (maps.has(url)) return maps.get(url); let c = null; try { const f = path.join(dir, new URL(url).pathname); const m = JSON.parse(fs.readFileSync(f + '.map', 'utf8')); c = new SourceMapConsumer(m); } catch {} maps.set(url, c); return c; }
function cat(src) { if (!src) return 'unmapped'; const m = src.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/); if (m) return 'lib: ' + m[1]; const s = src.replace(/^(\.\.\/)+/, ''); const p = s.split('/'); return p[0] === 'src' ? 'app: ' + p.slice(1, 3).join('/') : s; }
for (const scen of (process.env.SCEN || 'home,post').split(',')) {
  const agg = { self: {}, byFile: {}, byFunc: {}, specials: {}, total: 0, runs: [] };
  for (let rep = 0; rep < Number(process.env.REPS || 3); rep++) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
    await page.addInitScript(() => { navigator.sendBeacon = () => true; const of = window.fetch.bind(window); window.fetch = (i, n) => { const u = typeof i === 'string' ? i : i.url; const m = String((n && n.method) || (i && i.method) || 'GET').toUpperCase(); if (/supabase\.co/.test(u) && m !== 'GET' && !/rpc\/(convergence_meter|fn_method_value|gematria_method_trace|get_category_videos|world_group_source_arrivals_v2|fn_zero_scale)/.test(u)) return Promise.resolve(new Response('null', { status: 200 })); return of(i, n); }; });
    const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
    await page.goto('http://127.0.0.1:' + PORT + routes[scen], { waitUntil: 'commit' }).catch(() => {});
    const t0 = Date.now(); await page.waitForFunction(r => { try { return !!eval(r); } catch { return false; } }, READY[scen], { timeout: 60000, polling: 100 }).catch(() => {});
    const ready = Date.now() - t0; await page.waitForTimeout(1500);
    const { profile } = await cdp.send('Profiler.stop'); const nodes = new Map(profile.nodes.map(n => [n.id, n]));
    if (process.env.LINES) { const re = new RegExp(process.env.LINES); for (const n of profile.nodes) { if (!n.positionTicks || !n.callFrame.url) continue; const mc = getMap(n.callFrame.url); if (!mc) continue;
      if (!mc.__rev) { mc.__rev = new Map(); mc.eachMapping(m => { if (m.source && re.test(m.source) && m.originalLine) { const k = m.generatedLine; const prev = mc.__rev.get(k); if (!prev || m.generatedColumn < prev.c) mc.__rev.set(k, { l: m.originalLine, c: m.generatedColumn, s: m.source }); } }); }
      for (const t of n.positionTicks) { const o = mc.__rev.get(t.line); if (o) { const k = o.s.replace(/^(\.\.\/)+/, '').split('/').slice(-1)[0] + ':' + o.l; agg.lines = agg.lines || {}; agg.lines[k] = (agg.lines[k] || 0) + t.ticks * 0.5; } } } }
    const dt = profile.timeDeltas; let tot = 0;
    profile.samples.forEach((id, i) => { const n = nodes.get(id); const us = dt[i] || 0; tot += us; const cf = n.callFrame; const fn = cf.functionName || '(anonymous)';
      if (/^\(/.test(fn)) { agg.specials[fn] = (agg.specials[fn] || 0) + us; return; }
      let src = null, name = fn; const mc = cf.url ? getMap(cf.url) : null;
      if (mc) { const o = mc.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber }); if (o && o.source) { src = o.source; name = o.name || fn; } }
      const c = cat(src); agg.self[c] = (agg.self[c] || 0) + us;
      const f = src ? src.replace(/^(\.\.\/)+/, '') : (cf.url || '').split('/').pop(); agg.byFile[f] = (agg.byFile[f] || 0) + us;
      const k = f.split('/').slice(-2).join('/') + ' :: ' + name + (src && /SystemFrame|app|src\//.test(src) && mc ? ' L' + (mc.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber }).line) : ''); agg.byFunc[k] = (agg.byFunc[k] || 0) + us; });
    agg.total += tot; agg.runs.push({ readyWait: ready, sampledMs: Math.round(tot / 1000) }); await ctx.close();
  }
  const R = Number(process.env.REPS || 3), top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v / R / 1000)]);
  const out = { scen, reps: R, dir: DIR, sampledMsPerRun: Math.round(agg.total / R / 1000), specialsMs: top(agg.specials, 8), byCategoryMs: top(agg.self, 25), byFileMs: top(agg.byFile, 25), byFuncMs: top(agg.byFunc, 30), runs: agg.runs, lines: Object.entries(agg.lines || {}).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round(v / R)]) };
  fs.writeFileSync(`cpuprof-${scen}.json`, JSON.stringify(out, null, 1)); console.log(scen, 'sampled/run ms', out.sampledMsPerRun, JSON.stringify(out.specialsMs.slice(0, 4)));
}
await br.close(); process.exit(0);
