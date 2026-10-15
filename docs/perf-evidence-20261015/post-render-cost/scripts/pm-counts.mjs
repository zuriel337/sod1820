import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib';
import { serve } from '/tmp/claude-0/pr/scripts/perf/serve.mjs';
const require = createRequire('/opt/node-tools/node_modules/'); const { chromium } = require('playwright');
const [dist, fixf, a, b] = process.argv.slice(2);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(fixf))); const { srv, port } = await serve(dist); const origin = `http://127.0.0.1:${port}`;
const br0 = 0; const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const pg = await ctx.newPage();
await pg.route('**/*', async r => { const q = r.request(), u = q.url(); if (u.startsWith(origin)) return r.continue(); if (u.includes('.supabase.co')) { if (q.method() !== 'GET') return r.fulfill({ status: 204, body: '' }); const f = fixtures[norm(u)]; return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'content-type': f?.ct || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(f?.cr ? { 'content-range': f.cr } : {}) } }); } return r.fulfill({ status: 200, body: '' }); });
const snap = async (l) => console.log(l, JSON.stringify(await pg.evaluate(() => JSON.parse(JSON.stringify(window.__pm || null)))));
await pg.goto(origin + a, { waitUntil: 'load' }); await pg.waitForTimeout(6000); await snap('entry ' + a);
await pg.evaluate((b) => { history.pushState({}, '', b); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, b); await pg.waitForTimeout(4000); await snap('after nav ' + b);
// scroll through the page like a reader
const cdp = await ctx.newCDPSession(pg); for (let k = 0; k < 5; k++) { await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 600, yDistance: -1200, speed: 1800, gestureSourceType: 'mouse' }); await pg.waitForTimeout(150); } await pg.waitForTimeout(500); await snap('after real scroll ~6000px');
await br.close(); srv.close();
