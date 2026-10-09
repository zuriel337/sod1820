const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const BASE = 'http://127.0.0.1:4173';
const ARTIFACTS = process.env.KINGDOM_ARTIFACTS || 'test-results/kingdom';
const KEY = 'sod-kingdom-preview-v1';
if (process.env.KINGDOM_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.KINGDOM_CHROMIUM } });
const cases = [
  ['letters', 'garden', 3], ['heart', 'garden', 32], ['light', 'garden', 207], ['life', 'garden', 68],
  ['peace', 'mine', 376], ['king', 'mine', 36], ['one', 'mine', 13],
  ['love', 'factory', 13], ['torah', 'factory', 53], ['blessing', 'factory', 38],
];
const names = { garden: 'גן האותיות', mine: 'מכרה המספרים', factory: 'מפעל הצירופים' };
async function setup(page, preset = 'dark') {
  // No live requests, including shared auth/research/analytics providers.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === BASE ? route.continue() : route.abort();
  });
  await page.addInitScript((preset) => localStorage.setItem('sod-theme', preset), preset);
  await page.goto(`${BASE}/2029/kingdom`);
  await expect(page.getByRole('heading', { name: 'ממלכת המספרים', exact: true })).toBeVisible();
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function screenshot(page, name) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: true });
}
for (const width of [320, 390, 768, 1440]) {
  for (const preset of ['light', 'parchment', 'dark']) {
    test(`${width}px / ${preset}: gate, map, RTL, targets and reduced motion`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await setup(page, preset);
      await noOverflow(page);
      if (width === 1440 && preset === 'dark') await screenshot(page, 'desktop-gate');
      const enter = page.getByRole('button', { name: 'כניסה לממלכה', exact: true });
      await enter.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByLabel('מפת הממלכה', { exact: true })).toBeVisible();
      await noOverflow(page);
      expect(await page.locator('.kingdom').evaluate((node) => getComputedStyle(node).direction)).toBe('rtl');
      const badControls = await page.locator('.kingdom button, .kingdom input').evaluateAll((nodes) => nodes.filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      }).map((node) => node.textContent));
      expect(badControls).toEqual([]);
      await expect(page.locator('.kingdom-tower, .kingdom-island')).toHaveCount(0);
      await expect(page.locator('.sod29-glyph-scene')).toHaveAttribute('data-renderer', 'outline');
      await expect(page.locator('.sod29-glyph-volume canvas')).toHaveCount(0);
      await page.getByRole('button', { name: /מכרה המספרים.*טרם נפתח/ }).click();
      await expect(page.getByRole('heading', { name: 'דרך חדשה מחכה להיפתח' })).toBeVisible();
      await page.getByRole('button', { name: /גן האותיות.*רמה/ }).click();
      await page.getByRole('button', { name: 'אפשר רמז?' }).click();
      await expect(page.locator('#kingdom-hint')).toBeVisible();
      await page.getByLabel('התשובה שלכם', { exact: true }).fill('999');
      await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
      await expect(page.getByRole('status')).toContainText('עוד ניסיון');
      await expect(page.getByTestId('light')).toHaveText('0');
      await page.getByLabel('התשובה שלכם', { exact: true }).fill('3');
      await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
      await expect(page.getByTestId('light')).toHaveText('20');
      if (width === 1440 || width === 390) await screenshot(page, `${width}-${preset}-discovery`);
      await page.reload();
      await expect(page.getByTestId('light')).toHaveText('20');
      await noOverflow(page);
      expect(errors).toEqual([]);
    });
  }
}
test('full loop: 10 discoveries, 5 upgrades, collection, journal and research handoff with exact return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page);
  await page.getByRole('button', { name: 'כניסה לממלכה', exact: true }).click();
  let selected = 'garden';
  for (const [id, building, answer] of cases) {
    if (selected !== building) {
      await page.getByRole('button', { name: new RegExp(`${names[building]}.*רמה`) }).click();
      selected = building;
    }
    await page.getByLabel('התשובה שלכם', { exact: true }).fill(String(answer));
    await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
    await expect(page.getByRole('status')).toContainText('גילוי חדש');
    for (const button of await page.locator('.kingdom-upgrades button:enabled').all()) await button.click();
    const collect = page.getByRole('button', { name: /^איסוף/ });
    if (await collect.isEnabled()) await collect.click();
    // Collection can make another upgrade affordable.
    for (const button of await page.locator('.kingdom-upgrades button:enabled').all()) await button.click();
    if (await collect.isEnabled()) await collect.click();
    await page.getByRole('button', { name: 'המשך הגילוי', exact: true }).click();
  }
  await expect(page.locator('.kingdom-upgrades button', { hasText: 'הושלם' })).toHaveCount(5);
  await expect(page.getByRole('status')).toContainText('כל עשר החידות');
  await page.locator('.kingdom-journal summary').click();
  await expect(page.locator('.kingdom-journal li')).toHaveCount(10);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.events.filter((e) => e.type === 'answer')).toHaveLength(10);
  expect(saved.events.filter((e) => e.type === 'upgrade')).toHaveLength(5);
  await screenshot(page, 'desktop-completed');
  await page.locator('.kingdom-journal li').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/2029\/number\/3\?focus=/);
  await expect(page.locator('.sod29-rail-utilities button[aria-label="חזרה מדויקת"]')).toBeEnabled();
  await page.locator('.sod29-rail-utilities button[aria-label="חזרה מדויקת"]').click();
  await expect(page.getByRole('heading', { name: 'ממלכת המספרים', exact: true })).toBeVisible();
  await expect(page.locator('.kingdom-upgrades button', { hasText: 'הושלם' })).toHaveCount(5);
});
test('unavailable local storage allows play with an honest save warning', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'sod-kingdom-preview-v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await setup(page);
  await page.getByRole('button', { name: 'כניסה לממלכה', exact: true }).click();
  await expect(page.locator('.kingdom-local-note')).toContainText('השמירה במכשיר אינה זמינה');
  await page.getByLabel('התשובה שלכם', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
  await expect(page.getByTestId('light')).toHaveText('20');
});
