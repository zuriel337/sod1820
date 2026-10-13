const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');

const BASE = process.env.G4_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const CLOSED_FLAGS = [
  'lock_world', 'lock_heichal', 'lock_raziel_site', 'lock_life_journey', 'lock_books',
].map((key) => ({ key, enabled: true, mode: 'all', message: `${key} בבנייה` }));
const OPEN_FLAGS = [{ key: 'lock_number', enabled: false, mode: 'all', message: '' }, ...CLOSED_FLAGS.map((flag) => flag.key === 'lock_world' ? { ...flag, enabled: false, message: '' } : flag)];

test.setTimeout(90_000);
test.beforeEach(async ({ context }) => {
  // Test environment: real public reads only; no analytics/product writes.
  await context.route('https://linswmnnkjxvweumprav.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const readRpc = url.pathname.startsWith('/rest/v1/rpc/')
      && /^(fn_|gematria_|posts_by_number_strict|number_neighbors|lang_links_list)/.test(url.pathname.split('/').pop());
    if (request.method() === 'GET' || (request.method() === 'POST' && readRpc)) return route.continue();
    return route.abort();
  });
  await installStorageEgressGuard(context);
  await context.route('**/rest/v1/site_flags*', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([...OPEN_FLAGS, { key: 'lock_els', enabled: false, mode: 'all', message: '' }]),
  }));
});

test('full Number page opens from both menus without entering another drawer', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    if (width < 720) await page.getByRole('button', { name: 'פתח ניווט' }).click();
    await page.getByRole('link', { name: 'דף המספר', exact: true }).click();
    await expect(page).toHaveURL(`${BASE}/number/1820`);
    const full = page.locator('.sod29-number-core2029.is-page[data-number-core-root="1820"]');
    await expect(full).toBeVisible({ timeout: 35_000 });
    await expect(page.locator('.sod29-number-drawer2029')).toHaveCount(0);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      label: Number.parseFloat(getComputedStyle(document.querySelector('.sod29-number-v10-method-head span')).fontSize),
    }));
    expect(metrics.overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    expect(metrics.label).toBeGreaterThanOrEqual(14);
  }
});

test('real zero stays zero, invalid number never falls through to zero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/number/0`, { waitUntil: 'domcontentloaded' });
  const zero = page.locator('[data-experience-surface="number"][data-number-root="0"]');
  await expect(zero).toBeVisible({ timeout: 35_000 });
  // An unindexed Number may have no canonical Graph node. Do not invent one.
  if (await zero.getAttribute('data-number-empty') === 'true') {
    await expect(zero).toContainText('אין עדיין חומר מחקרי מקושר ל־0');
    await expect(zero.locator('.sod29-number-zero-identity strong')).toHaveText('0');
  } else {
    await expect(zero.locator('.sod29-number-core2029.is-page')).toBeVisible();
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="number"][data-number-root="0"]'))
    .toBeVisible({ timeout: 35_000 });
  await page.goto(`${BASE}/number/not-a-number`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('המספר לא תקין')).toBeVisible();
  await expect(page.locator('[data-number-core-root="0"]')).toHaveCount(0);
});

test('Number expression and method deep link survives reload; fake crossing is not shown as evidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const href = `${BASE}/number/376?focus=${encodeURIComponent('שלום')}&method=${encodeURIComponent('רגיל')}&cross=${encodeURIComponent('לא-מאומת-123')}`;
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 35_000 });
  const focus = page.locator('[data-expression-focus="true"]');
  await expect(focus).toContainText('שלום');
  await expect(focus).not.toContainText('לא-מאומת-123');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 35_000 });
  await expect(focus).toContainText('שלום', { timeout: 35_000 });
  await expect(focus).not.toContainText('לא-מאומת-123');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('full Number crossing area and regular rail retain readable layout at all breakpoints', async ({ page }) => {
  for (const width of [320, 390, 980, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/number/376?focus=${encodeURIComponent('שלום')}&method=${encodeURIComponent('רגיל')}`, { waitUntil: 'domcontentloaded' });
    const number = page.locator('.sod29-number-core2029.is-page');
    await expect(number).toBeVisible({ timeout: 35_000 });
    const box = number.locator('[data-experience-capability="number-hidden-crossing"]');
    await expect(box).toBeVisible({ timeout: 35_000 });
    const metrics = await page.evaluate(() => {
      const q = (sel) => { const el = document.querySelector(sel); return el ? Number.parseFloat(getComputedStyle(el).fontSize) : null; };
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        boxWidth: document.querySelector('[data-experience-capability="number-hidden-crossing"]')?.getBoundingClientRect().width,
        crossingHead: q('.sod29-number-core2029.is-page .sod29-number-v10-crossing .sod29-number-v10-panel-head span'),
        method: q('.sod29-number-core2029.is-page .sod29-number-v10-method-head span'),
        regular: q('.sod29-number-core2029.is-page .sod29-number-v11-regular-track button strong'),
      };
    });
    expect(metrics.overflow, `full Number horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    expect(metrics.boxWidth).toBeGreaterThan(110);
    expect(metrics.crossingHead).toBeGreaterThanOrEqual(14);
    expect(metrics.method).toBeGreaterThanOrEqual(14);
    if (metrics.regular != null) expect(metrics.regular).toBeGreaterThanOrEqual(14);
    const lead = box.locator('[data-experience-action="crossing-focus"]');
    if (await lead.count()) {
      await lead.click();
      await expect(page).toHaveURL(/cross=/);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 35_000 });
      await expect(page.locator('[data-expression-focus="true"]')).toContainText('↔', { timeout: 35_000 });
      await page.getByRole('button', { name: /חזור ל־376|חזור למספר/ }).first().click();
      await expect(page).not.toHaveURL(/cross=/);
    }
  }
});

test('same Number can be revisited after navigation/back without losing preview-only SEO', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.goto(`${BASE}/number/1237`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="1237"]')).toBeVisible({ timeout: 35_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="1237"]')).toBeVisible({ timeout: 35_000 });
  await page.goBack();
  await expect(page).toHaveURL(`${BASE}/`);
  await expect(page.locator('[data-experience-capability="home-composition"]')).toBeVisible();
});

test('Number and verified crossing are usable before stalled depth finishes', async ({ page, context }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const lookupRequests = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/rpc/fn_number_lookup')) lookupRequests.push(request.postDataJSON());
  });
  await context.route('**/rest/v1/edges*', async route => { await held; await route.fallback(); });
  try {
    await page.goto(`${BASE}/number/376?focus=${encodeURIComponent('שלום')}&method=${encodeURIComponent('רגיל')}`, { waitUntil: 'domcontentloaded' });
    const core = page.locator('[data-number-core-root="376"]');
    await expect(core).toBeVisible({ timeout: 15_000 });
    await expect(core.locator('.sod29-number-v10-method-grid button').first()).toBeEnabled({ timeout: 15_000 });
    const crossing = core.locator('[data-experience-action="crossing-focus"]');
    await expect(crossing).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-number-depth]')).toHaveAttribute('data-number-depth', 'loading');
    await expect(core.locator('[data-experience-action="number-life-seal"] small')).toHaveText('טוען…');
    await crossing.click();
    await expect(page).toHaveURL(/cross=/);
    await expect(page.locator('[data-expression-focus="true"]')).toContainText('↔');
    release();
    await expect(page.locator('[data-number-depth]')).toHaveAttribute('data-number-depth', 'ready', { timeout: 35_000 });
    expect(lookupRequests.filter(args => args.p_value === 376)).toHaveLength(1);
    await expect(page.locator('[data-expression-focus="true"]')).toContainText('↔');
  } finally { release(); }
});

test('a depth failure keeps the loaded Number and methods available without inventing zero coverage', async ({ page, context }) => {
  await context.route('**/rest/v1/edges*', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic depth reader unavailable' }),
  }));
  await page.goto(`${BASE}/number/376?focus=${encodeURIComponent('שלום')}&method=${encodeURIComponent('רגיל')}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-depth]')).toHaveAttribute('data-number-depth', 'unavailable', { timeout: 35_000 });
  const core = page.locator('[data-number-core-root="376"]');
  await expect(core).toBeVisible();
  await expect(core.locator('.sod29-number-v10-method-grid button').first()).toBeEnabled({ timeout: 15_000 });
  await expect(core.locator('[data-experience-action="number-life-seal"] small')).toHaveText('לא זמין');
  await expect(page.getByText('הקשרים והמקורות לא זמינים כרגע', { exact: true })).toBeVisible();
});

test('back and forward subscribe to an in-flight Number without waiting for its depth', async ({ page, context }) => {
  await page.goto(`${BASE}/number/376?focus=${encodeURIComponent('שלום')}&method=${encodeURIComponent('רגיל')}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-depth]')).toHaveAttribute('data-number-depth', 'ready', { timeout: 35_000 });
  let releaseLookup, releaseDepth;
  const lookup = new Promise(resolve => { releaseLookup = resolve; });
  const depth = new Promise(resolve => { releaseDepth = resolve; });
  let lookupCount = 0;
  await context.route('**/rest/v1/rpc/fn_number_lookup', async route => {
    if (route.request().postDataJSON()?.p_value === 1820) { lookupCount++; await lookup; }
    await route.fallback();
  });
  await context.route('**/rest/v1/edges*', async route => { await depth; await route.fallback(); });
  try {
    await page.getByRole('link', { name: 'דף המספר', exact: true }).click();
    await expect(page.locator('[data-number-core-root="1820"]')).toBeVisible({ timeout: 15_000 });
    await page.goBack();
    await expect(page.locator('[data-number-core-root="376"]')).toBeVisible();
    await page.goForward();
    const core = page.locator('[data-number-core-root="1820"]');
    await expect(core).toBeVisible();
    releaseLookup();
    await expect(core.locator('.sod29-number-v10-method-grid button').first()).toBeEnabled({ timeout: 15_000 });
    await expect(page.locator('[data-number-depth]')).toHaveAttribute('data-number-depth', 'loading');
    expect(lookupCount).toBe(1);
    releaseDepth();
    await expect(page.locator('[data-number-depth]')).toHaveAttribute('data-number-depth', 'ready', { timeout: 35_000 });
  } finally { releaseLookup(); releaseDepth(); }
});
