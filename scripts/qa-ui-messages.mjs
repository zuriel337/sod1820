// Priority 1 through real clicks (ZURIEL 26.11.2026): private messages and the unread mark on the profile picture, on desktop and on a phone,
// against the isolated backend with synthetic accounts. A sends two messages; B sees the mark on the picture, follows it to the messages, opens the
// conversation (the mark and the stored notification go down), replies, and after a reload the state is still the same; A receives the reply.
// Result lines start with "ui-messages <profile>:" so the report can match them.
export async function runMessagesUi({ settings, browser, devices, newSignedIn, syntheticAccount, note }) {
  const { origin, anon } = settings;
  const headers = (token) => ({ apikey: anon, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' });
  const token = async (account) => (await (await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email: account.email, password: account.password }) })).json()).access_token;
  const rpc = async (name, args, t) => (await (await fetch(`${origin}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(t), body: JSON.stringify(args) })).json());
  const rows = async (query, t) => (await (await fetch(`${origin}/rest/v1/${query}`, { headers: headers(t) })).json());

  for (const [profile, options] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['Pixel 7', devices['Pixel 7']]]) {
    const label = `ui-messages ${profile}`;
    const [a, b] = [await syntheticAccount(), await syntheticAccount()];
    const [ta, tb] = [await token(a), await token(b)];
    await rpc('dm_send', { p_to: b.id, p_body: `ראשונה ${profile}` }, ta);
    await rpc('dm_send', { p_to: b.id, p_body: `שנייה ${profile}` }, ta);
    const { context, page } = await newSignedIn(options, b);
    const trace = [];
    page.on('response', (r) => { if (r.status() >= 400) trace.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    page.on('pageerror', (e) => trace.push(`pageerror ${String(e.message).slice(0, 80)}`));
    const step = async (name, fn) => { try { await fn(); note(true, `${label}: ${name}`); return true; } catch (error) { note(false, `${label}: ${name}`, `${String(error.message).split('\n')[0].slice(0, 120)} | ${trace.slice(-4).join('; ')}`); return false; } };
    try {
      const badge = () => page.locator('.sod29-attention-badge:visible').first();
      const seen = await step('the unread mark on the profile picture counts the two messages, inside the viewport', async () => {
        await page.goto('https://sod1820.co.il/privacy', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await badge().waitFor({ timeout: 30000 });
        if (!/2 חדשים אליך/.test(await badge().innerText() + await page.locator('.sod29-attention-badge:visible .sod29-visually-hidden').first().textContent())) throw new Error('count is not 2');
        const box = await badge().boundingBox(), width = await page.evaluate(() => document.documentElement.clientWidth);
        if (box.x < 0 || box.x + box.width > width + 1) throw new Error('badge outside the viewport');
        if (!(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))) throw new Error('horizontal scroll');
      });
      if (!seen) continue;
      await step('pressing the picture opens the messages', async () => {
        await badge().locator('xpath=ancestor::button[1]').click({ timeout: 15000 });
        await page.waitForURL(/\/2029\/me\/messages/, { timeout: 30000 });
      });
      await step('the conversation shows the sender, an unread count of 2 and the last message', async () => {
        const row = page.getByRole('button').filter({ hasText: `שנייה ${profile}` }).first();
        await row.waitFor({ timeout: 30000 });
        if (!/2/.test(await row.innerText())) throw new Error('no unread count on the row');
      });
      await step('opening the conversation shows both messages', async () => {
        await page.getByRole('button').filter({ hasText: `שנייה ${profile}` }).first().click();
        await page.getByText(`ראשונה ${profile}`, { exact: false }).first().waitFor({ timeout: 30000 });
        await page.getByText(`שנייה ${profile}`, { exact: false }).first().waitFor({ timeout: 15000 });
      });
      await step('the mark disappears and the database shows nothing unread (messages and the stored notification)', async () => {
        await page.locator('.sod29-attention-badge:visible').first().waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
        const deadline = Date.now() + 30000; let inbox, unreadNotes;
        do { inbox = (await rpc('dm_inbox', {}, tb))[0]; unreadNotes = await rows('user_notifications?select=id&kind=eq.dm&read_at=is.null', tb); if (inbox?.unread === 0 && !unreadNotes.length) break; await new Promise((r) => setTimeout(r, 1000)); } while (Date.now() < deadline);
        if (inbox?.unread !== 0) throw new Error(`inbox unread ${inbox?.unread}`);
        if (unreadNotes.length) throw new Error(`${unreadNotes.length} dm notifications still unread`);
        if (await page.locator('.sod29-attention-badge:visible').count()) throw new Error('the mark is still on the picture');
      });
      await step('a reply is sent through the box and reaches the sender as one unread message', async () => {
        await page.getByLabel('ההודעה שלך').fill(`תשובה ${profile}`);
        await page.getByRole('button', { name: 'שלח', exact: true }).click();
        await page.getByText(`תשובה ${profile}`, { exact: false }).first().waitFor({ timeout: 30000 });
        const deadline = Date.now() + 30000; let row;
        do { row = (await rpc('dm_inbox', {}, ta)).find((r) => r.counterpart === b.id); if (row?.unread === 1) break; await new Promise((r) => setTimeout(r, 1000)); } while (Date.now() < deadline);
        if (row?.unread !== 1 || row.last_body !== `תשובה ${profile}`) throw new Error(`sender inbox: ${JSON.stringify(row)}`);
        const senderNote = await rows('user_notifications?select=kind&kind=eq.dm&read_at=is.null', ta);
        if (senderNote.length !== 1) throw new Error(`sender notifications ${senderNote.length}`);
      });
      await step('after a reload the conversation is still there and nothing is unread', async () => {
        await page.goto('https://sod1820.co.il/2029/me/messages', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const row = page.getByRole('button').filter({ hasText: `תשובה ${profile}` }).first();
        await row.waitFor({ timeout: 30000 });
        if (await page.locator('.sod29-attention-badge:visible').count()) throw new Error('mark reappeared');
      });
    } finally { await context.close(); }
  }
}
