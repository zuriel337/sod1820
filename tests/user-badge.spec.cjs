const { test, expect } = require('@playwright/test');
const BASE = process.env.USER_BADGE_DEV_BASE_URL || 'http://127.0.0.1:4174';

test('renders an original image, falls back on failure, and recovers when the avatar changes', async ({ page }) => {
  await page.route('https://avatar.test/**', route => {
    if (route.request().url().endsWith('/broken.png')) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  });
  await page.goto(BASE + '/tests/user-badge-harness.html');
  const avatar = page.locator('.sod-user-avatar');
  const input = page.getByLabel('כתובת תמונה');
  await expect(avatar.locator('img')).toHaveAttribute('src', 'https://avatar.test/first.png');
  await expect.poll(() => avatar.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
  await expect(avatar.locator('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
  await input.fill('https://avatar.test/broken.png');
  await expect(avatar).toHaveAttribute('data-avatar-state', 'fallback');
  await expect(avatar).toHaveText('מ');
  await input.fill('https://avatar.test/replaced.png');
  await expect(avatar.locator('img')).toHaveAttribute('src', 'https://avatar.test/replaced.png');
  await expect.poll(() => avatar.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
  await input.fill('javascript:alert(1)');
  await expect(avatar).toHaveAttribute('data-avatar-state', 'fallback');
  await expect(avatar.locator('img')).toHaveCount(0);
  await expect(page.getByText('משתמש לדוגמה', { exact: true })).toBeVisible();
});
