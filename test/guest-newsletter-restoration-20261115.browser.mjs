// Actual public build, worker, Auth client and SystemFrame. All hosts are mapped
// to the local fixture. No subscription, email or live telemetry is sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'The built invitation acceptance requires Chromium; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const SLUG = 'newsletter-original-post';
const content = '<p>מאמר ציבורי לבדיקת ההזמנה לעדכונים.</p>'.repeat(30);
const post = { id: 90013, wp_id: 103, slug: SLUG, link: `https://sod1820.co.il/${SLUG}/`, title: 'מאמר בדיקה', source: 'wordpress',
  content, excerpt: 'מאמר בדיקה', categories: [], tags: [], date: '2020-01-01T00:00:00Z', author: null, image_url: null };
const sheet = page => page.locator('[role="dialog"][data-panel-kind="newsletter"]');

async function open({ path = '/', width = 390, member = false, holdPost = false } = {}) {
  let releasePost, user;
  const waiting = holdPost ? new Promise(resolve => { releasePost = resolve; }) : Promise.resolve();
  const fixture = await startFixture({ supabase: async ({ url, headers }) => {
    if (url.pathname === '/rest/v1/posts') {
      const matches = (url.searchParams.get('slug') || '').includes(SLUG);
      if (matches) await waiting;
      return { body: matches ? [post] : [] };
    }
    if (url.pathname === '/rest/v1/users' && user) {
      const profile = { id: user.id, display_name: 'בודק', role: 'member' };
      return { body: headers.accept?.includes('application/vnd.pgrst.object+json') ? profile : [profile] };
    }
    return null;
  } });
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height: 900 }, locale: 'he-IL', serviceWorkers: 'allow' });
    if (member) {
      user = fixture.auth.newUser('newsletter-member@example.invalid', true, 'fixture-password');
      const response = await fixture.auth.handle(new Request('https://linswmnnkjxvweumprav.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'fixture-password' }),
      }));
      assert.equal(response.status, 200);
      await context.addInitScript(session => localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify(session)), await response.json());
    }
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(fixture.origin + path, { waitUntil: 'domcontentloaded' });
    await page.locator('.sod29-root.native-frame').waitFor({ timeout: 20000 });
    return { page, fixture, releasePost, close: async () => {
      releasePost?.();
      await browser.close();
      await fixture.close();
      assert.deepEqual(errors, [], 'no uncaught application errors');
      assert.equal(fixture.state.functions.filter(x => x.path.endsWith('/newsletter-signup') && x.method === 'POST').length, 0,
        'showing or dismissing an invitation never subscribes anyone');
    } };
  } catch (error) {
    releasePost?.();
    await browser.close();
    await fixture.close();
    throw error;
  }
}

test('guest home: timer opens the existing sheet; dismissal survives navigation for 14 days', { timeout: 60000 }, async () => {
  const f = await open();
  try {
    assert.equal(await sheet(f.page).count(), 0);
    await f.page.clock.fastForward(23000);
    await sheet(f.page).waitFor();
    const box = await sheet(f.page).boundingBox();
    assert.ok(box.x >= -1 && box.x + box.width <= 391, 'the actual mobile sheet fits the viewport');
    assert.equal(await sheet(f.page).locator('input[type=email]').count(), 0, 'inviting does not start signup automatically');
    await f.page.getByRole('button', { name: 'אולי אחר כך', exact: true }).click();
    const remaining = await f.page.evaluate(() => Number(localStorage.getItem('sod_legacy_newsletter_invite_until')) - Date.now());
    assert.ok(remaining > 13.99 * 86400000 && remaining <= 14 * 86400000);
    await f.page.goto(f.fixture.origin + '/world');
    await f.page.clock.fastForward(23000);
    assert.equal(await sheet(f.page).count(), 0);
  } finally { await f.close(); }
});

test('desktop original Post address: scrolling over 450px opens the invitation before the timer', { timeout: 60000 }, async () => {
  const f = await open({ path: '/' + SLUG, width: 1280 });
  try {
    await f.page.locator('article [data-public-post-id]').waitFor();
    assert.equal(await sheet(f.page).count(), 0);
    await f.page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
    await f.page.waitForFunction(() => scrollY > 450);
    await sheet(f.page).waitFor();
  } finally { await f.close(); }
});

test('a slow original Post qualifies only after its public content resolves', { timeout: 60000 }, async () => {
  const f = await open({ path: '/' + SLUG, holdPost: true });
  try {
    await f.page.clock.fastForward(23000);
    assert.equal(await sheet(f.page).count(), 0, 'loading is not a public Post');
    f.releasePost();
    await f.page.locator('article [data-public-post-id]').waitFor();
    // The entry may mount the Post shell only after resolution, starting its timer then.
    await f.page.clock.fastForward(23000);
    await sheet(f.page).waitFor();
  } finally { await f.close(); }
});

for (const path of ['/post/newsletter-missing-post', '/newsletter-missing-post', '/login']) {
  test(`${path}: no invitation on missing Posts or a sign-in page`, { timeout: 60000 }, async () => {
    const f = await open({ path });
    try {
      await f.page.clock.fastForward(30000);
      assert.equal(await f.page.locator('article [data-public-post-id]').count(), 0);
      assert.equal(await sheet(f.page).count(), 0);
    } finally { await f.close(); }
  });
}

test('a verified signed-in visitor is not invited', { timeout: 60000 }, async () => {
  const f = await open({ member: true });
  try {
    await f.page.clock.fastForward(30000);
    assert.ok(f.fixture.auth.log.some(x => x.path === '/user' && x.status === 200), 'a real fixture session was verified');
    assert.equal(await sheet(f.page).count(), 0);
  } finally { await f.close(); }
});
