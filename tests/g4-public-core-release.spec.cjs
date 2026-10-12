const { test, expect } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const CLOSED_FLAGS = [
  'lock_world',
  'lock_heichal',
  'lock_raziel_site',
  'lock_life_journey',
  'lock_books',
].map((key) => ({ key, enabled: true, mode: 'all', message: `${key} בבנייה` }));

test.setTimeout(45_000);

test.beforeEach(async ({ context }) => {
  // The preview reads public production data. Never send analytics or other
  // product mutations from this acceptance runner to the canonical project.
  await context.route('https://linswmnnkjxvweumprav.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const readRpc = url.pathname.startsWith('/rest/v1/rpc/') && /^(fn_|gematria_|posts_by_number_strict|number_neighbors|lang_links_list)/.test(url.pathname.split('/').pop());
    if (request.method() === 'GET' || (request.method() === 'POST' && readRpc)) {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  await context.route('**/rest/v1/site_flags*', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([...CLOSED_FLAGS, { key: 'lock_els', enabled: false, mode: 'all', message: '' }]),
  }));
});

test('public Home keeps the adopted page and exposes the opening paths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-capability="home-composition"]')).toBeVisible();
  await expect(page.locator('[data-home-launch-notice="gradual-opening"]')).toBeVisible();
  await expect(page.locator('[data-home-user-area="locked"]')).toBeVisible();
  await expect(page.locator('[data-experience-capability="home-composition"] a[href="/community/chat"]')).toBeVisible();
  await expect(page.locator('a[href="/els"]').first()).toBeVisible();
});

test('posts, ELS, calculator and Number are reachable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/2029/posts`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="posts-index"]')).toBeVisible();
  await page.goto(`${BASE}/els`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-els-2029-surface="v1"]')).toBeVisible();
  await page.goto(`${BASE}/2029/gematria`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="calculator-2029"]')).toBeVisible();
  await page.getByPlaceholder('למשל: צוריאל').fill('שלום');
  await expect(page.getByRole('button', { name: 'פתח דף מספר' })).toBeVisible();
  await page.getByRole('button', { name: 'פתח דף מספר' }).click();
  await expect(page).toHaveURL(/\/2029\/number\/376(?:\?|$)/);
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible();
});

test('closed areas stay closed without starting World discovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Vercel rewrites /heichal to the 2029 shell. Vite preview instead serves
  // the old static dist/heichal.html, so mirror the production rewrite here.
  const shell = await page.context().request.get(`${BASE}/2029.html`);
  await page.route(`${BASE}/heichal`, async (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: await shell.text(),
  }));
  const worldReads = [];
  page.on('request', (request) => {
    if (request.url().includes('/rpc/world_group_source_arrivals_v3')) worldReads.push(request.url());
  });
  for (const route of ['/world', '/topic/888-yeshua', '/researcher/example', '/books', '/book/daat-tevunot', '/heichal', '/2029/journey']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mlock'), route).toBeVisible();
    await expect(page.locator('.sod29-world-native-projection'), route).toHaveCount(0);
  }
  expect(worldReads).toEqual([]);
});
