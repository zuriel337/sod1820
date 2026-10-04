const { test, expect } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const POST_PATH = '/post/bennett-melach-631-78';
const FAMILIARITY_KEY = 'sod_entry_learn_2029_v1';

async function routePostTo2029(page) {
  await page.route('**/post/bennett-melach-631-78*', async (route) => {
    const response = await page.request.get(`${BASE}/2029.html`);
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: await response.body(),
    });
  });
}

async function noOverflow(page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBe(metrics.clientWidth);
}

test.setTimeout(60_000);
test.describe.configure({ mode: 'serial' });

test('direct Post teaches in place before opening the canonical calculation at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((key) => {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem('sod_entry_learn_2029_session_v1'); } catch {}
  }, FAMILIARITY_KEY);
  await routePostTo2029(page);

  let traceRequests = 0;
  let traceResponse = null;
  page.on('request', (request) => {
    if (request.url().includes('/rpc/gematria_method_trace')) traceRequests += 1;
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/rpc/gematria_method_trace')) return;
    try {
      traceResponse = { status: response.status(), body: await response.json() };
    } catch {
      traceResponse = { status: response.status(), body: null };
    }
  });

  await page.goto(`${BASE}${POST_PATH}`, { waitUntil: 'networkidle' });
  const post = page.locator('[data-experience-surface="post-reading"]');
  await expect(post).toBeVisible({ timeout: 30_000 });

  const orientation = page.locator('.sod29-entry-orientation-slot .sod29-learn-mark');
  await expect(orientation).toBeVisible();
  await expect(orientation).toHaveClass(/is-prominent/);
  await expect(orientation.getByRole('button', { name: 'חדש כאן? מה עושים בפוסט הזה?' })).toBeVisible();

  const focusGroup = post.locator('[data-contextual-number-focus-group="true"]');
  await expect(focusGroup).toBeVisible({ timeout: 30_000 });
  expect(traceRequests).toBe(0);

  await focusGroup.locator('[data-contextual-number-focus="true"]').first().click();

  const sidecar = page.locator('[data-experience-capability="contextual-sidecar"]');
  await expect(sidecar).toBeVisible({ timeout: 30_000 });
  await expect(sidecar).toHaveAttribute('data-mobile-projection', 'bottom-context-sheet');
  await expect(sidecar).toContainText('מלח');

  // Inspect is the Post first meaningful action, so Orientation compacts instead of disappearing.
  await expect(page.locator('.sod29-entry-orientation-slot .sod29-learn-mark')).toHaveClass(/is-compact/);

  const learn = sidecar.locator('[data-learn-scope="concept"]');
  await expect(learn).toBeVisible();
  await expect(learn.getByRole('button', { name: 'איך זה עובד?' })).toBeVisible();
  await learn.getByRole('button', { name: 'איך זה עובד?' }).click();
  await expect(learn).toContainText('השיטה היא חלק מהטענה המספרית');
  await expect(learn).toContainText('מלח');
  await expect(learn).toContainText('רגיל');
  await expect(learn).toContainText('78');
  expect(traceRequests).toBe(0);

  // ASK: unresolved comprehension opens the already-live Contact Gateway, not a new help form.
  await expect(learn.getByRole('button', { name: 'עדיין לא ברור?' })).toBeVisible();
  await learn.getByRole('button', { name: 'עדיין לא ברור?' }).click();

  const contact = page.locator('[data-contact-gateway="true"]');
  await expect(contact).toBeVisible({ timeout: 10_000 });
  await expect(contact).toHaveAttribute('data-contact-learn-context', 'true');
  await expect(contact.locator('textarea')).toHaveValue(/פתחתי את ההסבר על שיטת הגימטריה ועדיין לא היה לי ברור/);
  await expect(contact.locator('.sod29-contact-suggest strong')).toHaveText('משהו לא עובד');
  await contact.locator('.sod29-contact-suggest').click();
  await expect(page.locator('[data-issue-report="true"]')).toBeVisible();
  await expect(page.locator('[data-issue-report="true"] textarea')).toHaveValue(/פתחתי את ההסבר על שיטת הגימטריה/);

  await page.locator('.sod29-frame-panel-head button[aria-label="סגור"]').click();
  await expect(page.locator('[data-contact-gateway="true"]')).toHaveCount(0);

  // Re-enter the same focus and continue; asking for help never converts the object to feedback/research truth.
  await focusGroup.locator('[data-contextual-number-focus="true"]').first().click();
  const sidecarAfterAsk = page.locator('[data-experience-capability="contextual-sidecar"]');
  const learnAfterAsk = sidecarAfterAsk.locator('[data-learn-scope="concept"]');
  await learnAfterAsk.getByRole('button', { name: 'איך זה עובד?' }).click();

  // TRY uses the existing Number drawer / canonical trace path. Learn never calculates locally.
  await learnAfterAsk.getByRole('button', { name: 'ראה את החישוב' }).click();
  const drawer = sidecar.locator('.sod29-number-drawer2029');
  await expect(drawer).toBeVisible({ timeout: 30_000 });
  await expect(drawer.locator('.sod29-number-v10-expression strong')).toHaveText('מלח', { timeout: 20_000 });

  await expect.poll(async () => page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((name) => name.startsWith('sod_research_context_v2:'));
    if (!key) return '';
    const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
    const selection = stored?.selection || {};
    return JSON.stringify([
      selection.entityId || null,
      selection.expression || null,
      selection.method || null,
      Number(selection.resultValue),
    ]);
  }), { timeout: 5_000 }).toBe(JSON.stringify(['salt-78', 'מלח', 'רגיל', 78]));

  await expect.poll(() => traceRequests, { timeout: 10_000 }).toBeGreaterThan(0);

  const calculation = drawer.locator('.sod29-number-v10-calculation-card');
  await expect(calculation).toBeVisible({ timeout: 20_000 });
  await expect(calculation).toContainText('רגיל');
  await expect(calculation).toContainText('78');
  await calculation.click();

  const inspector = drawer.locator('.sod29-number-method-inspector');
  await expect(inspector).toBeVisible({ timeout: 10_000 });
  await expect(inspector).toHaveAttribute('data-method-inspector', 'רגיל');

  const anySpatialStage = inspector.locator('[data-experience-capability="spatial-method-stage"]');
  await expect(anySpatialStage).toBeVisible({ timeout: 10_000 });
  const spatialMethodKey = await anySpatialStage.getAttribute('data-method-key');
  if (spatialMethodKey !== 'רגיל') {
    const state = await anySpatialStage.getAttribute('data-state');
    const text = await anySpatialStage.innerText().catch(() => '');
    throw new Error(`SpatialMethodStage verification failed: state=${state || 'verified-without-key'} inspector=רגיל calculation=78 trace=${JSON.stringify(traceResponse)} text=${text}`);
  }

  const stored = await page.evaluate((key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }, FAMILIARITY_KEY);
  expect(stored?.surfaces?.post?.state).toBe('complete');
  expect(['tried', 'complete']).toContain(stored?.concepts?.method?.stage);

  await noOverflow(page);
  await page.screenshot({ path: 'test-results/release-visual/entry-learn-post-390.png', fullPage: true });

  await page.keyboard.press('Escape');
  await expect(page.locator('.sod29-number-drawer2029')).toHaveCount(0);

  const exactReturn = page.getByRole('button', { name: /חזרה מדויקת/ });
  await expect(exactReturn).toBeEnabled();
  await exactReturn.click();
  await expect(page).toHaveURL(/\/post\/bennett-melach-631-78#source-region-salt-78/, { timeout: 20_000 });
  await expect(page.locator('.sod29-entry-orientation-slot')).toHaveCount(0);
  await noOverflow(page);
});

test('completed Post entry stays compact after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      surfaces: { post: { v: 1, state: 'complete', at: Date.now() } },
      concepts: { method: { v: 1, stage: 'tried', at: Date.now() } },
    }));
  }, FAMILIARITY_KEY);
  await routePostTo2029(page);

  await page.goto(`${BASE}${POST_PATH}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible({ timeout: 30_000 });
  const orientation = page.locator('.sod29-entry-orientation-slot .sod29-learn-mark');
  await expect(orientation).toBeVisible();
  await expect(orientation).toHaveClass(/is-compact/);
  await noOverflow(page);
});
