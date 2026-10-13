const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');

const BASE = process.env.G4_PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const CLOSED_FLAGS = [
  'lock_world',
  'lock_heichal',
  'lock_raziel_site',
  'lock_life_journey',
  'lock_books',
  'lock_number',
].map((key) => ({ key, enabled: true, mode: 'all', message: `${key} בבנייה` }));
// Existing positive Number scenarios exercise its explicitly-open state;
// the launch-specific closed state is asserted separately below.
const OPEN_FLAGS = CLOSED_FLAGS.map((flag) => ['lock_world', 'lock_number'].includes(flag.key) ? { ...flag, enabled: false, message: '' } : flag);

async function installCanonicalChatFixture(context, { verified = false } = {}) {
  const uid = 'b6ce542a-2b07-4749-8aba-532c886f6de7';
  const contributorId = '4cd9c034-0464-4600-a35d-7156f0584d9b';
  const profile = { id: uid, display_name: 'חשבון בדיקה', username: 'fixture', role: 'user', tier: 'member', avatar_url: null };
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', email_confirmed_at: '2026-10-13T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: '2026-10-13T00:00:00Z' };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: uid, role: 'authenticated', exp: expiresAt })}.fixture-signature`, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user };
  const messages = [{ id: '10000000-0000-4000-8000-000000000001', parent_id: null, author_user_id: uid, author_contributor_id: contributorId, author_name: profile.display_name, body: 'הודעת מקור קיימת', origin: 'community_2029', status: 'approved', reactions: { likes: 3 }, created_at: '2026-10-13T00:00:00Z', contributor: { id: contributorId, user_id: uid, display_name: profile.display_name, avatar_url: null } }];
  const writes = [];
  const fixture = { writes, messages, response: 'success', signedIn: verified };
  if (verified) await context.addInitScript((value) => localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify(value)), session);
  // This scenario runs the real renderer/auth/client code against local HTTP
  // fixtures. No login, email, publication, reaction or telemetry reaches live.
  await context.route('https://linswmnnkjxvweumprav.supabase.co/**', async (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
    if (url.pathname === '/auth/v1/otp') { writes.push({ kind: 'otp' }); return json({}); }
    if (url.pathname === '/auth/v1/verify') { fixture.signedIn = true; writes.push({ kind: 'verify' }); return json(session); }
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/rest/v1/rpc/add_contribution') {
      const payload = request.postDataJSON(); writes.push({ kind: 'message', payload });
      if (fixture.response === 'error') return json({ code: 'P0001', message: 'rate_limited', details: null, hint: null }, 400);
      if (fixture.response === 'null') return json(null);
      const id = `20000000-0000-4000-8000-${String(writes.filter((item) => item.kind === 'message').length).padStart(12, '0')}`;
      messages.unshift({ ...messages[0], id, body: payload.p_body, parent_id: payload.p_parent_id, status: fixture.signedIn ? 'approved' : 'pending', author_user_id: fixture.signedIn ? uid : null });
      return json(id);
    }
    if (url.pathname === '/rest/v1/research_contributions') {
      const parent = url.searchParams.get('parent_id');
      const rows = messages.filter((row) => row.status === 'approved' && (parent === 'is.null' ? row.parent_id === null : parent?.startsWith('eq.') ? row.parent_id === parent.slice(3) : parent?.startsWith('in.') ? false : true));
      return json(rows, 200, { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` });
    }
    if (url.pathname === '/rest/v1/users') return json([profile]);
    if (url.pathname === '/rest/v1/contributors') return json([{ id: contributorId, user_id: uid }]);
    if (url.pathname === '/rest/v1/site_flags') return json(OPEN_FLAGS);
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json({});
    return json([]);
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(BASE).origin || url.host === 'linswmnnkjxvweumprav.supabase.co') return route.fallback();
    if (route.request().resourceType() === 'script') return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return route.abort();
  });
  if (process.env.G4_PREVIEW_USE_DEV_DOCUMENT === 'true') await context.route(`${BASE}/community/chat`, async (route) => {
    const document = await context.request.get(`${BASE}/2029.html`);
    return route.fulfill({ status: 200, contentType: 'text/html', body: await document.text() });
  });
  return fixture;
}

test.setTimeout(45_000);

test.beforeEach(async ({ context }) => {
  // The preview reads public production data. Never send analytics or other
  // product mutations from this acceptance runner to the canonical project.
  await context.route('https://linswmnnkjxvweumprav.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const readRpc = url.pathname.startsWith('/rest/v1/rpc/') && /^(fn_|gematria_|posts_by_number_strict|number_neighbors|lang_links_list)/.test(url.pathname.split('/').pop());
    if (request.method() === 'GET' || (request.method() === 'POST' && readRpc)) {
      if (process.env.G4_NODE_NETWORK_PROXY === 'true') {
        const response = await fetch(request.url(), { method: request.method(), headers: request.headers(), body: request.method() === 'GET' ? undefined : request.postData(), signal: AbortSignal.timeout(25000) });
        const headers = Object.fromEntries(response.headers);
        delete headers['content-encoding']; delete headers['content-length']; delete headers['transfer-encoding'];
        await route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
      } else await route.continue();
    } else {
      await route.abort();
    }
  });
  await installStorageEgressGuard(context);
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
  await expect(page.locator('[data-home-user-area="open"]')).toBeVisible();
  await expect(page.locator('[data-home-world="open"]')).toBeVisible();
  await expect(page.locator('[data-experience-capability="home-composition"] a[href="/community/chat"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'לספריית ELS ולמנוע הדילוגים ←' })).toBeVisible();
  await page.locator('[data-home-user-area="open"]').click();
  await expect(page.locator('[data-workspace-section="account"]')).toBeVisible();
  await expect(page.locator('[data-workspace-card="life-journey"]')).toHaveAttribute('aria-disabled', 'true');
});

test('public navigation opens the same user area', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'פתח ניווט' }).click();
  await page.getByRole('button', { name: 'אזור משתמשים', exact: true }).click();
  await expect(page.locator('[data-workspace-section="account"]')).toBeVisible();
});

test('launch Number lock blocks direct entry before the Number engine mounts', async ({ page }) => {
  let numberReads = 0;
  await page.route('**/rest/v1/rpc/fn_number_lookup*', async (route) => { numberReads++; await route.abort(); });
  await page.route('**/rest/v1/site_flags*', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(CLOSED_FLAGS),
  }));
  await page.goto(`${BASE}/number/1820`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mlock')).toBeVisible();
  await expect(page.locator('[data-number-core-root]')).toHaveCount(0);
  expect(numberReads).toBe(0);
});

test('chat transition has one frame with the existing chat above the connected new chat', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sod_research_context_v2:guest', JSON.stringify({
    subject: { id: 'previous-post', type: 'post', label: 'Previous post context', href: '/post/previous-post' },
    selection: { entityId: 'previous-post', entityType: 'post' },
    dimensions: {},
  })));
  await page.route('https://launcher.spot.im/**', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript', body: 'window.__openwebLauncherLoads = (window.__openwebLauncherLoads || 0) + 1;',
  }));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
    const oldChat = page.locator('[data-community-chat="legacy"]');
    const newChat = page.locator('#community-new-chat');
    await expect(oldChat).toBeVisible();
    await expect(newChat).toBeAttached();
    await expect(page.locator('.sod29-root')).toHaveCount(1);
    await expect(page.locator('.sod29-surface-context-rail')).toHaveCount(0);
    await expect(oldChat.locator('[data-spotim-module="conversation"]')).toHaveAttribute('data-post-id', 'POST_ID_GOES_HERE');
    await expect(oldChat.locator('[data-spotim-module="conversation"]')).toHaveAttribute('data-post-url', 'https://sod1820.co.il/community/chat');
    await expect(page.locator('#spotim-script')).toHaveCount(1);
    expect(await newChat.evaluate((element) => Boolean(document.querySelector('[data-community-chat="legacy"]').compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.locator('.sod29-community-preview-notice, .sod29-community-feed-label')).toHaveCount(0);
    await oldChat.getByRole('link', { name: 'לצ׳אט החדש ↓' }).click();
    await expect(newChat.getByRole('textbox', { name: 'מה תרצו לשתף?' })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sod1820.co.il/community/chat');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});

test('canonical chat loads its actual Community styles and readable full-width composer', async ({ page, context }) => {
  await installCanonicalChatFixture(context);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
    const chat = page.locator('#community-new-chat');
    await expect(chat.locator('.sod29-community-thread').first()).toBeVisible();
    const styles = await chat.evaluate((root) => {
      const draft = root.querySelector('#community-live-draft');
      const composer = root.querySelector('.sod29-community-composer');
      return {
        layout: getComputedStyle(root.querySelector('.sod29-community-layout')).display,
        draftWidth: draft.getBoundingClientRect().width,
        composerWidth: composer.getBoundingClientRect().width,
        draftFont: parseFloat(getComputedStyle(draft).fontSize),
        draftBackground: getComputedStyle(draft).backgroundColor,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(styles.layout).toBe('grid');
    expect(styles.draftWidth / styles.composerWidth).toBeGreaterThan(0.95);
    expect(styles.draftFont).toBeGreaterThanOrEqual(16);
    expect(styles.draftBackground).not.toBe('rgb(255, 255, 255)');
    expect(styles.overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('.sod29-root')).toHaveCount(1);
    await expect(page.locator('.sod29-community-preview-notice, .sod29-community-feed-label')).toHaveCount(0);
    if (width >= 981) {
      const presets = page.locator('.sod29-header .sod29-theme-presets');
      await expect(presets.getByRole('button', { name: 'יום', exact: true })).toBeVisible();
      await presets.getByRole('button', { name: 'יום', exact: true }).click();
      await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset', 'light');
      const dayInput = await chat.locator('#community-live-draft').evaluate((element) => getComputedStyle(element).backgroundColor);
      await presets.getByRole('button', { name: 'לילה', exact: true }).click();
      await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset', 'dark');
      const nightInput = await chat.locator('#community-live-draft').evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(dayInput).not.toBe(nightInput);
    }
    await chat.evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: `test-results/release-visual/canonical-chat-styled-${width}.png` });
  }
});

test('canonical chat guest submission stays pending and a rejected publication keeps the draft', async ({ page, context }) => {
  const fixture = await installCanonicalChatFixture(context);
  await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
  const chat = page.locator('#community-new-chat');
  const draft = chat.getByRole('textbox', { name: 'מה תרצו לשתף?' });
  await draft.fill('הודעת אורח לבדיקה');
  await chat.getByRole('button', { name: 'פרסום', exact: true }).click();
  await expect(chat.getByRole('status')).toHaveText('ההודעה נשלחה לבדיקה.');
  await expect(draft).toHaveValue('');
  await expect(chat.locator('.sod29-community-feed')).not.toContainText('הודעת אורח לבדיקה');
  expect(fixture.messages[0].status).toBe('pending');
  fixture.response = 'error';
  await draft.fill('טיוטה שנשמרת כשהשרת דוחה');
  await chat.getByRole('button', { name: 'פרסום', exact: true }).click();
  await expect(chat.getByRole('status')).toContainText('נכשלה');
  await expect(draft).toHaveValue('טיוטה שנשמרת כשהשרת דוחה');
  expect(fixture.writes.filter((item) => item.kind === 'message')).toHaveLength(2);
});

test('canonical chat verified account publishes a real canonical message and reply through the existing writer', async ({ page, context }) => {
  const fixture = await installCanonicalChatFixture(context, { verified: true });
  await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
  const chat = page.locator('#community-new-chat');
  await expect(chat.getByText('מחובר/ת כ־חשבון בדיקה')).toBeVisible();
  const draft = chat.getByRole('textbox', { name: 'מה תרצו לשתף?' });
  await draft.fill('הודעה מאושרת מהחשבון המאומת');
  await chat.getByRole('button', { name: 'פרסום', exact: true }).click();
  await expect(chat.getByRole('status')).toHaveText('ההודעה פורסמה.');
  await expect(chat.locator('.sod29-community-feed')).toContainText('הודעה מאושרת מהחשבון המאומת');
  await expect(draft).toHaveValue('');
  const source = chat.locator('#message-10000000-0000-4000-8000-000000000001');
  await source.getByRole('button', { name: 'השב', exact: true }).click();
  await draft.fill('תשובה בתוך אותו שרשור');
  await chat.getByRole('button', { name: 'פרסום', exact: true }).click();
  await expect(chat.getByRole('status')).toHaveText('ההודעה פורסמה.');
  const written = fixture.writes.filter((item) => item.kind === 'message');
  expect(written).toHaveLength(2);
  expect(written[0].payload).toMatchObject({ p_intent: 'תגובה', p_origin: 'community_2029', p_target_type: 'home', p_target_id: 'community', p_parent_id: null });
  expect(written[1].payload.p_parent_id).toBe('10000000-0000-4000-8000-000000000001');
  expect(fixture.messages[0].author_user_id).toBe('b6ce542a-2b07-4749-8aba-532c886f6de7');
});

test('canonical chat inline OTP keeps the same route and account when publishing after verification', async ({ page, context }) => {
  const fixture = await installCanonicalChatFixture(context);
  await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
  const chat = page.locator('#community-new-chat');
  await chat.getByLabel('כתובת מייל', { exact: true }).fill('fixture@example.invalid');
  await chat.getByRole('button', { name: 'שלחו לי קוד כניסה' }).click();
  await chat.locator('#community-sign-in-code').fill('12345678');
  await chat.getByRole('button', { name: 'כניסה לקהילה', exact: true }).click();
  await expect(chat.getByText('מחובר/ת כ־חשבון בדיקה')).toBeVisible();
  await expect(page).toHaveURL(`${BASE}/community/chat`);
  await chat.getByRole('textbox', { name: 'מה תרצו לשתף?' }).fill('הודעה אחרי כניסה בקוד');
  await chat.getByRole('button', { name: 'פרסום', exact: true }).click();
  await expect(chat.locator('.sod29-community-feed')).toContainText('הודעה אחרי כניסה בקוד');
  expect(fixture.writes.map((item) => item.kind)).toEqual(['otp', 'verify', 'message']);
});

test('canonical chat never reports publication or clears a draft without a server message identity', async ({ page, context }) => {
  const fixture = await installCanonicalChatFixture(context);
  fixture.response = 'null';
  await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
  const chat = page.locator('#community-new-chat');
  const draft = chat.getByRole('textbox', { name: 'מה תרצו לשתף?' });
  await draft.fill('אין אישור שרת — הטיוטה צריכה להישאר');
  await chat.getByRole('button', { name: 'פרסום', exact: true }).click();
  await expect(draft).toHaveValue('אין אישור שרת — הטיוטה צריכה להישאר');
  await expect(chat.getByRole('status')).toContainText('נכשלה');
});

test('Number navigation opens the full page on mobile and desktop', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
    if (width < 720) await page.getByRole('button', { name: 'פתח ניווט' }).click();
    await page.getByRole('link', { name: 'דף המספר', exact: true }).click();
    await expect(page).toHaveURL(/\/number\/1820$/);
    await expect(page.locator('[data-number-core-root="1820"]')).toBeVisible({ timeout: 30_000 });
  }
});

test('a phrase in the Number drawer opens its calculated full page, never a missing-value zero', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
    await page.locator('.sod29-header-search').click();
    const search = page.getByRole('dialog', { name: 'חיפוש' });
    await search.getByRole('textbox', { name: 'חיפוש' }).fill('שלום');
    await search.getByRole('button', { name: 'בדוק' }).click();
    const drawer = page.locator('.sod29-number-drawer2029');
    await expect(drawer.locator('.sod29-number-core2029-root b')).toHaveText('376', { timeout: 30_000 });
    await drawer.getByRole('button', { name: 'פתח דף מלא ↗' }).click();
    await expect(page).toHaveURL(`${BASE}/number/376`);
    await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 30_000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 30_000 });
    const type = await page.locator('.sod29-number-core2029.is-page').evaluate((core) => ({
      regular: parseFloat(getComputedStyle(core.querySelector('.sod29-number-v11-regular-track button strong')).fontSize),
      method: parseFloat(getComputedStyle(core.querySelector('.sod29-number-v10-method-head span')).fontSize),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(type.regular).toBeGreaterThanOrEqual(12);
    expect(type.method).toBeGreaterThanOrEqual(12);
    expect(type.overflow).toBeLessThanOrEqual(1);
  }
});

test('a large signed-in profile image cannot squeeze the account text', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${BASE}/2029`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-home-user-area="open"]').click();
    const sizes = await page.locator('[data-workspace-section="account"]').evaluate((account) => {
      const card = document.createElement('div');
      card.className = 'sod29-workspace-account-connected';
      card.innerHTML = `<span class="sod29-user-avatar is-normal"><img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'%3E%3Crect width='1200' height='1200' fill='gold'/%3E%3C/svg%3E"></span><div><strong>משתמש לדוגמה</strong><small>member@example.com</small><p>זה החשבון שמחובר במכשיר הזה.</p></div><button class="sod29-action">התנתקות</button>`;
      account.append(card);
      const avatar = card.querySelector('.sod29-user-avatar').getBoundingClientRect();
      const copy = card.querySelector('div').getBoundingClientRect();
      return { avatar: avatar.width, copy: copy.width, card: card.getBoundingClientRect().width };
    });
    expect(sizes.avatar).toBeLessThanOrEqual(46);
    expect(sizes.copy).toBeGreaterThanOrEqual(160);
    expect(sizes.card).toBeLessThanOrEqual(520);
  }
});

test('posts, ELS, calculator and Number are reachable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/posts`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="posts-index"]')).toBeVisible();
  await page.goto(`${BASE}/els`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-els-2029-surface="v1"]')).toBeVisible();
  await page.goto(`${BASE}/gematria`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="calculator-pro-2029"]')).toBeVisible();
  await expect(page.getByText('צוריאל')).toHaveCount(0);
  await page.getByPlaceholder('שם, מילה או ביטוי · עברית או English').fill('שלום');
  await expect(page.locator('[data-experience-surface="calculator-pro-2029"] [data-share-url]')).toHaveAttribute('data-share-url', /\/gematria\/viral\?/);
  await page.getByRole('button', { name: /גלה הכל על 376/ }).click();
  await expect(page).toHaveURL(/\/number\/376(?:\?|$)/);
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 30_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="376"]')).toBeVisible({ timeout: 30_000 });
});

test('existing gematria share links still open the shared result', async ({ page }) => {
  await page.goto(`${BASE}/gematria?q=${encodeURIComponent('שלום')}&m=${encodeURIComponent('רגיל')}&v=376&s=existing-share`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-experience-surface="calculator-2029"]')).toBeVisible();
  await expect(page.locator('[data-experience-surface="calculator-pro-2029"]')).toHaveCount(0);
  await expect(page.getByPlaceholder('שם, מילה או ביטוי')).toBeVisible();
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
  await page.locator('article[data-entity-type="convergence"] a[href="/number/888"]').first().click();
  try {
    await expect(page.locator('[data-number-core-root="888"]')).toBeVisible({ timeout: 30_000 });
  } catch (error) {
    console.log(`Number 888 read failures: ${JSON.stringify(numberReadFailures)}`);
    throw error;
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-number-core-root="888"]')).toBeVisible({ timeout: 30_000 });
  await page.goBack();
  await expect(page).toHaveURL(`${BASE}/topic/888-yeshua`);
  await expect(page.locator('article[data-entity-type="convergence"]')).toBeVisible({ timeout: 30_000 });
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
  const number = page.locator('article[data-entity-type="convergence"] a[href="/number/888"]').first();
  await expect(number).toBeVisible({ timeout: 30_000 });
  const box = await number.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await number.click();
  await expect(page).toHaveURL(`${BASE}/number/888`);
});

test('Heichal and the other unopened areas stay closed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Vercel rewrites /heichal to the 2029 shell. Vite preview instead serves
  // the old static dist/heichal.html, so mirror the production rewrite here.
  const shell = await page.context().request.get(`${BASE}/2029.html`);
  await page.route(`${BASE}/heichal`, async (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: await shell.text(),
  }));
  for (const route of ['/books', '/book/daat-tevunot', '/heichal', '/journey']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mlock'), route).toBeVisible();
  }
});

test('the existing public World stays open when no lock flag has been installed', async ({ page }) => {
  await page.route('**/rest/v1/site_flags*', async (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(OPEN_FLAGS.filter((flag) => flag.key !== 'lock_world')),
  }));
  await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mlock')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'כיווני הגילוי בעולם' })).toBeVisible();
});

test('top bar exposes all three saved themes on phone and desktop without overflow', async ({ page, context }) => {
  await installCanonicalChatFixture(context);
  await page.goto(`${BASE}/community/chat`, { waitUntil: 'domcontentloaded' });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const control = page.locator('.sod29-header-actions .sod29-theme-presets');
    for (const [label, preset] of [['יום', 'light'], ['קלף', 'parchment'], ['לילה', 'dark']]) {
      if (width < 981) await control.locator('.sod29-theme-trigger').click();
      await control.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset', preset);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset', 'dark');
});

test('legacy Home and Posts links resolve to clean public URLs with query and fragment intact', async ({ page }) => {
  await page.goto(`${BASE}/2029?from=existing-link#kept-position`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(`${BASE}/?from=existing-link#kept-position`);
  await expect(page.locator('[data-experience-capability="home-composition"]')).toBeVisible();
  await page.goto(`${BASE}/2029/posts?source=existing-link#posts-catalog`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(`${BASE}/posts?source=existing-link#posts-catalog`);
  await expect(page.locator('[data-experience-surface="posts-index"]')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sod1820.co.il/posts');
  expect(await page.title()).not.toContain('2029');
  await expect(page.locator('a[href^="/2029"]')).toHaveCount(0);
});

test('direct video entry mounts its registered surface and playable asset without a runtime crash', async ({ page }) => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/rest/v1/video_media_assets_v1*', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ public_id: id, title: 'סרטון לבדיקה', video_kind: 'youtube', youtube_id: 'dQw4w9WgXcQ', media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', uses_generic_page: true, google_indexable: true, topics: [], placements: [], series_keys: [], cipher_slugs: [] }),
  }));
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Player fixture</p>' }));
  await page.goto(`${BASE}/video/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'נגן סרטון' })).toBeVisible();
  await page.getByRole('button', { name: 'נגן סרטון' }).click();
  await expect(page.locator('iframe[title="סרטון לבדיקה"]')).toHaveAttribute('src', /youtube-nocookie/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sod1820.co.il/video/${id}`);
  expect(await page.title()).not.toContain('2029');
  expect(errors).toEqual([]);
});

test('a temporary video read failure offers retry without claiming the public video is missing', async ({ page }) => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  let reads = 0;
  let unavailable = true;
  await page.route('**/rest/v1/video_media_assets_v1*', route => {
    reads++;
    return route.fulfill(unavailable
      ? { status: 503, contentType: 'application/json', body: JSON.stringify({ code: '503', message: 'temporarily unavailable' }) }
      : { status: 200, contentType: 'application/json', body: JSON.stringify({ public_id: id, title: 'סרטון ציבורי', video_kind: 'youtube', youtube_id: 'dQw4w9WgXcQ', uses_generic_page: true, google_indexable: true }) });
  });
  await page.goto(`${BASE}/video/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'טעינת הסרטון לא הושלמה' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'הסרטון לא נמצא' })).toHaveCount(0);
  const failedReads = reads;
  unavailable = false;
  await page.getByRole('button', { name: 'נסה שוב', exact: true }).click();
  await expect(page.getByRole('button', { name: 'נגן סרטון' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  expect(reads).toBe(failedReads + 1);
});

test('legacy calculator parameters and book aliases keep their input and reading location', async ({ page }) => {
  for (const parameter of ['w', 'calc']) {
    await page.goto(`${BASE}/gematria?${parameter}=${encodeURIComponent('שלום')}&from=old-link#reading`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder('שם, מילה או ביטוי · עברית או English')).toHaveValue('שלום');
    const url = new URL(page.url());
    expect(url.searchParams.get('q')).toBe('שלום');
    expect(url.searchParams.get('from')).toBe('old-link');
    expect(url.hash).toBe('#reading');
  }
  await page.goto(`${BASE}/2029/books/daat-tevunot?from=old-link#chapter-2`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(`${BASE}/book/daat-tevunot?from=old-link#chapter-2`);
  await expect(page.locator('.mlock')).toBeVisible();
});
