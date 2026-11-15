// Diagnostic for the repeat-visit series: does Chromium serve the fonts / brand images / Post backgrounds / scripts of a tree from a cache on the second visit, which cache
// (Blink's in-process memory cache or the HTTP cache), and with which response headers? Same server, Pixel 7 profile and Slow 4G as tools/lab2.mjs; one post.
//   node warm_probe.mjs <tree root> [post path] [--mode memory|restart] [--legacy-cert]
//   --mode memory   (default) two visits in one browser process, about:blank in between (what the "warm" stages of lab2.mjs do)
//   --mode restart  the browser is closed and started again on the same profile between the visits (a returning visitor: only the HTTP cache can help)
//   --legacy-cert   the old lab setting (--ignore-certificate-errors): Chromium does not store responses of a connection with certificate errors in the HTTP cache
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const mode = flag('--mode') || 'memory', legacy = args.includes('--legacy-cert');
const [root, postPath = '/post/mah-kore-goliath-benjamin-gath-david'] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--mode'));
const { startLabServer } = await import('./labserver2.mjs');
const anon = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(root + '/src/lib/supabase.js', 'utf8'))[1];
const cacheDir = '/tmp/claude-0/-home-user-sod1820/110674db-474e-508e-82dd-23165024ac9c/scratchpad/perf/cache/supabase';
const readRpc = ['world_group_source_arrivals_v2', 'convergence_meter'];
const lab = await startLabServer({ root, cacheDir, readRpc, anon, supabaseExtraMs: 250, docDelayFor: p => p === '/' ? 700 : p.startsWith('/post/') ? 900 : 1300, record: false, trustCert: !legacy });
const profile = mkdtempSync(join(tmpdir(), 'probe-profile-'));
let visit = 1; const rows = new Map(); const served = new Set();

async function open() {
  const context = await chromium.launchPersistentContext(profile, { ...devices['Pixel 7'], headless: true, args: lab.chromiumArgs, env: lab.browserEnv, locale: 'he-IL', timezoneId: 'Asia/Jerusalem',
    ignoreHTTPSErrors: legacy, serviceWorkers: 'allow' });
  await context.addCookies([{ name: 'vb', value: 'browser', domain: 'sod1820.co.il', path: '/' }]);
  const page = context.pages()[0] || await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  cdp.on('Network.requestWillBeSent', e => { rows.set(e.requestId, { visit, url: e.request.url, type: e.type }); });
  cdp.on('Network.requestServedFromCache', e => served.add(e.requestId));
  cdp.on('Network.responseReceived', e => { const r = rows.get(e.requestId); if (r) Object.assign(r, { status: e.response.status, disk: e.response.fromDiskCache, sw: e.response.fromServiceWorker,
    cc: e.response.headers?.['cache-control'] || e.response.headers?.['Cache-Control'] || null }); });
  cdp.on('Network.loadingFinished', e => { const r = rows.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
  return { context, page };
}
const url = lab.origin + postPath;
let s = await open();
await s.page.goto(url, { waitUntil: 'load', timeout: 60000 }); await sleep(6000);
if (mode === 'restart') { await s.context.close(); s = await open(); visit = 2; } else { await s.page.goto('about:blank'); visit = 2; }
await s.page.goto(url, { waitUntil: 'load', timeout: 60000 }); await sleep(4000);
const interesting = r => /\/(fonts|brand\/2029|backgrounds)\//.test(r.url) || /\.(webp|jpg|png|ico)(\?|$)/.test(r.url);
const where = (id, r) => r.disk ? 'HTTP-disk-cache' : served.has(id) ? 'memory-cache' : (r.bytes || 0) > 0 ? 'NETWORK' : 'other';
console.log(`mode=${mode} cert=${legacy ? 'legacy(--ignore-certificate-errors)' : 'trusted(spki)'} tree=${root.split('/').pop()}`);
for (const v of [2]) {
  console.log(`--- visit ${v}`);
  for (const [id, r] of rows) if (r.visit === v && r.url.startsWith(lab.origin) && interesting(r) && r.type !== 'Script') console.log(r.type.padEnd(10), String(r.status).padEnd(4), where(id, r).padEnd(16), `bytes=${String(r.bytes).padEnd(6)}`, `cc="${r.cc}"`, r.url.replace(lab.origin, '').slice(0, 64));
}
const summary = type => { const list = [...rows.entries()].filter(([, r]) => r.visit === 2 && r.type === type && r.url.startsWith(lab.origin)); const by = {}; for (const [id, r] of list) { const k = where(id, r); by[k] = (by[k] || 0) + 1; }
  return `${type}: ${list.length} requests ${JSON.stringify(by)} bytes ${list.reduce((n, [, r]) => n + (r.bytes || 0), 0)}`; };
for (const type of ['Script', 'Stylesheet', 'Font', 'Image']) console.log('visit 2', summary(type));
await s.context.close(); await lab.close?.(); rmSync(profile, { recursive: true, force: true });
process.exit(0);
