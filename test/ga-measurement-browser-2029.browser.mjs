// Real Chromium, the BUILT public-reading artifact, its real service worker and the deployment's real Content-Security-Policy.
// Google Analytics 4 must not be blocked on the 2029 public site (ZURIEL, 10.11.2026): every transport host the real gtag.js uses must be
// admitted by the CSP and must reach the network (not be answered by the worker). Other cross-origin writes stay restricted.
//   node scripts/build-public-reading-production.mjs && node --test test/ga-measurement-browser-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const skip = !(Boolean(pw) && existsSync(join(dist, 'sw.js'))) && 'playwright or the built artifact is unavailable';

const GA_REQUESTS = [
  ['https://www.google.com/g/collect?v=2&tid=G-TEST12345&en=page_view&gaf=1', 'POST'],
  ['https://www.google.com/ccm/collect?en=page_view', 'POST'],
  ['https://www.google-analytics.com/g/collect?v=2&tid=G-TEST12345&en=scroll&epn.percent_scrolled=90', 'POST'],
  ['https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST12345&en=user_engagement', 'POST'],
  ['https://analytics.google.com/g/collect?v=2&tid=G-TEST12345&en=click', 'POST'],
  ['https://stats.g.doubleclick.net/g/collect?v=2&tid=G-TEST12345&en=page_view', 'POST'],
];

test('Google Analytics 4 transports are admitted by the real CSP and reach the network through the real worker; other writes stay restricted', { skip, timeout: 120000 }, async () => {
  const fixture = await startFixture({ deploymentCsp: true });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'he-IL' });
    const reached = [];
    // These hosts do not resolve in the fixture; a request that leaves the browser and is not answered by the worker is seen here.
    await context.route(/^https:\/\/(www\.google\.com|www\.google-analytics\.com|region1\.google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net|tracker\.invalid)\//, route => { reached.push(route.request().url().split('?')[0]); route.fulfill({ status: 204, body: '' }); });
    await context.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.blockedURI.split('?')[0])); });
    const page = await context.newPage();
    await page.goto(fixture.origin + '/world', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('#root')?.children.length, null, { timeout: 30000 });
    const outcome = await page.evaluate(async requests => {
      const out = [];
      for (const [url, method] of requests) {
        try { await fetch(url, { method, body: 'x', mode: 'no-cors', keepalive: true }); out.push([url.split('?')[0], 'sent']); } catch (error) { out.push([url.split('?')[0], 'failed: ' + error.message]); }
      }
      out.push(['sendBeacon https://www.google.com/g/collect', navigator.sendBeacon('https://www.google.com/g/collect?v=2&tid=G-TEST12345&en=page_view', 'x') ? 'queued' : 'refused']);
      try { await fetch('https://tracker.invalid/tr?id=1', { method: 'POST', body: 'x', mode: 'no-cors' }); out.push(['https://tracker.invalid/tr', 'sent']); } catch (error) { out.push(['https://tracker.invalid/tr', 'failed']); }
      return out;
    }, GA_REQUESTS);
    await page.waitForTimeout(500);
    const violations = await page.evaluate(() => window.__csp);
    for (const [url] of GA_REQUESTS) {
      const bare = url.split('?')[0];
      assert.ok(reached.includes(bare), `${bare} reaches the network (the CSP admits it and the worker does not deny it); outcome ${JSON.stringify(outcome.find(row => row[0] === bare))}`);
      assert.ok(!violations.includes(bare), `${bare} is not blocked by the CSP`);
    }
    assert.ok(reached.filter(url => url === 'https://www.google.com/g/collect').length >= 2, 'the sendBeacon also reaches the network');
    // Not a blanket exemption: a non-GA third-party write is still refused by the CSP.
    assert.ok(violations.includes('https://tracker.invalid/tr'), 'a non-listed third-party write is still blocked by the CSP');
    assert.ok(!reached.includes('https://tracker.invalid/tr'));
  } finally { await browser.close(); await fixture.close(); }
});
