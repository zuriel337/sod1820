// Additional service-boundary acceptance only; no performance cohort or live writes.
// Run with a private 0600 access config, never commit that config or browser state.
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 30000 });
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const [configPath, output] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath));
assert.match(config.origin, /^https:\/\/sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/);
assert.match(config.sha, /^[0-9a-f]{40}$/);
const db = 'https://linswmnnkjxvweumprav.supabase.co';
const reads = require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x => x.proname).filter(x => x !== 'lang_links_list');
reads.push('convergence_meter', 'is_number_indexable', 'is_phrase_indexable', 'writer_public_contributions_page_v1');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const report = { kind: 'admin-home-dock-public-hosted-acceptance', productSha: config.sha,
  origin: config.origin, actualSW: true, performanceComparison: false,
  liveLogin: false, liveSignup: false, liveUnsubscribe: false, mailSent: false,
  sameIndependentRPCReadInventory: true, cases: [] };
const flush = () => fs.writeFileSync(output + '/receipt.json', JSON.stringify(report, null, 2) + '\n');
const safeError = error => ({ name: error.name, message: String(error.message).replace(/_vercel_share=[^\s"')&]+/g, '_vercel_share=[REDACTED]').slice(0, 1600) });

async function installGuard(context) {
  // This task's independent guard retains the prior RPC inventory. Its only
  // additional service request is exact OPTIONS /newsletter-signup, with no
  // query/body; all signup/login/unsubscribe and other mutations stay denied.
  await context.addInitScript(({ db, origin, reads }) => {
    const fetchOriginal = window.fetch.bind(window), permitted = new Set(reads);
    window.__serviceReads = []; window.__serviceDenied = [];
    function admission(req) {
      const u = new URL(req.url), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];
      const read = u.origin === db && (
        u.pathname.startsWith('/rest/v1/') && (!rpc || permitted.has(rpc)) &&
          (['GET', 'HEAD'].includes(req.method) || rpc && req.method === 'POST') ||
        req.method === 'GET' && ['/auth/v1/settings', '/auth/v1/user'].includes(u.pathname) ||
        req.method === 'GET' && u.pathname.startsWith('/storage/v1/object/public/'));
      const probe = u.origin === db && u.pathname === '/functions/v1/newsletter-signup' &&
        !u.search && req.method === 'OPTIONS' && req.body === null;
      const local = req.method === 'GET' && u.origin === origin &&
        (!u.pathname.startsWith('/api/') || /^\/api\/(?:public-document|public-sitemap|public-robots)$/.test(u.pathname));
      return { allowed: read || probe || local, u, probe };
    }
    window.fetch = (input, init) => {
      const req = new Request(input instanceof Request ? input : new URL(input, location.href), init);
      const { allowed, u, probe } = admission(req);
      const row = { origin: u.origin, path: u.pathname, method: req.method };
      if (!allowed) { window.__serviceDenied.push(row); return Promise.reject(Error('independent_service_guard')); }
      window.__serviceReads.push(row);
      return fetchOriginal(req).then(response => {
        row.status = response.status;
        if (probe) row.contract = response.headers.get('x-newsletter-purpose-contract');
        return response;
      });
    };
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const req = new Request(new URL(url, location.href), { method });
      if (!['GET', 'HEAD'].includes(req.method) || !admission(req).allowed) throw Error('independent_service_guard');
      return open.call(this, method, url, ...rest);
    };
    navigator.sendBeacon = () => false;
    window.WebSocket = class { constructor() { throw Error('independent_service_guard'); } };
  }, { db, origin: config.origin, reads });
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
      ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    report.browser = browser.version();
    for (const width of [320, 390, 1440]) {
      const item = { width, startedAt: new Date().toISOString(), checks: [], documents: [], errors: [] };
      report.cases.push(item); flush();
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
      let page;
      try {
        if (config.accessUrl) await context.request.get(config.accessUrl);
        const manifestResponse = await context.request.get(config.origin + '/public-reading-artifact.json');
        assert.equal(manifestResponse.status(), 200);
        const manifest = await manifestResponse.json();
        assert.equal(manifest.sourceSha, config.sha); assert.equal(manifest.productionReady, false);
        assert.equal(manifest.applicationSourceDirty, false); assert.equal(manifest.automaticModelCalls, false); assert.equal(manifest.newSignup, false);
        const worker = await context.request.get(config.origin + '/sw.js');
        assert.equal(worker.status(), 200);
        assert.equal(crypto.createHash('sha256').update(await worker.body()).digest('hex'), manifest.workerSha256);
        item.identity = { sourceSha: manifest.sourceSha, productionReady: manifest.productionReady, workerSha256: manifest.workerSha256 };
        await installGuard(context);
        page = await context.newPage(); page.setDefaultNavigationTimeout(30000);
        page.on('pageerror', error => item.errors.push(safeError(error)));
        const cdp = await context.newCDPSession(page); await cdp.send('Network.enable');
        await cdp.send('Network.setBlockedURLs', { urls: ['https://vercel.live/_next-live/feedback/feedback.js', '*://*.google-analytics.com/*', '*://*.googletagmanager.com/*', '*://www.facebook.com/tr*', '*://connect.facebook.net/*', '*://*.clarity.ms/*'] });
        const phase = value => { item.phase = value; flush(); };
        async function snapshot(label) {
          item.documents.push({ label, ...await page.evaluate(() => ({ path: location.pathname,
            controller: navigator.serviceWorker.controller ? new URL(navigator.serviceWorker.controller.scriptURL).pathname : null,
            reads: window.__serviceReads, denied: window.__serviceDenied,
            viewport: innerWidth, documentWidth: document.documentElement.scrollWidth })) }); flush();
        }
        async function go(path) {
          const response = await page.goto(config.origin + path, { waitUntil: 'commit' });
          assert.equal(response.status(), 200);
          assert.match(response.headers()['x-robots-tag'] || '', /noindex/);
          assert.equal(response.headers()['cache-control'], 'no-store'); return response;
        }
        phase('home-panel-dock-and-pending-mail');
        await go('/?hosted-admin-home=1&keep=one&keep=two#service-return');
        const panel=page.locator('[data-home-top-updates="public-closed"]');
        await expect(panel).toBeVisible();await expect(panel).toContainText('האתר בבנייה');
        await expect(panel.locator('[data-home-updates-preview="illustration"]')).toBeVisible();
        assert.ok(!(await panel.innerText()).includes('הסרה'));
        assert.equal(await page.locator('.h29').evaluate(el=>el.firstElementChild.hasAttribute('data-home-top-updates')),true);
        await expect(page.locator('[data-home-public-series="true"]')).toHaveAttribute('aria-busy','false');
        assert.ok(await page.locator('[data-home-series]').count()>=3,'real public series kept');
        const dock=page.locator('.sod29-command-island');
        await expect(dock.locator('.sod29-dock-here')).toBeDisabled();
        await expect(dock.locator('.sod29-raziel-orb')).toBeDisabled();
        await expect(dock.locator('.sod29-dock-here')).toContainText('בבנייה');
        await expect(dock.locator('.sod29-raziel-orb')).toContainText('בבנייה');
        item.dock=await dock.evaluate(el=>{
          const r=el.getBoundingClientRect(), root=document.documentElement.getBoundingClientRect(), frame=el.closest('.sod29-root').getBoundingClientRect();
          return {left:r.left,width:r.width,viewport:innerWidth,contentLeft:root.left,contentWidth:root.width,
            frameLeft:frame.left,frameWidth:frame.width,scrollbarGutter:getComputedStyle(document.documentElement).scrollbarGutter,
            purple:getComputedStyle(el.querySelector('.sod29-raziel-orb-core')).backgroundImage};
        });
        // The real artifact reserves a stable scrollbar gutter. Its document
        // rectangle is the usable containing block; innerWidth includes the
        // reserved 15px even when Chromium reports clientWidth === innerWidth.
        // Verify both document and actual Frame centers, retaining the 2px limit.
        assert.ok(Math.abs(item.dock.left+item.dock.width/2-(item.dock.contentLeft+item.dock.contentWidth/2))<2);
        assert.ok(Math.abs(item.dock.left+item.dock.width/2-(item.dock.frameLeft+item.dock.frameWidth/2))<2);
        assert.ok(item.dock.contentWidth>=width-20 && item.dock.contentWidth<=width);
        assert.ok(item.dock.left>=item.dock.contentLeft && item.dock.left+item.dock.width<=item.dock.contentLeft+item.dock.contentWidth);
        assert.ok(item.dock.width<500);
        const now=dock.getByRole('button',{name:/^עכשיו/});await now.click();
        await expect(page.getByRole('dialog',{name:'עכשיו',exact:true})).toBeVisible();await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog',{name:'עכשיו',exact:true})).toHaveCount(0);
        item.checks.push('Claude-panel-first/construction/signup-only-copy','real-series-remain','public-Here-and-Raziel-disabled/purple','compact-centered-dock/Now-open-close');
        await page.screenshot({path:`${output}/home-${width}.png`});
        const mail=page.getByRole('region',{name:'עדכוני האתר',exact:true});
        assert.equal(await mail.locator('input').count(),0);
        assert.equal(await page.evaluate(()=>window.__serviceReads.filter(x=>x.path==='/functions/v1/newsletter-signup').length),0);
        await mail.getByRole('button',{name:'הרשמה לעדכוני האתר',exact:true}).click();
        await expect(mail.getByRole('alert')).toContainText('עדיין אינה זמינה');
        assert.equal(await mail.locator('input').count(),0);
        const probes=await page.evaluate(()=>window.__serviceReads.filter(x=>x.path==='/functions/v1/newsletter-signup'));
        assert.equal(probes.length,1);assert.equal(probes[0].method,'OPTIONS');assert.equal(probes[0].contract,'opening-parts-v1');
        item.checks.push('no-startup-mail-probe','pending-contract-honest/no-signup-POST');await snapshot('home-mail-pending');
        phase('existing-account-entry-without-login');
        const returnPath = '/world?keep=one&keep=two#service-return';
        await go('/login?returnTo=' + encodeURIComponent(returnPath));
        await expect(page.locator('[data-experience-surface="auth-2029"]')).toBeVisible();
        await expect(page.getByRole('button', {name:/Google/})).toBeDisabled();
        await expect(page.getByRole('button', {name:/Facebook/})).toBeDisabled();
        await page.getByRole('button',{name:'כניסה עם סיסמה',exact:true}).click();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.getByText('כניסה עם Google ו־Facebook תיפתח בהמשך.',{exact:false})).toBeVisible();
        await expect(page.locator('.sod29-auth-return')).toHaveAttribute('href', returnPath);
        item.checks.push('existing-account-password-and-otp-entry/social-pending', 'return-query-and-fragment-preserved', 'no-login-submission');
        await page.screenshot({ path: `${output}/login-${width}.png` }); await snapshot('login-anonymous');
        phase('unsigned-unsubscribe');
        const unsub = await go('/unsubscribe');
        assert.equal(unsub.headers()['referrer-policy'], 'no-referrer');
        await expect(page.getByRole('heading', { name: 'קישור לא תקין', exact: true })).toBeVisible();
        assert.equal(await page.evaluate(() => window.__serviceReads.filter(x => x.path.includes('newsletter-unsubscribe')).length), 0);
        item.checks.push('tokenless-unsubscribe-invalid-no-request');
        await snapshot('unsubscribe-without-token');
        phase('anonymous-closed-routes');
        for (const path of ['/code', '/heichal', '/2029/journey', '/2029/raziel', '/community/chat']) {
          await go(path);
          await expect(page.getByRole('heading', { name: 'האזור ייפתח בהמשך', exact: true })).toBeVisible();
          assert.equal(await page.locator('[data-admin-view="read-only"]').count(), 0);
          await snapshot('closed:' + path);
        }
        item.checks.push('five-anonymous-large-system-routes-closed');
        assert.deepEqual(item.errors, []);
        assert.ok(item.documents.every(x => x.controller === '/sw.js'));
        assert.ok(item.documents.every(x => x.documentWidth <= x.viewport + 1));
        assert.deepEqual(item.documents.flatMap(x => x.denied || []), []);
        assert.equal(item.documents.flatMap(x => x.reads || []).filter(x =>
          x.method === 'POST' && !x.path.startsWith('/rest/v1/rpc/')).length, 0);
        item.ok = true;
      } catch (error) {
        item.ok = false; item.failure = safeError(error);
        if (page) {
          item.failureState = await page.evaluate(() => ({ path: location.pathname, body: document.body.innerText.slice(0, 1800), denied: window.__serviceDenied, reads: window.__serviceReads })).catch(() => null);
          await page.screenshot({ path: `${output}/failure-${width}.png` }).catch(() => {});
        }
      } finally {
        await context.close(); item.finishedAt = new Date().toISOString(); flush();
        console.log(JSON.stringify({ width, ok: item.ok, phase: item.phase, failure: item.failure }));
      }
    }
  } catch (error) { report.fatal = safeError(error); }
  finally {
    await browser?.close(); report.ok = !report.fatal && report.cases.length === 3 && report.cases.every(x => x.ok);
    flush(); console.log(JSON.stringify({ ok: report.ok, cases: report.cases.length, fatal: report.fatal }));
    process.exitCode = report.ok ? 0 : 1;
  }
})();
