const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');

const BASE = 'http://127.0.0.1:4173';
const FIELDS = 'id,slug,title,excerpt,date,author,source,tags,home_hidden';
test.setTimeout(45000);

// Deterministic browser acceptance for this integration, not proof of live ingestion or admin access.
async function fixture(page, { slowRedemption = false } = {}) {
  await installStorageEgressGuard(page);
  await page.route('https://linswmnnkjxvweumprav.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/rest/v1/posts' && url.searchParams.get('select') === FIELDS) {
      expect(url.searchParams.get('or')).toBe('(tags.is.null,tags.not.ov.{טיוטה,פורום})');
      const categories = url.searchParams.get('categories') || '';
      const theme = categories.includes('עלוני גאולה') ? 'גאולה' : categories.includes('תיעוד אירועים') ? 'סיפורים' : 'מקורות';
      if (slowRedemption && theme === 'גאולה') await new Promise((resolve) => setTimeout(resolve, 350));
      const offset = Number(url.searchParams.get('offset') || 0);
      const rows = Array.from({ length: 24 }, (_, index) => ({
        id: 990000 + offset + index, slug: `fixture-${offset + index}`, title: `<b>${theme} ${offset + index}</b>`,
        excerpt: '<p>תיאור מקור לדוגמה &amp; המשך</p>', author: 'כותב בדיקה', source: 'wordpress', tags: null, date: '2026-10-01',
      }));
      return route.fulfill({ json: rows, headers: { 'content-range': `${offset}-${offset + 23}/72`, 'access-control-expose-headers': 'content-range' } });
    }
    if (url.pathname === '/rest/v1/posts' && request.method() === 'HEAD' && url.searchParams.get('source')) {
      expect(url.searchParams.get('or')).toBe('(tags.is.null,tags.not.ov.{טיוטה,פורום})');
      return route.fulfill({ status: 200, body: '', headers: { 'content-range': '*/72', 'access-control-expose-headers': 'content-range' } });
    }
    if (url.pathname === '/rest/v1/posts' && url.searchParams.get('slug')?.includes('fixture-')) {
      const slug = url.searchParams.get('slug').match(/fixture-\d+/)[0];
      return route.fulfill({ json: [{ id: 990024, slug, title: 'מקור בדיקה', content: '<p>זהו מקור לבדיקת חזרה מדויקת.</p>', excerpt: 'מקור בדיקה', author: 'כותב בדיקה', source: 'wordpress', tags: [], categories: [], date: '2026-10-01' }] });
    }
    // No live writes from the browser harness (including incidental telemetry).
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.fulfill({ json: [] });
    return route.fallback();
  });
}

async function openLens(page, path = '/world') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  const lens = page.locator('#world-themes');
  await lens.scrollIntoViewIfNeeded();
  await expect(lens.locator('.wtu-card')).toHaveCount(24);
  return lens;
}

test('theme/writer/page survive source navigation, exact return, refresh and browser back', async ({ page }) => {
  await fixture(page);
  let lens = await openLens(page);
  await lens.getByRole('button', { name: /יצירות מקור/ }).click();
  await lens.getByRole('combobox').selectOption('כותב בדיקה');
  await expect(lens.locator('.wtu-card')).toHaveCount(24);
  await lens.getByRole('button', { name: 'עוד מקורות' }).click();
  await expect(lens.locator('.wtu-card').first()).toContainText('מקורות 24');
  const target = new URL(page.url()).pathname + new URL(page.url()).search;
  await lens.locator('.wtu-card').first().click();
  await expect(page).toHaveURL(/\/post\/fixture-24$/);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((name) => name.startsWith('sod_research_context_v2:'));
    return JSON.parse(sessionStorage.getItem(key) || '{}').returnTo?.href;
  })).toBe(target);
  await expect(page.getByText('זהו מקור לבדיקת חזרה מדויקת.', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'חזרה מדויקת', exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(`${BASE}${target}`);
  lens = page.locator('#world-themes');
  await lens.scrollIntoViewIfNeeded();
  await expect(lens.locator('.wtu-card').first()).toContainText('מקורות 24');
  await page.reload();
  await lens.scrollIntoViewIfNeeded();
  await expect(lens.getByRole('combobox')).toHaveValue('כותב בדיקה');
  await expect(lens.locator('.wtu-card').first()).toContainText('מקורות 24');
  await lens.getByRole('button', { name: 'העמוד הקודם' }).click();
  await expect(lens.locator('.wtu-card').first()).toContainText('מקורות 0');
  await page.goBack();
  await expect(lens.locator('.wtu-card').first()).toContainText('מקורות 24');
});

test('a stale theme response cannot replace a newer choice; current updates stay above the lens', async ({ page }) => {
  await fixture(page, { slowRedemption: true });
  const lens = await openLens(page, '/world#group-source-preserved');
  await lens.getByRole('button', { name: /רמזי גאולה/ }).click();
  await lens.getByRole('button', { name: /סיפורים על־זמניים/ }).click();
  await expect(lens.locator('.wtu-card').first()).toContainText('סיפורים 0');
  await page.waitForTimeout(450);
  await expect(lens.locator('.wtu-card').first()).toContainText('סיפורים 0');
  expect(new URL(page.url()).hash).toBe('#group-source-preserved');
  expect(await page.evaluate(() => Boolean(document.querySelector('#world-entry').compareDocumentPosition(document.querySelector('#world-themes')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.locator('#world-source-depth')).toBeAttached();
});

for (const width of [320, 360, 1280]) {
  for (const theme of ['light', 'parchment', 'dark']) {
    test(`readable source lens at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem('sod-theme', value), theme);
      await fixture(page);
      const lens = await openLens(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme-preset', theme);
      await expect(lens.getByRole('button', { name: /כל המקורות/ })).toContainText('72');
      await expect(lens.getByRole('status')).toContainText('מתוך 72 רשומות');
      await expect(lens.locator('.wtu-card strong').first()).toHaveText('מקורות 0');
      await expect(lens.locator('.wtu-card small').first()).toHaveText('תיאור מקור לדוגמה & המשך');
      const metrics = await lens.evaluate((element) => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        controls: [...element.querySelectorAll('button,select')].map((node) => node.getBoundingClientRect().height),
        bodySize: parseFloat(getComputedStyle(element.querySelector('.wtu-card small')).fontSize),
      }));
      expect(metrics.overflow).toBeLessThanOrEqual(1);
      expect(metrics.controls.every((height) => height >= 44)).toBe(true);
      expect(metrics.bodySize).toBeGreaterThanOrEqual(18);
      await lens.screenshot({ path: `test-results/release-visual/world-thematic-${width}-${theme}.png` });
    });
  }
}
