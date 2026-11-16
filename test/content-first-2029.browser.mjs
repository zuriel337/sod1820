// Readable content first (ZURIEL 16.11.2026: "התוכן הקריא ... יהיו במקום ראשון לפני כל פעולות המחקר רזיאל או כל פעולה שיש פעולות מדידה גם
// לדחות את הכל"). Built public artifact + its real worker; every host resolves to a local fixture, Google and Meta are stubbed, no request
// leaves the machine. On a public Post, the Google tag, the first-party visit and the frame's background reads (the public stream) start only
// after the article is on screen and the document has loaded; they are delayed, never dropped (bounded by CONTENT_FIRST_CAP_MS).
//   VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs
//   CHROMIUM_PATH=/usr/bin/chromium node --test test/content-first-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the pinned browser tooling; this acceptance test must not skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;

const row = { id: 90031, slug: 'content-first-order', title: 'מאמר בדיקת התוכן קודם', content: '<p>התוכן הקריא קודם לכל מדידה.</p>', source: 'sod1820', categories: [], tags: [] };
const COVER = '/__content-first-cover.jpg';
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

async function visit(path, { rows = [row], delayReadMs = 0, width = 390, cover = null, run }) {
  const fixture = await startFixture({ supabase: async ({ url }) => {
    if (url.pathname === '/rest/v1/posts') {
      const slug = url.searchParams.get('slug') || '';
      if (!slug) return { body: [] };                                         // the frame's public stream and featured Post reads
      if (delayReadMs) await delay(delayReadMs);
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
    if (cover) await context.route('**' + COVER, async route => {
      await delay(cover.delayMs, undefined, { signal: release.signal }).catch(() => {});
      return route.fulfill({ status: 200, contentType: 'image/gif', body: GIF }).catch(() => {});
    });
    // The moment the article exists, on the page's own clock.
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

// Request start times on the page's clock (resource timing): the Google tag, the first-party visit, the frame's public stream and the cover.
const timings = page => page.evaluate(cover => {
  const entries = performance.getEntriesByType('resource');
  const first = re => { const hit = entries.filter(entry => re.test(entry.name)).sort((a, b) => a.startTime - b.startTime)[0]; return hit ? hit.startTime : null; };
  const image = entries.find(entry => entry.name.endsWith(cover));
  const nav = performance.getEntriesByType('navigation')[0];
  return { articleAt: window.__articleAt, loadAt: nav && nav.loadEventStart ? nav.loadEventStart : null,
    // the frame's public stream reads the latest modified public posts (worldDiscoveryStream: order=modified)
    gtag: first(/googletagmanager\.com\/gtag\/js/), visit: first(/\/rpc\/track_visit/), stream: first(/\/rest\/v1\/posts\?.*order=modified/),
    adsense: first(/googlesyndication\.com/), coverEnd: image && image.responseEnd ? image.responseEnd : null };
}, COVER);
async function waitFor(page, keys, ms) {
  const deadline = Date.now() + ms; let seen = await timings(page);
  while (keys.some(key => seen[key] == null) && Date.now() < deadline) { await delay(100); seen = await timings(page); }
  return seen;
}

for (const width of [390, 1280]) test(`[${width}px] a Post: the Google tag, the visit and the frame's stream start after the article is on screen and the page has loaded`, { timeout: 60000 }, async () => {
  await visit('/post/' + row.slug, { width, delayReadMs: 1800, run: async page => {
    await page.locator('article', { hasText: 'התוכן הקריא קודם לכל מדידה.' }).waitFor({ timeout: 40000 });
    const seen = await waitFor(page, ['gtag', 'visit', 'stream', 'loadAt'], 20000);
    assert.ok(seen.articleAt != null && seen.loadAt != null, JSON.stringify(seen));
    for (const key of ['gtag', 'visit', 'stream']) {
      assert.ok(seen[key] != null, `${key} still starts (delayed, not dropped): ${JSON.stringify(seen)}`);
      // On main the tag waits only for an idle moment, the visit for 150 ms and the stream for nothing: all long before the 1.8 s read ends.
      assert.ok(seen[key] >= seen.articleAt, `${key} at ${Math.round(seen[key])} ms, article on screen at ${Math.round(seen.articleAt)} ms`);
      assert.ok(seen[key] >= seen.loadAt, `${key} at ${Math.round(seen[key])} ms, load at ${Math.round(seen.loadAt)} ms`);
    }
    assert.equal(seen.adsense, null, 'no ad script (paused, ZURIEL 16.11.2026)');
  } });
});

test('an original Post address (`/<slug>`) waits for its article the same way', { timeout: 60000 }, async () => {
  const original = { ...row, id: 90032, slug: 'content-first-original-address', source: 'wordpress', wp_id: 102 };
  await visit('/' + original.slug, { rows: [original], delayReadMs: 1800, run: async page => {
    await page.locator('article', { hasText: 'התוכן הקריא קודם לכל מדידה.' }).waitFor({ timeout: 40000 });
    const seen = await waitFor(page, ['gtag', 'visit'], 20000);
    assert.ok(seen.gtag != null && seen.visit != null && seen.articleAt != null, JSON.stringify(seen));
    assert.ok(seen.gtag >= seen.articleAt && seen.visit >= seen.articleAt, JSON.stringify(seen));
  } });
});

test("the Google tag waits for the article's priority image while it downloads, then starts", { timeout: 60000 }, async () => {
  const withCover = { ...row, id: 90033, slug: 'content-first-cover', image_url: COVER };
  await visit('/post/' + withCover.slug, { rows: [withCover], cover: { delayMs: 2500 }, run: async page => {
    await page.locator('article', { hasText: 'התוכן הקריא קודם לכל מדידה.' }).waitFor({ timeout: 40000 });
    const seen = await waitFor(page, ['gtag', 'coverEnd'], 20000);
    assert.ok(seen.gtag != null && seen.coverEnd != null, JSON.stringify(seen));
    assert.ok(seen.gtag >= seen.coverEnd - 20, `tag at ${Math.round(seen.gtag)} ms, cover finished at ${Math.round(seen.coverEnd)} ms`);
  } });
});

test('an address without a Post settles on its notice (not found or "could not open") and measures once it is shown, without the bounded wait', { timeout: 60000 }, async () => {
  await visit('/content-first-address-without-a-post', { rows: [], run: async page => {
    // The Post page answers a slug with no published Post with its own notice (.sod29-frame-state); the not-found page answers other addresses.
    await page.locator('[data-experience-surface="not-found"], .sod29-frame-state').first().waitFor({ timeout: 40000 });
    const shownAt = await page.evaluate(() => performance.now());
    const seen = await waitFor(page, ['gtag', 'visit'], 15000);
    assert.equal(seen.articleAt, null, 'there is no article');
    assert.ok(seen.gtag != null && seen.visit != null, `measured: ${JSON.stringify(seen)}`);
    assert.ok(seen.gtag < 9000 && seen.gtag <= shownAt + 4000, `not held for the bound (${Math.round(seen.gtag)} ms)`);
  } });
});

test('a Post still loading when the bound passes measures after the bound (delayed, never dropped)', { timeout: 60000 }, async () => {
  await visit('/post/' + row.slug, { delayReadMs: 20000, run: async page => {
    const seen = await waitFor(page, ['gtag', 'visit'], 18000);
    assert.equal(seen.articleAt, null, 'the article has not arrived');
    assert.ok(seen.gtag != null && seen.visit != null, `measured after the bound: ${JSON.stringify(seen)}`);
    assert.ok(seen.gtag >= 9500 && seen.visit >= 9500, `not before the bound: ${JSON.stringify(seen)}`);
  } });
});

test('a page without a content marker (privacy) measures once it has loaded, without the article wait', { timeout: 60000 }, async () => {
  await visit('/privacy', { rows: [], run: async page => {
    const seen = await waitFor(page, ['gtag', 'visit', 'loadAt'], 15000);
    assert.ok(seen.gtag != null && seen.visit != null && seen.loadAt != null, JSON.stringify(seen));
    assert.ok(seen.gtag >= seen.loadAt && seen.gtag < 9000, `after the load, not held for the bound (${Math.round(seen.gtag)} ms)`);
  } });
});
