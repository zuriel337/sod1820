// Regression (ZURIEL 27.11.2026): in the community the actions menu must stay inside the screen (RTL, 320 / 390 / 1440 and Pixel 7), and "השב" opens the SAME
// composer directly under the message it answers (no page change, no jump to the top); after sending, the reply appears in place.
// The live community component runs in the built site against the existing fixture server; only the remote data and auth are fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'the community regression requires the pinned browser; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const id = (n) => `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;
const root = (n) => ({ id: id(n), author_name: `כותב ${n}`, author_user_id: id(900 + n), origin: 'community_2029', parent_id: null, title: null,
  body: `הודעת שורש ${n}. ` + 'טקסט ארוך לבדיקה, כדי שהעמוד יגלול ויהיה מה למדוד. '.repeat(3), created_at: '2026-11-12T12:00:00Z', reactions: {}, is_deleted: false, total_count: 0 });
const ROOTS = Array.from({ length: 8 }, (_, i) => root(i + 1));
const PROFILES = [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['width-390', { viewport: { width: 390, height: 844 } }], ['width-320', { viewport: { width: 320, height: 640 } }], ['Pixel 7', 'Pixel 7']];

async function open(profile) {
  const nested = (n, parent, author, depth) => ({ id: id(n), author_name: `משיב ${n}`, author_user_id: author, origin: 'community_2029', parent_id: parent, title: null, body: `תגובה ברמה ${depth} (${n}). ` + 'ועוד כמה מילים כדי שהשורה תתארך ותשבור למספר שורות בנייד. '.repeat(2), created_at: '2026-11-12T13:00:00Z', reactions: {}, is_deleted: false });
  const replies = [nested(201, id(1), id(950), 1), nested(202, id(201), id(951), 2), nested(203, id(202), id(952), 3), nested(204, id(2), id(953), 1), nested(205, id(1), id(954), 1)];
  for (const r of ROOTS) r.total_count = replies.filter((x) => x.parent_id === r.id).length;
  const fixture = await startFixture({ supabase: async ({ url, body }) => {
    const path = url.pathname;
    if (path === '/rest/v1/users') return { body: [] };
    if (path === '/rest/v1/rpc/community_staff_user_ids_v1') return { body: [] };
    if (path === '/rest/v1/rpc/community_feed_page' || path === '/rest/v1/rpc/community_feed_page_v2') return { body: ROOTS.map((r) => (r.id === id(1) ? { ...r, author_user_id: viewer.id } : r)) };
    if (path === '/rest/v1/rpc/community_thread_updates') return { body: JSON.parse(body).p_cursors.map((c) => ({ root_id: c.root_id, new_count: 0, first_reply_id: null, first_path: null })) };
    if (path === '/rest/v1/rpc/community_reply_counts') return { body: JSON.parse(body).p_ids.map((idv) => ({ id: idv, total: replies.filter((r) => r.parent_id === idv).length })) };
    if (path === '/rest/v1/rpc/community_replies_page') { const p = JSON.parse(body); const mine = replies.filter((r) => r.parent_id === p.p_parent); return { body: mine.map((r) => ({ ...(r.id === id(202) ? { ...r, author_user_id: viewer.id } : r), total_count: mine.length })) }; }
    if (path === '/rest/v1/rpc/add_contribution') {
      const p = JSON.parse(body); const n = 300 + replies.length;
      replies.push({ id: id(n), author_name: 'בודק', author_user_id: viewer.id, origin: 'community_2029', parent_id: p.p_parent_id, title: null, body: p.p_body, created_at: new Date().toISOString(), reactions: {}, is_deleted: false });
      return { body: id(n) };
    }
    if (path === '/rest/v1/research_contributions') return { body: [] };
    return null;
  } });
  const options = profile[1] === 'Pixel 7' ? { ...pw.devices['Pixel 7'] } : profile[1];
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, ...options, locale: 'he-IL', serviceWorkers: 'allow' });
  const user = fixture.auth.newUser('member@example.invalid', true, 'fixture-password');
  const viewer = user;
  const response = await fixture.auth.handle(new Request('https://linswmnnkjxvweumprav.supabase.co/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'fixture-password' }) }));
  assert.equal(response.status, 200);
  await context.addInitScript((session) => localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify(session)), await response.json());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(fixture.origin + '/community/chat', { waitUntil: 'domcontentloaded' });
  await page.locator('.sod29-community-thread').first().waitFor({ timeout: 30000 });
  return { page, errors, close: async () => { await context.close(); await browser.close(); await fixture.close(); } };
}

for (const profile of PROFILES) {
  test(`${profile[0]}: the actions menu of every message opens inside the screen, scrolls nothing sideways and closes`, { timeout: 120000 }, async () => {
    const { page, errors, close } = await open(profile);
    try {
      // open every thread, nested ones included, so the menus of deep replies are measured too
      for (let round = 0; round < 4; round++) {
        const toggles = page.locator('.sod29-community-replies-toggle[aria-expanded="false"]');
        const n = await toggles.count();
        if (!n) break;
        for (let i = n - 1; i >= 0; i--) await toggles.nth(i).click().catch(() => {});
        await page.waitForTimeout(600);
      }
      const menus = page.locator('.sod29-community-personal-menu');
      await menus.first().waitFor({ timeout: 30000 });
      const count = await menus.count();
      console.log(`${profile[0]}: ${count} menus measured`);
      assert.ok(count >= 1, 'the signed-in member has the actions menu');
      for (let i = 0; i < count; i++) {
        const menu = menus.nth(i);
        await menu.scrollIntoViewIfNeeded();
        await menu.locator('summary').click();
        const options = menu.locator('.sod29-community-personal-options');
        await options.waitFor();
        const box = await options.boundingBox(), vw = await page.evaluate(() => document.documentElement.clientWidth);
        assert.ok(box.x >= 0 && box.x + box.width <= vw, `menu ${i} inside the screen: x=${box.x} w=${box.width} vw=${vw}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal page scroll');
        // not clipped by an ancestor (overflow) and not covered: the element under each corner and the middle of the menu is the menu itself
        const covered = await options.evaluate((el) => { const r = el.getBoundingClientRect(); const pts = [[r.left + 14, r.top + 14], [r.right - 14, r.top + 14], [r.left + 14, r.bottom - 14], [r.right - 14, r.bottom - 14], [r.left + r.width / 2, r.top + r.height / 2]]; return pts.map(([x, y], k) => { const hit = document.elementFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1)); return (hit && el.contains(hit)) ? null : `pt${k}(${Math.round(x)},${Math.round(y)}) hit=${hit ? (hit.tagName + '.' + String(hit.className).slice(0, 40)) : 'none'} rect=${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)} vw=${innerWidth}`; }).filter(Boolean); });
        assert.deepEqual(covered, [], `menu ${i} clipped or covered`);
        await page.keyboard.press('Escape');
        assert.equal(await menu.evaluate((el) => el.open), false, 'Escape closes it');
      }
      // every other disclosure panel of the community (message management, hints, filters): same bounds and clipping rules
      const others = page.locator('.sod29-community details:not(.sod29-community-personal-menu) > summary');
      const total = await others.count();
      console.log(`${profile[0]}: ${total} other disclosure panels measured`);
      for (let i = 0; i < total; i++) {
        const summary = others.nth(i);
        await summary.scrollIntoViewIfNeeded().catch(() => {});
        await summary.click({ timeout: 5000 }).catch(() => {});
        const result = await summary.evaluate((sum) => {
          const d = sum.parentElement; if (!d.open) return { skipped: true };
          const panel = [...d.children].find((c) => c !== sum && c.getBoundingClientRect().height > 0); if (!panel) return { skipped: true };
          const r = panel.getBoundingClientRect();
          const pts = [[r.left + 14, r.top + 14], [r.right - 14, r.top + 14], [r.left + 14, r.bottom - 14], [r.right - 14, r.bottom - 14]];
          const bad = pts.map(([x, y], k) => { const hit = document.elementFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1)); return (hit && panel.contains(hit)) ? null : `pt${k} hit=${hit ? hit.tagName + '.' + String(hit.className).slice(0, 30) : 'none'}`; }).filter(Boolean);
          const inside = r.left >= -0.5 && r.right <= innerWidth + 0.5;
          d.open = false;
          return { inside, bad, rect: `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)} vw=${innerWidth}`, label: (sum.textContent || '').trim().slice(0, 24) };
        });
        if (result.skipped) continue;
        assert.ok(result.inside, `panel "${result.label}" leaves the screen: ${result.rect}`);
        assert.deepEqual(result.bad, [], `panel "${result.label}" clipped or covered`);
      }
      assert.deepEqual(errors, []);
    } finally { await close(); }
  });

  test(`${profile[0]}: "השב" opens the one composer under the message, no page change or jump, and the sent reply appears in place`, { timeout: 120000 }, async () => {
    const { page, errors, close } = await open(profile);
    try {
      const threads = page.locator('.sod29-community-thread');
      const target = threads.nth(3);
      await target.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => ({ y: window.scrollY, url: location.pathname + location.search }));
      const messageTop = await target.evaluate((el) => el.getBoundingClientRect().top);
      await target.getByRole('button', { name: 'השב', exact: true }).first().click();
      const composer = page.locator('.sod29-community-composer');
      await composer.waitFor();
      assert.equal(await composer.count(), 1, 'one composer only (no second mechanism)');
      assert.equal(await target.locator('.sod29-community-composer').count(), 1, 'the composer is inside the thread of the answered message');
      const after = await page.evaluate(() => ({ y: window.scrollY, url: location.pathname + location.search }));
      assert.equal(after.url, before.url, 'no page change');
      assert.ok(Math.abs(after.y - before.y) < 200, `no jump (scrollY ${before.y} -> ${after.y})`);
      const message = target.locator('.sod29-community-message, article, .sod29-community-thread-actions').first();
      const messageBottom = await target.locator('.sod29-community-thread-actions').first().evaluate((el) => el.getBoundingClientRect().bottom);
      const composerTop = await composer.evaluate((el) => el.getBoundingClientRect().top);
      assert.ok(composerTop >= messageBottom - 4, `the composer is below the message (message bottom ${messageBottom}, composer top ${composerTop})`);
      assert.ok(await composer.evaluate((el) => el.contains(document.activeElement)), 'the editor has focus');
      const text = `תשובה במקום ${profile[0]}`;
      await page.keyboard.type(text);
      // the person scrolls to the send button themselves (the test must not let the click scroll for them)
      await page.evaluate(() => { const r = document.querySelector('.sod29-community-composer').getBoundingClientRect(); if (r.bottom > innerHeight - 8) scrollBy(0, r.bottom - innerHeight + 16); });
      const messageTopBeforeSend = await target.evaluate((el) => el.getBoundingClientRect().top);
      await composer.locator('button.sod29-community-primary').click();
      await target.getByText(text, { exact: false }).first().waitFor({ timeout: 30000 });
      const sent = await page.evaluate(() => ({ y: window.scrollY, url: location.pathname + location.search }));
      const messageTopAfter = await target.evaluate((el) => el.getBoundingClientRect().top);
      assert.equal(sent.url, before.url, 'no page change after sending');
      // the composer returns to the top of the page, so scrollY legitimately changes; what matters is that the reader stays at the thread and sees the new reply
      const replyBox = await target.getByText(text, { exact: false }).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
      assert.ok(replyBox.bottom > 0 && replyBox.top < replyBox.vh, `the new reply is on screen where it was written (${JSON.stringify(replyBox)})`);
      assert.ok(sent.y > before.y - 600, `no jump to the top (scrollY ${before.y} -> ${sent.y})`);
      assert.deepEqual(errors, []);
    } finally { await close(); }
  });
}
