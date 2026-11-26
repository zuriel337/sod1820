const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');
const { installPublicReadOnlyEgress, disposePublicReadOnlyEgress } = require('./fixtures/public-readonly-egress.cjs');
const { installSyntheticAdmin, SYNTHETIC_ADMIN_ID } = require('./fixtures/synthetic-admin-session.cjs');

// A personal save on a Post, with the browser store FULL of old navigation journals (what months of reading with an older runtime leaves behind):
// the person is told the real cause, can free ONLY abandoned passive journals (never a journal holding a save), and the SAME save then reaches the
// account and is confirmed by the server receipt. The server is answered locally; nothing here reaches the live database.
const BASE = 'http://127.0.0.1:4173';
const API = 'https://linswmnnkjxvweumprav.supabase.co';
const PRINCIPAL = `user:${SYNTHETIC_ADMIN_ID}`;
const KEY = `sod_research_v2:${PRINCIPAL}`;

test.beforeEach(async ({ context }) => {
  await installPublicReadOnlyEgress(context, { baseUrl: BASE });
  await installStorageEgressGuard(context);
});
test.afterEach(async ({ context }) => disposePublicReadOnlyEgress(context));
test.setTimeout(90_000);

test('a full browser store is named, freed on request without touching a saved journal, and the save is confirmed by the server', async ({ page }) => {
  await installSyntheticAdmin(page);
  await page.addInitScript(({ key, principal }) => {
    try { sessionStorage.setItem('sod_guest_signup_popup_dismissed', '1'); } catch {}
    if (localStorage.getItem('__seeded')) return;
    // The same few pages read again and again (as in life): many journals, few distinct history entries, so the recovery archive is small next to what is freed.
    const batch = (i) => ({ batch_id: `b${i}`, ops: [{ kind: 'history_add', op_id: `o${i}`, entity: { id: `post:${i % 3}`, type: 'post', title: 't'.repeat(600), ref: `s${i % 3}`, link: '/p', metadata: {}, t: i } }] });
    // Ownerless: written by the oldest runtime, one per page load.
    for (let i = 0; i < 8; i += 1) localStorage.setItem(`${key}:pending:old${i}`, JSON.stringify({ principal, revision: 3, queue: [batch(i), batch(i + 50)], inflight: null }));
    localStorage.setItem(`${key}:pending:precious`, JSON.stringify({ principal, revision: 3, inflight: null, queue: [{ batch_id: 'keep', ops: [{ kind: 'item_upsert', op_id: 'k1', bucket: 'library', entity: { id: 'number:7', type: 'number', title: '7', ref: '7', link: '/number/7', metadata: {}, addedAt: 1 } }] }] }));
    localStorage.setItem('__seeded', '1');
    // The browser store is now full: a write that would grow it past what it holds is refused, as a real quota refuses.
    // (Only the research keys are limited here, so the synthetic sign-in itself is not what the test breaks; a real full store also hurts sign-in: see #1528.)
    const research = (name) => name.startsWith('sod_research_v2:');
    const sizeOf = (skip) => Object.keys(localStorage).filter(research).reduce((n, name) => n + (name === skip ? 0 : name.length + localStorage.getItem(name).length), 0);
    const limit = sizeOf() + 60;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (this === localStorage && research(k) && sizeOf(k) + k.length + String(v).length > limit) { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; }
      return original.call(this, k, v);
    };
  }, { key: KEY, principal: PRINCIPAL });

  const calls = [];
  let revision = 3, saved = [];
  const snapshot = () => ({ cart: [], saved, pinned: [], history: [], collections: [], journeys: [], revision, context: null });
  await page.route(`${API}/rest/v1/rpc/research_state_snapshot_v1`, route => { calls.push('snapshot'); route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot()) }); });
  await page.route(`${API}/rest/v1/rpc/research_state_apply_ops_v1`, route => {
    const body = JSON.parse(route.request().postData() || '{}');
    calls.push(`apply:${body.p_ops.map(op => op.kind).join(',')}`);
    for (const op of body.p_ops) if (op.kind === 'item_upsert') saved = [op.entity, ...saved];
    revision += 1;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, replayed: false, batch_id: body.p_batch_id, applied_revision: revision, snapshot: snapshot() }) });
  });
  await page.route('**/rest/v1/posts*', async (route) => {
    const url = new URL(route.request().url());
    if (!url.search.includes('bennett-melach-631-78')) return route.fallback();
    const row = { id: 900000631, slug: 'bennett-melach-631-78', title: 'בנט — מקור בדיקה סינתטי', source: 'SOD1820', tags: [], categories: [], author: 'מקור בדיקה',
      date: '2026-10-01T00:00:00+00:00', modified: '2026-10-01T00:00:00+00:00', excerpt: 'בדיקה', content: '<p>טקסט בדיקה סינתטי.</p>', image_url: null, thumb_url: null };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) });
  });
  await page.route('**/post/bennett-melach-631-78*', async (route) => {
    const response = await page.request.get(`${BASE}/2029.html`);
    await route.fulfill({ status: response.status(), headers: response.headers(), body: await response.body() });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/post/bennett-melach-631-78`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="post-reading"]')).toBeVisible({ timeout: 30_000 });
  const button = page.locator('[data-personal-save] button').first();
  await expect(button).toBeVisible({ timeout: 20_000 });

  // The save belongs to the signed-in account: wait for the session lookup to finish (the guest runtime would take the click otherwise).
  await page.waitForResponse(response => response.url().includes('/auth/v1/user'), { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await button.click();
  const notice = page.locator('[data-personal-save] small[role="status"]');
  await expect(notice).toContainText('האחסון המקומי של הדפדפן מלא', { timeout: 10_000 });
  await expect(notice).toContainText('קוד: quota');
  expect(calls.filter(call => call.startsWith('apply'))).toEqual([]);   // fail-closed: nothing was sent without a durable journal

  const reclaim = page.getByRole('button', { name: 'פינוי ושמירה' });
  await expect(reclaim).toBeVisible();
  await reclaim.click();
  await expect(notice).toContainText('נשמר באזור האישי בחשבון', { timeout: 20_000 });
  expect(calls.filter(call => call.startsWith('apply'))).toHaveLength(1);
  expect(calls.find(call => call.startsWith('apply'))).toContain('item_upsert');

  const kept = await page.evaluate((key) => ({
    precious: Boolean(localStorage.getItem(`${key}:pending:precious`)),
    old: Object.keys(localStorage).filter(name => name.startsWith(`${key}:pending:old`)).length,
  }), KEY);
  expect(kept.precious).toBe(true);   // a journal holding a real save is never freed
  expect(kept.old).toBe(0);           // only the abandoned navigation journals were
});
