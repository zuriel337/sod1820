// CLAUDE_REVIEW_2029_PERF_20261014 — cold-load decomposition per route (READ_ONLY on product code).
// Separates: static graph (manifest, see static-graph.mjs)  vs  JS actually requested BEFORE the route READY marker
//            vs  JS requested only AFTER READY (deferred)  vs  duplicate content reads (head handoff misses).
// usage: node coldload.mjs <record|run> --dist DIR --label L [--runs 5] [--routes /,/world,/post/x] [--fx rev.gz] [--fxcold cold.gz] [--out f.json]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import path from 'node:path';
import { execFile } from 'node:child_process'; import { promisify } from 'node:util'; const execFileP = promisify(execFile);
import { serve } from '../../../scripts/perf/serve.mjs';
const require = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools') + '/node_modules/'); const { chromium } = require('playwright');
const argv = process.argv.slice(2); const mode = argv[0];
const A = Object.fromEntries(argv.slice(1).reduce((a, v, i, arr) => v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a, []));
const RUNS = +(A.runs || 5); const routes = (A.routes || '/,/world,/post/mah-kore-mokesh-har-naftali').split(',');
const ANON = (fs.readFileSync(new URL('../../../src/lib/supabase.js', import.meta.url), 'utf8').match(/eyJ[A-Za-z0-9._-]+/) || [])[0];
const READ_RPC = new Set(['convergence_meter', 'fn_method_value', 'fn_number_dossier', 'fn_number_journey', 'fn_number_lookup', 'fn_zero_scale', 'gematria_api', 'gematria_method_trace', 'get_category_videos', 'number_neighbors', 'posts_by_number_strict', 'world_group_source_arrivals_v3', 'world_group_source_arrivals_v2', 'notification_prefs_guest_get_v1']);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const keyOf = req => { const u = norm(req.url()); if (req.method() === 'GET') return 'GET ' + u; const b = /notification_prefs_guest_get_v1/.test(u) ? '' : (req.postData() || '').replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS'); return 'POST ' + u + ' ' + crypto.createHash('md5').update(b).digest('hex'); };
const load = f => f && fs.existsSync(f) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(f))) : {};
const fixtures = { ...load(A.fx), ...load(A.fxcold) };
const { srv, port } = await serve(path.resolve(A.dist)); const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const READY = { home: "document.querySelector(\"[data-experience-capability='home-composition'] a[href^='/post/']\")", world: "document.querySelector('[data-world-topic],[data-world-discovery-door]')", post: "(()=>{const e=document.querySelector(\"[data-experience-capability='post-master-reading-stage']\");return e&&e.innerText.length>800})()" };
const keyFor = r => r === '/' ? 'home' : r.startsWith('/world') ? 'world' : 'post';
const INIT = key => `(()=>{window.__r={ready:null,lead:null};const R=()=>${READY[key]};const L=()=>document.querySelector('[data-flight-story="world"] .sod29-flight-feature');const mo=new MutationObserver(()=>{if(__r.lead==null&&L())__r.lead=performance.now();if(__r.ready==null&&R()){__r.ready=performance.now()}});document.addEventListener('DOMContentLoaded',()=>mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true}))})()`;
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const rng = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? [Math.round(s[0]), Math.round(s[s.length - 1])] : null; };
async function one(route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await ctx.addInitScript(INIT(keyFor(route)));
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); const misses = new Set(); const reads = []; let ext = 0;
  await page.route('**/*', async r => {
    const req = r.request(), u = req.url();
    if (u.startsWith(origin)) { if (new URL(u).pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); return r.continue(); }
    if (u.includes('.supabase.co')) {
      const rpc = (/\/rest\/v1\/rpc\/([^?]+)/.exec(u) || [])[1]; const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
      if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: hdr, body: '' });
      const isRead = req.method() === 'GET' || (req.method() === 'POST' && rpc && READ_RPC.has(rpc));
      if (!isRead) return r.fulfill({ status: 204, body: '', headers: hdr });
      const k = keyOf(req); reads.push(norm(u).replace(/^https:\/\/[^/]+/, '').slice(0, 130));
      if (mode === 'record') {
        try { const a = ['-s', '-m', '30', '-D', '-', '-X', req.method(), u, '-H', 'apikey: ' + ANON, '-H', 'Authorization: Bearer ' + ANON, '-H', 'content-type: application/json']; for (const h of ['accept-profile', 'content-profile', 'prefer', 'range']) if (req.headers()[h]) a.push('-H', `${h}: ${req.headers()[h]}`); if (req.method() === 'POST') a.push('--data-binary', req.postData() || '');
          const o = (await execFileP('curl', a, { maxBuffer: 1 << 28, encoding: 'utf8' })).stdout; const i = o.lastIndexOf('\r\n\r\n'); const head = o.slice(0, i), body = o.slice(i + 4); const hv = n => (head.match(new RegExp('^' + n + ': (.*)$', 'mi')) || [])[1]?.trim() || null; const status = +head.split(' ')[1];
          fixtures[k] = { status, body, ct: hv('content-type'), cr: hv('content-range') }; return r.fulfill({ status, body, headers: { ...hdr, 'content-type': fixtures[k].ct || 'application/json', ...(fixtures[k].cr ? { 'content-range': fixtures[k].cr } : {}) } });
        } catch { return r.abort(); }
      }
      const f = fixtures[k]; if (!f) misses.add(k.slice(0, 120)); await new Promise(x => setTimeout(x, 150));
      return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : (req.method() === 'GET' ? '[]' : 'null'), headers: { ...hdr, 'content-type': f?.ct || 'application/json', ...(f?.cr ? { 'content-range': f.cr } : {}) } });
    }
    ext++; if (mode === 'run') await new Promise(x => setTimeout(x, 400)); return r.fulfill({ status: 200, body: '', contentType: u.includes('css') ? 'text/css' : 'text/javascript' });
  });
  if (mode === 'run') { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
  await page.goto(origin + route, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await page.waitForFunction(() => window.__r && window.__r.ready != null, null, { timeout: 40000 }).catch(() => {}); await page.waitForTimeout(mode === 'run' ? 5000 : 2500);
  const m = await page.evaluate(() => { const ready = window.__r.ready; const lead = window.__r.lead; const res = performance.getEntriesByType('resource'); const js = res.filter(r => /\/assets\/.*\.js(\?|$)/.test(r.name)); const css = res.filter(r => /\/assets\/.*\.css(\?|$)/.test(r.name));
    const sb = res.filter(r => r.name.includes('.supabase.co/rest')); const nm = r => r.name.replace(/^.*\/assets\//, '').replace(/-[A-Za-z0-9_]{6,10}\.(js|css)$/, '.$1');
    const before = js.filter(r => ready != null && r.responseEnd <= ready), after = js.filter(r => ready != null && r.startTime > ready);
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    return { ready, lead, fcp, jsBeforeKB: before.reduce((s, r) => s + (r.encodedBodySize || 0), 0) / 1024, jsBeforeN: before.length, jsAfterKB: after.reduce((s, r) => s + (r.encodedBodySize || 0), 0) / 1024, jsAfterN: after.length, jsAfterNames: after.map(nm), jsTotalKB: js.reduce((s, r) => s + (r.encodedBodySize || 0), 0) / 1024, jsTotalN: js.length, cssBeforeKB: css.filter(r => ready != null && r.responseEnd <= ready).reduce((s, r) => s + (r.encodedBodySize || 0), 0) / 1024, restBefore: sb.filter(r => ready != null && r.startTime <= ready).length, restTotal: sb.length, firstRestStart: sb.length ? Math.min(...sb.map(r => r.startTime)) : null }; });
  const dup = {}; for (const u of reads) dup[u] = (dup[u] || 0) + 1; m.dupReads = Object.entries(dup).filter(([, n]) => n > 1).map(([u, n]) => [u.slice(0, 90), n]);
  m.slugReads = reads.filter(u => /\/posts\?.*slug=/.test(u)).length; m.misses = [...misses]; m.ext = ext; await ctx.close(); return m;
}
const out = { label: A.label, runs: RUNS, routes: {} };
for (const r of routes) { const rs = []; for (let i = 0; i < (mode === 'record' ? 1 : RUNS); i++) rs.push(await one(r)); const f = k => rs.map(x => x[k]);
  out.routes[r] = { ready: { med: med(f('ready')), range: rng(f('ready')) }, lead: { med: med(f('lead')), range: rng(f('lead')) }, fcp: { med: med(f('fcp')) }, jsBeforeKB: med(f('jsBeforeKB')), jsBeforeN: med(f('jsBeforeN')), jsAfterKB: med(f('jsAfterKB')), jsAfterN: med(f('jsAfterN')), jsAfterNames: rs[0].jsAfterNames, jsTotalKB: med(f('jsTotalKB')), jsTotalN: med(f('jsTotalN')), cssBeforeKB: med(f('cssBeforeKB')), restBefore: med(f('restBefore')), restTotal: med(f('restTotal')), firstRestStart: med(f('firstRestStart')), slugReads: med(f('slugReads')), dupReads: rs[0].dupReads, misses: [...new Set(rs.flatMap(x => x.misses))].length, readyRuns: rs.filter(x => x.ready != null).length };
  process.stderr.write(`${A.label} ${r} done\n`); }
if (mode === 'record') fs.writeFileSync(A.fxcold, zlib.gzipSync(JSON.stringify(fixtures)));
if (A.out) fs.writeFileSync(A.out, JSON.stringify(out, null, 1));
console.log(`\n## cold ${A.label} n=${RUNS}\nroute | READY med [range] | FCP | JS before READY (KB br / files) | JS after READY (KB / files) | JS total | REST before READY / total | slug reads | dup reads | misses`);
for (const [r, v] of Object.entries(out.routes)) console.log([decodeURIComponent(r).slice(0, 34), `${Math.round(v.ready.med)} [${v.ready.range}]` + (v.lead.med != null ? ` lead ${Math.round(v.lead.med)} [${v.lead.range}]` : ''), Math.round(v.fcp.med), `${v.jsBeforeKB?.toFixed(0)}/${v.jsBeforeN}`, `${v.jsAfterKB?.toFixed(0)}/${v.jsAfterN}`, `${v.jsTotalKB?.toFixed(0)}/${v.jsTotalN}`, `${v.restBefore}/${v.restTotal}`, v.slugReads, v.dupReads.length, v.misses].join(' | '));
await browser.close(); srv.close();
