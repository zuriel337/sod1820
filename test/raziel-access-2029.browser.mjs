// Raziel access on the BUILT public-reading artifact (the real page, the real sw.js and the real Supabase client), served by the
// local HTTPS fixture under the production host names; nothing leaves the machine. ZURIEL 12.11.2026: two separate checks —
//   1. an authorised (admin) account: the navigation button and the permitted actions work;
//   2. a guest: Raziel stays locked and the page shows that state without a fault.
// A signed-in member who is not an admin is checked too: Raziel is admin-only today (SystemFrame2029: isAdmin + feature state).
// Nothing is opened to guests to make a test pass. Site flags are all "unlocked" here, so the lock seen is the account gate itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const canRun = Boolean(pw) && existsSync(join(dist, 'sw.js'));
const SKIP = !canRun && 'playwright or the built public-reading artifact is unavailable';
const LOCKS = ['lock_world', 'lock_heichal', 'lock_raziel_site', 'lock_life_journey', 'lock_books', 'lock_number'];
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];

// The fixture's Supabase answers for this test: the role of each signed-in account (the site and the worker both read
// public.users), all site locks off, and a plain ai-analyze answer that is counted.
function supabaseAnswers(roles, calls) {
  return async ({ url, method, headers, body }) => {
    if (url.pathname === '/rest/v1/users' && method === 'GET') {
      const id = /^eq\.(.+)$/.exec(url.searchParams.get('id') || '')?.[1];
      const role = id ? roles.get(decodeURIComponent(id)) : null;
      const row = role ? { id: decodeURIComponent(id), role, display_name: 'בודק', username: null, avatar_url: null } : null;
      if (String(headers.accept || '').includes('vnd.pgrst.object')) return row ? { body: row } : { status: 406, body: { code: 'PGRST116', message: 'no rows' } };
      return { body: row ? [row] : [] };
    }
    if (url.pathname === '/rest/v1/site_flags') return { body: LOCKS.map(key => ({ key, enabled: false, message: '', mode: 'all' })) };
    if (url.pathname === '/functions/v1/ai-analyze' && method === 'POST') {
      calls.push({ authorization: headers.authorization || null, body: body.toString('utf8') });
      return { body: { analysis: 'תשובה רגילה מרזיאל.', intelligence_level: 'fast' } };
    }
    return null;
  };
}

async function open(browser, fixture, viewport) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true, locale: 'he-IL', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = { pageErrors: [], consoleErrors: [] };
  page.on('pageerror', error => problems.pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') problems.consoleErrors.push(message.text()); });
  return { context, page, problems };
}
// Ready = the real worker controls the page, the bootstrap admitted it, and the frame (with the Raziel button) is mounted.
const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('.sod29-command-island .sod29-raziel-orb'), null, { timeout: 30000 });
const unexpected = problems => [...problems.pageErrors, ...problems.consoleErrors.filter(text => !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_FAILED|net::/i.test(text))];

async function signIn(page, fixture, email) {
  await page.goto(fixture.origin + '/login?returnTo=%2F', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'כתובת מייל' }).waitFor({ timeout: 30000 });
  await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
  await page.getByRole('button', { name: 'שלחו לי קוד כניסה' }).click();
  await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).waitFor({ timeout: 15000 });
  await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).fill(fixture.auth.lastCode(email));
  await page.getByRole('button', { name: /כניסה לחשבון/ }).click();
  await page.waitForURL(url => url.pathname === '/', { timeout: 20000 });
  await ready(page).catch(() => {});
}

const orb = page => page.locator('.sod29-command-island .sod29-raziel-orb');
// The chat opens in the panel on a phone and in the companion view on a wide screen; either way exactly one is visible.
async function openChat(page) {
  if (await page.locator('.sod29-frame-backdrop').count()) await page.keyboard.press('Escape');
  await orb(page).click();
  const chat = page.locator('[data-raziel-native-chat="true"]').filter({ visible: true }).first();
  await chat.waitFor({ timeout: 15000 });
  return chat;
}
async function ask(chat, text) {
  await chat.getByRole('textbox', { name: 'שאלה לרזיאל', exact: true }).fill(text);
  await chat.getByRole('button', { name: 'שלח', exact: true }).click();
}

async function assertLocked(page, label) {
  const button = orb(page);
  await button.waitFor({ timeout: 20000 });
  assert.equal(await button.isDisabled(), true, `${label}: the Raziel button is disabled`);
  assert.match(await button.getAttribute('class'), /\bis-locked\b/, `${label}: the button shows the locked state`);
  assert.equal(await button.getAttribute('title'), 'רזיאל בבנייה · למנהל בלבד', `${label}: the locked state is explained`);
  await button.click({ force: true });   // a determined click on the disabled button
  await page.waitForTimeout(600);
  assert.equal(await page.locator('[data-raziel-native-chat="true"]').count(), 0, `${label}: no Raziel chat opens`);
}

test('authorised (admin) account: Raziel opens; a navigation turn is a /number button with no model call; an ordinary turn reaches ai-analyze once with the account token; the button opens the page', { skip: SKIP }, async () => {
  const roles = new Map(), calls = [];
  const fixture = await startFixture({ supabase: supabaseAnswers(roles, calls) });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    for (const viewport of VIEWPORTS) {
      const email = `admin.${viewport.width}@example.invalid`;
      roles.set(fixture.auth.newUser(email, true).id, 'admin');
      const { context, page, problems } = await open(browser, fixture, viewport);
      await signIn(page, fixture, email);
      await page.waitForFunction(() => {
        const button = document.querySelector('.sod29-command-island .sod29-raziel-orb');
        return button && !button.disabled && !button.classList.contains('is-locked');
      }, null, { timeout: 20000 });
      const chat = await openChat(page);
      const buttons = () => chat.locator('[data-raziel-navigation-action]');
      const before = calls.length;

      await ask(chat, 'תן לי את דף המספר 73');
      await buttons().last().waitFor({ timeout: 15000 });
      assert.equal(await buttons().last().getAttribute('href'), '/number/73', 'the public build opens the public address');
      assert.equal(await buttons().last().getAttribute('data-raziel-navigation-action'), 'number_page');
      assert.equal(calls.length, before, 'a navigation turn makes no model call');

      await ask(chat, 'מה זה 73?');
      await chat.getByText('תשובה רגילה מרזיאל.').last().waitFor({ timeout: 20000 });
      assert.equal(calls.length, before + 1, 'an ordinary question reaches ai-analyze exactly once');
      assert.match(calls.at(-1).authorization || '', /^Bearer [^.]+\.[^.]+\./, "the call carries the account's own token");
      assert.equal(await buttons().count(), 1, 'an ordinary answer adds no navigation button');

      await buttons().last().click();
      await page.waitForURL(url => url.pathname === '/number/73', { timeout: 20000 });
      assert.deepEqual(unexpected(problems), [], `no page error (${viewport.width}px)`);
      await context.close();
    }
  } finally { await browser.close(); await fixture.close(); }
});

test('signed-in member who is not an admin: Raziel stays locked, no model call, no fault', { skip: SKIP }, async () => {
  const roles = new Map(), calls = [];
  const fixture = await startFixture({ supabase: supabaseAnswers(roles, calls) });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'member@example.invalid';
    roles.set(fixture.auth.newUser(email, true).id, 'user');
    const { context, page, problems } = await open(browser, fixture, VIEWPORTS[0]);
    await signIn(page, fixture, email);
    await assertLocked(page, 'member');
    assert.equal(calls.length, 0, 'no ai-analyze call');
    assert.deepEqual(unexpected(problems), []);
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test('guest: Raziel stays locked and explained; a direct ai-analyze request is refused by the worker and never reaches Supabase; no fault', { skip: SKIP }, async () => {
  const roles = new Map(), calls = [];
  const fixture = await startFixture({ supabase: supabaseAnswers(roles, calls) });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    for (const viewport of VIEWPORTS) {
      const { context, page, problems } = await open(browser, fixture, viewport);
      await page.goto(fixture.origin + '/', { waitUntil: 'domcontentloaded' });
      await ready(page);
      await assertLocked(page, `guest ${viewport.width}px`);
      const direct = await page.evaluate(async () => {
        const response = await fetch('https://linswmnnkjxvweumprav.supabase.co/functions/v1/ai-analyze', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona: 'raziel', subject: 'מה זה 73?' }),
        }).catch(error => ({ ok: false, status: 0, error: String(error) }));
        return { ok: response.ok, status: response.status };
      });
      assert.equal(direct.ok, false, 'a guest request to paid AI is refused');
      assert.equal(calls.length, 0, 'nothing reached ai-analyze');
      assert.equal(fixture.state.functions.filter(call => call.path === '/functions/v1/ai-analyze').length, 0, 'the refusal happened before Supabase');
      assert.deepEqual(unexpected(problems), [], `no page error (${viewport.width}px)`);
      await context.close();
    }
  } finally { await browser.close(); await fixture.close(); }
});
