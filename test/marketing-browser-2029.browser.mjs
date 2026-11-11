// Real Chromium, the BUILT public-reading artifact (built WITH test marketing ids), its real service worker and the deployment's real CSP.
// Meta Pixel and Google AdSense are enabled on the 2029 public site (ZURIEL, 11.11.2026): the app starts the Pixel on an admitted public route,
// the Conversions API relay is allowed through the worker, and every AdSense/Meta transport host is admitted by the CSP and reaches the network.
//   VITE_META_PIXEL_ID=1234567890123456 VITE_ADSENSE_CLIENT=ca-pub-0000000000000000 node scripts/build-public-reading-production.mjs
//   node --test test/marketing-browser-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const PIXEL = '1234567890123456';
const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const builtWithIds = () => { try { const dir = join(dist, 'assets'); return readdirSync(dir).filter(f => f.endsWith('.js')).some(f => readFileSync(join(dir, f), 'utf8').includes(PIXEL)); } catch { return false; } };
const skip = !(Boolean(pw) && existsSync(join(dist, 'sw.js')) && builtWithIds()) && 'playwright, or an artifact built with the test marketing ids, is unavailable';

const HOSTS = /^https:\/\/(connect\.facebook\.net|www\.facebook\.com|pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net|ep1\.adtrafficquality\.google|ep2\.adtrafficquality\.google|www\.google\.com|tracker\.invalid)\//;
const FBEVENTS = `(function(){var q=(window.fbq&&window.fbq.queue||[]).slice();window.__fbCalls=q.map(function(a){return Array.prototype.slice.call(a)});
fetch('https://www.facebook.com/tr/?id=${PIXEL}&ev=PageView',{method:'POST',body:'x',mode:'no-cors',keepalive:true}).catch(function(){});})();`;
const ADSBYGOOGLE = `window.__adsLoaded=true;`;

test('Meta Pixel starts on an admitted public route; CAPI relay and every Pixel/AdSense transport reach the network; the CSP stays closed to other hosts', { skip, timeout: 120000 }, async () => {
  const fixture = await startFixture({ deploymentCsp: true });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
    const reached = [];
    await context.route(HOSTS, route => {
      const url = new URL(route.request().url()); reached.push(url.origin + url.pathname);
      if (url.pathname === '/en_US/fbevents.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: FBEVENTS });
      if (url.pathname === '/pagead/js/adsbygoogle.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: ADSBYGOOGLE });
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' });
    });
    // The edge's verdict cookie for a human visitor (vb=browser); without it the headless browser is classified as a bot (see the second test).
    await context.addCookies([{ name: 'vb', value: 'browser', domain: 'sod1820.co.il', path: '/', secure: true }]);
    await context.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.blockedURI.split('?')[0])); });
    const page = await context.newPage();
    const capi = [];
    const capiSeen = [];
    page.on('request', request => { if (request.url().includes('/functions/v1/meta-capi')) capiSeen.push(request.method()); });
    page.on('response', async response => { if (response.url().includes('/functions/v1/meta-capi')) capi.push({ status: response.status(), body: await response.text().catch(() => '') }); });
    await page.goto(fixture.origin + '/world', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('#root')?.children.length, null, { timeout: 30000 });
    // The app (not the test) starts the Pixel: init with the build's id, then one PageView with a deduplication event id.
    await page.waitForFunction(() => Array.isArray(window.__fbCalls), null, { timeout: 30000 });
    const calls = await page.evaluate(() => window.__fbCalls);
    assert.deepEqual(calls[0], ['init', PIXEL]);
    const view = calls.find(call => call[0] === 'track' && call[1] === 'PageView');
    assert.ok(view && typeof view[3]?.eventID === 'string' && view[3].eventID.length >= 8, 'a PageView with an event id: ' + JSON.stringify(calls));
    assert.ok(reached.includes('https://connect.facebook.net/en_US/fbevents.js'));
    await page.waitForTimeout(1200);
    assert.ok(reached.includes('https://www.facebook.com/tr/'), 'the Pixel beacon reaches the network');
    // The Conversions API twin reaches the Supabase origin through the worker (anonymous, same event id as the Pixel PageView).
    await page.waitForFunction(() => true); await page.waitForTimeout(800);
    const relayed = fixture.state.functions.filter(call => call.path === '/functions/v1/meta-capi');
    assert.ok(relayed.length >= 1 && relayed.every(call => call.method === 'POST'), 'the CAPI relay request reached the origin: ' + JSON.stringify({ capiSeen, relayed }));
    const sentBody = JSON.parse(relayed[0].body);
    assert.equal(sentBody.event_name, 'PageView');
    assert.equal(sentBody.event_id, view[3].eventID, 'same event id as the browser Pixel event, so Meta deduplicates');
    assert.ok(relayed.every(call => call.cookie === null && /^Bearer /.test(call.authorization || '') && call.apikey), 'rebuilt anonymously: key only, no cookies');
    assert.ok(capi.every(item => item.status !== 403), 'the worker did not deny the relay');
    // AdSense transports as the real script uses them (observed in a real run under this CSP), from the page.
    const sent = await page.evaluate(async () => {
      const out = [];
      const script = document.createElement('script'); script.async = true; script.crossOrigin = 'anonymous';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000';
      await new Promise(done => { script.onload = script.onerror = done; document.head.appendChild(script); });
      out.push(['script', window.__adsLoaded === true]);
      for (const url of ['https://pagead2.googlesyndication.com/getconfig/abg_config?client=ca-pub-0000000000000000', 'https://pagead2.googlesyndication.com/pagead/ping?e=1',
        'https://ep1.adtrafficquality.google/getconfig/sodar?sv=200', 'https://ep2.adtrafficquality.google/sodar/sodar2/x.html', 'https://googleads.g.doubleclick.net/pagead/id']) {
        try { await fetch(url, { method: 'POST', body: 'x', mode: 'no-cors', keepalive: true }); out.push([url.split('?')[0], 'sent']); } catch (error) { out.push([url.split('?')[0], 'failed: ' + error.message]); }
      }
      out.push(['sendBeacon', navigator.sendBeacon('https://pagead2.googlesyndication.com/pagead/ping?e=2', 'x')]);
      try { await fetch('https://tracker.invalid/collect', { method: 'POST', body: 'x', mode: 'no-cors' }); out.push(['tracker', 'sent']); } catch (error) { out.push(['tracker', 'failed']); }
      return out;
    });
    await page.waitForTimeout(500);
    const violations = await page.evaluate(() => window.__csp);
    assert.equal(sent[0][1], true, 'the AdSense script loads');
    for (const bare of ['https://pagead2.googlesyndication.com/getconfig/abg_config', 'https://pagead2.googlesyndication.com/pagead/ping', 'https://ep1.adtrafficquality.google/getconfig/sodar',
      'https://ep2.adtrafficquality.google/sodar/sodar2/x.html', 'https://googleads.g.doubleclick.net/pagead/id']) {
      assert.ok(reached.includes(bare), `${bare} reaches the network; ${JSON.stringify(sent.find(row => row[0] === bare))}`);
      assert.ok(!violations.includes(bare), `${bare} is not blocked by the CSP`);
    }
    assert.ok(!violations.some(url => /facebook|googlesyndication|doubleclick|adtrafficquality/.test(url)), 'no Pixel/AdSense host is blocked: ' + JSON.stringify(violations));
    // Not a blanket exemption: a host that is not listed is still refused by the CSP.
    assert.ok(violations.includes('https://tracker.invalid/collect') && !reached.includes('https://tracker.invalid/collect'));
  } finally { await browser.close(); await fixture.close(); }
});

test('Pixel and ads stay off the pages that must not carry them: account and auth routes have no telemetry label', { skip }, async () => {
  const { readingTelemetryPath } = await import('../src/lib/publicReadingTelemetry2029.js');
  for (const path of ['/auth/callback?code=x', '/2029/me/settings', '/2029/control', '/login', '/profile/abc', '/unsubscribe/t']) assert.equal(readingTelemetryPath(path), null, path);
});

test('A bot visit loads no Pixel script and sends no PageView or CAPI event (bot-read-no-side-effect)', { skip, timeout: 120000 }, async () => {
  const fixture = await startFixture({ deploymentCsp: true });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'he-IL' });
    const reached = [];
    await context.route(HOSTS, route => { reached.push(new URL(route.request().url()).host); return route.fulfill({ status: 200, contentType: 'application/javascript', body: FBEVENTS }); });
    const page = await context.newPage();
    await page.goto(fixture.origin + '/world', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('#root')?.children.length, null, { timeout: 30000 });
    await page.waitForTimeout(4500);   // the app starts measurement on idle (at most 3 s)
    assert.deepEqual(reached.filter(host => /facebook/.test(host)), [], 'no Pixel script or beacon for a bot');
    assert.equal(await page.evaluate(() => window.__fbCalls), undefined);
    assert.deepEqual(fixture.state.functions.filter(call => call.path === '/functions/v1/meta-capi'), [], 'no CAPI event for a bot');
  } finally { await browser.close(); await fixture.close(); }
});
