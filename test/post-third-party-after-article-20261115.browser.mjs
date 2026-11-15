// Built public artifact + its real worker; every host resolves to a local fixture, Google is stubbed. No request leaves the machine.
// A Post's optional third-party scripts (Google tag, Meta Pixel) start once its article is on screen, not while the page code is still downloading:
// on a slow connection they were requested during that download and competed with it for the same bytes (lab: +0.5-0.9 s before the article showed).
// VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs
// CHROMIUM_PATH=/usr/bin/chromium node --test test/post-third-party-after-article-20261115.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the pinned browser tooling; this acceptance test must not skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;

const SLUG = 'measurement-third-party-order';
const row = { id: 90021, slug: SLUG, title: 'מאמר בדיקת סדר טעינה', content: '<p>תוכן ציבורי לבדיקת סדר.</p>', source: 'sod1820', categories: [], tags: [] };
const GTAG = /googletagmanager\.com\/gtag\/js/;

const COVER = '/__post-cover-test.jpg';
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const coverRow = { ...row, id: 90023, slug: 'measurement-third-party-cover', image_url: COVER };

async function visit(path, { rows = [row], delayReadMs = 0, width = 390, cover = null, run }) {
  const fixture = await startFixture({ supabase: async ({ url }) => {
    if (url.pathname === '/rest/v1/posts') {
      if (delayReadMs) await delay(delayReadMs);
      const slug = url.searchParams.get('slug') || '';
      return { body: rows.filter(candidate => slug.includes(candidate.slug)) };
    }
    return null;
  } });
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  const release = new AbortController();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height: 900 }, locale: 'he-IL', serviceWorkers: 'allow' });
    await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await context.route('https://connect.facebook.net/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    // The article's cover: answered after `cover.delayMs` (a number), never (`'stall'`, released when the test ends) or with an error (`'fail'`).
    if (cover) await context.route('**' + COVER, async route => {
      if (cover === 'fail') return route.fulfill({ status: 404, body: '' });
      await delay(cover === 'stall' ? 20000 : cover.delayMs, undefined, { signal: release.signal }).catch(() => {});
      return route.fulfill({ status: 200, contentType: 'image/gif', body: GIF }).catch(() => {});
    });
    // The moment the article exists, on the page's own clock, and the moment the page asked for the Google tag.
    await context.addInitScript(() => {
      window.__articleAt = null;
      new MutationObserver(() => { if (window.__articleAt == null && document.querySelector('[data-experience-surface="post-reading"]')) window.__articleAt = performance.now(); })
        .observe(document, { childList: true, subtree: true });
    });
    const page = await context.newPage();
    await page.goto(fixture.origin + path, { waitUntil: 'domcontentloaded' });
    return await run(page);
  } finally { release.abort(); await browser.close(); await fixture.close(); }
}
const timings = page => page.evaluate(({ gtagSource, cover }) => {
  const entries = performance.getEntriesByType('resource');
  const gtag = entries.find(entry => new RegExp(gtagSource).test(entry.name));
  const image = entries.find(entry => entry.name.endsWith(cover));
  return { articleAt: window.__articleAt, gtagStart: gtag ? gtag.startTime : null, coverEnd: image && image.responseEnd ? image.responseEnd : null };
}, { gtagSource: GTAG.source, cover: COVER });

for (const width of [390, 1280]) test(`[${width}px] the Google tag is requested only after the Post's article is on screen`, { timeout: 60000 }, async () => {
  await visit('/post/' + SLUG, { width, delayReadMs: 1800, run: async page => {
    await page.locator('article', { hasText: 'תוכן ציבורי לבדיקת סדר.' }).waitFor({ timeout: 40000 });
    // Give the idle callback its chance; the tag must have been requested by then.
    const deadline = Date.now() + 15000; let seen = await timings(page);
    while (seen.gtagStart == null && Date.now() < deadline) { await delay(100); seen = await timings(page); }
    assert.ok(seen.articleAt != null, 'the article was observed');
    assert.ok(seen.gtagStart != null, 'the Google tag is still requested (measurement is delayed, not dropped)');
    // This fails on main, where the tag is requested as soon as the page is idle, long before the source has been read (the read here takes 1.8 s).
    assert.ok(seen.gtagStart >= seen.articleAt, `tag requested at ${Math.round(seen.gtagStart)} ms, article on screen at ${Math.round(seen.articleAt)} ms`);
  } });
});

test('an original address (`/<slug>`) behaves the same way', { timeout: 60000 }, async () => {
  const wordpressRow = { ...row, id: 90022, slug: 'measurement-original-address', source: 'wordpress', wp_id: 101 };
  await visit('/' + wordpressRow.slug, { rows: [wordpressRow], delayReadMs: 1800, run: async page => {
    await page.locator('article', { hasText: 'תוכן ציבורי לבדיקת סדר.' }).waitFor({ timeout: 40000 });
    const deadline = Date.now() + 15000; let seen = await timings(page);
    while (seen.gtagStart == null && Date.now() < deadline) { await delay(100); seen = await timings(page); }
    assert.ok(seen.gtagStart != null && seen.articleAt != null);
    assert.ok(seen.gtagStart >= seen.articleAt, `tag requested at ${Math.round(seen.gtagStart)} ms, article on screen at ${Math.round(seen.articleAt)} ms`);
  } });
});

test('an address that never reaches an article still starts the tag after the bounded wait', { timeout: 60000 }, async () => {
  await visit('/measurement-address-without-a-post', { rows: [], run: async page => {
    const deadline = Date.now() + 25000; let seen = await timings(page);
    while (seen.gtagStart == null && Date.now() < deadline) { await delay(250); seen = await timings(page); }
    assert.equal(seen.articleAt, null, 'there is no article');
    assert.ok(seen.gtagStart != null, 'the bounded wait ends and the tag starts');
    assert.ok(seen.gtagStart >= 9500, `not before the wait (${Math.round(seen.gtagStart)} ms)`);
  } });
});

test('a page that is not a post keeps the current timing: the Google tag does not wait for an article', { timeout: 60000 }, async () => {
  await visit('/privacy', { rows: [], run: async page => {
    const deadline = Date.now() + 12000; let seen = await timings(page);
    while (seen.gtagStart == null && Date.now() < deadline) { await delay(100); seen = await timings(page); }
    assert.ok(seen.gtagStart != null, 'the tag is requested');
    assert.ok(seen.gtagStart < 9000, `without the post wait (${Math.round(seen.gtagStart)} ms)`);
  } });
});

// The article's cover is the largest thing a reader waits for after the text: a script that starts while it downloads competes with it for bytes and for the
// main thread (lab, 446 KB cover, Regular 4G + 4x CPU: the cover finished 0.4 s later and the largest paint 0.3 s later than on main). The tag holds for the
// page's own priority image while it is still loading, once, and never for more than 4 seconds.
async function waitForTag(page, ms) {
  const deadline = Date.now() + ms; let seen = await timings(page);
  while (seen.gtagStart == null && Date.now() < deadline) { await delay(100); seen = await timings(page); }
  return seen;
}
test('the Google tag waits for the article\'s cover while it is loading, then starts', { timeout: 60000 }, async () => {
  await visit('/post/' + coverRow.slug, { rows: [coverRow], cover: { delayMs: 2500 }, run: async page => {
    await page.locator('article', { hasText: 'תוכן ציבורי לבדיקת סדר.' }).waitFor({ timeout: 40000 });
    const seen = await waitForTag(page, 15000);
    assert.ok(seen.gtagStart != null && seen.coverEnd != null && seen.articleAt != null, JSON.stringify(seen));
    assert.ok(seen.gtagStart >= seen.coverEnd - 20, `tag at ${Math.round(seen.gtagStart)} ms, cover finished at ${Math.round(seen.coverEnd)} ms`);
    assert.ok(seen.gtagStart - seen.articleAt < 9000, 'the tag still starts (delayed, not dropped)');
  } });
});

test('a cover that does not answer holds the tag for at most the bounded wait', { timeout: 60000 }, async () => {
  await visit('/post/' + coverRow.slug, { rows: [coverRow], cover: 'stall', run: async page => {
    await page.locator('article', { hasText: 'תוכן ציבורי לבדיקת סדר.' }).waitFor({ timeout: 40000 });
    const seen = await waitForTag(page, 20000);
    assert.ok(seen.gtagStart != null, 'the bounded wait ends and the tag starts although the cover never answered');
    assert.equal(seen.coverEnd, null, 'the cover had not finished');
    const waited = seen.gtagStart - seen.articleAt;
    assert.ok(waited >= 3800 && waited < 9000, `held ${Math.round(waited)} ms after the article (bound 4,000 ms plus the idle window)`);
  } });
});

test('a cover that fails to load does not hold the tag', { timeout: 60000 }, async () => {
  await visit('/post/' + coverRow.slug, { rows: [coverRow], cover: 'fail', run: async page => {
    await page.locator('article', { hasText: 'תוכן ציבורי לבדיקת סדר.' }).waitFor({ timeout: 40000 });
    const seen = await waitForTag(page, 15000);
    assert.ok(seen.gtagStart != null && seen.articleAt != null, JSON.stringify(seen));
    assert.ok(seen.gtagStart >= seen.articleAt, 'still after the article');
    assert.ok(seen.gtagStart - seen.articleAt < 3600, `not held for the bound (${Math.round(seen.gtagStart - seen.articleAt)} ms)`);
  } });
});
