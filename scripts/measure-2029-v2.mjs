// measure-2029 v2 — corrected baseline.
//  * real gzip on the wire (server compresses; encoded vs decoded bytes from CDP, not recomputed)
//  * /assets immutable cache headers, html no-cache => warm visit can really hit the HTTP cache
//  * content-ready per route = dedicated content marker (not h1 + 600 chars), same timeline as fcp/lcp
//  * public Supabase reads are real; writes/telemetry are aborted and listed; RPCs only if in RPC_ALLOW
//  * Google fonts are NOT blocked (set BLOCK_GOOGLE=1 to block)
//  usage: node m2.mjs   env: VARIANTS=base,narrow  REPS=5  PROFILES=mobile,desktop  SCEN=home,post,world,topic,number  OUT=file
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const SC = process.cwd(); const OUT = process.env.OUT || 'm2.jsonl'; const REPS = Number(process.env.REPS || 5);
const VARIANTS = (process.env.VARIANTS || 'base').split(',');
const PROFILES = (process.env.PROFILES || 'mobile,desktop').split(',');
const SCEN = (process.env.SCEN || 'home,post,world,topic,number').split(',');
const RPC_ALLOW = (process.env.RPC_ALLOW || 'convergence_meter,fn_method_value,fn_number_dossier,fn_number_journey,fn_number_lookup,fn_zero_scale,gematria_api,gematria_method_trace,get_category_videos,number_neighbors,posts_by_number_strict,world_group_source_arrivals_v3,world_group_source_arrivals_v2').split(',').filter(Boolean);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const gz = new Map();
const serve = (dir, port) => new Promise(r => { const s = http.createServer((q, rs) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = path.join(dir, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, '2029.html');
  const ext = path.extname(f); const h = { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
  if (['.html', '.js', '.css', '.json', '.svg'].includes(ext)) { let b = gz.get(f); if (!b) { b = zlib.gzipSync(fs.readFileSync(f), { level: 6 }); gz.set(f, b); } h['content-encoding'] = 'gzip'; h['content-length'] = b.length; rs.writeHead(200, h); rs.end(b); }
  else { rs.writeHead(200, h); fs.createReadStream(f).pipe(rs); } }).listen(port, '127.0.0.1', () => r(s)); });
const servers = []; const ports = {}; let pp = Number(process.env.PORT0 || 4950);
for (const v of VARIANTS) { ports[v] = pp; servers.push(await serve(`${SC}/var-${v}`, pp++)); }
const profiles = { mobile: { vp: { width: 390, height: 844 }, mobile: true, cpu: 4, lat: 150, down: 1.6e6 / 8, up: 750e3 / 8 }, desktop: { vp: { width: 1366, height: 768 }, mobile: false, cpu: 1, lat: 40, down: 10e6 / 8, up: 5e6 / 8 } };
const POST = '/post/flydubai-fz1073-363-14000-remzei-geula';
const routes = { home: '/', post: POST, world: '/world', topic: '/topic/atzirut-hageula', number: '/number/1820' };
const READY = {
  home: `document.querySelector('[data-experience-capability="home-composition"] a[href^="/post/"]')`,
  post: `(()=>{const e=document.querySelector('[data-experience-capability="post-master-reading-stage"]');return e&&e.innerText.length>800})()`,
  world: `document.querySelector('[data-world-topic],[data-world-discovery-door]')`,
  topic: `document.querySelector('.sod29-topic-section')`,
  number: `document.querySelector('.sod29-number-page')`,
};
const FLAGS = [{ key: 'lock_number', enabled: false, message: null, mode: 'all' }, { key: 'lock_world', enabled: false, message: null, mode: 'all' }];
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const emit = o => fs.appendFileSync(OUT, JSON.stringify(o) + '\n');

async function visit(ctx, prof, v, scen, label) {
  const P = profiles[prof], port = ports[v]; const page = await ctx.newPage();
  const st = { reqs: new Map(), blocked: [], flagsMocked: false };
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.cpu });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: P.lat, downloadThroughput: P.down, uploadThroughput: P.up });
  const blockList = ['*analytics*', '*clarity.ms*', '*facebook*', '*doubleclick*', '*openweb*', '*spot.im*', '*googletagmanager*']; if (process.env.BLOCK_GOOGLE) blockList.push('*fonts.googleapis.com*', '*fonts.gstatic.com*');
  await cdp.send('Network.setBlockedURLs', { urls: blockList });
  await cdp.send('Performance.enable');
  cdp.on('Network.requestWillBeSent', e => { st.reqs.set(e.requestId, { url: e.request.url, method: e.request.method, enc: 0, dec: 0, cache: false, t: e.timestamp, type: e.type }); });
  cdp.on('Network.responseReceived', e => { const r = st.reqs.get(e.requestId); if (r) { r.status = e.response.status; r.proto = e.response.protocol; r.cache = !!(e.response.fromDiskCache || e.response.fromMemoryCache); } });
  cdp.on('Network.dataReceived', e => { const r = st.reqs.get(e.requestId); if (r) r.dec += e.dataLength; });
  cdp.on('Network.loadingFinished', e => { const r = st.reqs.get(e.requestId); if (r) { r.enc = e.encodedDataLength; r.done = e.timestamp; } });
  await page.addInitScript(({ allow, mock, flags }) => {
    // No Playwright routing (it disables the HTTP cache): writes are refused in the page itself.
    window.__blocked = []; window.__flagsMocked = false; const of = window.fetch.bind(window);
    window.fetch = (input, init) => { const u = typeof input === 'string' ? input : input.url; const m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (/supabase\.co\//.test(u)) {
        if (mock && u.includes('/rest/v1/site_flags') && m === 'GET') { window.__flagsMocked = true; return Promise.resolve(new Response(JSON.stringify(flags), { status: 200, headers: { 'content-type': 'application/json' } })); }
        if (m !== 'GET' && m !== 'HEAD') { const rpc = (u.match(/\/rpc\/([a-z0-9_]+)/) || [])[1]; if (!(rpc && allow.includes(rpc))) { window.__blocked.push(m + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 80)); return Promise.resolve(new Response('null', { status: 200, headers: { 'content-type': 'application/json' } })); } } }
      return of(input, init); };
    navigator.sendBeacon = () => true;
  }, { allow: RPC_ALLOW, mock: scen === 'number', flags: FLAGS });
  await page.addInitScript(({ ready }) => {
    window.__m = { fcp: 0, lcp: 0, lcpEl: '', lcpUrl: '', lt: 0, ltn: 0, ltdur: 0, content: -1, shell: -1 };
    new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__m.lcp = e.startTime; window.__m.lcpEl = e.element ? e.element.tagName : ''; window.__m.lcpUrl = e.url || ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__m.lt += Math.max(0, e.duration - 50); window.__m.ltdur += e.duration; window.__m.ltn++; } }).observe({ type: 'longtask', buffered: true });
    window.__m.cls = 0; window.__m.shifts = []; window.__m.ev = [];
    const desc = n => { if (!n || !n.tagName) return ''; let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__m.cls += e.value; if (e.value > 0.004) window.__m.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(3), n: (e.sources || []).slice(0, 2).map(x => desc(x.node)).join(' | ') }); } }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) window.__m.ev.push({ n: e.name, d: Math.round(e.duration), delay: Math.round(e.processingStart - e.startTime), t: Math.round(e.startTime) }); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    const chk = () => { const m = window.__m; if (m.shell < 0 && document.querySelector('.sod29-root')) m.shell = performance.now(); if (m.content < 0) { let ok = false; try { ok = !!eval(ready); } catch {} if (ok) m.content = performance.now(); } if (m.content < 0 && performance.now() < 90000) requestAnimationFrame(chk); };
    requestAnimationFrame(chk);
  }, { ready: READY[scen] });
  await page.goto(`http://127.0.0.1:${port}${routes[scen]}`, { waitUntil: 'commit', timeout: 120000 }).catch(() => {});
  await page.waitForFunction(() => window.__m && window.__m.content >= 0, null, { timeout: 90000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (process.env.INTERACT !== '0') {
    const btn = page.locator('.sod29-theme-presets button:not(.is-active)').first();
    if (await btn.isVisible().catch(() => false)) await btn.click({ timeout: 4000 }).catch(() => {}); else await page.mouse.click(8, 200).catch(() => {});
  }
  await page.waitForTimeout(1500);
  const sig = await page.evaluate(() => { const q = s => document.querySelector(s); const root = q('main') || document.body; const h1 = (q('h1') || {}).innerText || '';
    const links = [...document.querySelectorAll('a[href^="/post/"]')].slice(0, 12).map(a => a.getAttribute('href')).join(',');
    let hash = 0; const t = (root.innerText || '').replace(/\s+/g, ' '); for (let i = 0; i < t.length; i++) hash = (hash * 31 + t.charCodeAt(i)) | 0;
    return { h1: h1.slice(0, 80), len: t.length, links: links.length, linkHash: links.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0), textHash: hash, imgs: document.images.length }; }).catch(() => ({}));
  const m = await page.evaluate(() => window.__m).catch(() => ({})); st.blocked = await page.evaluate(() => window.__blocked).catch(() => []); st.flagsMocked = await page.evaluate(() => window.__flagsMocked).catch(() => false);
  const perf = await page.evaluate(() => { const es = performance.getEntriesByType('resource'); const js = es.filter(e => /\/assets\/.*\.js/.test(e.name)); const rest = es.filter(e => /\/rest\/v1\//.test(e.name)); const font = es.filter(e => /fonts\.g/.test(e.name));
    return { jsLastEnd: Math.max(0, ...js.map(e => e.responseEnd)), jsCount: js.length, restFirstStart: rest.length ? Math.min(...rest.map(e => e.startTime)) : -1, restLastEnd: rest.length ? Math.max(...rest.map(e => e.responseEnd)) : -1, fontLastEnd: Math.max(0, ...font.map(e => e.responseEnd)) }; }).catch(() => ({}));
  const pm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const R = [...st.reqs.values()]; const local = R.filter(r => r.url.startsWith(`http://127.0.0.1:${port}`)); const sup = R.filter(r => r.url.includes('supabase.co')); const rest = sup.filter(r => r.url.includes('/rest/v1/'));
  const byM = {}; for (const r of sup) byM[r.method] = (byM[r.method] || 0) + 1; const byT = {}; for (const r of R) byT[r.type || '?'] = (byT[r.type || '?'] || 0) + 1;
  const restApi = rest.filter(r => r.method !== 'OPTIONS').length;
  const sum = (a, k) => a.reduce((s, r) => s + (r[k] || 0), 0);
  const dupKeys = new Map(); for (const r of rest) if (r.method === 'GET') dupKeys.set(r.url, (dupKeys.get(r.url) || 0) + 1);
  const out = { t: new Date().toISOString(), label, variant: v, prof, scen, ready: Math.round(m.content), shell: Math.round(m.shell), fcp: Math.round(m.fcp), lcp: Math.round(m.lcp), lcpEl: m.lcpEl, tbt: Math.round(m.lt), longMs: Math.round(m.ltdur), cls: +(m.cls || 0).toFixed(3), shifts: m.shifts || [], lcpUrl: (m.lcpUrl || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 120), inp: Math.max(0, ...((m.ev || []).filter(e => e.n === 'click' || e.n === 'pointerdown' || e.n === 'keydown').map(e => e.d))), inpDelay: Math.max(0, ...((m.ev || []).map(e => e.delay))), sig,
    jsLastEnd: Math.round(perf.jsLastEnd), jsCount: perf.jsCount, restFirst: Math.round(perf.restFirstStart), restLastEnd: Math.round(perf.restLastEnd), fontEnd: Math.round(perf.fontLastEnd),
    cpuScriptMs: Math.round((pm.ScriptDuration || 0) * 1000), cpuTaskMs: Math.round((pm.TaskDuration || 0) * 1000), layoutMs: Math.round((pm.LayoutDuration || 0) * 1000),
    localEncKB: Math.round(sum(local, 'enc') / 1024), localDecKB: Math.round(sum(local, 'dec') / 1024), localFromCache: local.filter(r => r.cache).length, localReqs: local.length,
    restReqs: rest.length, restApi, supaByMethod: byM, allReqs: R.length, allByType: byT, preflights: sup.filter(r => r.method === 'OPTIONS').length, restEncKB: Math.round(sum(rest, 'enc') / 1024), restDecKB: Math.round(sum(rest, 'dec') / 1024), restDupGets: [...dupKeys.values()].reduce((a, c) => a + c - 1, 0), supaReqs: sup.length,
    otherReqs: R.length - local.length - sup.length, blocked: st.blocked.length, blockedList: [...new Set(st.blocked)].slice(0, 12), flagsMocked: st.flagsMocked, ok: m.content >= 0 };
  emit(out); await page.close(); return out;
}

const order = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
for (let rep = 0; rep < REPS; rep++) for (const prof of PROFILES) for (const scen of order(SCEN)) for (const v of order(VARIANTS)) {
  const ctx = await br.newContext({ viewport: profiles[prof].vp, isMobile: profiles[prof].mobile, hasTouch: profiles[prof].mobile });
  await visit(ctx, prof, v, scen, `cold#${rep}`);
  if (process.env.WARM !== '0') await visit(ctx, prof, v, scen, `warm#${rep}`);
  await ctx.close();
}
emit({ kind: 'done' }); await br.close(); servers.forEach(s => s.close());
