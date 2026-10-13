const { test, expect } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const CLOSED_FLAGS = [
  'lock_world',
  'lock_heichal',
  'lock_raziel_site',
  'lock_life_journey',
  'lock_books',
].map((key) => ({ key, enabled: true, mode: 'all', message: `${key} בבנייה` }));
const OPEN_FLAGS = CLOSED_FLAGS.map((flag) => flag.key === 'lock_world' ? { ...flag, enabled: false, message: '' } : flag);

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
    body: JSON.stringify([...OPEN_FLAGS, { key: 'lock_els', enabled: false, mode: 'all', message: '' }]),
  }));
});

test('public Home keeps the adopted page and exposes the opening paths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-capability="home-composition"]')).toBeVisible();
  await expect(page.locator('[data-home-launch-notice="gradual-opening"]')).toBeVisible();
  await expect(page.locator('[data-home-user-area="locked"]')).toBeVisible();
  await expect(page.locator('[data-home-world="open"]')).toBeVisible();
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
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 30_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 30_000 });
});

test('World opens from Home and requests its grouped source reader', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/rest/v1/rpc/world_group_source_arrivals_v3', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([{
      id: '00000000-0000-4000-8000-000000000001', body: 'הודעת מקור לבדיקה',
      created_at: '2026-10-12T12:00:00Z', contributor_slug: 'tzvi-opoc', contributor_name: 'צבי',
      group_proof: true, proof_basis: 'verified_phone_unique',
      occurrences: [{ id: '00000000-0000-4000-8000-000000000001', created_at: '2026-10-12T12:00:00Z' }],
    }]),
  }));
  await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
  const groupedRead = page.waitForResponse((response) => response.url().includes('/rpc/world_group_source_arrivals_v3'));
  await page.locator('[data-home-world="open"]').click();
  await expect(page).toHaveURL(`${BASE}/world`);
  await expect(page.getByRole('region', { name: 'כיווני הגילוי בעולם' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('הודעת מקור לבדיקה').first()).toBeVisible({ timeout: 30_000 });
  expect((await groupedRead).ok()).toBe(true);
  await page.locator('#world-all-convergences').getByRole('textbox', { name: 'חיפוש בכל ההתכנסויות' }).fill('888');
  await page.locator('a[href="/topic/888-yeshua"]').first().click();
  await expect(page.locator('article[data-entity-type="convergence"]')).toBeVisible({ timeout: 30_000 });
  const numberReadFailures = [];
  page.on('response', (response) => {
    if (!response.url().includes('linswmnnkjxvweumprav.supabase.co') || response.status() < 400) return;
    const url = new URL(response.url());
    numberReadFailures.push(`${response.status()} ${url.pathname}`);
  });
  page.on('requestfailed', (request) => {
    if (!request.url().includes('linswmnnkjxvweumprav.supabase.co')) return;
    numberReadFailures.push(`${request.failure()?.errorText || 'request failed'} ${new URL(request.url()).pathname}`);
  });
  await page.locator('article[data-entity-type="convergence"] a[href="/2029/number/888"]').first().click();
  try {
    await expect(page.locator('[data-number-core-root="888"]')).toBeVisible({ timeout: 30_000 });
  } catch (error) {
    console.log(`Number 888 read failures: ${JSON.stringify(numberReadFailures)}`);
    throw error;
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="888"]')).toBeVisible({ timeout: 30_000 });
  await page.goBack();
  await expect(page.locator('article[data-entity-type="convergence"]')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`${BASE}/world`);
  await expect(page.getByRole('region', { name: 'כיווני הגילוי בעולם' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#world-all-convergences').getByRole('textbox', { name: 'חיפוש בכל ההתכנסויות' })).toBeVisible();
  await expect(page.getByText('אין חומר זמין לנקודה הזאת')).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `World horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('Topic number remains tappable when external fonts are unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.goto(`${BASE}/topic/888-yeshua`, { waitUntil: 'domcontentloaded' });
  const number = page.locator('article[data-entity-type="convergence"] a[href="/2029/number/888"]').first();
  await expect(number).toBeVisible({ timeout: 30_000 });
  const box = await number.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await number.click();
  await expect(page).toHaveURL(`${BASE}/2029/number/888`);
});

test('Heichal and the other unopened areas stay closed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Vercel rewrites /heichal to the 2029 shell. Vite preview instead serves
  // the old static dist/heichal.html, so mirror the production rewrite here.
  const shell = await page.context().request.get(`${BASE}/2029.html`);
  await page.route(`${BASE}/heichal`, async (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: await shell.text(),
  }));
  for (const route of ['/books', '/book/daat-tevunot', '/heichal', '/2029/journey']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mlock'), route).toBeVisible();
  }
});

test('World stays closed if its explicit flag is missing', async ({ page }) => {
  await page.route('**/rest/v1/site_flags*', async (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(OPEN_FLAGS.filter((flag) => flag.key !== 'lock_world')),
  }));
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mlock')).toBeVisible();
  await expect(page.locator('.sod29-world-native-projection')).toHaveCount(0);
});
