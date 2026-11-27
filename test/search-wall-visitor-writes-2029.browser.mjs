// Regression (ZURIEL 27.11.2026): a VISITOR's search reaches the private search wall writer through the real service worker of the built artifact.
// Before the fix the worker sent log_search_2029 to the admin-only path, so only administrators' own searches were ever recorded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'the search wall regression requires the pinned browser; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const SUPABASE = 'https://linswmnnkjxvweumprav.supabase.co';

async function visitor() {
  const writes = [];
  const fixture = await startFixture({ supabase: async ({ url, body, headers }) => {
    if (url.pathname === '/rest/v1/rpc/log_search_2029') { writes.push({ body: JSON.parse(body), authorization: headers?.get?.('authorization') ?? null }); return { body: null }; }
    if (url.pathname.startsWith('/rest/v1/')) return { body: [] };
    return null;
  } });
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: 'he-IL', serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(fixture.origin + '/community/chat', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });
  return { page, writes, close: async () => { await browser.close(); await fixture.close(); } };
}
const call = (page, payload, token) => page.evaluate(async ({ url, payload, token }) => {
  const r = await fetch(url + '/rest/v1/rpc/log_search_2029', { method: 'POST', headers: { 'content-type': 'application/json', apikey: token, authorization: 'Bearer ' + token }, body: JSON.stringify(payload) });
  return r.status;
}, { url: SUPABASE, payload, token });

test('the real worker lets a visitor write a search to the private wall, and refuses any other shape', { timeout: 150000 }, async () => {
  const v = await visitor();
  try {
    const key = await v.page.evaluate(() => { try { return Object.values(window.__SOD_PUBLISHABLE_KEY__ || {})[0] || ''; } catch { return ''; } });
    // the worker is configured with the public key at build time; the page's own client carries it too: read it from a real request header
    const publishable = await v.page.evaluate(async () => { const r = await fetch('/sw.js'); const t = await r.text(); const m = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.exec(t); return m ? m[0] : ''; });
    const token = publishable || key;
    assert.ok(token, 'the built worker carries the public key');
    assert.equal(await call(v.page, { p_term: 'גאולה', p_value: 45, p_source: 'gematria' }, token), 200);
    assert.equal(v.writes.length, 1);
    assert.deepEqual(v.writes[0].body, { p_term: 'גאולה', p_value: 45, p_source: 'gematria' });
    for (const bad of [{ p_term: 'גאולה', p_value: 45, p_source: 'home' }, { p_term: 'גאולה', p_value: 45, p_source: 'els', extra: 1 }, { p_term: '', p_value: null, p_source: 'site' }]) {
      assert.equal(await call(v.page, bad, token), 403, JSON.stringify(bad));
    }
    assert.equal(v.writes.length, 1, 'nothing else reaches the database');
  } finally { await v.close(); }
});
