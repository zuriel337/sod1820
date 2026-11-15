// Built public artifact + its real worker; every host resolves to a local fixture. No request leaves the machine.
// A post at its original WordPress address `/<slug>` (the address search engines serve and visitors open) must read its source while the
// page code downloads, as `/post/<slug>` does. On main that read started only after the code had arrived and mounted: one whole read later.
// VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs
// CHROMIUM_PATH=/usr/bin/chromium node --test test/post-root-address-early-read-20261115.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the pinned browser tooling; this acceptance test must not skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;

const SLUG_TEXT = 'סדר-תפילה-לבדיקת-מהירות';
const STORED = encodeURIComponent(SLUG_TEXT).replace(/%[0-9A-F]{2}/g, match => match.toLowerCase());
const row = { id: 90011, wp_id: 100, slug: STORED, link: `https://sod1820.co.il/${STORED}/`, title: 'פוסט ותיק לבדיקת מהירות', source: 'wordpress',
  excerpt: 'פוסט ותיק לבדיקה.', content: '<p>תוכן ציבורי ותיק.</p>', categories: [], tags: [], date: '2020-01-01T00:00:00+00:00', modified: null, author: null, image_url: null };

for (const width of [390, 1280]) test(`[${width}px] a post at its original address reads its source while the page code downloads`, { timeout: 60000 }, async () => {
  const reads = [];
  const fixture = await startFixture({ supabase: async ({ url }) => {
    if (url.pathname === '/rest/v1/posts') {
      const slugFilter = url.searchParams.get('slug') || '';
      reads.push(slugFilter);
      return { body: slugFilter.includes(STORED) ? [row] : [] };
    }
    return null;
  } });
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height: 900 }, locale: 'he-IL', serviceWorkers: 'allow' });
    await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();
    // A per-request round trip makes the order of independent requests unambiguous: the code (a graph of chunks) takes several of them.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 350, downloadThroughput: -1, uploadThroughput: -1 });
    await page.goto(fixture.origin + '/' + encodeURIComponent(SLUG_TEXT), { waitUntil: 'domcontentloaded' });
    await page.locator('article', { hasText: 'תוכן ציבורי ותיק.' }).waitFor({ timeout: 40000 });
    await delay(300);
    const timeline = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const view = entry => entry && { start: entry.startTime, end: entry.responseEnd };
      return {
        read: view(entries.find(entry => entry.name.includes('/rest/v1/posts'))),
        code: view(entries.find(entry => /\/assets\/Post2029Page-[^/]+\.js$/.test(entry.name))),
      };
    });
    assert.ok(timeline.read && timeline.code, `both requests were observed: ${JSON.stringify(timeline)}`);
    // This fails on main, where the read starts after the page code has arrived (read.start >= code.end).
    assert.ok(timeline.read.start < timeline.code.end - 150,
      `the source read starts while the page code is still downloading (read starts ${Math.round(timeline.read.start)} ms, code ends ${Math.round(timeline.code.end)} ms)`);
    // The same source is read once: the page uses the early read instead of requesting it again. (Other, independent reads of the `posts` table are not this source.)
    assert.equal(reads.filter(filter => filter.includes(STORED)).length, 1, 'one read of this post: ' + JSON.stringify(reads));
  } finally { await browser.close(); await fixture.close(); }
});
