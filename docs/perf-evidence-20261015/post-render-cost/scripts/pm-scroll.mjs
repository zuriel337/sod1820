import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib';
import { serve } from '/tmp/claude-0/pr/scripts/perf/serve.mjs';
const require = createRequire('/opt/node-tools/node_modules/'); const { chromium } = require('playwright');
const [dist, fixf, a, runs = '3'] = process.argv.slice(2);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(fixf))); const { srv, port } = await serve(dist); const origin = `http://127.0.0.1:${port}`;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const med = x => [...x].sort((p, q) => p - q)[Math.floor(x.length / 2)];
const R = [];
for (let i = 0; i < +runs; i++) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const pg = await ctx.newPage(); const cdp = await ctx.newCDPSession(pg);
  await pg.addInitScript(() => { window.__fr = []; window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ type: 'longtask', buffered: true }); });
  await pg.route('**/*', async r => { const q = r.request(), u = q.url(); if (u.startsWith(origin)) return r.continue(); if (u.includes('.supabase.co')) { if (q.method() !== 'GET') return r.fulfill({ status: 204, body: '' }); const f = fixtures[norm(u)]; return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'content-type': f?.ct || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(f?.cr ? { 'content-range': f.cr } : {}) } }); } return r.fulfill({ status: 200, body: '' }); });
  await pg.goto(origin + a, { waitUntil: 'load' }); await pg.waitForTimeout(6000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  await pg.evaluate(() => { window.__fr = []; window.__lt.length = 0; let last = performance.now(); const tick = (t) => { window.__fr.push(t - last); last = t; window.__go && requestAnimationFrame(tick); }; window.__go = true; requestAnimationFrame(tick); window.__sc = { r: window.__pm?.r }; });
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  for (let k = 0; k < 5; k++) { await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 600, yDistance: -1200, speed: 1800, gestureSourceType: 'mouse' }); await pg.waitForTimeout(150); }
  await pg.waitForTimeout(400);
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const o = await pg.evaluate(() => { window.__go = false; const f = window.__fr.slice(2); const s = [...f].sort((a, b) => a - b); return { frames: f.length, p50: s[Math.floor(s.length * .5)], p95: s[Math.floor(s.length * .95)], max: s[s.length - 1], over50: f.filter(x => x > 50).length, lt: window.__lt.length, ltSum: window.__lt.reduce((a, b) => a + Math.max(0, b - 50), 0), y: window.scrollY }; });
  R.push({ ...o, task: (m1.TaskDuration - m0.TaskDuration) * 1000, script: (m1.ScriptDuration - m0.ScriptDuration) * 1000, layout: (m1.LayoutDuration - m0.LayoutDuration) * 1000, style: (m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000 });
  await ctx.close();
}
const keys = Object.keys(R[0]); const out = {}; for (const k of keys) out[k] = Math.round(med(R.map(x => x[k])) * 10) / 10;
console.log(a, JSON.stringify(out)); await br.close(); srv.close();
