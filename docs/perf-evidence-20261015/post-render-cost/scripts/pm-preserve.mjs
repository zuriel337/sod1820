import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { serve } from '/tmp/claude-0/pr/scripts/perf/serve.mjs';
const require = createRequire('/opt/node-tools/node_modules/'); const { chromium } = require('playwright');
const [dist, fixf] = process.argv.slice(2);
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS');
const fixtures = JSON.parse(zlib.gunzipSync(fs.readFileSync(fixf))); const { srv, port } = await serve(dist); const origin = `http://127.0.0.1:${port}`;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const P = ['seventh-to-tenth-sefirot-2027', 'chibur-bein-hasafot-mafteach-lagan', 'flydubai-fz1073-363-14000-remzei-geula', 'mah-kore-mokesh-har-naftali'];
const out = {};
for (const s of P) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const pg = await ctx.newPage(); const calls = [];
  await pg.route('**/*', async r => { const q = r.request(), u = q.url(); if (u.startsWith(origin)) return r.continue(); if (u.includes('.supabase.co')) { if (q.method() !== 'GET') { calls.push(q.method() + ' ' + (u.match(/rpc\/(\w+)/) || [])[1]); return r.fulfill({ status: 204, body: '' }); } const f = fixtures[norm(u)]; return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'content-type': f?.ct || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(f?.cr ? { 'content-range': f.cr } : {}) } }); } return r.fulfill({ status: 200, body: '' }); });
  await pg.goto(origin + '/post/' + s, { waitUntil: 'load' }); await pg.waitForTimeout(5000);
  const snap = await pg.evaluate(() => { const r = document.querySelector('.sod29-reading-source'); const h = r ? r.innerHTML : ''; let x = 0; for (let i = 0; i < h.length; i++) x = (x * 31 + h.charCodeAt(i)) | 0; return { srcHash: x, srcLen: h.length, gem: document.querySelectorAll('[data-gem]').length, numlink: document.querySelectorAll('.sod-numlink').length, numHref: document.querySelectorAll('a[href^="/number/"]').length, roleBtn: document.querySelectorAll('[data-gem][role=button]').length, imgs: document.images.length, h1: document.querySelector('h1')?.innerText.slice(0, 30), regions: document.querySelectorAll('[data-reading-region]').length, caps: [...document.querySelectorAll('[data-experience-capability]')].map(e => e.dataset.experienceCapability).join(','), secNav: document.querySelectorAll('.sod29-surface-section-nav a, nav[aria-label] a').length, title: document.title.slice(0, 30) }; });
  // number opening: click first gem, record URL / panel state
  const gemClick = await pg.evaluate(() => { const g = document.querySelector('[data-gem]'); if (!g) return null; g.scrollIntoView({ block: 'center' }); g.click(); return g.textContent.trim().slice(0, 12); });
  await pg.waitForTimeout(1200);
  const after = await pg.evaluate(() => ({ path: location.pathname + location.hash, panel: !!document.querySelector('.sod29-frame-panel, [data-number-drawer], .sod29-number-drawer'), ctxLabel: document.querySelector('.sod29-context-rail, [data-surface-context-rail]')?.innerText.slice(0, 40) }));
  out[s.slice(0, 12)] = { ...snap, gemClick, after, writes: [...new Set(calls)].join(',') }; await ctx.close();
}
// rapid switching: A,B,A,B, ends on B; expect B content only
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const pg = await ctx.newPage();
await pg.route('**/*', async r => { const q = r.request(), u = q.url(); if (u.startsWith(origin)) return r.continue(); if (u.includes('.supabase.co')) { if (q.method() !== 'GET') return r.fulfill({ status: 204, body: '' }); const f = fixtures[norm(u)]; await new Promise(x => setTimeout(x, 150 + Math.random() * 300)); return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'content-type': f?.ct || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(f?.cr ? { 'content-range': f.cr } : {}) } }); } return r.fulfill({ status: 200, body: '' }); });
await pg.goto(origin + '/post/' + P[0], { waitUntil: 'load' }); await pg.waitForTimeout(4000);
await pg.evaluate(async (P) => { const go = (p) => { history.pushState({}, '', '/post/' + p); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }; for (const p of [P[1], P[0], P[2], P[1], P[3], P[1]]) { go(p); await new Promise(r => setTimeout(r, 40)); } }, P);
await pg.waitForTimeout(5000);
out.rapid = await pg.evaluate(() => ({ path: location.pathname.slice(6, 30), h1: document.querySelector('h1')?.innerText.slice(0, 30), title: document.title.slice(0, 30), srcLen: document.querySelector('.sod29-reading-source')?.innerHTML.length }));
console.log(JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"')); await br.close(); srv.close();
