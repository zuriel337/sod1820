// Password account flow in a real browser against the REAL built app (dist/), with a stubbed Auth server: no live network, no live write.
// Scenarios: sign-up, code confirmation, send failures that must never look like success, sign-in errors, password reset with a code,
// the set-password step staying open on a recovery session, cancel, busy indicator, layout.
// Run:  npm run build && node test/auth-password-account-2029.browser.mjs
// Public-reading release mode (the production profile: session in sessionStorage, server-verified principal):
//       VITE_PUBLIC_READING_RELEASE=public-reading-20261101 SOD_BUILD_TARGET=2029 npx vite build && node test/auth-password-account-2029.browser.mjs
// The service-worker policy itself is proven separately by test/public-reading-password-account-transport.test.mjs (real SDK through the emitted worker).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.AUTH_PASSWORD_OUT || path.join(process.env.TMPDIR || '/tmp', 'auth-password-account-2029');
fs.mkdirSync(OUT, { recursive: true });
const DIST = path.join(ROOT, 'dist');
assert.ok(fs.existsSync(path.join(DIST, '2029.html')), 'build the app first: npm run build');

const API = 'linswmnnkjxvweumprav.supabase.co';
const ACTOR = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GOOD_PASSWORD = 'correct horse 9';
const CODE = '123456';
const TARGET = '/community/chat?sort=liked&page=0';
const ENTRY = '/login?returnTo=' + encodeURIComponent(TARGET);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, pathname);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, '2029.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function sessionFor() {
  const now = Math.floor(Date.now() / 1000);
  return { access_token: [part({ alg: 'HS256' }), part({ sub: ACTOR, role: 'authenticated', exp: now + 3600 }), 'synthetic'].join('.'), refresh_token: 'synthetic-local-only', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer',
    user: { id: ACTOR, aud: 'authenticated', role: 'authenticated', email: 'new.member@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: new Date().toISOString() } };
}

// One stubbed Auth server per context. `s` is the scenario's knobs; `s.requests` records every Auth request the app made.
function install(context) {
  const s = { requests: [], unexpected: [], actor: null, sendStatus: 0, unconfirmed: false, putStatus: 0, hold: null, held: null, logouts: [], errors: [] };
  context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== API) return route.fulfill({ status: 200, body: '' });
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    const body = request.method() === 'POST' || request.method() === 'PUT' ? JSON.parse(request.postData() || '{}') : {};
    if (url.pathname === '/auth/v1/settings') return reply({ external: { google: true, facebook: true, email: true } });
    if (url.pathname.startsWith('/auth/v1/')) {
      s.requests.push({ method: request.method(), path: url.pathname, query: url.search, body, authorization: request.headers().authorization || '' });
      const failure = (status, code, msg, extra = {}) => reply({ code: status, error_code: code, msg, ...extra }, status);
      if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/resend' || url.pathname === '/auth/v1/recover') {
        if (s.sendStatus === 500) return failure(500, 'unexpected_failure', 'Error sending confirmation email');
        if (s.sendStatus === 429) return failure(429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after 52 seconds.');
        if (s.sendStatus === 422) return failure(422, 'weak_password', 'Password should be at least 8 characters.', { weak_password: { reasons: ['length'] } });
        return reply(url.pathname === '/auth/v1/signup' ? { id: ACTOR, aud: 'authenticated', role: '', email: body.email, confirmation_sent_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, identities: [{ id: ACTOR }] } : {});
      }
      if (url.pathname === '/auth/v1/verify') {
        if (s.hold === 'verify') { s.held = route; return; }
        if (body.token !== CODE) return failure(403, 'otp_expired', 'Token has expired or is invalid');
        s.actor = ACTOR; return reply(sessionFor());
      }
      if (url.pathname === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'password') {
          if (body.password !== GOOD_PASSWORD) return failure(400, 'invalid_credentials', 'Invalid login credentials');
          if (s.unconfirmed) return failure(400, 'email_not_confirmed', 'Email not confirmed');
          s.actor = ACTOR; return reply(sessionFor());
        }
        return reply(sessionFor());
      }
      if (url.pathname === '/auth/v1/user' && request.method() === 'PUT') {
        if (s.putStatus === 401) return failure(401, 'bad_jwt', 'invalid JWT');
        if (s.putStatus === 422) return failure(422, 'same_password', 'New password should be different from the old password.');
        return reply(sessionFor().user);
      }
      if (url.pathname === '/auth/v1/user') return reply(sessionFor().user);
      if (url.pathname === '/auth/v1/logout') { s.logouts.push(url.search); s.actor = null; return route.fulfill({ status: 204, body: '' }); }
      s.unexpected.push(request.method() + ' ' + url.pathname); return reply({}, 403);
    }
    if (url.pathname === '/rest/v1/users') return reply({ id: ACTOR, username: 'fixture', display_name: 'חשבון לבדיקה', role: 'user', tier: 'free', created_at: '2026-01-01T00:00:00Z' });
    if (request.method() === 'GET') return reply([]);
    if (url.pathname.includes('/rpc/rd_is_admin')) return reply(false);
    return reply([]);
  });
  return s;
}

const results = [];
let browser;
async function scenario(name, run, { width = 390 } = {}) {
  if (process.env.AUTH_SCENARIO && !name.includes(process.env.AUTH_SCENARIO)) return; // optional focus filter for mutation checks
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const s = install(context);
  const page = await context.newPage();
  page.on('pageerror', error => s.errors.push(String(error)));
  try {
    await run(page, s);
    assert.deepEqual(s.errors, [], name + ': page errors');
    assert.deepEqual(s.unexpected, [], name + ': unexpected Auth requests');
    // The password is never persisted in the browser.
    const stored = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
    assert.ok(!stored.includes(GOOD_PASSWORD), name + ': password must not be stored');
    results.push({ name, pass: true });
    console.log('PASS ', name);
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, name.replace(/\W+/g, '-') + '.png') }).catch(() => {});
    results.push({ name, pass: false, error: String(error.stack || error) });
    console.log('FAIL ', name, '\n', error.stack || error);
  } finally { await context.close(); }
}

const open = async page => {
  await page.goto(BASE + ENTRY, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-experience-surface="auth-2029"]').waitFor();
  await page.getByLabel('סיסמה', { exact: true }).waitFor();
};
const goSignup = async page => { await page.getByRole('button', { name: 'אין לכם חשבון? פתיחת חשבון חדש', exact: true }).click(); await page.getByRole('heading', { name: 'פתיחת חשבון חדש', exact: true }).waitFor(); };
const fillSignup = async (page, email = 'new.member@example.invalid', password = GOOD_PASSWORD) => { await page.getByLabel('כתובת מייל', { exact: true }).fill(email); await page.getByLabel('סיסמה', { exact: true }).fill(password); };
const step = page => page.locator('[data-experience-surface="auth-2029"] [data-auth-step]');
const bodyText = page => page.locator('.sod29-account-entry').innerText();
const arrivedAt = async page => { await page.waitForURL(BASE + TARGET); };
const lastOf = (s, p) => s.requests.filter(r => r.path === p).at(-1);

browser = await chromium.launch();
try {
  await scenario('sign-up: e-mail + password, confirm by code, no metadata, no consent, no link', async (page, s) => {
    await open(page); await goSignup(page);
    assert.match(await page.locator('[data-signup-updates-policy="explicit-consent-only"]').innerText(), /אינה מצרפת אתכם לרשימת הדיוור/);
    assert.equal(await page.locator('input[type=checkbox]').count(), 0, 'no consent control and none pre-ticked');
    assert.equal(await page.getByLabel('סיסמה', { exact: true }).getAttribute('autocomplete'), 'new-password');
    await fillSignup(page);
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'confirm');
    assert.match(await page.getByRole('status').first().innerText(), /ביקשנו לשלוח קוד אימות/);
    assert.equal(await page.getByLabel('סיסמה', { exact: true }).count(), 0, 'the password field is gone after submitting');
    const signup = lastOf(s, '/auth/v1/signup');
    assert.equal(signup.query, '', 'no redirect_to: the mail can carry only a code');
    assert.deepEqual(Object.keys(signup.body).sort(), ['code_challenge', 'code_challenge_method', 'data', 'email', 'gotrue_meta_security', 'password']);
    assert.deepEqual(signup.body.data, {}, 'no user metadata and no consent are sent');
    await page.getByLabel('קוד אימות מהמייל', { exact: true }).fill('000000');
    await page.getByRole('button', { name: 'אימות הכתובת ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'הקוד שגוי' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'confirm', 'a wrong code keeps the person on the code step');
    await page.getByLabel('קוד אימות מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'אימות הכתובת ←', exact: true }).click();
    await arrivedAt(page);
    assert.deepEqual(lastOf(s, '/auth/v1/verify').body, { email: 'new.member@example.invalid', token: CODE, type: 'signup', gotrue_meta_security: {} });
    assert.equal(s.requests.filter(r => r.path === '/auth/v1/otp').length, 0, 'no emailed sign-in code or magic link is requested');
  });

  await scenario('sign-up: a mail server failure (500) is an error, never a success', async (page, s) => {
    await open(page); await goSignup(page); s.sendStatus = 500;
    await fillSignup(page);
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'לא הצלחנו לשלוח' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'signup', 'stays on the sign-up step');
    assert.equal(await page.getByLabel('קוד אימות מהמייל', { exact: true }).count(), 0, 'no code field is offered as if a mail were sent');
    const text = await bodyText(page);
    assert.doesNotMatch(text, /ביקשנו לשלוח קוד אימות|הקוד בדרך|ייתכן שהמייל בדרך/);
    assert.equal(await page.getByLabel('סיסמה', { exact: true }).inputValue(), GOOD_PASSWORD, 'the typed password is kept so the person can retry');
    s.sendStatus = 0;
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
  });

  await scenario('sign-up: rate limit (429) explains itself and still lets a received code be entered', async (page, s) => {
    await open(page); await goSignup(page); s.sendStatus = 429;
    await fillSignup(page);
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'אם כבר קיבלתם קוד' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'signup');
    await page.getByRole('button', { name: 'כבר קיבלתי קוד אימות', exact: true }).click();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
    await page.getByLabel('קוד אימות מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'אימות הכתובת ←', exact: true }).click();
    await arrivedAt(page);
  });

  await scenario('sign-up: a fast double click sends exactly one request', async (page, s) => {
    await open(page); await goSignup(page);
    await fillSignup(page);
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).dblclick();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
    assert.equal(s.requests.filter(r => r.path === '/auth/v1/signup').length, 1, 'a double click must not request two sign-ups (and two mails)');
  });

  await scenario('sign-up: a weak password from the server is explained and nothing advances', async (page, s) => {
    await open(page); await goSignup(page); s.sendStatus = 422;
    await fillSignup(page, 'new.member@example.invalid', 'longenough1');
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'קצרה מדי' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'signup');
  });

  await scenario('sign-up: client floors stop a bad e-mail or a short password before any request', async (page, s) => {
    await open(page); await goSignup(page);
    await fillSignup(page, 'new.member@example.invalid', 'short');
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'קצרה מדי' }).waitFor();
    await page.getByLabel('כתובת מייל', { exact: true }).fill('not-an-email@x');
    await page.getByLabel('סיסמה', { exact: true }).fill(GOOD_PASSWORD);
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'כתובת מייל תקינה' }).waitFor();
    assert.equal(s.requests.length, 0, 'nothing is sent for invalid input');
  });

  await scenario('sign-up: an address that already has an account gets the same neutral screen (no enumeration)', async (page, s) => {
    await open(page); await goSignup(page);
    await fillSignup(page, 'someone.registered@example.invalid');
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
    const text = await bodyText(page);
    assert.match(text, /אם נשלח אליכם קוד אימות/, 'conditional wording: a code is not promised');
    assert.match(text, /אם כבר יש לכם חשבון/);
    assert.doesNotMatch(text, /כבר רשום|קיים חשבון עם הכתובת/);
  });

  await scenario('sign-in: wrong password, then unconfirmed address moves to the code step; resend has a visible cooldown', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByLabel('סיסמה', { exact: true }).fill('wrong password');
    await page.getByRole('button', { name: 'כניסה לחשבון ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'המייל או הסיסמה אינם נכונים' }).waitFor();
    assert.match(await page.getByRole('alert').innerText(), /שכחתי סיסמה/);
    s.unconfirmed = true;
    await page.getByLabel('סיסמה', { exact: true }).fill(GOOD_PASSWORD);
    await page.getByRole('button', { name: 'כניסה לחשבון ←', exact: true }).click();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'עדיין לא אומתה' }).waitFor();
    assert.equal(s.requests.filter(r => r.path === '/auth/v1/resend' || r.path === '/auth/v1/signup').length, 0, 'moving to the code step sends nothing by itself');
    await page.getByRole('button', { name: 'שליחת קוד חדש', exact: true }).click();
    await page.locator('[data-auth-action="resend"]:disabled', { hasText: /אפשר לבקש קוד חדש בעוד \d+ שניות/ }).waitFor();
    assert.deepEqual(lastOf(s, '/auth/v1/resend').body.type, 'signup');
    await page.getByLabel('קוד אימות מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'אימות הכתובת ←', exact: true }).click();
    await arrivedAt(page);
  });

  await scenario('sign-in: password sign-in works and returns to the exact page', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByLabel('סיסמה', { exact: true }).fill(GOOD_PASSWORD);
    await page.getByRole('button', { name: 'כניסה לחשבון ←', exact: true }).click();
    await arrivedAt(page);
    assert.equal(s.requests.some(r => r.path === '/auth/v1/otp'), false);
  });

  await scenario('reset: code, set-password step stays open on the recovery session, validation, save, exact return', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click();
    await page.getByRole('heading', { name: 'קביעת סיסמה או איפוס', exact: true }).waitFor();
    assert.equal(await page.getByLabel('כתובת מייל', { exact: true }).inputValue(), 'new.member@example.invalid', 'the address is carried over');
    await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
    await page.getByRole('heading', { name: 'הזינו את קוד האיפוס', exact: true }).waitFor();
    const recover = lastOf(s, '/auth/v1/recover');
    assert.equal(recover.query, '', 'no redirect_to in the recovery request');
    assert.deepEqual(Object.keys(recover.body).sort(), ['code_challenge', 'code_challenge_method', 'email', 'gotrue_meta_security']);
    await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill('999999');
    await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'הקוד שגוי' }).waitFor();
    await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
    await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor();
    assert.equal(lastOf(s, '/auth/v1/verify').body.type, 'recovery');
    // The recovery code opened a session; the signed-in view must NOT replace the set-password form.
    await page.waitForTimeout(600);
    assert.equal(await step(page).getAttribute('data-auth-step'), 'reset-new');
    assert.equal(await page.getByRole('heading', { name: /^שלום/ }).count(), 0);
    assert.equal(await page.getByLabel('סיסמה חדשה', { exact: true }).getAttribute('autocomplete'), 'new-password');
    await page.getByLabel('סיסמה חדשה', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'שמירת הסיסמה ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'קצרה מדי' }).waitFor();
    assert.equal(s.requests.filter(r => r.method === 'PUT').length, 0, 'a short password is never sent');
    await page.getByLabel('סיסמה חדשה', { exact: true }).fill('brand new pass 9');
    await page.getByRole('button', { name: 'שמירת הסיסמה ←', exact: true }).click();
    await arrivedAt(page);
    const update = s.requests.find(r => r.method === 'PUT');
    assert.equal(update.path, '/auth/v1/user');
    assert.deepEqual(Object.keys(update.body).filter(key => update.body[key] !== null).sort(), ['password']);
    assert.match(update.authorization, /^Bearer /);
  });

  await scenario('reset: reloading while choosing the new password returns to the same step (the recovery session is still open)', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click();
    await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
    await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
    await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: /^שלום/ }).count(), 0, 'not the signed-in view');
    await page.getByLabel('סיסמה חדשה', { exact: true }).fill('brand new pass 9');
    await page.getByRole('button', { name: 'שמירת הסיסמה ←', exact: true }).click();
    await arrivedAt(page);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sod-account-new-password-step')), null, 'the step flag is cleared after saving');
  });

  await scenario('reset: if the recovery session disappears, the entry restarts the reset instead of showing a dead form', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click();
    await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
    await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
    await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor();
    // Drop the SDK session wherever the build keeps it (localStorage in an ordinary build, sessionStorage in the public-reading release),
    // but keep the tab's step flag: that is exactly the "flag without a session" case.
    await page.evaluate(() => {
      localStorage.clear();
      for (const key of Object.keys(sessionStorage)) if (key.startsWith('sb-') || key === 'sod-public-reading-account') sessionStorage.removeItem(key);
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').filter({ hasText: 'פג תוקף האימות' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'reset');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sod-account-new-password-step')), null);
  });

  await scenario('reset: a mail server failure on the request stays on the reset step with an error', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click();
    s.sendStatus = 500;
    await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'לא הצלחנו לשלוח' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'reset');
    assert.equal(await page.getByLabel('קוד איפוס מהמייל', { exact: true }).count(), 0);
    assert.doesNotMatch(await bodyText(page), /ביקשנו לשלוח קוד איפוס/);
  });

  await scenario('reset: cancelling the new-password step signs this device out locally and returns to sign-in', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click();
    await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
    await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
    await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor();
    await page.getByRole('button', { name: 'ביטול ויציאה', exact: true }).click();
    await page.getByRole('heading', { name: 'כניסה עם מייל וסיסמה', exact: true }).waitFor();
    assert.deepEqual(s.logouts, ['?scope=local']);
  });

  await scenario('reset: an expired recovery session during save returns to a clean sign-in with a clear message', async (page, s) => {
    await open(page);
    await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
    await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click();
    await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
    await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
    await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor();
    s.putStatus = 401;
    await page.getByLabel('סיסמה חדשה', { exact: true }).fill('brand new pass 9');
    await page.getByRole('button', { name: 'שמירת הסיסמה ←', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'פג תוקף האימות' }).waitFor();
    assert.equal(await step(page).getAttribute('data-auth-step'), 'signin', 'a clean sign-in replaces the dead form');
    assert.deepEqual(s.logouts, ['?scope=local'], 'the unusable recovery session is dropped on this device');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sod-account-new-password-step')), null);
  });

  await scenario('busy indicator: the real stage and elapsed seconds are visible while a code is verified', async (page, s) => {
    await open(page); await goSignup(page);
    await fillSignup(page);
    await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
    await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor();
    s.hold = 'verify';
    await page.getByLabel('קוד אימות מהמייל', { exact: true }).fill(CODE);
    await page.getByRole('button', { name: 'אימות הכתובת ←', exact: true }).click();
    const progress = page.locator('[data-auth-progress="confirm"]');
    await progress.waitFor();
    assert.match(await progress.innerText(), /מאמתים את הקוד… \d+ שנ׳/);
    await page.waitForTimeout(1300);
    assert.match(await progress.innerText(), /[1-9] שנ׳/, 'the elapsed seconds advance');
    assert.equal(await page.getByRole('button', { name: 'רגע…', exact: true }).isDisabled(), true);
    s.hold = null; s.actor = ACTOR;
    await s.held.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionFor()) });
    await arrivedAt(page);
  });

  for (const width of [320, 360, 390, 1440]) {
    await scenario(`layout ${width}px: every step fits, touch targets are at least 44px, no horizontal scroll`, async (page, s) => {
      const check = async label => {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + ': overflow');
        // Measured in one synchronous pass inside the page: the entry re-renders every second (cooldown, elapsed seconds), so measuring
        // element by element from the test runner races with those updates.
        const small = await page.evaluate(() => [...document.querySelectorAll('.sod29-auth button, .sod29-auth input, .sod29-auth a')]
          .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
          .map(el => ({ height: el.getBoundingClientRect().height, html: el.outerHTML.slice(0, 80) })).filter(item => item.height < 44));
        assert.deepEqual(small, [], label + ': targets below 44px');
      };
      await open(page); await check('signin');
      await goSignup(page); await check('signup');
      await fillSignup(page);
      await page.getByRole('button', { name: 'פתיחת חשבון ←', exact: true }).click();
      await page.getByRole('heading', { name: 'אימות כתובת המייל', exact: true }).waitFor(); await check('confirm');
      await page.getByRole('button', { name: 'שינוי כתובת', exact: true }).click();
      await page.getByRole('button', { name: 'יש לכם כבר חשבון? כניסה', exact: true }).click();
      await page.getByRole('button', { name: 'שכחתי סיסמה, או שעוד לא קבעתי סיסמה', exact: true }).click(); await check('reset');
      await page.getByLabel('כתובת מייל', { exact: true }).fill('new.member@example.invalid');
      await page.getByRole('button', { name: 'שלחו לי קוד לאיפוס', exact: true }).click();
      await page.getByRole('heading', { name: 'הזינו את קוד האיפוס', exact: true }).waitFor(); await check('reset-code');
      await page.getByLabel('קוד איפוס מהמייל', { exact: true }).fill(CODE);
      await page.getByRole('button', { name: 'המשך ←', exact: true }).click();
      await page.getByRole('heading', { name: 'בחרו סיסמה חדשה', exact: true }).waitFor(); await check('reset-new');
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(OUT, `reset-new-${width}.png`) });
    }, { width });
  }
} finally {
  await browser.close();
  server.close();
}
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, real_network_auth: false, real_product_writes: 0 }, null, 2));
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed; stubbed Auth only, no live network`);
process.exit(failed.length ? 1 : 0);
