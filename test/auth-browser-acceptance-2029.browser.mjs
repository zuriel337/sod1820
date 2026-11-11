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


// ---- password recovery (and the first password for an account that began with Google) ------------------------------------
const storedUserId = page => page.evaluate(() => { const key = Object.keys(localStorage).find(item => /auth-token$/.test(item)); return key ? JSON.parse(localStorage.getItem(key))?.user?.id ?? null : null; });
async function signOutViaUi(page) {
  await page.goto('https://sod1820.co.il/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-state="signed-in"]').waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'כניסה עם חשבון אחר' }).click();
  await page.locator('[data-auth-state="guest"]').waitFor({ timeout: 20000 });
  assert.equal(await storedUserId(page), null, 'the local session is gone');
}
async function askForResetLink(page, email, { viaPasswordStep = true } = {}) {
  if (viaPasswordStep) { await page.getByRole('button', { name: 'כניסה עם סיסמה' }).click(); await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email); await page.getByRole('button', { name: 'שכחתי סיסמה?' }).click(); }
  await page.getByRole('heading', { name: 'שחזור סיסמה' }).waitFor({ timeout: 15000 });
  assert.equal(await page.getByRole('textbox', { name: 'כתובת מייל' }).inputValue(), email, 'the address already typed is carried over');
  await page.getByRole('button', { name: 'שלחו לי קישור לבחירת סיסמה' }).click();
}
async function chooseNewPassword(tab, password) {
  await tab.getByRole('heading', { name: 'בחירת סיסמה חדשה' }).waitFor({ timeout: 20000 });
  await tab.getByLabel('סיסמה חדשה', { exact: true }).fill(password);
  await tab.getByLabel('אימות הסיסמה', { exact: true }).fill(password);
  await tab.getByRole('button', { name: /שמירת הסיסמה/ }).click();
  await tab.getByRole('heading', { name: 'הסיסמה נשמרה' }).waitFor({ timeout: 20000 });
}
async function passwordSignIn(page, email, password) {
  await page.goto('https://sod1820.co.il/login', { waitUntil: 'domcontentloaded' }); await ready(page);
  await page.getByRole('button', { name: 'כניסה עם סיסמה' }).click();
  await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
  await page.getByLabel('סיסמה', { exact: true }).fill(password);
  await page.getByRole('button', { name: /כניסה לחשבון/ }).click();
}

for (const profile of ['desktop', 'mobile-browser']) {
  test(`[${profile}] Google-only account gets its first password by e-mail link; Google and password then reach the SAME user_id`, { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 180000 }, async () => {
    const fixture = await startFixture();
    const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
    try {
      const email = 'google.person@example.invalid';   // the address the fixture's Google round trip signs in
      const { context, page, problems } = await open(browser, profile, fixture);
      await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
      await page.getByRole('button', { name: 'המשך עם Google' }).click();
      await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
      const userId = await storedUserId(page);
      assert.ok(userId); assert.equal(fixture.auth.users.get(email).password, null, 'no password yet');
      await signOutViaUi(page);
      // An address with no account first, then the real one: the answer is identical. (Only the latest request from a browser can be
      // completed there, because the PKCE verifier is kept per browser, which is why the page says "only the last link works".)
      await askForResetLink(page, 'nobody.at.all@example.invalid');
      await page.getByRole('heading', { name: 'בדקו את המייל' }).waitFor({ timeout: 15000 });
      const unknown = await page.locator('.sod29-account-entry').innerText();
      assert.match(unknown, /אם קיים חשבון עם הכתובת/); assert.equal(fixture.auth.state.sent.length, 0, 'no mail, no account created');
      await page.getByRole('button', { name: 'שליחה חוזרת או שינוי כתובת' }).click();
      await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
      await page.getByRole('button', { name: 'שלחו לי קישור לבחירת סיסמה' }).click();
      await page.getByRole('heading', { name: 'בדקו את המייל' }).waitFor({ timeout: 15000 });
      const known = await page.locator('.sod29-account-entry').innerText();
      await shot(page, `${profile}-recovery-1-sent`);
      assert.equal(known.replace(email, 'X'), unknown.replace('nobody.at.all@example.invalid', 'X'), 'identical answer with and without an account');
      assert.equal(fixture.auth.state.sent.filter(item => item.kind === 'recovery').length, 1, 'only the real account got a link');
      assert.equal(fixture.auth.users.size, 1, 'no account was created by asking');
      const link = fixture.auth.lastRecoveryLink(email);
      assert.equal(new URL(link).pathname, '/auth/callback');
      // The link opens in a new tab of the same browser.
      const tab = await context.newPage();
      await tab.goto(link, { waitUntil: 'domcontentloaded' });
      await tab.getByRole('heading', { name: 'בחירת סיסמה חדשה' }).waitFor({ timeout: 30000 }); await tab.waitForTimeout(800);
      await shot(tab, `${profile}-recovery-2-new-password`);
      await chooseNewPassword(tab, 'first-ever-password-1');
      await shot(tab, `${profile}-recovery-3-saved`);
      assert.equal(await storedUserId(tab), userId, 'the recovery session is the same user_id');
      assert.deepEqual(fixture.auth.state.passwordChanges, [userId]);
      await signOutViaUi(tab);
      await passwordSignIn(tab, email, 'first-ever-password-1');
      await tab.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
      assert.equal(await storedUserId(tab), userId, 'password sign-in: same user_id');
      await signOutViaUi(tab);
      await tab.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(tab);
      await tab.getByRole('button', { name: 'המשך עם Google' }).click();
      await tab.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
      assert.equal(await storedUserId(tab), userId, 'Google sign-in again: same user_id');
      assert.equal(fixture.auth.users.size, 1);
      assert.deepEqual(problems.authDenied, [], 'the worker blocked nothing'); assert.deepEqual(unexpected(problems), []);
      report.push({ profile, scenario: 'google-only-first-password', ok: true, userId, authCalls: fixture.auth.log.map(line => `${line.method} ${line.path} ${line.status}`) });
      await context.close();
    } finally { await browser.close(); await fixture.close(); }
  });
}

test('signed in with Google: "הגדרת סיסמה לאתר" in the account view sets a password without e-mail; password and Google then reach the SAME user_id', { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 180000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'google.person@example.invalid';
    const { context, page, problems } = await open(browser, 'mobile-browser', fixture);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
    await page.getByRole('button', { name: 'המשך עם Google' }).click();
    await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    const userId = await storedUserId(page);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-auth-state="signed-in"]').waitFor({ timeout: 20000 });
    await page.locator('[data-auth-action="set-password"]').click();
    await page.getByLabel('סיסמה חדשה', { exact: true }).fill('site-password-from-google-1'); await page.getByLabel('אימות הסיסמה', { exact: true }).fill('site-password-from-google-1');
    await shot(page, 'set-password-signed-in-google');
    await page.getByRole('button', { name: /שמירת הסיסמה/ }).click();
    await page.getByText('הסיסמה נשמרה. מעכשיו אפשר להיכנס גם עם הסיסמה').waitFor({ timeout: 20000 });
    assert.equal(fixture.auth.state.sent.length, 0, 'no e-mail was needed'); assert.deepEqual(fixture.auth.state.passwordChanges, [userId]);
    await signOutViaUi(page);
    await passwordSignIn(page, email, 'site-password-from-google-1');
    await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    assert.equal(await storedUserId(page), userId, 'password sign-in: same user_id');
    await signOutViaUi(page);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
    await page.getByRole('button', { name: 'המשך עם Google' }).click();
    await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    assert.equal(await storedUserId(page), userId, 'Google again: same user_id'); assert.equal(fixture.auth.users.size, 1);
    assert.deepEqual(problems.authDenied, []); assert.deepEqual(unexpected(problems), []);
    report.push({ scenario: 'signed-in-set-password', ok: true, userId });
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test('account with a password: "forgot" after a wrong-password error carries the address; reset replaces the password; the e-mail code still signs in', { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 180000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'has.password@example.invalid'; const user = fixture.auth.newUser(email, true, 'old-password-123');
    const { context, page, problems } = await open(browser, 'desktop', fixture);
    await passwordSignIn(page, email, 'wrong-password-999');
    await page.getByText('המייל או הסיסמה אינם נכונים').waitFor({ timeout: 15000 });
    await shot(page, 'recovery-wrong-password-offers-reset');
    await page.locator('[data-auth-action="forgot-password-after-error"]').click();
    await askForResetLink(page, email, { viaPasswordStep: false });
    await page.getByRole('heading', { name: 'בדקו את המייל' }).waitFor({ timeout: 15000 });
    const tab = await context.newPage();
    await tab.goto(fixture.auth.lastRecoveryLink(email), { waitUntil: 'domcontentloaded' });
    await chooseNewPassword(tab, 'old-password-123').catch(() => {});   // the same password is refused with a clear message
    await tab.getByText('זו אותה סיסמה שכבר מוגדרת בחשבון').waitFor({ timeout: 15000 });
    await tab.getByLabel('סיסמה חדשה', { exact: true }).fill('replacement-pass-456'); await tab.getByLabel('אימות הסיסמה', { exact: true }).fill('replacement-pass-456');
    await tab.getByRole('button', { name: /שמירת הסיסמה/ }).click(); await tab.getByRole('heading', { name: 'הסיסמה נשמרה' }).waitFor({ timeout: 15000 });
    await signOutViaUi(tab);
    await passwordSignIn(tab, email, 'old-password-123');
    await tab.getByText('המייל או הסיסמה אינם נכונים').waitFor({ timeout: 15000 });
    await passwordSignIn(tab, email, 'replacement-pass-456');
    await tab.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    assert.equal(await storedUserId(tab), user.id);
    await signOutViaUi(tab); fixture.auth.forgetSendTimes();
    await tab.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(tab);
    await requestCode(tab, email); await submitCode(tab, fixture.auth.lastCode(email));
    await tab.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
    assert.equal(await storedUserId(tab), user.id, 'the existing code sign-in still works');
    assert.deepEqual(problems.authDenied, []);
    report.push({ scenario: 'existing-password-reset', ok: true });
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test('recovery failures each leave an action: expired link, another browser, mail-server error, no session; nothing is left half-done', { skip: !canRun && 'playwright or the built artifact is unavailable', timeout: 180000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const email = 'fails@example.invalid'; fixture.auth.newUser(email, true);
    const { context, page } = await open(browser, 'mobile-browser', fixture);
    // 1. An expired or already used link comes back with Auth's error in the address.
    await page.goto(fixture.origin + '/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', { waitUntil: 'domcontentloaded' });
    await page.getByText('הקישור פג תוקף או שכבר נעשה בו שימוש').waitFor({ timeout: 30000 });
    assert.equal(new URL(page.url()).search, '', 'the error is removed from the address');
    await shot(page, 'recovery-failure-expired');
    await page.getByRole('link', { name: 'בקשת קישור חדש לשחזור סיסמה' }).click();
    await page.getByRole('heading', { name: 'שחזור סיסמה' }).waitFor({ timeout: 20000 });
    // 2. A mail-server error while asking: a clear message and the other ways in, no dead end.
    fixture.auth.state.rejectNextSend = 500;
    await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
    await page.getByRole('button', { name: 'שלחו לי קישור לבחירת סיסמה' }).click();
    await page.getByText('השרת לא ענה כרגע').waitFor({ timeout: 15000 });
    assert.ok(await page.getByRole('button', { name: 'המשך עם Google' }).isVisible()); assert.ok(await page.locator('[data-auth-action="reset-to-code"]').isVisible());
    await shot(page, 'recovery-failure-server-error');
    await page.getByRole('button', { name: 'שלחו לי קישור לבחירת סיסמה' }).click();   // the retry works once the server does
    await page.getByRole('heading', { name: 'בדקו את המייל' }).waitFor({ timeout: 15000 });
    // 3. The link opened in another browser (no verifier there): guidance plus a new-link action.
    const link = fixture.auth.lastRecoveryLink(email);
    const other = await open(browser, 'desktop', fixture);
    await other.page.goto(link, { waitUntil: 'domcontentloaded' });
    await other.page.getByText(/הכניסה לא הושלמה/).waitFor({ timeout: 30000 });
    assert.ok(await other.page.getByRole('link', { name: 'בקשת קישור חדש לשחזור סיסמה' }).isVisible()); assert.ok(await other.page.getByRole('link', { name: /חזרה לכניסה/ }).isVisible());
    assert.equal(await storedUserId(other.page), null, 'no session was created');
    await shot(other.page, 'recovery-failure-other-browser');
    assert.equal(fixture.auth.state.passwordChanges.length, 0, 'no password changed in any failure');
    report.push({ scenario: 'recovery-failures', ok: true });
    await other.context.close(); await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

test.after(() => { if (evidence && report.length) writeFileSync(join(evidence, 'report.json'), JSON.stringify(report, null, 2)); });
