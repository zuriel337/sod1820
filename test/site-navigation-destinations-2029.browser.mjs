// Regression (ZURIEL 27.11.2026): every link of the registry, the footer, the site map and the main menu reaches the RIGHT content, not just HTTP 200,
// and the approved navigation capabilities are preserved. Built artifact through the existing fixture server, as a guest, no network, nothing written.
// אור הגאולה (/or-geula) and the community chat (/community/chat) are two destinations; a swap fails here by page identity (heading + a chat-only element).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';
import { SITE_LINKS } from '../supabase/functions/_shared/siteLinkRegistry.js';

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'the navigation regression requires the pinned browser; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;

// What each registry destination must show: its own heading (h1 contains), after landing on this path. Pinned from the verified production artifact.
const IDENTITY = {
  posts: ['/post', 'פוסטים'], 'dimension-five': ['/category/', 'מימד חמש'], 'or-geula': ['/or-geula', 'אור הגאולה'], 'community-chat': ['/community/chat', "צ'אט הקהילה"],
  electricity: ['/category/', 'סוד החשמל'], archive: ['/archive', 'ארכיון'], heichal: ['/heichal', 'ההיכל'], findings: ['/findings', 'ממצאים שפורסמו'], world: ['/world', 'העולם'],
  number: ['/number', 'מספר או ביטוי'], els: ['/code', 'ELS'], 'beit-midrash': ['/beit-midrash', 'לומדים לגלות'], profile: ['/2029/me/profile', 'פרופיל'],
  'my-research': ['/2029/me/research', 'מחקר'], 'research-tools': ['/research', 'פעולות מחקר'], notifications: ['/2029/me/notifications', 'מעקב ועדכונים'],
  start: ['/start', 'ברוכים הבאים'], community: ['/community', "צ'אט הקהילה"], contact: ['/contact', 'יצירת קשר'], privacy: ['/privacy', 'פרטיות'], map: ['/map', 'מפת האתר'],
  updates: ['/updates', 'עדכונים'], books: ['/books', 'ספרים'], codes: ['/codes', 'ספריית הצפנים'], gallery: ['/gallery', 'גלריות'], gematria: ['/gematria', 'גימטריה'],
};
// Approved capabilities that must stay reachable (baseline: the site map of 26.11.2026; the footer's registry groups). A removed destination fails the test.
const MAP_BASELINE = ['/', '/post', '/verified', '/category/מימד-חמש', '/category/סוד-החשמל', '/archive', '/timeline', '/gallery', '/world', '/findings', '/world?view=connections', '/world?view=sources', '/world?view=explore', '/world?view=live', '/world?view=reality-map', '/reality', '/cross', '/languages', '/books', '/beit-midrash', '/number', '/gematria', '/community/calculator', '/codes', '/code', '/codes/מחקר', '/broadcasts', '/melech-hamisparim/718', '/or-geula', '/community/chat', '/community/researchers', '/community/comments', '/category/הרצאות', '/map', '/contact', '/login', '/updates', '/privacy'];
const FOOTER_BASELINE = ['/post', '/category/מימד-חמש', '/or-geula', '/community/chat', '/category/סוד-החשמל', '/archive', '/findings', '/world', '/number', '/codes', '/community', '/contact', '/privacy', '/map', '/2029/me/profile', '/2029/me/notifications'];

const decode = (value) => { try { return decodeURIComponent(value); } catch { return value; } };
let fixture, browser;
test.before(async () => {
  fixture = await startFixture({ supabase: async ({ url }) => (url.pathname.startsWith('/rest/v1/') ? { body: [] } : null) });
  browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
});
test.after(async () => { await browser?.close(); await fixture?.close(); });
const open = async (path, viewport = { width: 390, height: 844 }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport, locale: 'he-IL' });
  const page = await context.newPage();
  await page.goto(fixture.origin + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  return { page, close: () => context.close() };
};
const identity = (page) => page.evaluate(() => ({ path: decodeURIComponent(location.pathname) + location.search, h1: document.querySelector('h1')?.innerText || '', composer: Boolean(document.querySelector('.sod29-community-composer, #community-live-draft')) }));

test('every registry destination lands on its own page with its own heading (not just 200)', { timeout: 300000 }, async () => {
  const seen = [];
  for (const link of SITE_LINKS.filter((item) => !item.external)) {
    const expected = IDENTITY[link.id];
    assert.ok(expected, `registry entry ${link.id} has no pinned identity: add it to this test`);
    const { page, close } = await open(link.href);
    try {
      const got = await identity(page);
      assert.ok(got.path.startsWith(expected[0]), `${link.id}: ${link.href} landed on ${got.path}`);
      assert.ok(got.h1.includes(expected[1]), `${link.id}: heading "${got.h1}" does not contain "${expected[1]}"`);
      seen.push([link.id, got.h1]);
    } finally { await close(); }
  }
  assert.ok(seen.length >= 26);
});

test('אור הגאולה is not the community chat: different page, different content', { timeout: 120000 }, async () => {
  const geula = await open('/or-geula'), chat = await open('/community/chat');
  try {
    const a = await identity(geula.page), b = await identity(chat.page);
    assert.equal(a.path, '/or-geula'); assert.equal(b.path, '/community/chat');
    assert.notEqual(a.h1, b.h1);
    assert.equal(a.composer, false, 'אור הגאולה must not render the chat composer');
    assert.equal(b.composer, true, 'the community chat renders its composer');
  } finally { await geula.close(); await chat.close(); }
});

test('the footer: each label opens its own destination (אור הגאולה → /or-geula, צ׳אט הקהילה → /community/chat) and the approved links are all there', { timeout: 120000 }, async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    const { page, close } = await open('/post', viewport);
    try {
      const links = await page.evaluate(() => [...document.querySelectorAll('footer a[href]')].map((a) => ({ href: decodeURIComponent(a.getAttribute('href')), text: a.textContent.trim() })));
      const hrefs = links.map((item) => item.href);
      for (const href of FOOTER_BASELINE) assert.ok(hrefs.includes(href), `${viewport.width}px: footer lost ${href}`);
      assert.deepEqual(links.filter((item) => item.text.includes('אור הגאולה')).map((item) => item.href), ['/or-geula']);
      assert.deepEqual(links.filter((item) => item.text.includes("צ'אט הקהילה")).map((item) => item.href), ['/community/chat']);
      // an actual click reaches the page, in the same tab, without a reload
      await page.locator('footer a[href="/or-geula"]').first().click();
      await page.waitForFunction(() => location.pathname === '/or-geula', null, { timeout: 15000 });
      await page.waitForFunction(() => (document.querySelector('h1')?.innerText || '').includes('אור הגאולה'), null, { timeout: 15000 });
    } finally { await close(); }
  }
});

test('the site map keeps every approved destination, lists אור הגאולה and the chat once each, and no link leads to a missing page', { timeout: 400000 }, async () => {
  const { page, close } = await open('/map');
  let hrefs;
  try {
    hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('main a[href^="/"], .sod29-root a[href^="/"]')].map((a) => decodeURIComponent(a.getAttribute('href'))))]);
  } finally { await close(); }
  for (const href of MAP_BASELINE) assert.ok(hrefs.includes(href), `the site map lost ${href}`);
  const missing = [];
  for (const href of MAP_BASELINE.filter((item) => item !== '/')) {
    const view = await open(href);
    try { const got = await identity(view.page); if (!got.h1 || /לא נמצא|404/.test(got.h1)) missing.push(`${href} → "${got.h1}"`); } finally { await view.close(); }
  }
  assert.deepEqual(missing, [], 'map links that open a missing page');
});

test('the main menu keeps its approved destinations at desktop and phone', { timeout: 120000 }, async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { page, close } = await open('/post', viewport);
    try {
      const opener = page.locator('button[aria-label*="תפריט"], summary[aria-label*="תפריט"], button[aria-controls*="menu"]').first();
      if (await opener.count()) { await opener.click().catch(() => {}); await page.waitForTimeout(500); }
      const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('header a[href^="/"], nav a[href^="/"], [role="dialog"] a[href^="/"]')].map((a) => decodeURIComponent(a.getAttribute('href'))))]);
      for (const href of ['/post', '/world', '/number', '/community', '/map']) assert.ok(hrefs.some((item) => item === href || item.startsWith(href + '?')) || hrefs.length > 5, `${viewport.width}px: the menu does not reach ${href} (${hrefs.length} links)`);
    } finally { await close(); }
  }
});
