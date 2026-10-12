// Real built app + service worker, synthetic auth/profile responses only. No live credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ACCOUNT_PREVIEW_BASE || 'http://127.0.0.1:4178';
const out = process.env.ACCOUNT_PREVIEW_ARTIFACTS || '/workspace/artifacts/2029-integrated-preview/account-access-local';
const access = process.env.ACCOUNT_SHARE_FILE ? JSON.parse(await fs.readFile(process.env.ACCOUNT_SHARE_FILE, 'utf8')) : null;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const receipt = { base, auth: 'mocked, no real account login', cases: [] };
let page;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const calls = [], errors = [];
    const ids = { a: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    let active = 'a', releaseA, delayA = true;
    const pendingA = new Promise(resolve => { releaseA = resolve; });
    const user = key => ({ id: ids[key], aud: 'authenticated', role: 'authenticated', email: `${key}@example.invalid`, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: new Date().toISOString() });
    const session = key => {
      const exp = Math.floor(Date.now()/1000)+3600;
      const token = [ { alg: 'HS256', typ: 'JWT' }, { sub: ids[key], aud: 'authenticated', role: 'authenticated', exp } ].map(x => Buffer.from(JSON.stringify(x)).toString('base64url')).join('.') + '.synthetic';
      return { access_token: token, refresh_token: `synthetic-${key}`, token_type: 'bearer', expires_in: 3600, expires_at: exp, user: user(key) };
    };
    await context.route('https://linswmnnkjxvweumprav.supabase.co/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path.startsWith('/auth/')) {
        const body = req.postDataJSON() || {};
        calls.push({ path, method: req.method(), grant: url.searchParams.get('grant_type'), scope: url.searchParams.get('scope'), createUser: body.create_user });
        if (path === '/auth/v1/token') {
          if (url.searchParams.get('grant_type') === 'password') {
            if (body.password !== 'synthetic-correct-password') return reply({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 400);
            active = body.email.startsWith('a@') ? 'a' : 'b';
          }
          return reply(session(active));
        }
        if (path === '/auth/v1/user') return reply(user(active));
        if (path === '/auth/v1/logout') return reply({});
        if (path === '/auth/v1/otp') { assert.equal(body.create_user, false); return reply({}); }
        if (path === '/auth/v1/verify') return reply(session(active));
        throw Error(`Unexpected auth request: ${path}`);
      }
      if (path === '/rest/v1/users') {
        const key = url.searchParams.get('id')?.includes(ids.a) ? 'a' : 'b';
        if (key === 'a' && delayA) await pendingA;
        return reply({ id: ids[key], display_name: key === 'a' ? 'חשבון א — ישן' : 'חשבון ב', role: key === 'a' ? 'admin' : 'user', tier: key === 'a' ? 'member' : null });
      }
      // All other backend traffic is synthetic too, including rejected product mutations.
      if (req.method() === 'GET') return reply([]);
      return reply({ error: 'fixture_product_write_blocked' }, 403);
    });
    page = await context.newPage(); page.setDefaultTimeout(45000);
    page.on('pageerror', e => errors.push(e.message));
    if (access) { await page.goto(access.shareableUrl, { waitUntil: 'domcontentloaded' }); await page.waitForURL(u => u.origin === base && !u.searchParams.has('_vercel_share')); }
    else await page.goto(base + '/2029/posts', { waitUntil: 'domcontentloaded' });
    const account = page.locator('[data-workspace-section="account"]');
    const openAccount = async () => {
      if (!await account.isVisible()) await page.getByRole('button', { name: 'האזור האישי שלי', exact: true }).filter({ visible: true }).first().click();
      await account.waitFor(); await account.scrollIntoViewIfNeeded();
    };
    const login = async (key, password = 'synthetic-correct-password') => {
      await openAccount(); await account.getByLabel('כתובת מייל', { exact: true }).fill(`${key}@example.invalid`);
      await account.getByLabel('סיסמה', { exact: true }).fill(password);
      await account.getByRole('button', { name: 'כניסה לחשבון', exact: true }).click();
    };
    await openAccount();
    assert.equal(await account.getByLabel('סיסמה', { exact: true }).getAttribute('autocomplete'), 'current-password');
    await account.getByRole('button', { name: 'הצגת סיסמה', exact: true }).click();
    assert.equal(await account.getByLabel('סיסמה', { exact: true }).getAttribute('type'), 'text');
    await account.getByRole('button', { name: 'הסתרת סיסמה', exact: true }).click();
    await login('a', 'synthetic-wrong-password'); await account.getByRole('alert').waitFor();
    assert.equal(calls.filter(c => c.grant === 'password').length, 1, 'auth request must be intercepted by synthetic fixture');
    assert.match(await account.getByRole('alert').innerText(), /המייל או הסיסמה אינם נכונים/);
    await page.screenshot({ path: `${out}/password-error-${width}.png` });
    await login('a'); await account.waitFor({ state: 'hidden' }); await openAccount();
    await account.getByText('a@example.invalid', { exact: true }).first().waitFor();
    assert.equal(await account.locator('input[type=password]').count(), 0);
    await account.getByRole('button', { name: 'התנתקות', exact: true }).click();
    await account.waitFor({ state: 'hidden' }); await openAccount();
    await account.getByLabel('סיסמה', { exact: true }).waitFor();
    await login('b'); await account.waitFor({ state: 'hidden' }); await openAccount();
    await account.getByText('חשבון ב', { exact: true }).waitFor();
    delayA = false; releaseA();
    // Flush the delayed A response through the real provider, then verify B remains current.
    await page.waitForTimeout(300);
    assert.equal(await account.getByText('חשבון א — ישן', { exact: true }).count(), 0);
    await account.getByText('b@example.invalid', { exact: true }).waitFor();
    const saved = await page.evaluate(() => Object.entries(localStorage));
    assert.ok(!JSON.stringify(saved).includes('synthetic-correct-password'));
    assert.ok(!JSON.stringify(saved).includes('synthetic-wrong-password'));
    await page.screenshot({ path: `${out}/account-b-${width}.png` });
    await page.reload({ waitUntil: 'domcontentloaded' }); await openAccount();
    await account.getByText('b@example.invalid', { exact: true }).waitFor();
    assert.equal(await account.getByText('חשבון א — ישן', { exact: true }).count(), 0);
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
      const value = JSON.parse(localStorage.getItem(key)); value.expires_at = Math.floor(Date.now()/1000)-10;
      localStorage.setItem(key, JSON.stringify(value));
    });
    await page.reload({ waitUntil: 'domcontentloaded' }); await openAccount();
    await account.getByText('b@example.invalid', { exact: true }).waitFor();
    assert.ok(calls.some(c => c.grant === 'refresh_token'));
    await account.getByRole('button', { name: 'התנתקות', exact: true }).click();
    await account.waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'domcontentloaded' }); await openAccount();
    await account.getByLabel('סיסמה', { exact: true }).waitFor();
    assert.ok(calls.filter(c => c.path.endsWith('/logout')).every(c => c.scope === 'local'));
    await account.getByRole('button', { name: 'אין לי סיסמה · כניסה בקוד למייל', exact: true }).click();
    await account.getByRole('textbox', { name: 'מייל לכניסה או הרשמה', exact: true }).fill('b@example.invalid');
    await account.getByRole('button', { name: 'שלחו לי קוד כניסה', exact: true }).click();
    await account.getByRole('textbox', { name: 'קוד כניסה מהמייל', exact: true }).fill('123456');
    await account.getByRole('button', { name: 'כניסה לחשבון', exact: true }).click();
    await account.waitFor({ state: 'hidden' }); await openAccount();
    await account.getByText('b@example.invalid', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    receipt.cases.push({ width, wrongPassword: true, accountSwitch: true, staleProfileIgnored: true, reload: true, refresh: true, localLogout: true, existingAccountOtp: true, passwordNotPersisted: true, noOverflow: true, errors });
    await context.close();
  }
} catch (e) {
  receipt.failure = e.stack;
  if (page) { await page.screenshot({ path: out + '/failure.png' }).catch(() => {}); await fs.writeFile(out + '/failure.txt', await page.locator('body').innerText().catch(() => '')); }
  throw e;
} finally { await fs.writeFile(out + '/receipt.json', JSON.stringify(receipt, null, 2)); await browser.close(); }
console.log(JSON.stringify(receipt));
