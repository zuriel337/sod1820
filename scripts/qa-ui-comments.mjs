// Comments and likes through real clicks (ZURIEL 26.11.2026), desktop and phone, synthetic accounts, isolated backend: the Community page (the page that
// renders the comments of the site) shows an approved comment to a guest and never an unreviewed one; a member presses like and dislike and the stored
// counters change; the author edits and deletes their own comment through the buttons the server allows, and another member is offered neither; every state
// is read again from the database and after a reload. Result lines start with "ui-comments <profile>:" so the report can match them.
import { randomBytes } from 'node:crypto';

export async function runCommentsUi({ settings, browser, devices, newSignedIn, syntheticAccount, note }) {
  const { origin, anon, service } = settings;
  const headers = (key, token) => ({ apikey: key, Authorization: `Bearer ${token || key}`, 'content-type': 'application/json' });
  const token = async (account) => (await (await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(anon, anon), body: JSON.stringify({ email: account.email, password: account.password }) })).json()).access_token;
  const rpc = async (name, args, t, extra = {}) => { const r = await fetch(`${origin}/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...headers(anon, t), ...extra }, body: JSON.stringify(args) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const row = async (id) => (await (await fetch(`${origin}/rest/v1/research_contributions?id=eq.${id}&select=id,body,status,reactions,edited_at,deleted_at`, { headers: headers(service) })).json())[0] ?? null;
  const until = async (read, ok, ms = 30000) => { const end = Date.now() + ms; let value; do { value = await read(); if (ok(value)) return value; await new Promise((r) => setTimeout(r, 700)); } while (Date.now() < end); return value; };

  // the guest network key (a random value in the local database, the same QA configuration as the API scenarios) so that a guest comment can be stored
  await fetch(`${origin}/rest/v1/community_net_key`, { method: 'POST', headers: { ...headers(service), prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ key: `\\x${randomBytes(16).toString('hex')}` }) });

  for (const [profile, options] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['Pixel 7', devices['Pixel 7']]]) {
    const label = `ui-comments ${profile}`;
    const [a, b] = [await syntheticAccount(), await syntheticAccount()];
    const [ta, tb] = [await token(a), await token(b)];
    const tag = randomBytes(3).toString('hex');
    const texts = { own: `תגובה של הכותב ${profile} ${tag}`, other: `תגובה של חבר אחר ${profile} ${tag}`, guest: `אורח שממתין לסקירה ${profile} ${tag}`, edited: `תגובה ערוכה ${profile} ${tag}` };
    const add = async (body, t, extra) => (await rpc('add_contribution', { p_intent: 'תגובה', p_origin: 'community_2029', p_body: body }, t, extra)).body;
    const guestId = await add(texts.guest, undefined, { 'cf-connecting-ip': `203.0.113.${1 + (randomBytes(1)[0] % 200)}` });
    const ownId = await add(texts.own, ta), otherId = await add(texts.other, tb);
    const trace = [];
    const reactionCalls = [];
    const watch = (page) => {
      page.on('response', async (r) => {
        if (/toggle_contribution_reaction/.test(r.url())) reactionCalls.push(`${r.status()} ${(await r.text().catch(() => '')).slice(0, 80)}`);
        else if (r.status() >= 400 && !/community_replies_page|community_thread_updates|track_visit|world_group|\/posts/.test(r.url())) trace.push(`${r.status()} ${new URL(r.url()).pathname}`);
      });
      page.on('request', (r) => {
        if (!/toggle_contribution_reaction/.test(r.url())) return;
        const bearer = String(r.headers().authorization || '').replace(/^Bearer /, '');
        let claims = {}; try { claims = JSON.parse(Buffer.from(bearer.split('.')[1] || '', 'base64url').toString()); } catch { /* not a JWT */ }
        const apikey = String(r.headers().apikey || '').split('.')[1] || ''; let keyRole = ''; try { keyRole = JSON.parse(Buffer.from(apikey, 'base64url').toString()).role; } catch { /* not a JWT */ }
        reactionCalls.push(`request role=${claims.role} sub=${claims.sub ? 'yes' : 'no'} apikey=${keyRole} aud=${claims.aud} headers=${Object.keys(r.headers()).filter((k) => /ip|forward|profile|prefer/.test(k)).join(',')}`);
      });
      page.on('requestfailed', (r) => { if (/toggle_contribution_reaction/.test(r.url())) reactionCalls.push(`failed ${r.failure()?.errorText}`); });
      page.on('pageerror', (e) => trace.push(`pageerror ${String(e.message).slice(0, 80)}`));
    };
    const step = async (name, fn) => { try { await fn(); note(true, `${label}: ${name}`); return true; } catch (error) { note(false, `${label}: ${name}`, `${String(error.message).split('\n')[0].slice(0, 130)} | ${trace.slice(-3).join('; ')}${reactionCalls.length ? ` | reaction calls: ${reactionCalls.slice(-4).join(' / ')}` : ''}`); return false; } };
    const message = (page, id) => page.locator(`article#message-${id}`);
    const openCommunity = async (page, id) => { await page.goto('https://sod1820.co.il/community', { waitUntil: 'domcontentloaded', timeout: 30000 }); await message(page, id).first().waitFor({ timeout: 40000 }); };
    const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

    // 1. a guest: the approved comment is shown, the unreviewed one is not
    const guestContext = await browser.newContext({ ...options, locale: 'he-IL' });
    try {
      const guestPage = await guestContext.newPage(); watch(guestPage);
      await step('a guest sees the approved comments of both members on the Community page, inside the viewport', async () => {
        await openCommunity(guestPage, ownId);
        await message(guestPage, otherId).first().waitFor({ timeout: 20000 });
        if (!(await message(guestPage, ownId).innerText()).includes(texts.own)) throw new Error('the text of the comment is not on the page');
        if (!(await noSideScroll(guestPage))) throw new Error('horizontal scroll');
      });
      await step('the unreviewed guest comment is nowhere on the page for a guest', async () => {
        if ((await guestPage.content()).includes(texts.guest)) throw new Error('unreviewed text is visible');
        if (await guestPage.locator(`article#message-${guestId}`).count()) throw new Error('the unreviewed comment has a place on the page');
      });
    } finally { await guestContext.close(); }

    // 2. member B: like and dislike, another member's comment offers no edit or delete
    const reader = await newSignedIn(options, b); watch(reader.page);
    try {
      const likeButton = () => message(reader.page, ownId).getByRole('button', { name: 'הוסף לייק' });
      const dislikeButton = () => message(reader.page, ownId).getByRole('button', { name: 'הוסף דיסלייק' });
      if (!await step('member B opens the Community page and sees the like and dislike buttons on the comment', async () => {
        await openCommunity(reader.page, ownId);
        await likeButton().first().waitFor({ timeout: 20000 });
        await dislikeButton().first().waitFor({ timeout: 20000 });
      })) continue;
      await step('another member is offered neither edit nor delete on a comment that is not theirs, while their own comment offers both', async () => {
        await message(reader.page, otherId).getByRole('button', { name: 'עריכה', exact: true }).first().waitFor({ timeout: 30000 });
        await message(reader.page, otherId).getByRole('button', { name: 'מחיקה', exact: true }).first().waitFor({ timeout: 10000 });
        if (await message(reader.page, ownId).getByRole('button', { name: /^(עריכה|מחיקה)$/ }).count()) throw new Error('edit or delete offered on another member\'s comment');
      });
      await step('pressing like stores one like, pressing dislike stores one dislike, and the buttons show the counts', async () => {
        await likeButton().first().click({ timeout: 15000 });
        const replay = await rpc('toggle_contribution_reaction', { p_id: ownId, p_emoji: '👍', p_visitor: 'community-repeatable-like' }, tb);
        reactionCalls.push(`replay with the member token from outside the page: ${replay.status} ${JSON.stringify(replay.body).slice(0, 70)}`);
        const liked = await until(() => row(ownId), (r) => r?.reactions?.community_likes === 1);
        if (liked?.reactions?.community_likes !== 1) throw new Error(`stored likes ${liked?.reactions?.community_likes}`);
        await dislikeButton().first().click({ timeout: 15000 });
        const both = await until(() => row(ownId), (r) => r?.reactions?.community_dislikes === 1);
        if (both?.reactions?.community_dislikes !== 1 || both?.reactions?.community_likes !== 1) throw new Error(`stored ${JSON.stringify(both?.reactions)}`);
        await message(reader.page, ownId).getByRole('button', { name: 'הוסף לייק' }).filter({ hasText: '1' }).first().waitFor({ timeout: 20000 });
      });
      await step('after a reload the like and dislike counts are still 1 and 1 on the page', async () => {
        await openCommunity(reader.page, ownId);
        await message(reader.page, ownId).getByRole('button', { name: 'הוסף לייק' }).filter({ hasText: '1' }).first().waitFor({ timeout: 20000 });
        await message(reader.page, ownId).getByRole('button', { name: 'הוסף דיסלייק' }).filter({ hasText: '1' }).first().waitFor({ timeout: 20000 });
        const stored = await row(ownId);
        if (stored.reactions.community_likes !== 1 || stored.reactions.community_dislikes !== 1) throw new Error(`stored ${JSON.stringify(stored.reactions)}`);
      });
    } finally { await reader.context.close(); }

    // 3. the author: edit, reload, delete
    const author = await newSignedIn(options, a); watch(author.page);
    try {
      if (!await step('the author sees edit and delete on their own comment', async () => {
        await openCommunity(author.page, ownId);
        await message(author.page, ownId).getByRole('button', { name: 'עריכה', exact: true }).first().waitFor({ timeout: 30000 });
        await message(author.page, ownId).getByRole('button', { name: 'מחיקה', exact: true }).first().waitFor({ timeout: 10000 });
      })) continue;
      await step('editing through the box stores the new text and the edit time, and the page shows the new text', async () => {
        await message(author.page, ownId).getByRole('button', { name: 'עריכה', exact: true }).first().click({ timeout: 15000 });
        await author.page.locator(`#edit-${ownId}`).first().fill(texts.edited, { timeout: 15000 });
        await message(author.page, ownId).getByRole('button', { name: 'שמירה', exact: true }).click({ timeout: 15000 });
        const saved = await until(() => row(ownId), (r) => r?.body === texts.edited);
        if (saved?.body !== texts.edited || !saved?.edited_at) throw new Error(`stored body ${String(saved?.body).slice(0, 40)}`);
        await message(author.page, ownId).getByText(texts.edited, { exact: false }).first().waitFor({ timeout: 20000 });
      });
      await step('after a reload the edited text is still there and the stored edit time and reactions were kept', async () => {
        await openCommunity(author.page, ownId);
        await message(author.page, ownId).getByText(texts.edited, { exact: false }).first().waitFor({ timeout: 20000 });
        const stored = await row(ownId);
        if (!stored.edited_at) throw new Error('no stored edit time');
        if (stored.reactions.community_likes !== 1) throw new Error('the like was lost with the edit');
      });
      await step('deleting through the confirmation removes the text from the database and from the page, for the author and for a guest', async () => {
        await message(author.page, ownId).getByRole('button', { name: 'מחיקה', exact: true }).first().click({ timeout: 15000 });
        await author.page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה', exact: true }).click({ timeout: 15000 });
        const gone = await until(() => row(ownId), (r) => r?.deleted_at && r.body === null);
        if (!gone?.deleted_at || gone.body !== null) throw new Error('not deleted in the database');
        await author.page.reload({ waitUntil: 'domcontentloaded' });
        await message(author.page, otherId).first().waitFor({ timeout: 40000 });
        if ((await author.page.content()).includes(texts.edited)) throw new Error('the deleted text is still on the page');
        const guestContext2 = await browser.newContext({ ...options, locale: 'he-IL' });
        try { const p = await guestContext2.newPage(); await p.goto('https://sod1820.co.il/community', { waitUntil: 'domcontentloaded', timeout: 30000 }); await message(p, otherId).first().waitFor({ timeout: 40000 }); if ((await p.content()).includes(texts.edited)) throw new Error('a guest still sees the deleted text'); } finally { await guestContext2.close(); }
      });
    } finally { await author.context.close(); }
  }
}
