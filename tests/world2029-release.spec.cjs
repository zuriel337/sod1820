const { test, expect } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const WORLD = '/world';
const CONTEXT_KEY = 'sod_research_context_session_v1';
const MOBILE_WIDTHS = [320, 360, 390];

test.setTimeout(60_000);
test.describe.configure({ mode: 'serial' });

function researchContext(value) {
  const id = String(value);
  return {
    version: 1,
    subject: { id, type: 'number', label: id, href: WORLD },
    selection: { entityId: id, entityType: 'number' },
    lens: 'world',
    dimensions: {},
    journey: null,
    returnTo: null,
  };
}

async function seedWorldAnchor(page, value) {
  const context = researchContext(value);
  await page.addInitScript(({ key, value: seeded }) => {
    sessionStorage.setItem(key, JSON.stringify(seeded));
  }, { key: CONTEXT_KEY, value: context });
}

async function openWorldAnchor(page, value, width = 390) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
  await seedWorldAnchor(page, value);
  await page.goto(`${BASE}${WORLD}`, { waitUntil: 'domcontentloaded' });
  const projection = page.locator('.sod29-world-native-projection');
  await expect(projection).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.sod29-world-anchor-intro h2')).toContainText(String(value));
  await expect(projection).toHaveAttribute('data-experience-surface', 'world');
  await expect(projection).toHaveAttribute('data-experience-question', 'מה מתחבר?');
  await expect(projection).toHaveAttribute('data-truth-safe', 'true');
  return projection;
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.sod29-root');
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      direction: root ? getComputedStyle(root).direction : null,
      bodyText: document.body.innerText.trim().length,
    };
  });
}

async function assertNoHorizontalOverflow(page) {
  const metrics = await layoutMetrics(page);
  expect(metrics.bodyText).toBeGreaterThan(100);
  expect(metrics.direction).toBe('rtl');
  expect(metrics.scrollWidth).toBe(metrics.clientWidth);
}

async function selectWorldLane(page, label) {
  const lane = page.locator('.sod29-world-lane').filter({ hasText: label }).first();
  await expect(lane).toBeVisible();
  await lane.click();
  await expect(lane).toHaveAttribute('aria-pressed', 'true');
}

test('direct /world opens the Golden discovery landing without a stored anchor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}${WORLD}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'העולם', exact: true })).toBeVisible();
  await expect(page.getByText('העולם פתוח.')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'חוקרים וכתבים' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'מפגשים', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'מסע 878', exact: true })).toBeVisible({ timeout: 30_000 });
  for (const name of ['צבי (OPOC)', 'שמעון חיימוב', 'יניב לוי', 'יצחק שחר קנדרו']) {
    await expect(page.locator('.sod29-world-person-card').filter({ hasText: name }).first()).toBeVisible();
  }
  const entry = page.locator('#world-entry');
  await expect(entry).toHaveAttribute('data-experience-surface', 'world');
  await expect(entry).toHaveAttribute('data-experience-question', 'מה מתחבר?');
  await expect(entry.getByRole('button', { name: /חיפוש \/ פקודה/ })).toBeVisible();

  const core = entry.locator('.sod29-world-core-map');
  await expect(core).toBeVisible();
  await expect(core.getByRole('button', { name: 'פתח חיפוש בעולם' })).toBeVisible();
  await expect(core.getByText('בחר שער כדי לקפוץ ישר אליו')).toBeVisible();
  const numberGate = core.locator('.sod29-world-core-node').filter({ hasText: 'מספרים' }).first();
  await expect(numberGate).toBeVisible({ timeout: 30_000 });

  await core.getByRole('button', { name: 'פתח חיפוש בעולם' }).click();
  await expect(page.getByRole('dialog', { name: 'חיפוש / פקודה' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'חיפוש / פקודה' })).toHaveCount(0);

  await numberGate.click();
  await expect(page.locator('#world-facet-number')).toBeFocused();
  await expect(page.locator('#world-facet-number').getByRole('heading', { name: 'מספרים בעולם' })).toBeVisible();

  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-landing-390.png', fullPage: true });
});

test('Golden Journey 878 starts in World and keeps its rail across a path transition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}${WORLD}`, { waitUntil: 'domcontentloaded' });

  const start = page.getByRole('button', { name: 'פתח 878 והתחל מסע' });
  await expect(start).toBeVisible({ timeout: 30_000 });
  const previews = page.locator('.sod29-world-journey-path-preview');
  expect(await previews.count()).toBeGreaterThan(0);

  await start.click();
  await expect(page.locator('.sod29-world-anchor-intro h2')).toHaveText('878', { timeout: 30_000 });
  const rail = page.locator('.sod29-world-journey-rail');
  await expect(rail).toBeVisible({ timeout: 30_000 });
  await expect(rail.getByRole('heading', { name: 'אתה בתוך מסע 878' })).toBeVisible();

  const firstPath = rail.locator('.sod29-world-journey-path-card').first();
  await expect(firstPath).toBeVisible();
  const target = Number((await firstPath.locator('.sod29-world-journey-path-values strong').innerText()).trim());
  expect(Number.isSafeInteger(target)).toBe(true);
  expect(target).not.toBe(878);

  await firstPath.click();
  await expect(page.locator('.sod29-world-anchor-intro h2')).toHaveText(String(target), { timeout: 30_000 });
  await expect(page.locator('.sod29-world-journey-rail')).toBeVisible();
  await expect.poll(
    async () => page.locator('.sod29-world-journey-track-stop').count(),
    { timeout: 10_000, message: 'journey context should expose root + traversed stop' }
  ).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.sod29-world-journey-track-stop.is-current strong')).toHaveText(String(target));
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-golden-journey-878-390.png', fullPage: true });
});

for (const width of MOBILE_WIDTHS) {
  test(`World Core remains usable and overflow-free at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${BASE}${WORLD}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('העולם פתוח.')).toBeVisible({ timeout: 30_000 });
    const core = page.locator('.sod29-world-core-map');
    await expect(core).toBeVisible();
    const firstGate = core.locator('.sod29-world-core-node').first();
    await expect(firstGate).toBeVisible({ timeout: 30_000 });
    expect(await core.locator('.sod29-world-core-node').count()).toBeGreaterThan(0);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/release-visual/world-core-${width}.png`, fullPage: true });
  });
}

for (const width of [...MOBILE_WIDTHS, 1440]) {
  test(`RICH live World 1820 is truthful and overflow-free at ${width}px`, async ({ page }) => {
    const projection = await openWorldAnchor(page, 1820, width);
    await expect(projection).toHaveAttribute('data-world-density', 'rich');
    await expect(page.getByRole('heading', { name: 'מה אתה רוצה לראות עכשיו?' })).toBeVisible();
    await selectWorldLane(page, 'מקורות');
    await expect(page.getByText('מאיפה החומר מגיע')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/release-visual/world-rich-1820-${width}.png`, fullPage: true });
  });
}

test('RICH 1820 presents one anchor header before profile and exploration lanes', async ({ page }) => {
  await openWorldAnchor(page, 1820, 390);

  await expect(page.locator('.sod29-world-anchor-intro h2')).toHaveText('1820');
  await expect(page.locator('.sod29-world-anchor-intro')).toContainText('מתחילים במהות');
  await expect(page.getByText('מרכז העולם', { exact: true })).toHaveCount(0);
  await expect(page.locator('.sod29-world-stage')).toHaveCount(0);
  await expect(page.locator('.sod29-anchor-core')).toHaveCount(0);
  await expect(page.locator('.sod29-orbit-metrics')).toHaveCount(0);

  const hierarchy = await page.locator('.sod29-world-anchor-intro, .sod29-world-anchor-profile, .sod29-world-orientation')
    .evaluateAll((nodes) => nodes.map((node) => {
      if (node.classList.contains('sod29-world-anchor-intro')) return 'anchor';
      if (node.classList.contains('sod29-world-anchor-profile')) return 'profile';
      return 'orientation';
    }));
  expect(hierarchy).toEqual(['anchor', 'profile', 'orientation']);
  await assertNoHorizontalOverflow(page);
});

test('RICH 1820 opens human-first before raw research detail', async ({ page }) => {
  await openWorldAnchor(page, 1820, 390);

  await expect(page.getByRole('heading', { name: 'מה חשוב לדעת על 1820' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'לדף המספר ←' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'העיקר סביב 1820' })).toBeVisible();
  const primaryItems = page.locator('.sod29-world-primary-item');
  const primaryCount = await primaryItems.count();
  expect(primaryCount).toBeGreaterThan(0);
  expect(primaryCount).toBeLessThanOrEqual(7);

  await selectWorldLane(page, 'גימטריה');
  await expect(page.getByRole('heading', { name: 'כל רשימת הגימטריות של 1820' })).toBeVisible();
  await expect(page.getByLabel('סינון גימטריה לפי שיטה')).toBeVisible();
  await expect(page.getByLabel('סינון גימטריה לפי סוג')).toBeVisible();
  const gematriaRows = page.locator('.sod29-world-gematria-row');
  const fullGematriaCount = await gematriaRows.count();
  expect(fullGematriaCount).toBeGreaterThan(10);
  await expect(gematriaRows.first()).toContainText('1820');

  await page.getByLabel('סינון גימטריה לפי שיטה').selectOption({ index: 1 });
  const filteredGematriaCount = await gematriaRows.count();
  expect(filteredGematriaCount).toBeGreaterThan(0);
  expect(filteredGematriaCount).toBeLessThan(fullGematriaCount);
  await page.getByLabel('סינון גימטריה לפי שיטה').selectOption('all');

  await selectWorldLane(page, 'מקורות');
  await expect(page.getByRole('heading', { name: 'מאיפה החומר מגיע' })).toBeVisible();
  const publicSourceText = await page.locator('.sod29-world-source-row').allTextContents();
  expect(publicSourceText.join(' ')).not.toMatch(/(?:channel_updates|wa_bot_log|work_log|gallery_images|posts?):/i);
  expect(await page.locator('.sod29-world-native-projection').innerText()).not.toContain('traffic_intelligence');

  await selectWorldLane(page, 'זמן');
  await expect(page.getByRole('heading', { name: 'נוסף למחקר' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ציר הזמן' })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-human-projection-1820-390.png', fullPage: true });
});


test('RICH 1820 projects real published media without legacy gallery UI', async ({ page }) => {
  await openWorldAnchor(page, 1820, 390);
  await selectWorldLane(page, 'תמונות');
  await expect(page.getByRole('heading', { name: 'החומר החזותי שמחובר ל־1820' })).toBeVisible();
  const mediaCards = page.locator('.sod29-world-media-card');
  expect(await mediaCards.count()).toBeGreaterThan(0);
  const firstImage = mediaCards.first().locator('img');
  await expect(firstImage).toBeVisible();
  const src = await firstImage.getAttribute('src');
  expect(src).toMatch(/linswmnnkjxvweumprav\.supabase\.co\/storage\/v1\/object\/public\/media\//);
  const alt = await firstImage.getAttribute('alt');
  expect(String(alt || '').trim().length).toBeGreaterThan(3);
  await expect(page.locator('.sod29-world-native-projection')).not.toContainText(/\.(?:jpe?g|png|webp|gif|svg|avif)\b/i);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-media-1820-390.png', fullPage: true });
});

test('RICH 1820 remains useful when research rows are access-filtered', async ({ page }) => {
  const projection = await openWorldAnchor(page, 1820, 390);
  await expect(projection).toHaveAttribute('data-world-density', 'rich');
  await expect(page.getByText('חלק מהחומר אינו זמין בהרשאה הנוכחית')).toBeVisible();
  await selectWorldLane(page, 'קשרים');
  await expect(page.getByText('מה מחובר לכאן')).toBeVisible();
  await selectWorldLane(page, 'מקורות');
  await expect(page.getByText('מאיפה החומר מגיע')).toBeVisible();
  await page.screenshot({ path: 'test-results/release-visual/world-partial-access-1820-390.png', fullPage: true });
});

test('automatic filters, sorting and explain-why work without exposing admin controls to anon', async ({ page }) => {
  await openWorldAnchor(page, 1820, 390);
  await expect(page.getByRole('button', { name: /מצב מנהל/ })).toHaveCount(0);
  await selectWorldLane(page, 'קשרים');
  await expect(page.getByLabel('מיון קשרים')).toBeVisible();
  const numberFilter = page.getByRole('button', { name: /מספרים ·/ }).first();
  await expect(numberFilter).toBeVisible();
  await numberFilter.click();
  await expect(numberFilter).toHaveAttribute('aria-pressed', 'true');
  const why = page.getByRole('button', { name: 'למה כאן?' }).first();
  await expect(why).toBeVisible();
  await why.click();
  await expect(page.getByText(/אינו דירוג אמת, אימות או קנוניות/).first()).toBeVisible();
  await page.getByLabel('מיון קשרים').selectOption('number_asc');
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-rich-1820-filters-390.png', fullPage: true });
});

test('MEDIUM live World 314 remains medium instead of being visually inflated', async ({ page }) => {
  const projection = await openWorldAnchor(page, 314, 390);
  await expect(projection).toHaveAttribute('data-world-density', 'medium');
  await selectWorldLane(page, 'קשרים');
  await expect(page.getByText('מה מחובר לכאן')).toBeVisible();
  await expect(page.getByText('דברים שנמצאו סביב הנקודה הזאת')).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-medium-314-390.png', fullPage: true });
});

test('SPARSE live World 122 stays honestly sparse with no fabricated research', async ({ page }) => {
  const projection = await openWorldAnchor(page, 122, 390);
  await expect(projection).toHaveAttribute('data-world-density', 'sparse');
  await expect(page.getByText('הנקודה קיימת, אבל סביבה מעט חומר כרגע')).toBeVisible();
  await expect(page.getByText('דברים שנמצאו סביב הנקודה הזאת')).toHaveCount(0);
  await expect(page.getByText('מאיפה החומר מגיע')).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-sparse-122-390.png', fullPage: true });
});

test('World uses the shared Command, Inspect, Share and exact-return seams', async ({ page }) => {
  await openWorldAnchor(page, 1820, 390);

  const command = page.locator('.sod29-command-island button').filter({ hasText: 'פקודה' });
  await expect(command).toBeVisible();
  await command.click();
  await expect(page.getByRole('dialog', { name: 'חיפוש / פקודה' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'חיפוש / פקודה' })).toHaveCount(0);

  const inspect = page.locator('.sod29-world-native-projection button').filter({ hasText: 'בדוק' }).first();
  await expect(inspect).toBeVisible();
  await inspect.focus();
  await page.keyboard.press('Enter');
  const inspectDialog = page.locator('.sod29-frame-panel[role="dialog"]');
  await expect(inspectDialog).toBeVisible();
  expect(await inspectDialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  // Canonical share owner: ShareActions. In headless Chromium native share is unavailable,
  // so the guaranteed control is the canonical copy-link action.
  const share = inspectDialog.getByRole('button', { name: /העתק/ });
  await expect(share).toBeEnabled();
  await share.click();
  await expect(share).toContainText(/הועתק/);
  await page.keyboard.press('Escape');

  const exactReturn = page.locator('.sod29-header-actions button[title]').first();
  await expect(exactReturn).toBeDisabled();

  await selectWorldLane(page, 'קשרים');
  const deepen = page.locator('.sod29-world-native-projection button').filter({ hasText: 'העמק' }).first();
  await expect(deepen).toBeVisible();
  await deepen.focus();
  await page.keyboard.press('Enter');
  await expect(exactReturn).toBeEnabled({ timeout: 30_000 });
  await exactReturn.click();
  await expect(page.locator('.sod29-world-anchor-intro h2')).toHaveText('1820', { timeout: 30_000 });
});

test('loading and error states are honest and native', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedWorldAnchor(page, 1820);

  let delayed = false;
  await page.route('**/rest/v1/nodes*', async (route) => {
    if (!delayed) {
      delayed = true;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    await route.continue();
  });
  await page.goto(`${BASE}${WORLD}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('אוסף את מה שמתחבר לכאן')).toBeVisible({ timeout: 1000 });
  await page.screenshot({ path: 'test-results/release-visual/world-loading-390.png', fullPage: true });
  await expect(page.locator('.sod29-world-native-projection')).toBeVisible({ timeout: 30_000 });

  await page.unroute('**/rest/v1/nodes*');
  await page.route('**/rest/v1/nodes*', (route) => route.abort('failed'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('לא הצלחנו לפתוח את הנקודה כרגע')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/release-visual/world-error-390.png', fullPage: true });
});

test('unavailable identity is not silently replaced by another anchor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedWorldAnchor(page, 999999999);
  await page.goto(`${BASE}${WORLD}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('אין חומר זמין לנקודה הזאת')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: '999999999', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/release-visual/world-unavailable-390.png', fullPage: true });
});

test('reduced motion preserves the same World meaning and controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const projection = await openWorldAnchor(page, 1820, 390);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(projection).toHaveAttribute('data-experience-question', 'מה מתחבר?');
  await page.getByRole('button', { name: /קשרים/ }).first().click();
  await expect(page.getByText('מה מחובר לכאן')).toBeVisible();
  await expect(page.locator('.sod29-world-native-projection button').filter({ hasText: 'העמק' }).first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/world-rich-1820-reduced-motion-390.png', fullPage: true });
});

test('320px RTL World survives 200% text zoom without horizontal overflow', async ({ page }) => {
  await openWorldAnchor(page, 1820, 320);
  await page.addStyleTag({ content: 'html{font-size:200%!important}' });
  await assertNoHorizontalOverflow(page);
  const firstAction = page.locator('.sod29-world-native-projection button').first();
  await expect(firstAction).toBeVisible();
  await firstAction.focus();
  await expect(firstAction).toBeFocused();
  await page.screenshot({ path: 'test-results/release-visual/world-rich-1820-320-zoom200.png', fullPage: true });
});


test('private researcher corpus stays gated for non-admin 2029 sessions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/researcher/tzvi-opoc`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'קורפוס חוקר', exact: true })).toBeVisible();
  await expect(page.getByText('מסך מנהל בלבד')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('297 ממצאים')).toHaveCount(0);
  await expect(page.getByText('צבי (OPOC)', { exact: true })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/researcher-corpus-gated-390.png', fullPage: true });
});
