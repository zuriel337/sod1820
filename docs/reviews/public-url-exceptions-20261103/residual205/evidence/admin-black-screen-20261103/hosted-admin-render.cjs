// Regression of the actual hosted app/shell, using synthetic identities only.
// Every Supabase response is a local fixture. No credential, real account,
// live data write, model, mailing operation or administrative RPC is forwarded.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const [configPath, output] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(configPath));
assert.match(cfg.origin, /^https:\/\/sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.match(cfg.sha, /^[0-9a-f]{40}$/);
fs.mkdirSync(output, { recursive: true });
const report = { sha: cfg.sha, deployment: cfg.deploymentId, syntheticIdentity: true,
  liveAccountAcceptance: false, liveProductWrites: 0, liveModelCalls: 0, cases: [] };
const flush = () => fs.writeFileSync(output + '/receipt.json', JSON.stringify(report, null, 2) + '\n');
const safe = e => String(e.stack || e.message || e).replace(/_vercel_share=[^\s"')&]+/g, '_vercel_share=[REDACTED]').slice(0, 2500);
const scenarios = [
  { name: 'admin-320', width: 320 }, { name: 'admin-390', width: 390 },
  { name: 'admin-1440', width: 1440 }, { name: 'read-failures-390', width: 390, failedReaders: true },
  { name: 'member-denied-390', width: 390, role: 'member' }, { name: 'guest-denied-390', width: 390, guest: true },
];
const requested = process.argv.slice(4);
assert.ok(requested.every(name => scenarios.some(scenario => scenario.name === name)));
const selected = scenarios.filter(scenario => !requested.length || requested.includes(scenario.name));
report.selectedCases = selected.map(scenario => scenario.name);
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}) });
    for (const scenario of selected) {
      const row = { ...scenario, errors: [] }; report.cases.push(row); flush();
      const context = await browser.newContext({ viewport: { width: scenario.width, height: 900 }, locale: 'he-IL', isMobile: scenario.width < 600 });
      try {
        await context.request.get(cfg.shareUrl);
        const artifact = await (await context.request.get(cfg.origin + '/public-reading-artifact.json')).json();
        assert.equal(artifact.sourceSha, cfg.sha);
        assert.equal(artifact.protectedReview.deploymentId, cfg.deploymentId);
        await context.addInitScript(({ role, failedReaders }) => {
          const original = window.fetch.bind(window), uid = '11111111-1111-4111-8111-111111111111';
          const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'admin@example.invalid',
            app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
          const token = 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })) + '.synthetic';
          window.__adminRender = { fixtures: [], denied: [], rejections: [] };
          addEventListener('unhandledrejection', e => window.__adminRender.rejections.push(String(e.reason?.message || e.reason)));
          window.fetch = async (input, options) => {
            const request = new Request(input instanceof Request ? input : new URL(input, location.href), options), url = new URL(request.url);
            const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
            if (url.hostname.endsWith('supabase.co')) {
              window.__adminRender.fixtures.push({ path: url.pathname, method: request.method });
              if (url.pathname === '/auth/v1/settings') return json({ external: { email: true, google: true, facebook: true }, disable_signup: false });
              if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') return json({ access_token: token,
                refresh_token: 'synthetic-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user });
              if (url.pathname === '/auth/v1/user') return json(user);
              if (url.pathname === '/rest/v1/users') return json(url.searchParams.get('select') === 'id,role'
                ? [{ id: uid, role }] : { id: uid, role, username: 'synthetic-admin', display_name: 'Synthetic administrator', tier: 'member' });
              if (['admin_system_health', 'admin_video_map_health', 'admin_op_trace_list_v1'].some(rpc => url.pathname === '/rest/v1/rpc/' + rpc)) {
                if (failedReaders) return json({ message: 'Synthetic reader unavailable', code: 'TEST_UNAVAILABLE' }, 503);
                return json(url.pathname.endsWith('admin_op_trace_list_v1') ? [] : { generated_at: '2026-11-03T23:00:00Z', cron: [], security: { unacked: 0, recent_24h: 0 } });
              }
              if (url.pathname.startsWith('/rest/v1/')) return json([]);
              window.__adminRender.denied.push({ path: url.pathname, method: request.method });
              return json({ message: 'Independent fixture denies every other remote action' }, 403);
            }
            if (url.origin === location.origin && request.method === 'GET' && !url.pathname.startsWith('/api/')) return original(request);
            window.__adminRender.denied.push({ path: url.pathname, method: request.method });
            return new Response('Independent fixture denies remote actions', { status: 403 });
          };
          navigator.sendBeacon = () => false;
          window.WebSocket = class { constructor() { throw Error('Fixture denies sockets'); } };
        }, { role: scenario.role || 'admin', failedReaders: !!scenario.failedReaders });
        const page = await context.newPage();
        page.on('pageerror', e => row.errors.push(safe(e)));
        page.setDefaultNavigationTimeout(60000);
        if (scenario.guest) {
          await page.goto(cfg.origin + '/2029/control', { waitUntil: 'domcontentloaded' });
          await expect(page.getByRole('heading', { name: 'מרכז הבקרה', exact: true })).toBeVisible({ timeout: 30000 });
          await expect(page.getByRole('heading', { name: 'Control Plane', exact: true })).toHaveCount(0);
        } else {
          await page.goto(cfg.origin + '/login?returnTo=%2F2029%2Fcontrol', { waitUntil: 'domcontentloaded' });
          await page.getByRole('button', { name: 'כניסה עם סיסמה', exact: true }).click({ timeout: 45000 });
          await page.locator('input[type="email"]').fill('admin@example.invalid');
          await page.locator('input[type="password"]').fill('synthetic-not-a-real-password');
          await page.getByRole('button', { name: 'כניסה לחשבון ←', exact: true }).click();
          if (scenario.role === 'member') {
            await expect(page.getByRole('heading', { name: 'מרכז הבקרה', exact: true })).toBeVisible({ timeout: 30000 });
            await expect(page.getByRole('heading', { name: 'Control Plane', exact: true })).toHaveCount(0);
          } else {
            await expect(page.getByRole('heading', { name: 'Control Plane', exact: true })).toBeVisible({ timeout: 30000 });
            await expect(page.locator('.surface-control')).toBeVisible();
            if (scenario.failedReaders) {
              for (const title of ['לא ניתן לקרוא את מצב המערכת', 'לא ניתן לקרוא את מצב הווידאו', 'לא ניתן לקרוא traces כרגע']) await expect(page.getByRole('alert').filter({ hasText: title })).toBeVisible();
              await expect(page.getByText('רשימת ה־traces שהתקבלה ריקה', { exact: true })).toHaveCount(0);
            } else await expect(page.getByText('רשימת ה־traces שהתקבלה ריקה', { exact: true })).toBeVisible();
            // Direct reload with the SDK-owned synthetic session reproduces the
            // returning-admin entry independently of the first password form.
            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(page.getByRole('heading', { name: 'Control Plane', exact: true })).toBeVisible({ timeout: 30000 });
          }
        }
        await page.waitForFunction(() => !!navigator.serviceWorker.controller);
        row.observed = await page.evaluate(() => ({ path: location.pathname, sw: !!navigator.serviceWorker.controller,
          fixtures: window.__adminRender.fixtures, denied: window.__adminRender.denied, rejections: window.__adminRender.rejections,
          viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, hasMain: !!document.querySelector('main') }));
        assert.deepEqual(row.errors, []); assert.deepEqual(row.observed.rejections, []);
        assert.deepEqual(row.observed.denied, []);
        assert.ok(row.observed.documentWidth <= row.observed.viewport + 1);
        const adminReads = row.observed.fixtures.filter(r => /\/admin_(system_health|video_map_health|op_trace_list_v1)$/.test(r.path));
        if (scenario.guest || scenario.role === 'member') assert.equal(adminReads.length, 0);
        else assert.equal(adminReads.length, 3);
        row.passed = true;
        await page.screenshot({ path: output + '/' + scenario.name + '.png', fullPage: true });
      } catch (error) { row.passed = false; row.failure = safe(error); }
      finally { await context.close(); flush(); console.log(JSON.stringify({ name: row.name, passed: row.passed, failure: row.failure })); }
    }
  } catch (error) { report.fatal = safe(error); }
  finally {
    await browser?.close();
    report.passed = report.cases.filter(c => c.passed).length;
    report.ok = !report.fatal && report.cases.length === selected.length && report.passed === selected.length;
    flush(); console.log(JSON.stringify({ ok: report.ok, passed: report.passed, total: report.cases.length, fatal: report.fatal }));
    process.exitCode = report.ok ? 0 : 1;
  }
})();
