// Browser acceptance for authentication: a real Chromium, the BUILT public-reading artifact, the real service worker and the
// real Supabase client, on the production URL (https://sod1820.co.il, mapped to a local fixture; Auth answered by an in-memory
// GoTrue model). Run `node scripts/build-public-reading-production.mjs` first. Skips when Chromium or the build is unavailable.
//   node --test test/auth-browser-acceptance-2029.browser.mjs
// AUTH_EVIDENCE_DIR=<dir> writes screenshots and a JSON report of every scenario.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const canRun = Boolean(pw) && existsSync(join(dist, 'sw.js'));
const evidence = process.env.AUTH_EVIDENCE_DIR, report = [];
if (evidence) mkdirSync(evidence, { recursive: true });

const PROFILES = {
  desktop: { viewport: { width: 1280, height: 900 }, isMobile: false },
  'mobile-browser': { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' },
  // Emulation of the installed-app presentation (display-mode: standalone). A real Android install cannot be driven from here.
  'mobile-pwa-standalone': { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, standalone: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' },
};

async function open(browser, profileName, fixture, { storageState } = {}) {
  const { standalone, ...contextOptions } = PROFILES[profileName];
  const context = await browser.newContext({ ...contextOptions, ignoreHTTPSErrors: true, locale: 'he-IL', ...(storageState ? { storageState } : {}) });
  const page = await context.newPage();
  const problems = { pageErrors: [], consoleErrors: [], authDenied: [], failedAuth: [] };
  page.on('pageerror', error => problems.pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') problems.consoleErrors.push(message.text()); });
  page.on('response', async response => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/auth/v1/') || response.status() < 400) return;
    problems.failedAuth.push(`${response.request().method()} ${url.pathname} ${response.status()}`);
    if ((await response.text().catch(() => '')).includes('public_reading_auth_denied')) problems.authDenied.push(`${response.request().method()} ${url.pathname}`);   // blocked by the worker, not answered by Auth
  });
  if (standalone) { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] }); }
  return { context, page, problems };
}
const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('.sod29-account-entry,[data-auth-state]'), null, { timeout: 30000 });
const shot = async (page, name) => { if (evidence) await page.screenshot({ path: join(evidence, name + '.png') }); };
const entry = page => page.locator('[data-auth-state]').first();

async function requestCode(page, email) {
  await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
  await page.getByRole('button', { name: 'שלחו לי קוד כניסה' }).click();
  await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).waitFor({ timeout: 15000 });
}
async function submitCode(page, code) {
  await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).fill(code);
  await page.getByRole('button', { name: /כניסה לחשבון/ }).click();
}
const unexpected = problems => [...problems.pageErrors, ...problems.consoleErrors.filter(text => !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_FAILED|net::/i.test(text)), ...problems.authDenied];

for (const profile of Object.keys(PROFILES)) {
  test(`[${profile}] existing account: code sign-in, correct identity, session persists across reload and navigation, no worker interference`, { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 120000 }, async () => {
    const fixture = await startFixture();
    const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
    try {
      const email = 'existing.owner@example.invalid';
      fixture.auth.newUser(email, true);
      const { context, page, problems } = await open(browser, profile, fixture);
      await page.goto(fixture.origin + '/login?returnTo=%2Fworld', { waitUntil: 'domcontentloaded' });
      await ready(page);
      assert.equal(await page.evaluate(() => window.__bootstrapFailure ?? null), null, 'the application admitted the worker');
      await shot(page, `${profile}-1-login`);
      await requestCode(page, email);
      assert.equal(fixture.auth.state.sent.length, 1, 'exactly one code request');
      await submitCode(page, fixture.auth.lastCode(email));
      await page.waitForURL(url => url.pathname === '/world', { timeout: 20000 });   // correct return destination
      await shot(page, `${profile}-2-after-signin`);
      // identity and persistence
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page).catch(() => {});
      const stored = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => /auth-token$/.test(k)).map(([, v]) => JSON.parse(v)?.user?.email));
      assert.deepEqual(stored, [email], 'one stored session, for this user');
      await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' });
      await page.locator('[data-auth-state="signed-in"]').waitFor({ timeout: 20000 });
      await shot(page, `${profile}-3-signed-in-after-reload`);
      assert.equal(fixture.auth.state.sent.length, 1, 'no extra code request after refresh/navigation');
      assert.deepEqual(problems.failedAuth.filter(line => !/\/user 401/.test(line)), []);
      assert.deepEqual(unexpected(problems), [], 'no page errors / console errors outside blocked third-party resources');
      report.push({ profile, scenario: 'existing-account', ok: true, authCalls: fixture.auth.log.map(line => `${line.method} ${line.path} ${line.status}`) });
      await context.close();
    } finally { await browser.close(); await fixture.close(); }
  });
}

test('NEW account: signup code signs in; password sign-in works for an existing password account', { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 120000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'brand.new.person@example.invalid';
    const { context, page, problems } = await open(browser, 'mobile-browser', fixture);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
    await requestCode(page, email);
    assert.equal(fixture.auth.codes.get(email).type, 'signup');
    await submitCode(page, fixture.auth.lastCode(email));
    await page.locator('[data-auth-state="signed-in"], main').first().waitFor();
    await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    assert.equal(fixture.auth.users.get(email).confirmed, true);
    await shot(page, 'new-account-signed-in');
    assert.deepEqual(problems.authDenied, [], 'the worker blocked nothing');
    assert.deepEqual(problems.failedAuth, ['POST /auth/v1/verify 403'], 'only the expected first attempt (type email) is answered 403 by Auth before the signup type succeeds');
    await context.close();
    // password
    fixture.auth.newUser('pw.user@example.invalid', true, 'correct horse battery');
    const second = await open(browser, 'desktop', fixture);
    await second.page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(second.page);
    await second.page.getByRole('button', { name: 'כניסה עם סיסמה' }).click();
    await second.page.getByRole('textbox', { name: 'כתובת מייל' }).fill('pw.user@example.invalid');
    await second.page.getByLabel('סיסמה', { exact: true }).fill('correct horse battery');
    await second.page.getByRole('button', { name: /כניסה לחשבון/ }).click();
    await second.page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    assert.deepEqual(unexpected(second.problems), []);
    report.push({ scenario: 'new-account-and-password', ok: true });
    await second.context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test('e-mail link: same browser completes the session on the exact callback; another browser gets guidance to use the code', { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 120000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'link.user@example.invalid'; fixture.auth.newUser(email, true);
    const { context, page, problems } = await open(browser, 'desktop', fixture);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
    await requestCode(page, email);
    const link = new URL(fixture.auth.lastLink(email));
    assert.equal(link.pathname, '/auth/callback');
    // open the link in a new tab of the SAME browser profile
    const tab = await context.newPage();
    await tab.goto(link.toString(), { waitUntil: 'domcontentloaded' });
    await tab.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    await tab.waitForURL(url => url.pathname !== '/auth/callback', { timeout: 20000 });
    await shot(tab, 'link-same-browser-signed-in');
    assert.deepEqual(unexpected(problems), []);
    // another browser: no code verifier in its storage
    fixture.auth.forgetSendTimes();
    await page.getByRole('button', { name: 'שינוי כתובת או בקשת קוד חדש' }).click().catch(() => {});
    const other = await open(browser, 'mobile-browser', fixture);
    fixture.auth.forgetSendTimes();
    await fixture.auth.handle(new Request('https://linswmnnkjxvweumprav.supabase.co/auth/v1/otp?redirect_to=' + encodeURIComponent(fixture.origin + '/auth/callback'), { method: 'POST', body: JSON.stringify({ email, create_user: true, code_challenge: 'x'.repeat(43), code_challenge_method: 's256' }) }));
    await other.page.goto(fixture.auth.lastLink(email), { waitUntil: 'domcontentloaded' });
    await other.page.getByText(/הכניסה לא הושלמה/).waitFor({ timeout: 20000 });
    assert.match(await other.page.locator('main').innerText(), /הזינו את הקוד מהמייל/);
    await shot(other.page, 'link-other-browser-guidance');
    report.push({ scenario: 'email-link', ok: true });
    await other.context.close(); await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test('stale service worker: a poisoned worker heals once without clearing the session, then the new deployment signs in', { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 150000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'stale.worker@example.invalid'; fixture.auth.newUser(email, true);
    const { context, page } = await open(browser, 'mobile-pwa-standalone', fixture);
    // A previous deployment's worker is installed and controlling, and it keeps answering with an old policy.
    fixture.state.worker = 'stale';
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.textContent.includes('העמוד לא נפתח'), null, { timeout: 40000 });
    const loadsWhileStale = fixture.state.documents;
    assert.ok(loadsWhileStale <= 3, 'one self-heal reload at most, no reload loop: ' + loadsWhileStale);
    await page.evaluate(() => localStorage.setItem('sentinel-session', 'kept'));   // the heal must not clear storage
    await shot(page, 'stale-worker-message');
    // The new deployment goes live: a plain reload (no data clearing, no reinstall) recovers.
    fixture.state.worker = 'good';
    await page.evaluate(() => sessionStorage.removeItem('sod_runtime_heal'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    assert.equal(await page.evaluate(() => localStorage.getItem('sentinel-session')), 'kept', 'storage survived');
    await requestCode(page, email);
    await submitCode(page, fixture.auth.lastCode(email));
    await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    await shot(page, 'stale-worker-recovered-signed-in');
    report.push({ scenario: 'stale-worker', ok: true, loadsWhileStale });
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test.after(() => { if (evidence && report.length) writeFileSync(join(evidence, 'report.json'), JSON.stringify(report, null, 2)); });
