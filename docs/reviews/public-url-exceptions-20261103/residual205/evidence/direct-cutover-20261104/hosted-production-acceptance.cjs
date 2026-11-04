// Exact-source anonymous acceptance only. No login, mail, model or live writes.
// Private deployment-access configuration is supplied separately and never saved.
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 45000 });
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const [configPath, output] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath));
const origin = new URL(config.url).origin;
const db = 'https://linswmnnkjxvweumprav.supabase.co';
assert.match(origin, /^https:\/\/sod1820-(?:[a-z0-9]+|git-gpt-2029-public-cutover-f-7ce8ee)-sod1820-s-projects\.vercel\.app$/);
assert.match(config.sha, /^[0-9a-f]{40}$/);
const reads = require(path.resolve('docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json')).functions.map(x => x.proname).filter(x => x !== 'lang_links_list');
reads.push('convergence_meter', 'is_number_indexable', 'is_phrase_indexable', 'writer_public_contributions_page_v1');
const previous = require(path.resolve('docs/reviews/public-url-exceptions-20261103/residual205/evidence/final-preparation/hosted/accepted-runtime7fe.json'));
const postPath = previous.cases.find(x => x.postId === '1259').returnTo;
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const report = { sourceSha: config.sha, branch: config.branch, deploymentId: config.deploymentId,
  origin, realPublicData: true, actualSW: true, performanceMeasurement: false,
  modelCalls: 0, liveWrites: 0, testMail: 0, genuineTwoAccountAcceptance: 'RETAINED_NOT_REPEATED',
  productionPublicMode: 'NOT_DEPLOYED_OR_CLAIMED', cases: [], errors: [], requests: [], denied: [] };
const flush = () => fs.writeFileSync(output + '/receipt.json', JSON.stringify(report, null, 2) + '\n');
const safeError = e => ({ name: e.name, message: String(e.message).replace(/_vercel_share=[^\s"')&]+/g, '_vercel_share=[REDACTED]').slice(0, 1800) });

async function guard(context) {
  await context.addInitScript(({ db, origin, reads }) => {
    const fetchOriginal = window.fetch.bind(window), allowedRPC = new Set(reads);
    window.__guardReads = []; window.__guardDenied = [];
    function allowed(req) {
      const u = new URL(req.url), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
      return (u.origin === origin && req.method === 'GET' && (!u.pathname.startsWith('/api/') || /^\/api\/public-(?:document|robots|sitemap)$/.test(u.pathname)))
        || (u.origin === db && (
          u.pathname.startsWith('/rest/v1/') && (!rpc || allowedRPC.has(rpc)) && (['GET', 'HEAD'].includes(req.method) || rpc && req.method === 'POST')
          || req.method === 'GET' && ['/auth/v1/settings', '/auth/v1/user'].includes(u.pathname)
          || req.method === 'GET' && u.pathname.startsWith('/storage/v1/object/public/')));
    }
    window.fetch = (input, init) => {
      const req = new Request(input instanceof Request ? input : new URL(input, location.href), init);
      const u = new URL(req.url), row = { origin: u.origin, path: u.pathname, method: req.method };
      if (!allowed(req)) { window.__guardDenied.push(row); return Promise.reject(Error('independent_read_only_guard')); }
      window.__guardReads.push(row); return fetchOriginal(req).then(r => { row.status = r.status; return r; });
    };
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const req = new Request(new URL(url, location.href), { method });
      if (!['GET', 'HEAD'].includes(req.method) || !allowed(req)) throw Error('independent_read_only_guard');
      return open.call(this, method, url, ...rest);
    };
    navigator.sendBeacon = () => false;
    window.WebSocket = class { constructor() { throw Error('independent_read_only_guard'); } };
  }, { db, origin, reads });
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
      ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
      if (config.shareUrl) await context.request.get(config.shareUrl);
      await guard(context);
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(60000);
      page.on('pageerror', e => report.errors.push(safeError(e)));
      const cdp = await context.newCDPSession(page); await cdp.send('Network.enable');
      await cdp.send('Network.setBlockedURLs', { urls: ['https://vercel.live/_next-live/feedback/feedback.js', '*://*.google-analytics.com/*', '*://*.googletagmanager.com/*', '*://www.facebook.com/tr*', '*://connect.facebook.net/*', '*://*.clarity.ms/*'] });
      async function go(url) {
        const r = await page.goto(origin + url, { waitUntil: 'domcontentloaded' });
        assert.equal(r.status(), 200); assert.match(r.headers()['x-robots-tag'] || '', /noindex/);
        await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'));
        return r;
      }
      async function run(name, fn) {
        if (config.caseNames && !config.caseNames.includes(name)) return;
        const row = { name, width }; report.cases.push(row); flush();
        try { await fn(row); row.passed = true; }
        catch (e) { row.passed = false; row.failure = safeError(e); await page.screenshot({ path: `${output}/failure-${width}-${report.cases.length}.png` }).catch(() => {}); }
        const state = await page.evaluate(() => ({ reads: window.__guardReads || [], denied: window.__guardDenied || [], path: location.pathname,
          viewport: innerWidth, documentWidth: document.documentElement.scrollWidth })).catch(() => null);
        if (state) { report.requests.push(...state.reads); report.denied.push(...state.denied); row.path = state.path; row.noOverflow = state.documentWidth <= state.viewport + 1; }
        flush(); console.log(JSON.stringify({ name, width, passed: row.passed, failure: row.failure }));
      }
      await run('exact Preview artifact, real Home/SW and retained public series', async row => {
        const r = await context.request.get(origin + '/public-reading-artifact.json'); assert.equal(r.status(), 200);
        const a = await r.json(); assert.equal(a.sourceSha, config.sha); assert.equal(a.protectedReview.deploymentId, config.deploymentId);
        assert.equal(a.protectedReview.mode, config.expectedMode); assert.equal(a.protectedReview.target, 'production'); report.productionPublicMode = a.protectedReview.mode; assert.equal(a.protectedReview.branch, config.branch);
        assert.equal(a.productionReady, false); assert.equal(a.applicationSourceDirty, false);
        const sw = await context.request.get(origin + '/sw.js'); assert.equal(sw.status(), 200);
        assert.equal(crypto.createHash('sha256').update(await sw.body()).digest('hex'), a.workerSha256);
        await go('/?guard-acceptance=1'); await expect(page.locator('[data-home-top-updates="public-closed"]')).toBeVisible();
        await expect(page.locator('[data-home-public-series="true"]')).toHaveAttribute('aria-busy', 'false');
        row.series = await page.locator('[data-home-series]').count(); assert.ok(row.series >= 4);
        const dock = page.locator('.sod29-command-island');
        await expect(dock.locator('.sod29-raziel-orb')).toBeDisabled(); await expect(dock.locator('.sod29-dock-here')).toBeDisabled();
        await page.screenshot({ path: `${output}/home-${width}.png` });
        row.worker = '/sw.js';
      });
      await run('real old Post, full Number/Phrase and exact history return', async row => {
        await go(postPath); await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible();
        const oldCanonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        assert.equal(config.canonicalBaselineSha, '01662ab57e92ea71332c05ca971a2280ddb988ea');
        assert.equal(oldCanonical, config.expectedPostCanonical, 'retain the exact canonical observed on the accepted prior deployment');
        row.canonicalBaselineSha = config.canonicalBaselineSha;
        const phrase = 'משיח';
        await go('/number/1820?returnTo=' + encodeURIComponent(postPath));
        await expect(page.locator('[data-number-core-root="1820"]')).toBeVisible();
        const numberPath = new URL(page.url()).pathname + new URL(page.url()).search;
        await go('/number/358?phrase=' + encodeURIComponent(phrase) + '&method=regular&returnTo=' + encodeURIComponent(numberPath));
        await expect(page.locator('[data-number-core-root="358"]')).toBeVisible(); await expect(page.locator('.sod29-number-page')).toContainText(phrase);
        await page.goBack({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-number-core-root="1820"]')).toBeVisible();
        await page.goBack({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible();
        const u = new URL(page.url()); assert.equal(u.pathname + u.search + u.hash, postPath);
        row.postId = '1259'; row.canonical = oldCanonical; row.exactReturn = postPath;
      });
      await run('World/calculator, login copy and anonymous administrator denial', async row => {
        await go('/world'); await expect(page.locator('h1').first()).toContainText(/עולם/);
        await go('/gematria?q=' + encodeURIComponent('משיח'));
        await expect(page.locator('[data-experience-surface="calculator-pro-2029"]')).toBeVisible();
        await expect(page.locator('[data-experience-surface="calculator-pro-2029"]')).toContainText('358');
        const returnTo = '/world?keep=one&keep=two#source'; await go('/login?returnTo=' + encodeURIComponent(returnTo));
        await expect(page.locator('[data-experience-surface="auth-2029"]')).toBeVisible();
        await expect(page.locator('[data-signup-updates-policy="existing-site-default"]')).toContainText('כניסה לחשבון קיים אינה משנה');
        await expect(page.getByRole('button', { name: /Google/ })).toBeDisabled(); await expect(page.getByRole('button', { name: /Facebook/ })).toBeDisabled();
        await expect(page.locator('.sod29-auth-return')).toHaveAttribute('href', returnTo);
        await go('/2029/control'); assert.equal(await page.locator('[data-experience-surface="control-plane"]').count(), 0);
        await expect(page.locator('main')).toContainText(/פרטי|כניסה|מורש/);
        row.actualAdministrator = 'NOT_TESTED'; row.socialLogin = 'OWNER_CALLBACK_STEP_DEFERRED';
      });
      await context.close();
    }
  } catch (e) { report.fatal = safeError(e); }
  finally {
    await browser?.close(); report.finishedAt = new Date().toISOString();
    report.passed = report.cases.filter(x => x.passed).length; report.failed = report.cases.filter(x => !x.passed).length;
    report.expectedCases = config.caseNames ? config.caseNames.length * 2 : 6;
    report.ok = !report.fatal && report.cases.length === report.expectedCases && report.failed === 0 && report.errors.length === 0 && report.denied.length === 0 && report.cases.every(x => x.noOverflow);
    flush(); console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, errors: report.errors, denied: report.denied, fatal: report.fatal }));
    process.exitCode = report.ok ? 0 : 1;
  }
})();
