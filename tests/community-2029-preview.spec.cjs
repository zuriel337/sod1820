const { test, expect } = require('@playwright/test');

const BASE = process.env.COMMUNITY_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const PREVIEW = '/2029?preview=community';

test.beforeEach(async ({ context }) => {
  // Exercise the built app without touching production services (including the
  // existing shell's telemetry). Community itself must not call a live reader/writer.
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === new URL(BASE).origin) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
});

test('reads, filters and expands sample conversations without losing thread context', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(BASE + PREVIEW);
  const community = page.locator('[data-community-mode="design-preview"]');
  await expect(community).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('[data-frame-experience-surface]')).toHaveAttribute('data-frame-experience-surface', 'community');
  await expect(community.locator('.sod29-community-thread')).toHaveCount(4);
  await community.getByRole('button', { name: '2 תגובות' }).click();
  await expect(community.getByText('בתשובה לאורי', { exact: true })).toBeVisible();
  await community.getByRole('button', { name: 'סגירת תגובות' }).click();
  await expect(community.getByText('בתשובה לאורי', { exact: true })).toBeHidden();

  await community.getByRole('searchbox').fill('צילום');
  await expect(community.locator('.sod29-community-thread')).toHaveCount(1);
  await community.getByRole('button', { name: '1 תגובות' }).click();
  await expect(community.getByText(/אפילו צילום של העמוד/)).toBeVisible();
  await community.getByRole('searchbox').fill('אין-תוצאה-כזאת');
  await expect(community.getByText('לא נמצאו שיחות לדוגמה')).toBeVisible();
  await community.getByRole('button', { name: 'לכל השיחות' }).click();
  await community.getByRole('button', { name: 'עוד שיחות לדוגמה' }).click();
  await expect(community.locator('.sod29-community-thread')).toHaveCount(6);
  await community.getByRole('combobox', { name: 'סדר השיחות' }).selectOption('oldest');
  await expect(community.locator('.sod29-community-thread').first()).toContainText('שומרת כאן מקום לשיחות');
  expect(errors).toEqual([]);
});

test('draft and people navigation are local previews, with no publication or account misrouting', async ({ page }) => {
  const communityRequests = [];
  page.on('request', (request) => {
    if (/\/(?:rpc\/(?:add_contribution|toggle_contribution_reaction|community_stream_projection)|research_contributions)(?:[/?]|$)/.test(request.url())) communityRequests.push(request.url());
  });
  await page.goto(BASE + PREVIEW);
  const community = page.locator('[data-community-mode="design-preview"]');
  const draft = community.getByRole('textbox', { name: 'מה תרצו לשתף?' });
  await expect(community.getByRole('button', { name: 'תצוגה לפני שליחה' })).toBeDisabled();
  await community.getByRole('button', { name: 'כתיבת תשובה לדוגמה לשיחה של נועה' }).click();
  await expect(draft).toBeFocused();
  const text = '<img src=x onerror="window.__communityInjected=true"> טיוטת בדיקה';
  await draft.fill(text);
  await community.getByRole('button', { name: 'תצוגה לפני שליחה' }).click();
  await expect(community.getByText('כך ההודעה תיראה · לא נשלחה')).toBeVisible();
  await expect(community.locator('.sod29-community-draft-preview')).toContainText(text);
  expect(await page.evaluate(() => window.__communityInjected)).toBeUndefined();
  await expect(community.locator('.sod29-community-thread')).toHaveCount(4);
  await community.getByRole('button', { name: 'האנשים', exact: true }).click();
  await expect(community.locator('.sod29-community-person-card')).toHaveCount(4);
  await community.getByRole('button', { name: 'השיחות של אורי' }).click();
  await expect(draft).toHaveValue(text);
  await expect(community.getByText('שיחות בהשתתפות אורי')).toBeVisible();
  await expect(community.locator('.sod29-community-thread')).toHaveCount(2);
  await expect(community.locator('a[href*="/researcher/"]')).toHaveCount(0);
  await page.reload();
  await expect(community.getByRole('textbox', { name: 'מה תרצו לשתף?' })).toHaveValue('');
  expect(communityRequests).toEqual([]);
});

for (const [width, preset] of [[320, 'light'], [390, 'dark'], [1280, 'parchment'], [1440, 'light']]) {
  test(`fits ${width}px in ${preset}, with readable text and reduced motion`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.addInitScript((theme) => localStorage.setItem('sod-theme', theme), preset);
    await page.goto(BASE + PREVIEW);
    const community = page.locator('[data-community-mode="design-preview"]');
    await expect(community).toBeVisible();
    await expect(community.locator('.sod29-community-thread')).toHaveCount(4);
    const metrics = await community.evaluate((node) => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      width: node.getBoundingClientRect().width,
      scrollWidth: node.scrollWidth,
      bodySize: parseFloat(getComputedStyle(node.querySelector('.sod29-community-body')).fontSize),
      animation: getComputedStyle(node.querySelector('.sod29-community-thread')).animationName,
      smallTargets: [...node.querySelectorAll('button')].filter((button) => button.getClientRects().length && button.getBoundingClientRect().height < 44).length,
    }));
    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
    expect(metrics.bodySize).toBeGreaterThanOrEqual(18);
    expect(metrics.animation).toBe('none');
    expect(metrics.smallTargets).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`community-${width}-${preset}.png`), fullPage: true });
  });
}
