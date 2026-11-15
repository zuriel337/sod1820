// Accepted Community behavior, exercised through the built site, its real
// service worker and SDK. Only the remote data/Auth servers are fixtures.
// All hosts are mapped to the local fixture (or denied); no live traffic.
// Run after build-public-reading-production.mjs, with CHROMIUM_PATH locally.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

// Accepted account links are fixture inputs, not imported from the implementation:
// changing the production mapping must not silently change the expected outcome.
// Public reviewed links: Emily / Esther, ZURIEL 8.11; display decision 15.11.
const REVIEWED_EMILY_LINK = {
  accountId: '5516d596-46d3-486d-a9c7-a35b36bc3755',
  contributorId: 'e7581ab5-8c15-4832-b602-f361e41ff373',
};
const REVIEWED_ESTHER_LINK = {
  accountId: '9196e2b4-6473-4d44-9bad-913a4e4c4865',
  contributorId: '99bcfb38-85be-4f38-89f0-7886f2f179e6',
};

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) {
  try { pw = require(name); break; } catch {}
}
assert.ok(pw, 'Community acceptance requires the pinned browser; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const STAFF = '33333333-3333-4333-8333-333333333333';
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const row = (n, name, identity, origin = 'community_2029') => ({
  id: id(n), author_name: name, ...identity, origin, parent_id: null,
  title: null, body: `הודעת בדיקה ${n} — 7 וגם 73; טלפון 050 123 4567 ותאריך 12–11–2026.`,
  created_at: '2026-11-12T12:00:00Z', reactions: {}, is_deleted: false, total_count: 5,
});
const rows = [
  row(1, 'אמילי', {author_contributor_id: REVIEWED_EMILY_LINK.contributorId}, 'openweb'),
  row(2, 'אמילי', {author_user_id: REVIEWED_EMILY_LINK.accountId}),
  row(3, 'Esther Gem', {author_contributor_id: REVIEWED_ESTHER_LINK.contributorId}, 'openweb'),
  row(4, 'Esther Gem', {author_user_id: REVIEWED_ESTHER_LINK.accountId}),
  row(5, 'בקרת צוות', {author_user_id: STAFF}),
];

for (const width of [390, 1280]) for (const viewer of ['guest', 'member', 'admin']) {
  test(`${width}px ${viewer}: accepted names, history links and Emily's deliberate no-staff label`, {timeout: 90000}, async () => {
    let staffMode = 'success', staffReads = 0, feedReads = 0;
    let viewerId;
    const fixture = await startFixture({supabase: async ({url, headers, body}) => {
      const path = url.pathname;
      if (path === '/rest/v1/users') {
        const accounts = [
          {id: REVIEWED_EMILY_LINK.accountId, display_name: 'אמילי'},
          {id: REVIEWED_ESTHER_LINK.accountId, display_name: 'Esther Gem'},
          {id: STAFF, display_name: 'בקרת צוות'},
          ...(viewerId ? [{id: viewerId, display_name: 'בודק', role: viewer}] : []),
        ];
        const filter = url.searchParams.get('id');
        const found = filter?.startsWith('eq.') ? accounts.filter(x => x.id === filter.slice(3)) : accounts;
        return {body: headers.accept?.includes('application/vnd.pgrst.object+json') ? found[0] || null : found};
      }
      if (path === '/rest/v1/rpc/community_staff_user_ids_v1') {
        staffReads++;
        if (staffMode === 'error') return {status: 503, body: {message: 'synthetic staff read unavailable'}};
        return {body: staffMode === 'empty' ? [] : [REVIEWED_EMILY_LINK.accountId, STAFF].map(user_id => ({user_id}))};
      }
      if (path === '/rest/v1/rpc/community_feed_page') { feedReads++; return {body: rows}; }
      if (path === '/rest/v1/rpc/community_thread_updates') {
        return {body: JSON.parse(body).p_cursors.map(cursor => ({root_id: cursor.root_id, new_count: 0, first_reply_id: null, first_path: null}))};
      }
      if (path === '/rest/v1/research_contributions') return {body: []};
      return null;
    }});
    const browser = await pw.chromium.launch({executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv});
    try {
      const context = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width, height: 900}, locale: 'he-IL', serviceWorkers: 'allow'});
      if (viewer !== 'guest') {
        const user = fixture.auth.newUser(`${viewer}@example.invalid`, true, 'fixture-password');
        viewerId = user.id;
        const response = await fixture.auth.handle(new Request('https://linswmnnkjxvweumprav.supabase.co/auth/v1/token?grant_type=password', {
          method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({email: user.email, password: 'fixture-password'}),
        }));
        assert.equal(response.status, 200);
        const session = await response.json();
        await context.addInitScript(session => localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify(session)), session);
      }
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const staffResponses = [];
      page.on('response', response => { if (response.url().includes('/rpc/community_staff_user_ids_v1')) staffResponses.push(response.status()); });
      for (const mode of viewer === 'admin' ? ['success', 'empty', 'error'] : ['success']) {
        staffMode = mode;
        const beforeReads = staffReads;
        const responseCount = staffResponses.length;
        await page.goto(fixture.origin + '/community/chat', {waitUntil: 'domcontentloaded'});
        const emily = page.locator('.sod29-community-author-link').filter({hasText: 'אמילי'});
        const esther = page.locator('.sod29-community-author-link').filter({hasText: 'Esther26'});
        await emily.first().waitFor({timeout: 20000});
        assert.equal(await emily.count(), 2, 'historical and current Emily messages both render');
        assert.equal(await esther.count(), 2, 'historical and current Esther messages retain the approved public name');
        const deadline = Date.now() + 10000;
        while (staffResponses.length === responseCount && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
        assert.ok(staffResponses.length > responseCount, 'the real page must actually attempt its staff read');
        if (viewer === 'admin') {
          assert.ok(staffReads > beforeReads, 'a real worker-admitted staff request must reach the fixture');
          assert.equal(staffResponses.at(-1), mode === 'error' ? 503 : 200);
          const control = page.locator('.sod29-community-author-link').filter({hasText: 'בקרת צוות'});
          if (mode === 'success') await control.locator('.sod29-community-staff-chip').waitFor();
          assert.equal(await control.locator('.sod29-community-staff-chip').count(), mode === 'success' ? 1 : 0,
            'positive control: other staff still display a badge when their data is available');
        }
        assert.equal(await emily.locator('.sod29-community-staff-chip').count(), 0,
          'ZURIEL 15.11: Emily stays without the staff label even when a successful RPC lists her as staff');
        for (const [links, accountId] of [[emily, REVIEWED_EMILY_LINK.accountId], [esther, REVIEWED_ESTHER_LINK.accountId]]) {
          for (const href of await links.evaluateAll(links => links.map(a => a.href))) {
            assert.equal(new URL(href).searchParams.get('memberCard'), `user:${accountId}`, 'old and new messages open the same reviewed account');
          }
        }
        const numberLinks = page.locator('.sod29-community-thread a[href="/number/7"]');
        assert.ok(await numberLinks.count() > 0, 'single-digit gematria links survive the author change');
        assert.equal(await page.locator('a[href="/number/050"],a[href="/number/123"],a[href="/number/4567"]').count(), 0,
          'phone pieces must not become gematria links');
        assert.equal(await page.locator('a[href="/number/12"],a[href="/number/11"],a[href="/number/2026"]').count(), 0,
          'date pieces must not become gematria links');
      }
      assert.ok(feedReads > 0, 'the actual public reader supplied the visible messages');
      if (viewer !== 'guest') assert.ok(fixture.auth.log.some(entry => entry.path === '/user' && entry.status === 200),
        'member/admin cases must verify a real fixture session, not silently run as guests');
      assert.deepEqual(errors, [], 'no uncaught application errors');
      await context.close();
    } finally { await browser.close(); await fixture.close(); }
  });
}
