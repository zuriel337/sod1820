// Lab speed of /community/calculator: baseline (origin/main) against the branch. Same built artifact, same throttling, alternating cold loads.
// The fixture serves files uncompressed while production serves brotli, so the throttled bandwidth is scaled by each variant's measured
// raw/compressed ratio (brotli q5 on text, binary types unchanged): the throttle then stands for the compressed bytes production would send.
// usage: node speed_ab2.mjs <baseWorktree> <branchWorktree> <runs> <out.jsonl>
import { createRequire } from 'node:module';
import { writeFileSync, appendFileSync } from 'node:fs';
import zlib from 'node:zlib';
const require = createRequire(import.meta.url);
const pw = require('playwright');
const [, , baseWt, branchWt, runsArg, outFile] = process.argv;
const RUNS = Number(runsArg || 5);
writeFileSync(outFile, '');

const variants = {};
for (const [name, wt] of [['base', baseWt], ['branch', branchWt]]) {
  const { startFixture } = await import(`${wt}/test/helpers/authBrowserFixture.mjs`);
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  variants[name] = { fixture, browser, ratio: 1 };
}
const profiles = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, cpu: 4, net: { latency: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8 } },
  desktop: { viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false, cpu: 1, net: null },
};
const TEXT = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;

async function newPage(name, profileName, { throttle }) {
  const { fixture, browser, ratio } = variants[name];
  const p = profiles[profileName];
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: p.viewport, isMobile: p.isMobile, hasTouch: p.hasTouch, locale: 'he-IL', serviceWorkers: 'allow' });
  await context.addInitScript(() => {
    try { localStorage.setItem('sod_legacy_newsletter_invite_until', String(Date.now() + 86400000)); } catch {}
    window.__m = { lcp: 0, lcpEl: '', cls: 0 };
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) { window.__m.lcp = e.startTime; window.__m.lcpEl = (e.element ? e.element.tagName + '.' + String(e.element.className || '').slice(0, 40) : '') + (e.url ? ' ' + e.url.slice(-40) : ''); } }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  });
  await context.route('https://www.googletagmanager.com/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (throttle && p.net) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.net.latency, downloadThroughput: p.net.down * ratio, uploadThroughput: p.net.up });
  if (throttle && p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  return { context, page, cdp, url: fixture.origin + '/community/calculator' };
}

// calibration: raw and brotli bytes of everything the page downloads until the calculator is ready (no throttle)
for (const name of ['base', 'branch']) {
  const { context, page, url } = await newPage(name, 'mobile', { throttle: false });
  const bodies = [];
  page.on('response', r => { bodies.push(r); });
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction(() => { const i = document.querySelector('#community-calculator-name'); return i && !i.disabled && i.getBoundingClientRect().height > 0; }, null, { timeout: 90000 });
  await page.waitForTimeout(800);
  let raw = 0, comp = 0, jsCssRaw = 0, jsCssComp = 0, count = 0;
  for (const r of bodies) {
    let buf; try { buf = await r.body(); } catch { continue; }
    const type = (r.headers()['content-type'] || '').toLowerCase();
    raw += buf.length; count++;
    if (TEXT.test(type)) { const c = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }).length; comp += c; if (/javascript|css/.test(type)) { jsCssRaw += buf.length; jsCssComp += c; } }
    else comp += buf.length;
  }
  variants[name].ratio = raw / comp;
  variants[name].calib = { responses: count, rawKB: +(raw / 1024).toFixed(1), brotliKB: +(comp / 1024).toFixed(1), jsCssRawKB: +(jsCssRaw / 1024).toFixed(1), jsCssBrotliKB: +(jsCssComp / 1024).toFixed(1), ratio: +(raw / comp).toFixed(2) };
  console.log(name, JSON.stringify(variants[name].calib));
  await context.close();
}
appendFileSync(outFile, JSON.stringify({ calibration: { base: variants.base.calib, branch: variants.branch.calib } }) + '\n');

async function once(name, profileName) {
  const { context, page } = await (async () => { const o = await newPage(name, profileName, { throttle: true }); return o; })();
  const url = variants[name].fixture.origin + '/community/calculator';
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction(() => document.querySelector('h1')?.innerText?.trim(), null, { timeout: 120000 });
  const heading = await page.evaluate(() => performance.now());
  await page.waitForFunction(() => { const i = document.querySelector('#community-calculator-name'); return i && !i.disabled && i.getBoundingClientRect().height > 0; }, null, { timeout: 120000 });
  const inputReady = await page.evaluate(() => performance.now());
  const t0 = await page.evaluate(() => performance.now());
  await page.locator('#community-calculator-name').fill('אור');
  await page.waitForFunction(() => /207/.test(document.querySelector('#result')?.innerText || ''), null, { timeout: 120000 });
  const t1 = await page.evaluate(() => performance.now());
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
    return { responseStart: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, fcp: fcp ? fcp.startTime : null, lcp: window.__m.lcp, lcpEl: window.__m.lcpEl, cls: window.__m.cls };
  });
  await context.close();
  const row = { variant: name, profile: profileName, fcp: nav.fcp, lcp: nav.lcp, lcpEl: nav.lcpEl, heading, inputReady, typeToResult: t1 - t0, dcl: nav.dcl, load: nav.load, cls: nav.cls, kbToReady: variants[name].calib.brotliKB };
  appendFileSync(outFile, JSON.stringify(row) + '\n');
  return row;
}

try {
  for (const profileName of ['desktop', 'mobile']) { await once('base', profileName); await once('branch', profileName); }   // warm-up pair (discarded below)
  writeFileSync(outFile, JSON.stringify({ calibration: { base: variants.base.calib, branch: variants.branch.calib } }) + '\n');
  for (let i = 0; i < RUNS; i++) {
    for (const profileName of ['desktop', 'mobile']) {
      const order = i % 2 === 0 ? ['base', 'branch'] : ['branch', 'base'];
      for (const name of order) await once(name, profileName);
    }
    console.log('run', i + 1, 'of', RUNS, 'done');
  }
} finally {
  for (const { browser, fixture } of Object.values(variants)) { await browser.close().catch(() => {}); await fixture.close().catch(() => {}); }
}
