// Exact-deployment functional check; never a performance or real-admin claim.
// Pass a private JSON file {url: <temporary Vercel access URL>}; never commit it.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`);
const { chromium } = require('playwright');
const [base, expectedSha, authFile, output] = process.argv.slice(2);
assert.match(expectedSha || '', /^[a-f0-9]{40}$/);
const access = new URL(JSON.parse(fs.readFileSync(authFile, 'utf8')).url);
assert.equal(access.origin, new URL(base).origin);
access.pathname = '/preview-build.json';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const builder = fs.readFileSync(new URL('../../../scripts/build-integrated-preview.mjs', import.meta.url), 'utf8');
const reads = new Set(JSON.parse(builder.match(/const allow = (\[.*\]);/)[1]));
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/usr/bin/chromium',
  proxy: { server: process.env.HTTPS_PROXY }, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const result = { commit: expectedSha, preview: base, kind: 'hosted-functional-anonymous', checks: {}, pageErrors: 0,
  limitations: ['No real member/admin session', 'No performance measurement', 'No physical phone'] };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', reducedMotion: 'reduce' });
  // Additional protection before the application has installed its own worker.
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) return route.continue();
    const canonical = url.origin === 'https://linswmnnkjxvweumprav.supabase.co';
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
    if (/analytics|clarity|googletagmanager|facebook|doubleclick|track_visit|link_identity|ingest_event/.test(url.href)
      || url.pathname.startsWith('/auth/')
      || (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !(canonical && reads.has(rpc)))) {
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"smoke_write_blocked"}' });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', () => { result.pageErrors++; });
  const markerResponse = await page.goto(access.href, { timeout: 60000 });
  assert.ok(markerResponse.headers()['x-robots-tag']?.includes('noindex'));
  const marker = JSON.parse(await page.locator('body').innerText());
  assert.equal(marker.commit, expectedSha); assert.equal(marker.readOnly, true); assert.equal(marker.buildTarget, '2029');
  result.checks.marker = marker;
  const manifest = await context.request.get(`${base}/.vite/manifest.json`);
  assert.equal(manifest.status(), 200); assert.equal(sha(await manifest.body()), marker.manifestSha256);
  const workers = await Promise.all(['/preview-readonly-sw.js', '/sw.js'].map(async path => {
    const response = await context.request.get(base + path); assert.equal(response.status(), 200);
    const body = await response.text(); assert.ok(body.includes('X-Preview-Write-Blocked'));
    assert.ok(body.includes('notification_prefs_guest_get_v1')); assert.ok(!body.startsWith('<'));
    return sha(body);
  }));
  assert.equal(workers[0], workers[1]); result.checks.workerSha256 = workers[0];
  await page.goto(`${base}/world#world-sources`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/preview-readonly-sw.js'));
  const probe = await page.evaluate(async () => { const r = await fetch('/__preview_guard_probe__', { method: 'POST' });
    return { status: r.status, blocked: r.headers.get('X-Preview-Write-Blocked') }; });
  assert.deepEqual(probe, { status: 403, blocked: 'true' }); result.checks.writeGuard = 'PASS';
  const anchor = async () => {
    await page.waitForFunction(() => { const el = document.getElementById('world-sources');
      return el && scrollY > 0 && Math.abs(el.getBoundingClientRect().top - 120) < 30; }, null, { timeout: 60000 });
    await page.waitForTimeout(3500);
    const position = await page.locator('#world-sources').evaluate(el => ({ top: el.getBoundingClientRect().top,
      scrollY, sources: el.querySelectorAll('[data-source-arrival]').length }));
    assert.ok(Math.abs(position.top - 120) < 30, 'Sources anchor must remain aligned after content settles');
    return position;
  };
  result.checks.directSources = await anchor();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const link = page.locator('a[href="/world#world-sources"]').first();
  await link.waitFor({ timeout: 60000 }); await link.click();
  result.checks.crossPageSources = await anchor();
  await page.goBack(); await page.waitForURL(url => url.pathname === '/');
  await page.goForward(); result.checks.forwardSources = await anchor();
  await page.goto(`${base}/number/1820`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('דף המספר נמצא בהכנה וייפתח בהמשך.', { exact: true }).waitFor({ timeout: 45000 });
  result.checks.liveNumberGuestLock = 'PASS: expected denial; no flag override';
  assert.equal(result.pageErrors, 0); result.status = 'PASS';
} catch (error) {
  result.status = 'FAIL'; result.failureType = error.name;
  process.exitCode = 1;
} finally {
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ status: result.status, checks: Object.keys(result.checks), pageErrors: result.pageErrors }));
