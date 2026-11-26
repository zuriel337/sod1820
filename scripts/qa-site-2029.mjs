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

import { runP1 } from './qa-scenarios-p1.mjs';
import { runMessagesUi } from './qa-ui-messages.mjs';
import { runNotificationsUi } from './qa-ui-notifications.mjs';
import { runElsVerify, runCipherUi } from './qa-ui-cipher.mjs';

async function syntheticAccount({ origin, service }, role = 'member') {
  const email = `qa-${role}-${randomBytes(6).toString('hex')}@qa.invalid`, password = randomBytes(18).toString('base64url');
  const headers = { apikey: service, Authorization: `Bearer ${service}`, 'content-type': 'application/json' };
  const created = await fetch(`${origin}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify({ email, password, email_confirm: true }) });
  if (!created.ok) throw new Error(`account_create_${created.status}`);
  const { id } = await created.json();
  const profile = await fetch(`${origin}/rest/v1/users`, { method: 'POST', headers: { ...headers, prefer: 'return=minimal' }, body: JSON.stringify({ id, email, username: `qa-${id.slice(0, 8)}`, display_name: 'QA', role: role === 'admin' ? 'admin' : 'user' }) });
  if (!profile.ok) throw new Error(`profile_create_${profile.status}`);
  return { id, email, password };
}


// ── The three publication tiers, written and read through the real local stack (PostgREST + GoTrue JWTs + the repository's own SQL) ──
async function tiers({ origin, anon, service }, owner, browserOpen) {
  const headers = token => ({ apikey: anon, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' });
  const login = async account => {
    const response = await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email: account.email, password: account.password }) });
    if (!response.ok) throw new Error(`token_${response.status}`);
    return (await response.json()).access_token;
  };
  const rpc = async (name, body, token) => { const response = await fetch(`${origin}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) }); return { status: response.status, body: await response.json().catch(() => null) }; };
  const rows = async (query, token) => (await (await fetch(`${origin}/rest/v1/${query}`, { headers: headers(token) })).json());
  const system = async query => (await (await fetch(`${origin}/rest/v1/${query}`, { headers: { apikey: service, Authorization: `Bearer ${service}` } })).json());
  const check = (ok, name, detail = '') => { note(ok, `tiers: ${name}`, detail); if (!ok) failed = true; };

  const admin = await syntheticAccount({ origin, service }, 'admin'), stranger = await syntheticAccount({ origin, service });
  const [member, adminToken, strangerToken] = [await login(owner), await login(admin), await login(stranger)];
  const save = (title, token, isPublic) => rpc('save_els_matrix', { p_term: 'שלום', p_scope: 'torah', p_skip: 7, p_direction: 'fwd', p_positions: { findings: [{ t: 'שלום' }] }, p_title: title, p_note: 'QA synthetic', p_public: isPublic, p_start_index: 100 + title.length }, token);
  const library = async () => (await rows('els_records?select=id&status=eq.published&visibility=eq.public')).length;
  const baseline = await library();

  // 1. private: the owner reads it, nobody else does
  const saved = await save('QA פרטי', member, false);
  const id = saved.body;
  const own = (await rows(`els_records?id=eq.${id}&select=id,slug,status,visibility,self_published`, member))[0];
  check(saved.status === 200 && own?.visibility === 'private' && own?.status === 'draft', 'a private save is draft and private for its owner', `${own?.status}/${own?.visibility}`);
  check((await rows(`els_records?id=eq.${id}&select=id`)).length === 0 && (await rows(`els_records?id=eq.${id}&select=id`, strangerToken)).length === 0, 'a guest and another member cannot read the private cipher');
  // 2. my page: open to everyone, still not in the library
  const published = await rpc('self_publish_matrix', { p_id: id, p_on: true }, member);
  const open = (await rows(`els_records?id=eq.${id}&select=id,slug,status,visibility`))[0];
  check(published.body?.ok === true && open?.visibility === 'public' && open?.status === 'draft', 'publishing on my page opens it to a guest without any approval', `${open?.status}/${open?.visibility}`);
  check(await library() === baseline, 'the library did not grow (the central library is a separate decision)');
  if (open?.slug) check(await browserOpen(open.slug, 'QA פרטי', true), 'the public page shows the cipher to a guest in a real browser');
  // 3. library request: a request, never an approval; one open queue item
  const requested = await rpc('request_els_library_review', { p_id: id, p_on: true }, member);
  const queue = async () => (await system(`system_suggestions?select=id&detector=eq.els_library_request&status=eq.pending&observed->>els_record_id=eq.${id}`)).length;
  check(requested.body?.status === 'pending' && await queue() === 1 && await library() === baseline, 'a library request is pending, queued once, and not an approval');
  await rpc('request_els_library_review', { p_id: id, p_on: false }, member);
  check((await rows(`els_records?id=eq.${id}&select=status`, member))[0]?.status === 'draft' && await queue() === 0, 'cancelling the request returns to my page and closes the queue item');
  await rpc('request_els_library_review', { p_id: id, p_on: true }, member);
  // 4. only an administrator approves
  const refused = await rpc('moderate_els_matrix', { p_id: id, p_status: 'published' }, member);
  check(refused.status >= 400, 'a member cannot approve their own cipher', `status=${refused.status}`);
  await rpc('moderate_els_matrix', { p_id: id, p_status: 'published' }, adminToken);
  check(await library() === baseline + 1 && await queue() === 0, 'the administrator approves: it enters the library and the queue item is closed');
  await rpc('self_publish_matrix', { p_id: id, p_on: false }, member);
  check((await rows(`els_records?id=eq.${id}&select=id`)).length === 1, 'an approved cipher keeps its library access after the owner clears the flag');
  // 5. withdrawal: a second cipher published, then returned to private
  const second = (await save('QA משיכה', member, true)).body;
  const secondRow = (await rows(`els_records?id=eq.${second}&select=slug,status,visibility,self_published`, member))[0];
  check(secondRow?.visibility === 'public' && secondRow?.status === 'draft', 'a member public save lands on my page, not in the library', `${secondRow?.status}/${secondRow?.visibility}`);
  await rpc('self_publish_matrix', { p_id: second, p_on: false }, member);
  check((await rows(`els_records?id=eq.${second}&select=id`)).length === 0, 'withdrawing from my page makes it unreadable to a guest');
  if (secondRow?.slug) check(await browserOpen(secondRow.slug, 'QA משיכה', false), 'the withdrawn address no longer shows the cipher in a real browser');
  // 6. grants: no anonymous reach into the owner functions
  const anonRequest = await rpc('request_els_library_review', { p_id: id, p_on: true });
  const anonStrong = await rpc('els_my_strong_ciphers', {});
  check(anonRequest.status >= 400 && anonStrong.status >= 400, 'an anonymous caller cannot reach the owner functions', `${anonRequest.status}/${anonStrong.status}`);
}

const settings = config();
mkdirSync(out, { recursive: true });
const account = await syntheticAccount(settings);
note(true, 'synthetic account created in the local backend', 'random password, member role, never printed');
const fixture = await startFixture({ supabaseProxy: { origin: settings.origin, anon: settings.anon }, deploymentCsp: true });
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: fixture.chromiumArgs, env: fixture.browserEnv });
let failed = false;

// One signed-in browser context for a synthetic account, through the real login form (the same steps the login scenario proves).
const newSignedIn = async (options, who) => {
  const context = await browser.newContext({ ...options, locale: 'he-IL' });
  const page = await context.newPage();
  await page.goto('https://sod1820.co.il/login?returnTo=%2Flogin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: 'כניסה עם סיסמה', exact: true }).click({ timeout: 25000 });
  await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(who.email, { timeout: 15000 });
  await page.getByLabel('סיסמה', { exact: true }).fill(who.password, { timeout: 15000 });
  await page.getByRole('button', { name: /כניסה לחשבון/ }).click({ timeout: 15000 });
  await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key) || 'null')?.user?.id === id, { key: `sb-${PRODUCTION_REF}-auth-token`, id: who.id }, { timeout: 25000 });
  return { context, page };
};
const browserOpen = async (slug, title, shouldShow) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  try {
    const page = await context.newPage();
    await page.goto(`https://sod1820.co.il/codes/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const shown = await page.getByText(title, { exact: false }).first().waitFor({ timeout: shouldShow ? 25000 : 8000 }).then(() => true, () => false);
    return shown === shouldShow;
  } finally { await context.close(); }
};
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
  try { await runP1({ ...settings, syntheticAccount: () => syntheticAccount(settings), note }); } catch (error) { failed = true; note(false, 'p1: flow', String(error.message).split('\n')[0].slice(0, 160)); }
  try { await runMessagesUi({ settings, browser, devices, newSignedIn, syntheticAccount: () => syntheticAccount(settings), note }); } catch (error) { failed = true; note(false, 'ui-messages: flow', String(error.message).split('\n')[0].slice(0, 160)); }
  try { await runNotificationsUi({ settings, browser, devices, newSignedIn, syntheticAccount: () => syntheticAccount(settings), note }); } catch (error) { failed = true; note(false, 'ui-notifications: flow', String(error.message).split('\n')[0].slice(0, 160)); }
  try { await runElsVerify({ settings, syntheticAccount: () => syntheticAccount(settings), note }); } catch (error) { failed = true; note(false, 'els-verify: flow', String(error.message).split('\n')[0].slice(0, 160)); }
  try { await runCipherUi({ settings, browser, devices, newSignedIn, syntheticAccount: () => syntheticAccount(settings), note }); } catch (error) { failed = true; note(false, 'ui-cipher: flow', String(error.message).split('\n')[0].slice(0, 160)); }
  try { await tiers(settings, account, browserOpen); } catch (error) { failed = true; note(false, 'tiers: flow', String(error.message).split('\n')[0].slice(0, 160)); }
} finally { await browser.close(); }
const reachedLocalBackend = fixture.state.proxied.length > 0 && fixture.state.proxied.every(entry => entry.path.startsWith('/auth/v1/') || entry.path.startsWith('/rest/v1/') || entry.path.startsWith('/functions/v1/') || entry.path.startsWith('/storage/v1/'));
note(reachedLocalBackend, 'isolation: every Supabase request of the browser was answered by the local stack', `${fixture.state.proxied.length} requests, production host mapped to 127.0.0.1`);
await fixture.close();
if (!reachedLocalBackend) failed = true;
writeFileSync(`${out}/report.json`, JSON.stringify({ finishedAt: new Date().toISOString(), results }, null, 2));
process.exit(failed || results.some(item => !item.ok) ? 1 : 0);
