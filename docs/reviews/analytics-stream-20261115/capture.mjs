// Actual application analytics + downloaded public Google SDK, in an isolated
// synthetic page. Every browser request is fulfilled locally; no event leaves.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the existing pinned browser tooling.');
const { chromium } = pw;
const [sdkFile, output] = process.argv.slice(2);
if (!sdkFile || !output) throw new Error('Usage: node capture.mjs <downloaded-public-gtag.js> <results.json>');
const sdk = readFileSync(sdkFile, 'utf8');
const measurementId = 'G-V3H3E20FLY'; // Public stream ID read from the live site's config.
const flag = '"vtp_enableHistoryEvents":true';
assert.equal(sdk.split(flag).length - 1, 1, 'stream changed: re-read configuration before simulating');
const app = await build({ entryPoints: ['src/lib/analytics.js'], bundle: true, write: false, format: 'iife',
  globalName: 'measurementFixture', define: { 'import.meta.env.VITE_GA_ID': JSON.stringify(measurementId) } });
const results = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--host-resolver-rules=MAP * ~NOTFOUND,EXCLUDE 127.0.0.1'],
  env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/proxy/i.test(key))) });
try {
  for (const mode of ['current-public-stream', 'simulated-history-off']) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const row = { mode, events: [], requests: [], errors: [] };
    let stage = 'first-page';
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      row.requests.push({ host: url.hostname, path: url.pathname, method: req.method, stage });
      if (url.hostname === 'sod1820.co.il' && req.resourceType() === 'document') {
        return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><title>Fixture</title></head><body><main>Local analytics fixture</main></body></html>' });
      }
      if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: mode === 'current-public-stream' ? sdk : sdk.replace(flag, '"vtp_enableHistoryEvents":false') });
      }
      if (/\/(?:g\/)?collect$/.test(url.pathname)) {
        for (const line of (req.postData() || '').split('\n')) {
          const fields = Object.fromEntries([...url.searchParams, ...new URLSearchParams(line)]);
          // Synthetic payload only, and omit generated client/session/device identifiers.
          row.events.push({ stage, host: url.hostname, fields: Object.fromEntries(Object.entries(fields).filter(([key]) =>
            ['en', 'dl', 'dt', 'dr', 'cs', 'cm', 'cn', 'cc', 'ci', 'ep.search_term', 'ep.page_path', 'tid'].includes(key))) });
        }
      }
      // No continue/fetch: even an unexpected destination stays local.
      return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(error.message));
    await page.goto('https://sod1820.co.il/post/audit-alpha?utm_source=fixture&utm_medium=email&utm_campaign=synthetic');
    await page.addScriptTag({ content: app.outputFiles[0].text });
    await page.evaluate(() => {
      const title = document.querySelector('title'); title.textContent = 'Audit alpha';
      Object.assign(title.dataset, { analyticsRoute: location.pathname, analyticsPath: location.pathname, analyticsPublic: 'true' });
      measurementFixture.initGA({ publicReading: true, path: location.pathname });
      measurementFixture.trackPageview(location.pathname, { publicReading: true });
    });
    // The real SDK batches events; the shorter initial probe missed queued
    // manual events. Observe after its batch window, then flush on page exit.
    await delay(6000);
    for (const [name, path, title] of [['second-page', '/post/audit-beta', 'Audit beta'], ['search-page', '/search?q=synthetic-audit-query', 'Audit search']]) {
      stage = name;
      await page.evaluate(({ path, title }) => {
        history.pushState({}, '', path);
        const el = document.querySelector('title'); el.textContent = title;
        Object.assign(el.dataset, { analyticsRoute: location.pathname, analyticsPath: location.pathname, analyticsPublic: 'true' });
        measurementFixture.trackPageview(location.pathname, { publicReading: true });
      }, { path, title });
      await delay(6000);
    }
    row.manualCommands = await page.evaluate(() => (window.dataLayer || []).map(x => Array.from(x))
      .filter(x => x[0] === 'event').map(x => ({ event: x[1], fields: x[2] })));
    stage = 'page-exit';
    await page.goto('about:blank');
    await delay(500);
    row.pageViewCount = row.events.filter(x => x.fields.en === 'page_view').length;
    row.searchEvents = row.events.filter(x => x.fields.en === 'view_search_results');
    results.push(row);
    console.log(JSON.stringify({ mode, pageViews: row.pageViewCount, searchEvents: row.searchEvents.length, errors: row.errors }));
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(output, JSON.stringify({ measuredAt: new Date().toISOString(), appSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sdkSha256: createHash('sha256').update(sdk).digest('hex'), sdkBytes: Buffer.byteLength(sdk), measurementId,
  scope: 'Actual analytics module and downloaded public stream SDK; synthetic local HTML/history transitions; all network requests fulfilled locally; not GA4 ingestion or a full-site browser test',
  simulatedChange: 'Only vtp_enableHistoryEvents true -> false in a local copy; Google settings unchanged', results }, null, 2) + '\n');
assert.equal(results[0].pageViewCount, 5, 'stream behavior changed: inspect before recommending');
assert.equal(results[1].pageViewCount, 3, 'simulation must retain one page view for each of three navigations');
assert.ok(results.every(row => row.manualCommands.filter(x => x.event === 'page_view').length === 3), 'application must emit exactly three manual views in both cases');
assert.ok(results.every(row => row.errors.length === 0), 'unexpected SDK/application errors');
