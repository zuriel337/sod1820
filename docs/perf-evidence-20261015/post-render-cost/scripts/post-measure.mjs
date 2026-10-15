// Post reading cost measurement (fixture replay, shared conditions of docs/perf-measurement-conditions-2029.md).
// usage: node post-measure.mjs --dist D --fixtures F --scen entry|nav|back|scroll --a /post/x [--b /post/y] [--runs 7] [--profile 1] [--label L] [--out f.json]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib';
import { serve } from '/tmp/claude-0/pr/scripts/perf/serve.mjs';
const require = createRequire('/opt/node-tools/node_modules/'); const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a, []));
const runs = +(args.runs || 7), scen = args.scen || 'entry', A = args.a, B = args.b, cpu = +(args.cpu || 4), rtt = +(args.rtt || 150), sbdelay = 150, extdelay = 400;
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(args.fixtures)));
const { srv, port } = await serve(args.dist); const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const READY = `(()=>{const e=document.querySelector("[data-experience-capability='post-master-reading-stage']");return !!e&&e.innerText.length>800})()`;
const INIT = `(()=>{window.__m={lt:[],cls:0,ready:null};new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__m.cls+=e.value}).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())__m.lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true});
window.__markReady=(tag)=>{const t0=window.__navT0||0;const chk=()=>{if(${READY}&&document.querySelector('h1')&&(!window.__expectTitle||document.querySelector('h1').innerText.trim().length)){window.__m['ready'+tag]=performance.now()-t0;return}requestAnimationFrame(chk)};chk()};
document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{if(__m.ready==null&&${READY})__m.ready=performance.now()}).observe(document.documentElement,{childList:true,subtree:true,characterData:true})});})()`;
async function one() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141 Mobile Safari/537.36' });
  await ctx.addInitScript(INIT); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  let sb = 0, misses = 0; let counting = false; const ext = [];
  await page.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(origin)) { if (new URL(u).pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); return route.continue(); }
    if (u.includes('.supabase.co')) {
      if (req.method() !== 'GET') return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
      const f = fixtures[norm(u)]; if (!f) misses++; if (counting) sb++;
      await new Promise(r => setTimeout(r, sbdelay));
      return route.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'content-type': f?.ct || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(f?.cr ? { 'content-range': f.cr } : {}) } });
    }
    ext.push(u.slice(0, 60)); await new Promise(r => setTimeout(r, extdelay)); return route.fulfill({ status: 200, body: '', contentType: u.endsWith('.css') || u.includes('css2') ? 'text/css' : 'text/javascript' });
  });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: rtt, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  if (args.profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); }
  const out = { misses: 0 };
  counting = true;
  if (args.profile && scen === 'entry') await cdp.send('Profiler.start');
  await page.goto(origin + A, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await page.waitForFunction(() => window.__m && window.__m.ready != null, null, { timeout: 60000, polling: 100 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500);
  const m0 = await metrics(); const entry = await page.evaluate(() => ({ ready: window.__m.ready, cls: window.__m.cls, lt: window.__m.lt.reduce((s, x) => s + Math.max(0, x[1] - 50), 0), ltn: window.__m.lt.length, h1: document.querySelector('h1')?.innerText.slice(0, 40) }));
  out.entryReady = entry.ready; out.entryCls = entry.cls; out.entryTbt = entry.lt; out.entryLtn = entry.ltn; out.entryTask = m0.TaskDuration * 1000; out.entryScript = m0.ScriptDuration * 1000; out.entryLayout = m0.LayoutDuration * 1000; out.entryStyle = m0.RecalcStyleDuration * 1000; out.entryReqs = sb;
  const navTo = async (to, tag) => {
    const before = await metrics(); const reqs0 = sb;
    const r = await page.evaluate(async ([to, tag]) => {
      const mark = performance.now(); const lt0 = window.__m.lt.length; const cls0 = window.__m.cls; const h0 = document.querySelector('h1')?.innerText;
      window.__navT0 = performance.now(); window.__m['ready' + tag] = null;
      history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      await new Promise((res) => { const t0 = performance.now(); const chk = () => { const e = document.querySelector("[data-experience-capability='post-master-reading-stage']"); const h = document.querySelector('h1')?.innerText; if (e && e.innerText.length > 800 && h && h !== h0) return res(performance.now() - t0); if (performance.now() - t0 > 30000) return res(null); requestAnimationFrame(chk); }; chk(); });
      return { ready: window.__m['ready' + tag], mark, lt0, cls0 };
    }, [to, tag]).catch(() => null);
    return { before, reqs0 };
  };
  const timed = async (to) => {
    const before = await metrics(); const reqs0 = sb;
    const res = await page.evaluate(async (to) => {
      const lt0 = window.__m.lt.length, cls0 = window.__m.cls; const h0 = document.querySelector('h1')?.innerText;
      const t0 = performance.now(); history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      const ready = await new Promise((res) => { const chk = () => { const e = document.querySelector("[data-experience-capability='post-master-reading-stage']"); const h = document.querySelector('h1')?.innerText; if (e && e.innerText.length > 800 && h && h !== h0) return res(performance.now() - t0); if (performance.now() - t0 > 30000) return res(null); requestAnimationFrame(chk); }; chk(); });
      await new Promise(r => setTimeout(r, 1500));
      const lts = window.__m.lt.slice(lt0); return { ready, tbt: lts.reduce((s, x) => s + Math.max(0, x[1] - 50), 0), ltn: lts.length, cls: window.__m.cls - cls0 };
    }, to);
    const after = await metrics(); return { ...res, task: (after.TaskDuration - before.TaskDuration) * 1000, script: (after.ScriptDuration - before.ScriptDuration) * 1000, layout: (after.LayoutDuration - before.LayoutDuration) * 1000, reqs: sb - reqs0 };
  };
  if (scen === 'nav' || scen === 'back') {
    if (args.profile) await cdp.send('Profiler.start');
    const nav = await timed(B); out.nav = nav;
    if (scen === 'back') { await page.waitForTimeout(500); const b = await page.evaluate(async () => { const h0 = document.querySelector('h1')?.innerText; return h0; });
      const before = await metrics(); const reqs0 = sb;
      const back = await page.evaluate(async () => { const lt0 = window.__m.lt.length, cls0 = window.__m.cls; const h0 = document.querySelector('h1')?.innerText; const t0 = performance.now(); history.back();
        const ready = await new Promise((res) => { const chk = () => { const e = document.querySelector("[data-experience-capability='post-master-reading-stage']"); const h = document.querySelector('h1')?.innerText; if (e && e.innerText.length > 800 && h && h !== h0) return res(performance.now() - t0); if (performance.now() - t0 > 30000) return res(null); requestAnimationFrame(chk); }; chk(); });
        await new Promise(r => setTimeout(r, 1500)); const lts = window.__m.lt.slice(lt0); return { ready, tbt: lts.reduce((s, x) => s + Math.max(0, x[1] - 50), 0), ltn: lts.length, cls: window.__m.cls - cls0 }; });
      const after = await metrics(); out.back = { ...back, task: (after.TaskDuration - before.TaskDuration) * 1000, script: (after.ScriptDuration - before.ScriptDuration) * 1000, reqs: sb - reqs0 }; }
  }
  if (args.profile) { const { profile } = await cdp.send('Profiler.stop'); const self = {}; const byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = profile.timeDeltas;
    profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const k = (f.functionName || '(anon)') + ' @' + (f.url || '').split('/').pop().replace(/-[A-Za-z0-9_]{8}\.js/, '.js') + ':' + f.lineNumber; self[k] = (self[k] || 0) + dt[i] / 1000; });
    out.prof = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round(v)]); }
  out.misses = misses; await ctx.close(); return out;
}
const rs = []; for (let i = 0; i < runs; i++) rs.push(await one());
const flat = r => ({ entryReady: r.entryReady, entryCls: r.entryCls, entryTbt: r.entryTbt, entryTask: r.entryTask, entryScript: r.entryScript, entryLayout: r.entryLayout, entryReqs: r.entryReqs, ...(r.nav ? Object.fromEntries(Object.entries(r.nav).map(([k, v]) => ['nav_' + k, v])) : {}), ...(r.back ? Object.fromEntries(Object.entries(r.back).map(([k, v]) => ['back_' + k, v])) : {}), misses: r.misses });
const F = rs.map(flat); const keys = Object.keys(F[0]); const med = {}, rng = {};
for (const k of keys) { const v = F.map(x => x[k]).filter(x => x != null && typeof x === 'number'); med[k] = median(v); rng[k] = v.length ? [Math.min(...v), Math.max(...v)] : null; }
const result = { label: args.label, scen, a: A, b: B, runs, cpu, med, rng, raw: F, prof: rs[0].prof };
if (args.out) fs.writeFileSync(args.out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ label: args.label, scen, med: Object.fromEntries(Object.entries(med).map(([k, v]) => [k, v == null ? null : Math.round(v * 1000) / 1000])) }));
if (rs[0].prof) console.log(rs[0].prof.slice(0, 18).map(x => x.join('  ')).join('\n'));
await browser.close(); srv.close();
