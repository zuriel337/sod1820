const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');
const { installPublicReadOnlyEgress, disposePublicReadOnlyEgress } = require('./fixtures/public-readonly-egress.cjs');
const { installSyntheticAdmin, SYNTHETIC_ADMIN_ID } = require('./fixtures/synthetic-admin-session.cjs');

// The unread mark and the DM-notification read, THROUGH THE REAL PUBLIC-READING TRANSPORT (public-reading-deploy/personal-request.js): every request the page
// makes to the database goes through readingPersonalResponse, which answers 403 to anything it does not admit. The database behind it is a local model of the server:
// a message arrives, the mark counts it once, opening ONLY that conversation reads ONLY its notification and its messages. Nothing here reaches the live database.
const BASE = 'http://127.0.0.1:4173';
const API = 'https://linswmnnkjxvweumprav.supabase.co';
const A = '36f5cb84-71c3-4977-a2c7-d6413e973443', B = 'b6ce542a-2b07-4749-8aba-532c886f6de7';
const link = (id) => `/me?tab=messages&dm=${id}`;

test.beforeEach(async ({ context }) => { await installPublicReadOnlyEgress(context, { baseUrl: BASE }); await installStorageEgressGuard(context); });
test.afterEach(async ({ context }) => disposePublicReadOnlyEgress(context));
test.setTimeout(120_000);

for (const width of [390, 1440]) {
  test(`message arrives, the mark counts it once, opening one conversation clears only its own signal (${width}px, real transport)`, async ({ page }) => {
    const { readingPersonalResponse } = await import('file://' + path.resolve(__dirname, '../public-reading-deploy/personal-request.js'));
    await installSyntheticAdmin(page);
    await page.addInitScript(() => { try { sessionStorage.setItem('sod_guest_signup_popup_dismissed', '1'); } catch {} });

    // The server model.
    const messages = { [A]: 2, [B]: 1 };   // unread messages per sender
    const notes = [
      { id: 'n-dm-a', kind: 'dm', link: link(A), read: false }, { id: 'n-dm-b', kind: 'dm', link: link(B), read: false },
      { id: 'n-reply', kind: 'reply', link: '/x', read: false }, { id: 'n-feed', kind: 'post_new', link: '/post/x', read: false },
    ];
    const log = { forwarded: [], denied: [], patches: [] };
    const json = (value, init = {}) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const database = async (input, init) => {
      const req = input instanceof Request ? input : new Request(input, init);
      const url = new URL(req.url), p = url.pathname, g = (k) => url.searchParams.get(k);
      log.forwarded.push(`${req.method} ${p}?${url.searchParams.toString().slice(0, 140)}`);
      if (p === '/rest/v1/rpc/dm_inbox') return json(Object.keys(messages).map((id) => ({ counterpart: id, name: id === A ? 'שולח א' : 'שולח ב', avatar: null, last_body: 'שלום', last_at: new Date().toISOString(), unread: messages[id] })));
      if (p === '/rest/v1/rpc/dm_thread') { const body = JSON.parse(await req.text()); messages[body.p_with] = 0; return json([]); }   // dm_thread reads that sender's messages only
      if (p === '/rest/v1/user_notifications' && req.method === 'PATCH') {
        const body = JSON.parse(await req.text());
        const rows = notes.filter((n) => !n.read && (!g('kind') || g('kind') === 'eq.' + n.kind) && (!g('link') || g('link') === 'eq.' + n.link));
        rows.forEach((n) => { n.read = true; }); log.patches.push(rows.map((n) => n.id));
        return json(rows.map((n) => ({ id: n.id, read_at: body.read_at })));
      }
      if (p === '/rest/v1/user_notifications') {
        const kind = g('kind') || '';
        const set = kind.startsWith('in.(') ? kind.slice(4, -1).split(',') : kind.startsWith('eq.') ? [kind.slice(3)] : notes.map((n) => n.kind);
        const count = notes.filter((n) => !n.read && set.includes(n.kind)).length;
        return json([], { headers: { 'content-range': `*/${count}`, 'access-control-expose-headers': 'content-range' } });
      }
      return json([]);
    };
    await page.route(`${API}/rest/v1/**`, async (route) => {
      const request = route.request(), url = request.url();
      if (/\/rest\/v1\/(posts|rpc\/(research_|world|fn_|lang))/.test(url)) return route.fallback();
      if (!/\/rest\/v1\/(user_notifications|rpc\/(dm_|replies_to_me|watch_toggle))/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      const req = new Request(url, { method: request.method(), headers: request.headers(), body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postData() });
      const response = await readingPersonalResponse(req, { apiKey: 'public', clientOrigin: BASE, verify: async () => SYNTHETIC_ADMIN_ID, fetchImpl: database });
      if (response === null) return route.fallback();
      if (response.status === 403) log.denied.push(`${request.method()} ${new URL(url).pathname}?${new URL(url).search.slice(0, 160)}`);
      return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    await page.route('**/2029/me/messages*', async (route) => { const r = await page.request.get(`${BASE}/2029.html`); await route.fulfill({ status: r.status(), headers: r.headers(), body: await r.body() }); });

    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/2029/me/messages`, { waitUntil: 'domcontentloaded' });
    const badge = page.locator('.sod29-attention-badge:visible').first();
    const mark = async () => (await badge.locator('.sod29-visually-hidden').textContent({ timeout: 20_000 })).match(/^(\d+) חדשים/)?.[1];

    // 1. Received: 2 + 1 messages and 1 reply. The two DM notifications and the public feed item are NOT counted again.
    await expect(badge).toBeVisible({ timeout: 30_000 });
    expect(await mark()).toBe('4');
    expect(log.denied).toEqual([]);   // every call of the mark was admitted by the real transport

    // 2. A new message arrives while the page is open (its saved DM notification arrives with it): the mark follows when the tab is seen again.
    messages[B] += 1; notes.push({ id: 'n-dm-b2', kind: 'dm', link: link(B), read: false });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(mark, { timeout: 15_000 }).toBe('5');

    // 3. Opening conversation A (the person opens it): its messages are read, its OWN notification is read, nothing else.
    await page.getByText('שולח א', { exact: true }).first().click({ timeout: 30_000 });
    await expect.poll(() => log.patches.length, { timeout: 20_000 }).toBe(1);
    expect(log.patches[0]).toEqual(['n-dm-a']);
    await expect.poll(mark, { timeout: 15_000 }).toBe('3');   // 1 reply + B's 2 messages
    expect(notes.filter((n) => n.read).map((n) => n.id)).toEqual(['n-dm-a']);   // B's notifications, the reply and the feed item are untouched
    expect(messages).toEqual({ [A]: 0, [B]: 2 });
    expect(log.denied).toEqual([]);

    // The picture still goes straight to what waits (messages), and the mark stays inside the screen.
    const button = page.locator('.sod29-header-workspace:visible, .sod29-sidebar-workspace:visible').filter({ has: page.locator('.sod29-attention-badge') }).first();
    await expect(button).toHaveAttribute('data-attention-href', '/2029/me/messages');
    const box = await badge.boundingBox(), vw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(vw);
  });
}
