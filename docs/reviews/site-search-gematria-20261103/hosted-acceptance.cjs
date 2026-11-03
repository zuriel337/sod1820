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
const report = { kind: 'site-search-gematria-public-hosted-acceptance', productSha: config.sha,
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
      const row = { origin: u.origin, path: u.pathname, method: req.method, suggestionFilter: u.searchParams.get('title') || u.searchParams.get('display_name') || null };
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

        phase('home-search-lazy');
        const back='/?keep=one&keep=two#search-return';
        await go(back);
        await expect(page.locator('[data-home-top-updates="public-closed"]')).toBeVisible();
        await expect(page.locator('[data-home-public-series="true"]')).toHaveAttribute('aria-busy','false');
        assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(x=>/SiteSearch2029-/.test(x.name))),false);
        const header=page.getByRole('button',{name:'חיפוש באתר',exact:true});
        await header.click();const search=page.getByRole('dialog',{name:'חיפוש באתר',exact:true});
        const input=search.getByRole('combobox');await expect(input).toBeVisible();
        assert.equal(await page.evaluate(()=>window.__serviceReads.filter(x=>x.suggestionFilter).length),0);
        await input.fill('צ');await page.waitForTimeout(400);
        assert.equal(await page.evaluate(()=>window.__serviceReads.filter(x=>x.suggestionFilter).length),0);
        phase('real-content-completions');
        await input.fill('סוד');await expect(search.getByRole('listbox')).toHaveAttribute('aria-busy','false');
        await expect(search.getByRole('option',{name:/סדרות סוד החשמל/})).toBeVisible();
        const posts=search.getByRole('option').filter({has:page.locator('small',{hasText:'פוסטים'})});
        assert.ok(await posts.count()>0,'public post title suggestions exist');
        assert.equal(await search.getByRole('alert').count(),0);
        assert.ok(await search.locator('mark').count()>0);
        item.suggestions=await search.getByRole('option').evaluateAll(nodes=>nodes.map(n=>({text:n.innerText,href:n.getAttribute('href')})));
        const reads=await page.evaluate(()=>window.__serviceReads.filter(x=>x.suggestionFilter));
        assert.equal(reads.length,3);assert.ok(reads.every(x=>x.status===200 && x.method==='GET'));
        item.searchReads=reads;
        assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(x=>/SiteSearch2029-/.test(x.name))),true);
        await page.screenshot({path:`${output}/search-${width}.png`});
        const rect=await search.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(rect.scroll<=rect.width+1);
        item.checks.push('no-search-chunk-before-open','no-suggestion-reads-until-two-characters','three-bounded-public-GETs','real-series-and-post-completions/highlight','no-horizontal-overflow');
        await snapshot('real-suggestions');
        phase('post-destination-and-exact-return');
        const href=await posts.first().getAttribute('href');item.selectedPost=href;
        await posts.first().click();await page.waitForURL(config.origin+href);
        await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible();
        if(width<800){await page.getByRole('button',{name:'פתח ניווט',exact:true}).click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}
        else await page.locator('button[aria-label="חזרה מדויקת"]:visible').first().click();
        await page.waitForURL(config.origin+back);
        item.checks.push('real-post-public-canonical-href','exact-return-query-duplicates-and-fragment');
        await snapshot('returned-home');
        phase('gematria-distinct-and-public-locks');
        await page.getByRole('button',{name:'גימטריה · מספר, ביטוי ושיטות חישוב',exact:true}).click();
        await expect(page.getByRole('dialog',{name:'מספר / ביטוי',exact:true})).toBeVisible();
        assert.equal(await page.getByRole('combobox').count(),0);
        await page.keyboard.press('Escape');
        await expect(page.locator('.sod29-dock-here')).toBeDisabled();await expect(page.locator('.sod29-raziel-orb')).toBeDisabled();
        await page.keyboard.press('Control+k');await expect(input).toBeVisible();await page.keyboard.press('Escape');
        item.checks.push('bottom-Gematria-distinct','CtrlK-content-search','public-Here-and-Raziel-closed');
        await snapshot('completed');
        assert.deepEqual(item.errors,[]);
        assert.ok(item.documents.every(x=>x.controller==='/sw.js' && x.documentWidth<=x.viewport+1));
        assert.deepEqual(item.documents.flatMap(x=>x.denied||[]),[]);
        assert.equal(item.documents.flatMap(x=>x.reads||[]).filter(x=>x.method==='POST'&&!x.path.startsWith('/rest/v1/rpc/')).length,0);
        item.ok=true;
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
