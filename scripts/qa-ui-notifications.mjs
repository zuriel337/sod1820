// Notifications through real clicks (ZURIEL 26.11.2026), desktop and phone, synthetic accounts, isolated backend: the unread mark on the picture counts the
// personal notifications (replies), the notifications page lists them, "mark all as read" reads the member's own rows only, the mark goes away and stays
// away after a reload, and another member's notifications are untouched. Result lines start with "ui-notifications <profile>:".
export async function runNotificationsUi({ settings, browser, devices, newSignedIn, syntheticAccount, note }) {
  const { origin, anon, service } = settings;
  const headers = (key, token) => ({ apikey: key, Authorization: `Bearer ${token || key}`, 'content-type': 'application/json' });
  const token = async (account) => (await (await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(anon, anon), body: JSON.stringify({ email: account.email, password: account.password }) })).json()).access_token;
  const insert = (account, kind, title) => fetch(`${origin}/rest/v1/user_notifications`, { method: 'POST', headers: { ...headers(service), prefer: 'return=minimal' }, body: JSON.stringify({ user_id: account.id, email: account.email, kind, title, body: `גוף ${title}` }) });
  const unread = async (t) => (await (await fetch(`${origin}/rest/v1/user_notifications?select=id,kind&read_at=is.null`, { headers: headers(anon, t) })).json());

  for (const [profile, options] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['Pixel 7', devices['Pixel 7']]]) {
    const label = `ui-notifications ${profile}`;
    const [b, c] = [await syntheticAccount(), await syntheticAccount()];
    const [tb, tc] = [await token(b), await token(c)];
    const titles = [`תגובה א ${profile}`, `תגובה ב ${profile}`, `עדכון כללי ${profile}`];
    await insert(b, 'reply', titles[0]); await insert(b, 'reply', titles[1]); await insert(b, 'general', titles[2]);
    await insert(c, 'reply', `לא שלך ${profile}`);
    const { context, page } = await newSignedIn(options, b);
    const trace = [];
    page.on('response', (r) => { if (r.status() >= 400) trace.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    const step = async (name, fn) => { try { await fn(); note(true, `${label}: ${name}`); return true; } catch (error) { note(false, `${label}: ${name}`, `${String(error.message).split('\n')[0].slice(0, 120)} | ${trace.slice(-4).join('; ')}`); return false; } };
    try {
      const badge = () => page.locator('.sod29-attention-badge:visible').first();
      if (!await step('the mark on the profile picture counts the two replies (the general update is not addressed to the person)', async () => {
        await page.goto('https://sod1820.co.il/privacy', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await badge().waitFor({ timeout: 30000 });
        const text = await page.locator('.sod29-attention-badge:visible .sod29-visually-hidden').first().textContent();
        if (!/2 חדשים אליך/.test(text)) throw new Error(`mark says "${text}"`);
      })) { await context.close(); continue; }
      await step('pressing the picture opens the notifications and lists all three updates', async () => {
        await badge().locator('xpath=ancestor::button[1]').click({ timeout: 15000 });
        await page.waitForURL(/\/2029\/me\/notifications/, { timeout: 30000 });
        for (const title of titles) await page.getByText(title, { exact: true }).first().waitFor({ timeout: 30000 });
        if (await page.getByText(`לא שלך ${profile}`).count()) throw new Error("another member's notification is listed");
      });
      await step('"mark all as read" reads this member\'s notifications and only theirs', async () => {
        await page.getByRole('button', { name: /סמן הכול כנקרא/ }).click({ timeout: 15000 });
        const deadline = Date.now() + 30000; let mine;
        do { mine = await unread(tb); if (!mine.length) break; await new Promise((r) => setTimeout(r, 1000)); } while (Date.now() < deadline);
        if (mine.length) throw new Error(`${mine.length} still unread`);
        if ((await unread(tc)).length !== 1) throw new Error('the other member\'s notification changed');
      });
      await step('the mark leaves the picture', async () => {
        await page.locator('.sod29-attention-badge:visible').first().waitFor({ state: 'detached', timeout: 30000 });
      });
      await step('after a reload nothing is unread and the updates are still listed', async () => {
        await page.goto('https://sod1820.co.il/2029/me/notifications', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.getByText(titles[2], { exact: true }).first().waitFor({ timeout: 30000 });
        if (await page.locator('.sod29-attention-badge:visible').count()) throw new Error('mark reappeared');
        if (await page.locator('[data-unread="true"]').count()) throw new Error('an item is still shown as unread');
      });
    } finally { await context.close(); }
  }
}
