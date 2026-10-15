import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib';
import { serve } from '/tmp/claude-0/pr/scripts/perf/serve.mjs';
const require = createRequire('/opt/node-tools/node_modules/'); const { chromium } = require('playwright');
const [dist, fixf, a, b] = process.argv.slice(2);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(fixf))); const { srv, port } = await serve(dist); const origin = `http://127.0.0.1:${port}`;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 }); const pg = await ctx.newPage(); const cdp = await ctx.newCDPSession(pg);
await pg.route('**/*', async r => { const q = r.request(), u = q.url(); if (u.startsWith(origin)) return r.continue(); if (u.includes('.supabase.co')) { if (q.method() !== 'GET') return r.fulfill({ status: 204, body: '' }); const f = fixtures[norm(u)]; await new Promise(x => setTimeout(x, 150)); return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'content-type': f?.ct || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(f?.cr ? { 'content-range': f.cr } : {}) } }); } return r.fulfill({ status: 200, body: '' }); });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await pg.goto(origin + a, { waitUntil: 'load' }); await pg.waitForTimeout(7000);
const events = []; cdp.on('Tracing.dataCollected', e => events.push(...e.value));
const done = new Promise(r => cdp.on('Tracing.tracingComplete', r));
await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking,v8.execute', transferMode: 'ReportEvents' });
await pg.evaluate((b) => { history.pushState({}, '', b); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, b);
await pg.waitForTimeout(5000);
await cdp.send('Tracing.end'); await done;
const mainTid = (events.find(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain') || {}).tid;
const sums = {}; for (const e of events) { if (e.ph !== 'X' || e.tid !== mainTid || !e.dur) continue; sums[e.name] = (sums[e.name] || 0) + e.dur / 1000; }
// only non-nested summation is hard; report top names (inclusive durations; nested ones overlap)
const inv = events.filter(e => e.name === 'StyleRecalcInvalidationTracking' || e.name === 'StyleInvalidatorInvalidateRules');
const by = {}; for (const e of inv) { const d = e.args?.data || {}; const k = (d.reason || e.name) + ' | ' + (d.invalidationSet || d.selectorPart || '').toString().slice(0, 40) + ' | ' + (d.nodeName || '').toString().slice(0,20); by[k] = (by[k] || 0) + 1; }
console.log('invalidation events', inv.length); console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => v + '  ' + k).join('\n'));
const lay = events.filter(e => e.name === 'LayoutInvalidationTracking'); const lb = {}; for (const e of lay) { const k = (e.args?.data?.reason || '') + ' | ' + (e.args?.data?.nodeName || ''); lb[k] = (lb[k] || 0) + 1; } console.log('layout invalidations', lay.length); console.log(Object.entries(lb).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => v + '  ' + k).join('\n'));
await br.close(); srv.close();
