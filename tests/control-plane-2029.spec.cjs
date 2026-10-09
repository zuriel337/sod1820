const { test, expect } = require('@playwright/test');
const { readFileSync, mkdirSync } = require('node:fs');

// Both modes mount the real App2029/AuthProvider/ControlPlane/SystemFrame/resolver.
// CI uses synthetic HTTP fixtures. Live acceptance uses GoTrue-issued sessions and
// real RPCs on the existing disposable child; it never mocks modules or role gates.
const BASE = process.env.CONTROL_2029_BASE_URL || 'http://127.0.0.1:4173';
const LIVE = Boolean(process.env.CONTROL_2029_AUTH_FILE);
const STAGE = 'https://krnaxxndgtrdnaddlzws.supabase.co';
const API = LIVE ? STAGE : 'https://linswmnnkjxvweumprav.supabase.co';
const REF = new URL(API).hostname.split('.')[0];
const sessions = LIVE ? JSON.parse(readFileSync(process.env.CONTROL_2029_AUTH_FILE, 'utf8')) : null;
const RPCS = ['admin_system_health', 'admin_video_map_health', 'admin_op_trace_list_v1', 'admin_op_trace_v1'];
const TRACE_IDS = ['20290000-0000-4000-8000-000000000001', '20290000-0000-4000-8000-000000000002'];
const CAPABILITIES = ['control-2029-fixture-a', 'control-2029-fixture-b'];
const SPANS = ['control-2029-span-a', 'control-2029-span-b'];
const PRESETS = ['light', 'parchment', 'dark'];
const WIDTHS = [1440, 390, 320];
const EVIDENCE = 'test-results/control-plane-2029';

test.setTimeout(60_000);
test.describe.configure({ mode: 'serial' });

function fixtureSession(role) {
  const id = role === 'admin' ? '20290000-0000-4000-9000-000000000001' : '20290000-0000-4000-9000-000000000002';
  const payload = Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  return { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`, refresh_token: 'synthetic', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600,
    user: { id, aud: 'authenticated', role: 'authenticated', email: `${role}@example.invalid`, app_metadata: {}, user_metadata: {} } };
}

async function prepare(context, page, role, preset = 'light', options = {}) {
  const requests = [], errors = [], blocked = [];
  const session = role === 'anon' ? null : LIVE ? sessions[role] : fixtureSession(role);
  let healthReads = 0;
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(({ ref, session, preset }) => {
    localStorage.setItem('sod-theme', preset);
    if (session) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
  }, { ref: REF, session, preset });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === new URL(BASE).origin) return route.continue();
    if (url.origin !== API) {
      blocked.push(url.hostname);
      return route.abort('blockedbyclient');
    }
    const rpc = url.pathname.split('/rpc/')[1];
    if (RPCS.includes(rpc)) requests.push({ rpc, body: request.postDataJSON() });
    // Production is NEVER contacted in CI; live mode allows only this disposable child.
    if (LIVE) return route.continue();
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/rest/v1/users' && request.method() === 'GET') {
      return respond({ id: session?.user.id, role, display_name: 'Synthetic acceptance', avatar_url: 'fixture', tier: 'free' });
    }
    if (url.pathname === '/auth/v1/user') return respond(session?.user || {});
    if (rpc === 'admin_system_health') {
      healthReads++;
      if (options.holdSecondHealth && healthReads === 2) await new Promise(resolve => options.holdSecondHealth.push(resolve));
      if (options.failHealth || (options.failHealthFrom && healthReads >= options.failHealthFrom)) return respond({ message: 'Synthetic monitoring unavailable' }, 503);
      if (options.holdHealth && healthReads === 1) await new Promise(resolve => options.holdHealth.push(resolve));
      // Existing SQL catches sub-reader errors and returns {} for that block: fulfilled but empty.
      if (options.partialHealth) return respond({ db: { connections: 3, max_connections: 100 }, media: {}, usage: {} });
      return respond({ db: { connections: healthReads, max_connections: 100 }, media: { storage: { total_objects: options.zeroMedia ? 0 : 2 } },
        usage: { ...(options.emptyHistory ? { storage_egress_observed_history_24h: [] } : {}), ai_cost_usd_7d: 0.125, ai_cost_basis: 'SYNTHETIC', supabase_cached_egress_basis: 'UNKNOWN', storage_egress_observed_basis: 'OBSERVED_STORAGE_LOGS', storage_egress_guard: { state: 'sensor_stale' } } });
    }
    if (rpc === 'admin_video_map_health') {
      if (options.failVideo) return respond({ message: 'Synthetic video unavailable' }, 503);
      if (options.partialVideo) return respond({ cron: {} });
      return respond({ summary: { unique_assets: 2, placements: 3 }, cron: { active: false } });
    }
    if (rpc === 'admin_op_trace_list_v1') return options.failTraces ? respond({ message: 'Synthetic traces unavailable' }, 503) : respond(options.empty ? [] : TRACE_IDS.map((trace_id, index) => ({ trace_id, capability: CAPABILITIES[index], surface: 'admin', outcome: 'success', started_at: '2026-10-09T00:00:00Z', span_count: 1, cost_certainty: 'unknown' })));
    if (rpc === 'admin_op_trace_v1') {
      const id = request.postDataJSON().p_trace_id;
      const index = TRACE_IDS.indexOf(id);
      return respond({ trace: { trace_id: id, surface: 'admin', outcome: 'success' }, spans: [{ span_id: `${id}-span`, name: SPANS[index], kind: 'rpc', duration_ms: 12, cost_certainty: 'unknown' }], rollup: { span_count: 1, known_cost_ils: 0, has_unknown_cost: true, linked_ai_calls: 0 } });
    }
    // Other existing frame/identity/research readers get empty synthetic responses.
    return respond(rpc ? null : []);
  });
  return { requests, errors, blocked, session };
}

async function openControl(page) {
  const response = await page.goto(`${BASE}/2029/control`, { waitUntil: 'domcontentloaded' });
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toMatch(/main2029|\/assets\/2029-/);
}

async function assertLayout(page, preset) {
  await expect(page.locator('.sod29-root.surface-admin')).toHaveAttribute('data-experience-context', 'experience-context-2029-v1');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preset', preset);
  const layout = await page.evaluate(() => ({
    direction: getComputedStyle(document.querySelector('.sod29-root')).direction,
    viewport: document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
    refresh: (() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === 'רענן'); const r = b.getBoundingClientRect(); return { width: r.width, height: r.height }; })(),
  }));
  expect(layout.direction).toBe('rtl');
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  expect(layout.refresh.width).toBeGreaterThanOrEqual(44);
  expect(layout.refresh.height).toBeGreaterThanOrEqual(44);
}

for (const width of WIDTHS) for (const preset of PRESETS) {
  test(`native control admin: ${width}px ${preset}${LIVE ? ' real APIs' : ' HTTP fixtures'}`, async ({ context, page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1080 });
    const evidence = await prepare(context, page, 'admin', preset);
    const statuses = [];
    page.on('response', response => { if (RPCS.some(name => response.url().endsWith(`/rpc/${name}`))) statuses.push(response.status()); });
    await openControl(page);
    await expect(page.getByRole('heading', { name: 'Control Plane', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'רענן', exact: true })).toBeEnabled({ timeout: 45_000 });
    await expect(page.getByText('לא ניתן לקרוא את מצב המערכת', { exact: true })).toHaveCount(0);
    await expect(page.getByText(SPANS[0], { exact: true })).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: new RegExp(CAPABILITIES[1]) }).click();
    await expect(page.getByText(SPANS[1], { exact: true })).toBeVisible();
    await expect(page.getByText('יש עלות לא ידועה', { exact: true })).toBeVisible();
    await expect(page.locator('[data-experience-capability="storage-egress-health"]')).toBeVisible();
    await expect(page.getByText('VIDEO MAP · 2029', { exact: true })).toBeVisible();
    const previousReads = evidence.requests.filter(r => r.rpc === 'admin_system_health').length;
    await page.getByRole('button', { name: 'רענן', exact: true }).click();
    await expect.poll(() => evidence.requests.filter(r => r.rpc === 'admin_system_health').length).toBeGreaterThan(previousReads);
    await expect(page.getByRole('button', { name: 'רענן', exact: true })).toBeEnabled();
    await assertLayout(page, preset);
    for (const rpc of RPCS) expect(evidence.requests.some(r => r.rpc === rpc)).toBe(true);
    expect(evidence.requests.filter(r => r.rpc === 'admin_op_trace_list_v1').every(r => r.body.p_days === 7 && r.body.p_limit === 100)).toBe(true);
    expect(statuses.length).toBeGreaterThanOrEqual(5);
    expect(statuses.every(status => status === 200)).toBe(true);
    expect(evidence.errors).toEqual([]);
    await test.info().attach('control-acceptance', { contentType: 'application/json', body: Buffer.from(JSON.stringify({ mode: LIVE ? 'real_GoTrue_PostgREST' : 'synthetic_HTTP', role: 'admin', width, preset, rpc_statuses: statuses, requested_admin_rpcs: evidence.requests.map(r => r.rpc), refresh: true, trace_selection: true, rtl: true, horizontal_overflow: false })) });
    mkdirSync(EVIDENCE, { recursive: true });
    await page.screenshot({ path: `${EVIDENCE}/${LIVE ? 'live' : 'fixture'}-${width}-${preset}.png`, fullPage: true });
  });
}

for (const role of ['user', 'anon']) {
  test(`native control denies ${role} before admin data requests`, async ({ context, page }) => {
    const evidence = await prepare(context, page, role);
    await openControl(page);
    await expect(page).toHaveURL(`${BASE}/2029`);
    await expect(page.getByRole('heading', { name: 'Control Plane', exact: true })).toHaveCount(0);
    await expect(page.getByText(SPANS[0], { exact: true })).toHaveCount(0);
    expect(evidence.requests).toEqual([]);
    expect(evidence.errors).toEqual([]);
    if (LIVE) {
      // Prove backend authorization too, even if a caller ignores the route gate.
      const denied = await page.evaluate(async ({ api, key, token, rpcs, traceId }) => {
        const results = [];
        for (const rpc of rpcs) {
          const body = rpc === 'admin_op_trace_v1' ? { p_trace_id: traceId } : rpc === 'admin_op_trace_list_v1' ? { p_days: 7, p_limit: 100 } : {};
          const response = await fetch(`${api}/rest/v1/rpc/${rpc}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token || key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const text = await response.text();
          let error; try { error = JSON.parse(text); } catch { error = {}; }
          results.push({ rpc, status: response.status, code: error.code, message: error.message, leaked: text.includes('control-2029-fixture') || text.includes('control-2029-span') });
        }
        return results;
      }, { api: API, key: sessions.anonKey, token: evidence.session?.access_token, rpcs: RPCS, traceId: TRACE_IDS[0] });
      for (const result of denied) {
        // Existing SQL guards raise either insufficient_privilege (401/403) or
        // a P0001 forbidden exception (400). A generic 400 is not proof of denial.
        expect([400, 401, 403]).toContain(result.status);
        if (result.status === 400) {
          expect(result.code).toBe('P0001');
          expect(result.message).toMatch(/forbidden|not.admin|not.authorized/i);
        }
        expect(result.leaked).toBe(false);
      }
      await test.info().attach('control-backend-denial', { contentType: 'application/json', body: Buffer.from(JSON.stringify({ role, redirect: '/2029', admin_requests_before_redirect: 0, denied })) });
    }
  });
}

if (!LIVE) {
  test('native control renders monitoring failures without fabricating data', async ({ context, page }) => {
    const evidence = await prepare(context, page, 'admin', 'dark', { failHealth: true });
    await openControl(page);
    await expect(page.getByText('מצב המערכת לא זמין', { exact: true })).toBeVisible();
    await expect(page.getByText('Synthetic monitoring unavailable', { exact: true })).toBeVisible();
    // Partial failure: the independent trace reader still renders, and failed metrics are unavailable, not 0.
    await expect(page.getByText('לא זמין').first()).toBeVisible();
    await expect(page.getByText('אין traces בטווח הזה', { exact: true })).toHaveCount(0);
    await expect(page.getByText('רשימת ה־traces לא זמינה')).toHaveCount(0);
    await expect(page.locator('.sod29-row[aria-pressed]').first()).toBeVisible();
    expect(evidence.errors).toEqual([]);
  });
  const metric = (page, label) => page.locator('.sod29-card', { has: page.locator('.sod29-kicker', { hasText: new RegExp(`^${label}$`) }) }).locator('h3');
  test('native control shows unknown, not zero, for a fulfilled partial health/video payload', async ({ context, page }) => {
    const evidence = await prepare(context, page, 'admin', 'light', { partialHealth: true, partialVideo: true });
    await openControl(page);
    await expect(metric(page, 'DB connections')).toHaveText(/3\s*\/\s*100/);
    await expect(metric(page, 'Media objects')).toHaveText('—');
    await expect(metric(page, 'Video thumbnails')).toHaveText('—');
    await expect(metric(page, 'Video assets')).toHaveText('—');
    await expect(page.getByText('cron לא ידוע', { exact: true })).toBeVisible();
    await expect(page.getByText('cron לא פעיל', { exact: true })).toHaveCount(0);
    await expect(metric(page, 'Traces · 7 ימים')).toHaveText('2'); // true measured value survives
    // usage:{} means the egress history was never read: UNKNOWN/unavailable, not NO_HOURLY_DATA / "no snapshots".
    const egress = page.locator('[data-experience-capability="storage-egress-health"]');
    await expect(egress.getByText('NO_HOURLY_DATA')).toHaveCount(0);
    await expect(egress.getByText('אין עדיין hourly snapshots')).toHaveCount(0);
    await expect(egress.getByText('היסטוריית egress לא זמינה', { exact: true })).toBeVisible();
    await expect(egress.locator('.sod29-chip', { hasText: /^UNKNOWN$/ }).first()).toBeVisible();
    expect(evidence.errors).toEqual([]);
  });
  test('native control shows a measured zero and inactive cron as such', async ({ context, page }) => {
    await prepare(context, page, 'admin', 'light', { zeroMedia: true });
    await openControl(page);
    await expect(page.getByText('cron לא פעיל', { exact: true })).toBeVisible();
    await expect(metric(page, 'Media objects')).toHaveText('0'); // real measured 0, not unknown
  });
  test('native control shows genuine empty egress history only when explicitly returned as []', async ({ context, page }) => {
    const evidence = await prepare(context, page, 'admin', 'light', { emptyHistory: true });
    await openControl(page);
    const egress = page.locator('[data-experience-capability="storage-egress-health"]');
    await expect(egress.getByText('אין עדיין hourly snapshots', { exact: true })).toBeVisible();
    await expect(egress.getByText('היסטוריית egress לא זמינה')).toHaveCount(0);
    expect(evidence.errors).toEqual([]);
  });
  test('native control initial load shows loading, not zero, until readers settle', async ({ context, page }) => {
    const release = [];
    const evidence = await prepare(context, page, 'admin', 'light', { holdHealth: release });
    await openControl(page);
    await expect(metric(page, 'Media objects')).toHaveText('טוען…');
    await expect(metric(page, 'DB connections')).toHaveText('טוען…');
    await expect(page.getByText('הקריאה נכשלה — הערך אינו אפס')).toHaveCount(0);
    await expect.poll(() => release.length).toBe(1);
    release.forEach(fn => fn());
    await expect(metric(page, 'Media objects')).toHaveText('2');
    expect(evidence.errors).toEqual([]);
  });
  test('native control refresh with a still-rejecting read stays unknown, never falsely zero', async ({ context, page }) => {
    const gate = [];
    const evidence = await prepare(context, page, 'admin', 'light', { failHealthFrom: 1, holdSecondHealth: gate });
    await openControl(page);
    await expect(metric(page, 'Media objects')).toHaveText('לא זמין');
    await page.getByRole('button', { name: 'רענן', exact: true }).click();
    // Second (failing) request is held: the in-flight frame must be loading, not zero.
    await expect.poll(() => gate.length).toBe(1);
    await expect(metric(page, 'Media objects')).toHaveText('טוען…');
    await expect(metric(page, 'DB connections')).toHaveText('טוען…');
    await expect(metric(page, 'DB connections')).not.toHaveText(/^0\s*\/\s*0$/);
    gate.forEach(fn => fn());
    await expect(page.getByRole('button', { name: 'רענן', exact: true })).toBeEnabled();
    await expect(metric(page, 'Media objects')).toHaveText('לא זמין');
    await expect(metric(page, 'DB connections')).not.toHaveText(/^0\s*\/\s*0$/);
    expect(evidence.errors).toEqual([]);
  });
  test('native control video and trace readers fail independently', async ({ context, page }) => {
    const evidence = await prepare(context, page, 'admin', 'light', { failVideo: true });
    await openControl(page);
    await expect(page.getByText('מיפוי הווידאו לא זמין', { exact: true })).toBeVisible();
    await expect(page.getByText('cron לא ידוע', { exact: true })).toBeVisible();
    await expect(metric(page, 'Media objects')).toHaveText('2');
    await expect(page.locator('.sod29-row[aria-pressed]').first()).toBeVisible();
    expect(evidence.errors).toEqual([]);
  });
  test('native control trace list rejection leaves health and video readers intact', async ({ context, page }) => {
    const evidence = await prepare(context, page, 'admin', 'light', { failTraces: true });
    await openControl(page);
    await expect(page.getByText('רשימת ה־traces לא זמינה')).toBeVisible();
    await expect(metric(page, 'Traces · 7 ימים')).toHaveText('לא זמין');
    await expect(metric(page, 'Media objects')).toHaveText('2');
    await expect(metric(page, 'Video assets')).toHaveText('2');
    expect(evidence.errors).toEqual([]);
  });
  test('native control handles empty trace data', async ({ context, page }) => {
    const evidence = await prepare(context, page, 'admin', 'parchment', { empty: true });
    await openControl(page);
    await expect(page.getByText('אין traces בטווח הזה', { exact: true })).toBeVisible();
    expect(evidence.requests.some(r => r.rpc === 'admin_op_trace_v1')).toBe(false);
    expect(evidence.errors).toEqual([]);
  });
}
