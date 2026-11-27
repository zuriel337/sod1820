// Regression (ZURIEL 27.11.2026, post 5144): a comment on a public post must pass the REAL service-worker guard of the built artifact and reach add_contribution; a
// post that is not public, or any other target, must not. Built artifact, existing fixture server (production origin + Supabase host mapped to the fixture), nothing written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'the post comment transport regression requires the pinned browser; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const SUPABASE = 'https://linswmnnkjxvweumprav.supabase.co';
const NEW_ID = '44444444-4444-4444-8444-444444444444';

async function session({ publicPosts }) {
  const received = [];
  const fixture = await startFixture({ supabase: async ({ url, body }) => {
    if (url.pathname === '/rest/v1/posts') return { body: publicPosts.includes(Number(/id=eq\.(\d+)/.exec(url.search)?.[1])) ? [{ id: Number(/id=eq\.(\d+)/.exec(url.search)[1]) }] : [] };
    if (url.pathname === '/rest/v1/rpc/add_contribution') { received.push(JSON.parse(body)); return { body: NEW_ID }; }
    if (url.pathname.startsWith('/rest/v1/')) return { body: [] };
    return null;
  } });
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: 'he-IL', serviceWorkers: 'allow' });
  const user = fixture.auth.newUser('member@example.invalid', true, 'fixture-password');
  const response = await fixture.auth.handle(new Request(SUPABASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'content-type': 'application/json', apikey: 'fixture' }, body: JSON.stringify({ email: 'member@example.invalid', password: 'fixture-password' }) }));
  assert.equal(response.status, 200);
  const sessionJson = await response.json();
  await context.addInitScript((value) => localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify(value)), sessionJson);
  const page = await context.newPage();
  await page.goto(fixture.origin + '/community/chat', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });
  const post = (payload) => page.evaluate(async ({ url, token, payload }) => {
    const r = await fetch(url + '/rest/v1/rpc/add_contribution', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, apikey: token }, body: JSON.stringify(payload) });
    return { status: r.status, text: (await r.text()).slice(0, 120) };
  }, { url: SUPABASE, token: sessionJson.access_token, payload });
  return { received, post, close: async () => { await browser.close(); await fixture.close(); } };
}
const payload = (over = {}) => ({ p_intent: 'תגובה', p_origin: 'community_2029', p_body: 'תגובה לבדיקה', p_target_type: 'post', p_target_id: '5144', p_parent_id: null, p_title: null, p_gematria_claim: null, p_author_name: null, p_image_url: null, ...over });

test('the real worker lets a member comment on a verified public post and reaches add_contribution', { timeout: 150000 }, async () => {
  const s = await session({ publicPosts: [5144] });
  try {
    const ok = await s.post(payload());
    assert.equal(ok.status, 200, ok.text);
    assert.equal(s.received.length, 1);
    assert.equal(s.received[0].p_target_type, 'post'); assert.equal(s.received[0].p_target_id, '5144');
  } finally { await s.close(); }
});

test('the real worker refuses a non-public post and every other target; nothing reaches add_contribution', { timeout: 150000 }, async () => {
  const s = await session({ publicPosts: [5144] });
  try {
    for (const over of [{ p_target_id: '7' }, { p_target_type: 'topic' }, { p_target_id: '5144;drop' }, { p_origin: 'broadcast' }]) {
      const denied = await s.post(payload(over));
      assert.equal(denied.status, 403, JSON.stringify(over) + ' ' + denied.text);
    }
    assert.deepEqual(s.received, []);
  } finally { await s.close(); }
});
