#!/usr/bin/env node
// "בדוק את האתר" with a login, in an ISOLATED backend (ZURIEL 26.11.2026). Runs only inside the GitHub Actions job that starts a throwaway
// local Supabase (docs/site-check-2029.md). The built production artifact and its real service worker run unmodified at the production URLs;
// Chromium maps the Supabase host name to the local stack, and every other host to nothing, so production cannot be reached.
// The account is synthetic and created here with a random password that exists only in this process. No secret is typed in chat, stored or printed.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startFixture } from '../test/helpers/authBrowserFixture.mjs';

const PRODUCTION_REF = 'linswmnnkjxvweumprav';
const out = process.env.QA_OUT || 'qa-out';
const results = [];
const note = (ok, name, detail = '') => { results.push({ ok, name, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };

function config() {
  const need = name => process.env[name] || (() => { throw new Error(`missing ${name}`); })();
  const api = new URL(need('QA_SUPABASE_URL'));
  if (!['127.0.0.1', 'localhost'].includes(api.hostname)) throw new Error('qa_backend_must_be_local');
  const anon = need('QA_ANON_KEY'), service = need('QA_SERVICE_ROLE_KEY');
  for (const key of [anon, service]) {
    const claims = key.startsWith('eyJ') ? JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()) : {};
    if (claims.ref === PRODUCTION_REF || (claims.iss && claims.iss !== 'supabase-demo')) throw new Error('qa_key_is_not_a_local_key');
  }
  return { origin: api.origin, anon, service };
}

async function syntheticAccount({ origin, service }) {
  const email = `qa-${randomBytes(6).toString('hex')}@qa.invalid`, password = randomBytes(18).toString('base64url');
  const headers = { apikey: service, Authorization: `Bearer ${service}`, 'content-type': 'application/json' };
  const created = await fetch(`${origin}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify({ email, password, email_confirm: true }) });
  if (!created.ok) throw new Error(`account_create_${created.status}`);
  const { id } = await created.json();
  const profile = await fetch(`${origin}/rest/v1/users`, { method: 'POST', headers: { ...headers, prefer: 'return=minimal' }, body: JSON.stringify({ id, username: `qa-${id.slice(0, 8)}`, display_name: 'QA', role: 'member' }) });
  if (!profile.ok) throw new Error(`profile_create_${profile.status}`);
  return { id, email, password };
}

const settings = config();
mkdirSync(out, { recursive: true });
const account = await syntheticAccount(settings);
note(true, 'synthetic account created in the local backend', 'random password, member role, never printed');
const fixture = await startFixture({ supabaseProxy: { origin: settings.origin, anon: settings.anon }, deploymentCsp: true });
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: fixture.chromiumArgs, env: fixture.browserEnv });
let failed = false;
try {
  for (const [profile, options] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['Pixel 7', devices['Pixel 7']]]) {
    const context = await browser.newContext({ ...options, locale: 'he-IL' });
    try {
      const page = await context.newPage();
      const identityMatches = () => page.waitForFunction(
        ({ key, id }) => JSON.parse(localStorage.getItem(key) || 'null')?.user?.id === id,
        { key: `sb-${PRODUCTION_REF}-auth-token`, id: account.id }, { timeout: 25000 });
      await page.goto('https://sod1820.co.il/login?returnTo=%2Flogin', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.getByRole('button', { name: 'כניסה עם סיסמה', exact: true }).click({ timeout: 25000 });
      await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(account.email, { timeout: 15000 });
      await page.getByLabel('סיסמה', { exact: true }).fill(account.password, { timeout: 15000 });
      await page.getByRole('button', { name: /כניסה לחשבון/ }).click({ timeout: 15000 });
      await identityMatches();
      note(true, `${profile}: login with the synthetic account reaches the same user id`);
      await page.goto('https://sod1820.co.il/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await identityMatches();
      await page.locator('[data-auth-state="signed-in"]').waitFor({ timeout: 25000 });
      note(true, `${profile}: a reload keeps the account signed in`);
    } catch (error) {
      failed = true;
      note(false, `${profile}: login flow`, String(error.message).split('\n')[0].slice(0, 160));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const reachedLocalBackend = fixture.state.proxied.length > 0 && fixture.state.proxied.every(entry => entry.path.startsWith('/auth/v1/') || entry.path.startsWith('/rest/v1/') || entry.path.startsWith('/functions/v1/') || entry.path.startsWith('/storage/v1/'));
note(reachedLocalBackend, 'isolation: every Supabase request of the browser was answered by the local stack', `${fixture.state.proxied.length} requests, production host mapped to 127.0.0.1`);
await fixture.close();
if (!reachedLocalBackend) failed = true;
writeFileSync(`${out}/report.json`, JSON.stringify({ finishedAt: new Date().toISOString(), results }, null, 2));
process.exit(failed || results.some(item => !item.ok) ? 1 : 0);
