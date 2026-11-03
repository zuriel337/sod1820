// Public UI availability only: never fill an address, consent, submit or opt out.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 45000 });
const [configPath, output] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(configPath));
const origin = cfg.origin;
assert.match(origin, /^https:\/\/sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.match(cfg.sha, /^[0-9a-f]{40}$/);
const db = 'https://linswmnnkjxvweumprav.supabase.co';
const inventory = JSON.parse(execFileSync('git', ['show', 'HEAD:docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json'], { encoding: 'utf8' }));
const reads = inventory.functions.map(x => x.proname).filter(x => x !== 'lang_links_list');
reads.push('convergence_meter', 'is_number_indexable', 'is_phrase_indexable', 'writer_public_contributions_page_v1');
const report = { productSha: cfg.sha, deployment: cfg.deploymentId,
  liveSharedEndpoint: true, actualSW: true, signupSubmitted: false, unsubscribeSubmitted: false, testMail: false,
  existingAccountAcceptance: 'RETAINED_NOT_REPEATED', cases: [], errors: [] };
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const flush = () => fs.writeFileSync(output + '/receipt.json', JSON.stringify(report, null, 2) + '\n');
const safe = e => String(e.message).replace(/_vercel_share=[^\s"')&]+/g, '_vercel_share=[REDACTED]').slice(0, 1500);
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
      ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
      await context.request.get(cfg.shareUrl);
      const a = await (await context.request.get(origin + '/public-reading-artifact.json')).json();
      assert.equal(a.sourceSha, report.productSha); assert.equal(a.protectedReview.deploymentId, report.deployment);
      await context.addInitScript(({ db, origin, reads }) => {
        const original = window.fetch.bind(window), rpcAllow = new Set(reads);
        window.__bdRequests = []; window.__bdDenied = [];
        const allowed = r => {
          const u = new URL(r.url), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
          return u.origin === origin && r.method === 'GET'
            || u.origin === db && (
              u.pathname.startsWith('/rest/v1/') && (!rpc || rpcAllow.has(rpc)) && (['GET', 'HEAD'].includes(r.method) || rpc && r.method === 'POST')
              || r.method === 'GET' && ['/auth/v1/settings', '/auth/v1/user'].includes(u.pathname)
              || r.method === 'GET' && u.pathname.startsWith('/storage/v1/object/public/')
              || r.method === 'OPTIONS' && u.pathname === '/functions/v1/newsletter-signup' && !u.search && r.body === null);
        };
        window.fetch = (input, init) => {
          const r = new Request(input instanceof Request ? input : new URL(input, location.href), init);
          const u = new URL(r.url), row = { path: u.pathname, method: r.method };
          if (!allowed(r)) { window.__bdDenied.push(row); return Promise.reject(Error('independent_bd_nonwriting_guard')); }
          window.__bdRequests.push(row);
          return original(r).then(response => { row.status = response.status; if (r.method === 'OPTIONS') row.contract = response.headers.get('x-newsletter-purpose-contract'); return response; });
        };
        const open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          const r = new Request(new URL(url, location.href), { method });
          if (!['GET', 'HEAD'].includes(r.method) || !allowed(r)) throw Error('independent_bd_nonwriting_guard');
          return open.call(this, method, url, ...rest);
        };
        navigator.sendBeacon = () => false;
        window.WebSocket = class { constructor() { throw Error('independent_bd_nonwriting_guard'); } };
      }, { db, origin, reads });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(60000);
      page.on('pageerror', e => report.errors.push(safe(e)));
      const cdp = await context.newCDPSession(page); await cdp.send('Network.enable');
      await cdp.send('Network.setBlockedURLs', { urls: ['https://vercel.live/_next-live/feedback/feedback.js', '*://*.google-analytics.com/*', '*://*.googletagmanager.com/*', '*://www.facebook.com/tr*', '*://connect.facebook.net/*', '*://*.clarity.ms/*'] });
      for (const path of ['/updates', '/']) {
        const row = { width, path }; report.cases.push(row); flush();
        try {
          const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded' }); assert.equal(response.status(), 200);
          const region = page.getByRole('region', { name: 'עדכוני האתר', exact: true });
          await expect(region).toBeVisible(); assert.equal(await region.locator('input').count(), 0);
          await page.keyboard.press('Escape');
          await region.getByRole('button', { name: 'הרשמה לעדכוני האתר', exact: true }).click();
          await expect(region.locator('input[type="email"]')).toBeVisible();
          assert.equal(await region.locator('input[type="email"]').inputValue(), '');
          assert.equal(await region.locator('input[type="checkbox"]').isChecked(), false);
          await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'));
          const state = await page.evaluate(() => ({ requests: window.__bdRequests, denied: window.__bdDenied, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
          row.newsletterRequests = state.requests.filter(x => x.path === '/functions/v1/newsletter-signup');
          assert.equal(row.newsletterRequests.length, 1); assert.equal(row.newsletterRequests[0].method, 'OPTIONS');
          assert.ok(row.newsletterRequests[0].contract.split(',').map(x => x.trim()).includes('site-updates-v1'));
          assert.deepEqual(state.denied, []); assert.ok(state.documentWidth <= state.viewport + 1);
          row.passed = true; row.consentChecked = false; row.emailEntered = false;
          await page.screenshot({ path: output + '/form-' + (path === '/' ? 'home' : 'updates') + '-' + width + '.png' });
        } catch (e) { row.passed = false; row.failure = safe(e); await page.screenshot({ path: output + '/failure-' + width + '-' + report.cases.length + '.png' }).catch(() => {}); }
        flush(); console.log(JSON.stringify(row));
      }
      await context.close();
    }
  } catch (e) { report.fatal = safe(e); }
  finally {
    await browser?.close(); report.passed = report.cases.filter(x => x.passed).length;
    report.failed = report.cases.filter(x => !x.passed).length;
    report.ok = !report.fatal && report.cases.length === 4 && report.failed === 0 && report.errors.length === 0;
    flush(); console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, errors: report.errors, fatal: report.fatal }));
    process.exitCode = report.ok ? 0 : 1;
  }
})();
