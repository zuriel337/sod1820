// 5de85cfe functional check: World "כל השיטות ופירוט החישוב" opens the method Stage on demand; chunk failure shows explicit reload (READ_ONLY on product).
// usage: node stagecheck.mjs <dist> <fx.gz> <fxcold.gz> [abort]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import zlib from 'node:zlib'; import { serve } from '../../../scripts/perf/serve.mjs';
const require = createRequire('/opt/node-tools/node_modules/'); const { chromium } = require('playwright');
const fx = { ...JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[3]))), ...JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[4]))) }; const abort = process.argv[5] === 'abort';
const norm = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(Z|\+00:00| ?00:00)?/g, 'TS'); const { srv, port } = await serve(process.argv[2]);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage(); const loaded = []; const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
await p.route('**/*', r => { const q = r.request(), u = q.url(); if (u.startsWith('http://127')) { const pa = new URL(u).pathname; if (/\.js$/.test(pa) && /assets/.test(pa)) loaded.push(pa.replace('/assets/', '').replace(/-[A-Za-z0-9_]{6,10}\.js$/, '')); if (abort && /SpatialMethodStage2029|semanticSceneCompiler/.test(pa)) return r.abort('failed'); return r.continue(); }
  if (u.includes('supabase')) { const f = fx[(q.method() === 'GET' ? 'GET ' : 'POST ') + norm(u)]; return r.fulfill({ status: f ? f.status : 200, body: f ? f.body : '[]', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' } }); } return r.fulfill({ status: 200, body: '' }); });
await p.goto(`http://127.0.0.1:${port}${process.env.WROUTE || '/world'}`); await p.waitForTimeout(7000);
const det = p.locator('details.sod29-world-calculation-depth'); const n = await det.count();
const stageBefore = loaded.filter(x => /SpatialMethodStage|semanticSceneCompiler/.test(x)).length;
let opened = null; if (n) { await det.first().locator('summary').scrollIntoViewIfNeeded().catch(() => {}); await det.first().locator('summary').tap({ timeout: 5000 }).catch(e => { opened = 'tapfail ' + e.message.slice(0, 80); }); await p.waitForTimeout(3500); }
const stageAfter = loaded.filter(x => /SpatialMethodStage|semanticSceneCompiler/.test(x)).length;
console.log(JSON.stringify({ dist: process.argv[2].split('/').slice(-2)[0], abort, witnessDetailsOnWorld: n, stageChunksBeforeOpen: stageBefore, stageChunksAfterOpen: stageAfter, opened, failedStateShown: await p.locator('[data-deferred-state="failed"]').count(), reloadButton: await p.locator('[data-deferred-state="failed"] button').count(), loadingStillShown: await p.locator('text=טוען את פירוט השיטה').count(), pageErrors: errs.length }));
await b.close(); srv.close();
