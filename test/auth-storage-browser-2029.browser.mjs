// Browser acceptance for sign-in with a failing localStorage (permanent gate): a real Chromium, the BUILT public-reading artifact, the real
// service worker and Supabase client on the production URL. localStorage is made full (every write throws QuotaExceededError) or blocked
// (every access throws SecurityError) before any page script runs; regular browser and installed-app (standalone) presentations.
//   node scripts/build-public-reading-production.mjs && node --test test/auth-storage-browser-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const skip = !(Boolean(pw) && existsSync(join(dist, 'sw.js'))) && 'playwright or the built artifact is unavailable';
const evidence = process.env.AUTH_EVIDENCE_DIR; if (evidence) mkdirSync(evidence, { recursive: true });

const PROFILES = {
  'desktop': { viewport: { width: 1280, height: 900 }, isMobile: false },
  'mobile-pwa-standalone': { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, standalone: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' },
};
// Runs before any page script, in every document of the context.
const BREAKERS = {
  healthy: '',
  full: `(() => { const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === window.localStorage) throw new DOMException("Failed to execute 'setItem' on 'Storage': Setting the value of '" + k + "' exceeded the quota.", 'QuotaExceededError'); return real.call(this, k, v); }; })();`,
  blocked: `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError'); } });`,
};

async function open(browser, profileName, state) {
  const { standalone, ...contextOptions } = PROFILES[profileName];
  const context = await browser.newContext({ ...contextOptions, ignoreHTTPSErrors: true, locale: 'he-IL' });
  if (BREAKERS[state]) await context.addInitScript(BREAKERS[state]);
  const page = await context.newPage();
  const problems = { pageErrors: [], authDenied: [] };
  page.on('pageerror', error => problems.pageErrors.push(String(error.message || error)));
  page.on('response', async response => { if (new URL(response.url()).pathname.startsWith('/auth/v1/') && response.status() === 403 && (await response.text().catch(() => '')).includes('public_reading_auth_denied')) problems.authDenied.push(response.url()); });
  if (standalone) { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] }); }
  return { context, page, problems };
}
const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('[data-auth-state]'), null, { timeout: 30000 });
const shot = async (page, name) => { if (evidence) await page.screenshot({ path: join(evidence, name + '.png') }); };
const withBrowser = async (body) => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try { await body({ fixture, browser }); } finally { await browser.close(); await fixture.close(); }
};

for (const profile of Object.keys(PROFILES)) for (const state of ['healthy', 'full', 'blocked']) {
  test(`[${profile} / ${state} localStorage] e-mail code sign-in completes and survives a reload in the same tab`, { skip, timeout: 120000 }, () => withBrowser(async ({ fixture, browser }) => {
    const email = `${state}.${profile}@example.invalid`; fixture.auth.newUser(email, true);
    const { context, page, problems } = await open(browser, profile, state);
    await page.goto(fixture.origin + '/login?returnTo=%2Fworld', { waitUntil: 'domcontentloaded' }); await ready(page);
    await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
    await page.getByRole('button', { name: 'שלחו לי קוד כניסה' }).click();
    await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).waitFor({ timeout: 15000 });
    assert.equal(fixture.auth.log.filter(line => line.path === '/otp').length, 1, 'the code request leaves the browser even with failing storage');
    await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).fill(fixture.auth.lastCode(email));
    await page.getByRole('button', { name: /כניסה לחשבון/ }).click();
    await page.waitForURL(url => url.pathname === '/world', { timeout: 20000 });
    await shot(page, `storage-${profile}-${state}-1-signed-in`);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' });   // a new page load in the same tab
    await page.locator('[data-auth-state="signed-in"]').waitFor({ timeout: 20000 });
    await shot(page, `storage-${profile}-${state}-2-after-reload`);
    assert.deepEqual(problems.authDenied, [], 'the worker blocked nothing');
    assert.deepEqual(problems.pageErrors.filter(text => /quota|storage|SecurityError|denied for this document/i.test(text)), [], 'no storage exception escapes to the page');
    await context.close();
  }));

  test(`[${profile} / ${state} localStorage] Google: the redirect round trip completes the session and the session is there on the next page load`, { skip, timeout: 120000 }, () => withBrowser(async ({ fixture, browser }) => {
    const { context, page } = await open(browser, profile, state);
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
    await page.getByRole('button', { name: /המשך עם Google/ }).click();
    await page.waitForURL(url => url.origin === fixture.origin && url.pathname !== '/login' && url.pathname !== '/auth/callback', { timeout: 20000 });   // the callback finished and moved on
    await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' });   // the session must also be there on a later page load of the same tab
    await page.locator('[data-auth-state="signed-in"]').waitFor({ timeout: 20000 });
    await shot(page, `storage-${profile}-${state}-google`);
    assert.equal(fixture.auth.log.some(line => line.path === '/token' && line.status === 200), true, 'the callback exchanged the code with the PKCE verifier that was saved before the redirect');
    assert.equal(fixture.auth.log.some(line => line.path === '/token' && line.status >= 400), false, 'no PKCE mismatch');
    await context.close();
  }));
}

test('[desktop] storage report is shown to the person (names and sizes only) when localStorage is full', { skip, timeout: 120000 }, () => withBrowser(async ({ fixture, browser }) => {
  const { context, page } = await open(browser, 'desktop', 'full');
  await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
  const note = page.locator('[data-auth-storage]');
  await note.waitFor({ timeout: 15000 });
  assert.match(await note.locator('summary').innerText(), /מלא או חסום|חסום/);
  await context.close();
}));
