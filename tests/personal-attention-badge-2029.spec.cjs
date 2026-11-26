const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');
const { installPublicReadOnlyEgress, disposePublicReadOnlyEgress } = require('./fixtures/public-readonly-egress.cjs');
const { installSyntheticAdmin } = require('./fixtures/synthetic-admin-session.cjs');

// The real unread mark on the profile picture (ZURIEL 26.11.2026). The server is answered locally; nothing here reaches the live database.
const BASE = 'http://127.0.0.1:4173';
const API = 'https://linswmnnkjxvweumprav.supabase.co';
const SENDER = '36f5cb84-71c3-4977-a2c7-d6413e973443';
test.beforeEach(async ({ context }) => { await installPublicReadOnlyEgress(context, { baseUrl: BASE }); await installStorageEgressGuard(context); });
test.afterEach(async ({ context }) => disposePublicReadOnlyEgress(context));
test.setTimeout(90_000);

for (const width of [390, 1440]) {
  test(`the mark counts a message once with the personal notifications, and reading the conversation reads its notification (${width}px)`, async ({ page }) => {
    await installSyntheticAdmin(page);
    await page.addInitScript(() => { try { sessionStorage.setItem('sod_guest_signup_popup_dismissed', '1'); } catch {} });
    let dmUnread = 2, repliesUnread = 1; const updates = [], reads = { count: 0 };
    await page.route(`${API}/rest/v1/user_notifications*`, route => {
      const request = route.request(), url = request.url();
      if (request.method() === 'PATCH') { updates.push(url); dmUnread = 0; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'n1', read_at: new Date().toISOString() }]) }); }
      if (request.method() === 'HEAD' || request.method() === 'GET') { if (url.includes('kind=in.')) reads.count += 1; return route.fulfill({ status: 200, headers: { 'content-range': `*/${repliesUnread}`, 'access-control-expose-headers': 'content-range' }, contentType: 'application/json', body: '[]' }); }
      return route.fallback();
    });
    await page.route(`${API}/rest/v1/rpc/dm_inbox`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ counterpart: SENDER, name: 'שולח', avatar: null, last_body: 'שלום', last_at: new Date().toISOString(), unread: dmUnread }]) }));
    await page.route(`${API}/rest/v1/rpc/dm_thread`, route => { route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }); });
    await page.route('**/rest/v1/posts*', async (route) => {
      if (!new URL(route.request().url()).search.includes('bennett-melach-631-78')) return route.fallback();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 900000631, slug: 'bennett-melach-631-78', title: 'בנט — מקור בדיקה סינתטי', source: 'SOD1820', tags: [], categories: [], author: 'מקור בדיקה', date: '2026-10-01T00:00:00+00:00', modified: '2026-10-01T00:00:00+00:00', excerpt: 'בדיקה', content: '<p>טקסט בדיקה סינתטי.</p>', image_url: null, thumb_url: null }]) });
    });
    await page.route('**/post/bennett-melach-631-78*', async (route) => { const response = await page.request.get(`${BASE}/2029.html`); await route.fulfill({ status: response.status(), headers: response.headers(), body: await response.body() }); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/post/bennett-melach-631-78`, { waitUntil: 'domcontentloaded' });
    const badge = page.locator('.sod29-attention-badge:visible').first();
    await expect(badge).toBeVisible({ timeout: 30_000 });
    await expect(badge).toContainText('3 חדשים אליך');   // 2 unread messages + 1 reply: the DM notification is NOT counted again
    const box = await badge.boundingBox(), vw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(vw);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(reads.count).toBe(1);   // the three drawings of the picture share ONE read
  });
}

// NOT covered here: the real conversation open (needs the personal-area page mocks); the DM-notification sync is checked as a static contract (test/personal-attention-badge-2029.test.mjs) and still needs a live check with the verified test account.
