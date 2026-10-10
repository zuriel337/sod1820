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

test('likes toggle on messages and replies, persist across author navigation, and never write', async ({ page }) => {
  const writes = [];
  page.on('request', (request) => { if (/\/rpc\/(toggle_contribution_reaction|admin_boost_reaction)/.test(request.url())) writes.push(request.url()); });
  await page.goto(BASE + PREVIEW);
  const community = page.locator('[data-community-mode="design-preview"]');
  const thread = community.locator('#example-welcome');
  const draft = community.getByRole('textbox', { name: 'מה תרצו לשתף?' });
  await draft.fill('טיוטה שנשארת כשפותחים כותב');
  await thread.getByRole('button', { name: 'אהבתי · לדוגמה', exact: true }).click();
  await expect(thread.locator('.sod29-community-like-count')).toHaveText('9');
  await thread.getByRole('button', { name: '2 תגובות' }).click();
  const reply = thread.locator('.sod29-community-reply').first();
  await reply.getByRole('button', { name: 'אהבתי · לדוגמה' }).click();
  await expect(reply.locator('.sod29-community-like-count')).toHaveCount(0); // unknown historical count stays unknown
  await thread.getByRole('link', { name: 'פתיחת העמוד של נועה' }).click();
  await expect(page).toHaveURL(/member=example-noa/);
  const profile = community.getByRole('region', { name: 'עמוד כותב לדוגמה' });
  await expect(profile.getByRole('heading', { name: 'נועה', exact: true })).toBeFocused();
  await expect(profile.locator('.sod29-community-thread')).toHaveCount(3);
  await expect(profile.locator('.sod29-community-thread').first().locator('.sod29-community-like-count')).toHaveText('9');
  await page.goBack();
  await expect(draft).toHaveValue('טיוטה שנשארת כשפותחים כותב');
  await expect(thread.getByRole('button', { name: 'סגירת תגובות' })).toBeVisible();
  await expect(reply.getByRole('button', { name: 'ביטול לייק לדוגמה' })).toHaveAttribute('aria-pressed', 'true');
  await thread.locator(':scope > .sod29-community-thread-actions').getByRole('button', { name: 'ביטול לייק לדוגמה' }).click();
  await expect(thread.locator('.sod29-community-like-count')).toHaveText('8');
  await reply.getByRole('link', { name: 'פתיחת העמוד של אורי' }).click();
  await profile.getByRole('button', { name: 'לשיחה המלאה' }).first().click();
  await expect(thread).toBeFocused();
  await expect(reply).toBeVisible();
  expect(writes).toEqual([]);
  await page.goto(BASE + PREVIEW + '&member=missing');
  await expect(community.getByText('הכותב לא נמצא בדוגמאות')).toBeVisible();
  await community.getByRole('button', { name: 'חזרה לשיחות' }).click();
  await expect(community.locator('.sod29-community-thread')).toHaveCount(4);
});

test('pasted links show safe video previews in editor and message, loading players only on click', async ({ page }) => {
  await page.goto(BASE + PREVIEW);
  const community = page.locator('[data-community-mode="design-preview"]');
  const composer = community.getByRole('region', { name: 'כתיבת הודעת דוגמה' });
  const draft = composer.getByRole('textbox', { name: 'מה תרצו לשתף?' });
  await expect(draft).toHaveAttribute('maxlength', '1500');
  await draft.fill('סרטון לבדיקה https://youtu.be/Jp0pxGofPjQ ועוד מקור https://example.com/article');
  await expect(composer.getByRole('button', { name: 'פתיחת נגן YouTube' })).toBeVisible();
  await expect(community.locator('iframe')).toHaveCount(0);
  await expect(composer.locator('.sod29-community-link-card')).toHaveAttribute('href', 'https://example.com/article');
  await composer.getByRole('button', { name: 'פתיחת נגן YouTube' }).click();
  await expect(composer.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/Jp0pxGofPjQ?rel=0');
  await composer.getByRole('button', { name: 'תצוגה לפני שליחה' }).click();
  await expect(composer.locator('.sod29-community-draft-preview').getByRole('button', { name: 'פתיחת נגן YouTube' })).toBeVisible();
  await draft.fill('https://youtube.com.evil.test/watch?v=Jp0pxGofPjQ javascript:alert(1)');
  await expect(composer.locator('iframe')).toHaveCount(0);
  await expect(composer.locator('.sod29-community-video-cover')).toHaveCount(0);
  await expect(composer.locator('.sod29-community-link-card')).toHaveCount(1);
  await draft.fill('https://vimeo.com/123456789');
  await composer.getByRole('button', { name: 'פתיחת נגן Vimeo' }).click();
  await expect(composer.locator('iframe')).toHaveAttribute('src', 'https://player.vimeo.com/video/123456789');
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
    const colors = await community.evaluate((node) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const luminance = (color) => {
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
        const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((n) => n / 255).map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      const input = node.querySelector('textarea');
      const background = luminance(getComputedStyle(input).backgroundColor);
      const text = luminance(getComputedStyle(input).color);
      const placeholder = luminance(getComputedStyle(input, '::placeholder').color);
      const contrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      return { background, panel: luminance(getComputedStyle(node.querySelector('.sod29-community-main')).backgroundColor), textContrast: contrast(background, text), placeholderContrast: contrast(background, placeholder) };
    });
    expect(colors.textContrast).toBeGreaterThanOrEqual(4.5);
    expect(colors.placeholderContrast).toBeGreaterThanOrEqual(4.5);
    if (preset === 'dark') expect(colors.background).toBeGreaterThan(colors.panel * 2);
    await page.screenshot({ path: testInfo.outputPath(`community-${width}-${preset}.png`), fullPage: true });
  });
}
