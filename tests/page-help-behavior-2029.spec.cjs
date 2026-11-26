const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');
const { installPublicReadOnlyEgress, disposePublicReadOnlyEgress } = require('./fixtures/public-readonly-egress.cjs');

// ONE page-help action (ZURIEL 26.11.2026): the same label, the same 44px quiet 14px button in the same corner of the page's opening, and the same BEHAVIOUR on every surface:
// it opens one disclosure over the page, Escape closes it with focus back on the button, and "סגירת ההסבר" does the same. It explains the page, never a finding.
const BASE = 'http://127.0.0.1:4173';

test.beforeEach(async ({ context }) => {
  await installPublicReadOnlyEgress(context, { baseUrl: BASE });
  await installStorageEgressGuard(context);
  await context.addInitScript(() => {
    try { sessionStorage.setItem('sod_guest_signup_popup_dismissed', '1'); } catch {}
  });
});
test.afterEach(async ({ context }) => disposePublicReadOnlyEgress(context));
test.setTimeout(90_000);

async function routeBennettPost(page) {
  // Bennett is a private draft in live data: a synthetic public row, as the entry-learn spec does.
  await page.route('**/rest/v1/posts*', async (route) => {
    const url = new URL(route.request().url());
    if (!url.search.includes('bennett-melach-631-78')) return route.fallback();
    const row = { id: 900000631, slug: 'bennett-melach-631-78', title: 'בנט — מקור בדיקה סינתטי', source: 'SOD1820', tags: [], categories: [], author: 'מקור בדיקה',
      date: '2026-10-01T00:00:00+00:00', modified: '2026-10-01T00:00:00+00:00', excerpt: 'בדיקה', content: '<p>טקסט בדיקה סינתטי.</p>', image_url: null, thumb_url: null };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) });
  });
  await page.route('**/post/bennett-melach-631-78*', async (route) => {
    const response = await page.request.get(`${BASE}/2029.html`);
    await route.fulfill({ status: response.status(), headers: response.headers(), body: await response.body() });
  });
}

const trigger = (page) => page.getByRole('button', { name: /מה זה\?/ }).first();
const focusedIsTrigger = (page) => page.evaluate(() => /מה זה\?/.test((document.activeElement?.getAttribute('aria-label') || '') + document.activeElement?.textContent));

async function assertPageHelp(page, { width }) {
  const button = trigger(page);
  await expect(button).toBeVisible({ timeout: 30_000 });
  const box = await button.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  const look = await button.evaluate((node) => { const s = getComputedStyle(node); return { font: s.fontSize, bg: s.backgroundColor, border: s.borderTopWidth }; });
  expect(look).toEqual({ font: '14px', bg: 'rgba(0, 0, 0, 0)', border: '0px' });
  const close = page.getByRole('button', { name: 'סגירת ההסבר' });
  for (const way of ['escape', 'button']) {
    await button.click();
    await expect(close).toBeVisible({ timeout: 20_000 });
    if (way === 'escape') await page.keyboard.press('Escape');
    else await close.click();
    await expect(close).toBeHidden();
    expect(await focusedIsTrigger(page)).toBe(true);
  }
  // The explanation never pushes the page: no horizontal overflow, the button keeps its place.
  const after = await button.boundingBox();
  expect(Math.abs(after.x - box.x)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(width).toBeGreaterThan(0);
}

for (const width of [390, 1440]) {
  test(`page help behaves the same on the Biblical Cipher at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/code`, { waitUntil: 'domcontentloaded' });
    await assertPageHelp(page, { width });
  });
  test(`page help behaves the same on the World at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
    await assertPageHelp(page, { width });
  });
  test(`page help behaves the same on a Post at ${width}px`, async ({ page }) => {
    await routeBennettPost(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/post/bennett-melach-631-78`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible({ timeout: 30_000 });
    await assertPageHelp(page, { width });
  });
}
