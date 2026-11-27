// Login and permissions through real clicks (ZURIEL 26.11.2026, night task 337): the admin console opens for an administrator only, a member and a guest are
// sent home, the answer holds after a reload, and the database agrees (the role decides, not the page). Desktop and phone, synthetic accounts, isolated backend.
// Result lines start with "ui-auth <profile>:".
export async function runAuthUi({ settings, browser, devices, newSignedIn, syntheticAccount, note }) {
  const { origin, anon } = settings;
  const rows = async (query, token) => (await (await fetch(`${origin}/rest/v1/${query}`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })).json());
  const token = async (a) => (await (await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' }, body: JSON.stringify({ email: a.email, password: a.password }) })).json()).access_token;

  for (const [profile, options] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['Pixel 7', devices['Pixel 7']]]) {
    const label = `ui-auth ${profile}`;
    const [admin, member] = [await syntheticAccount('admin'), await syntheticAccount('member')];
    const step = async (name, fn) => { try { await fn(); note(true, `${label}: ${name}`); return true; } catch (error) { note(false, `${label}: ${name}`, String(error.message).split('\n')[0].slice(0, 200)); return false; } };

    await step('the database decides the role: the administrator is admin, the member is not, and a member cannot make themselves admin', async () => {
      const [ta, tm] = [await token(admin), await token(member)];
      const a = (await rows(`users?select=role&id=eq.${admin.id}`, ta))[0], m = (await rows(`users?select=role&id=eq.${member.id}`, tm))[0];
      if (a?.role !== 'admin' || m?.role !== 'user') throw new Error(`roles ${a?.role}/${m?.role}`);
      const attempt = await fetch(`${origin}/rest/v1/users?id=eq.${member.id}`, { method: 'PATCH', headers: { apikey: anon, Authorization: `Bearer ${tm}`, 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ role: 'admin' }) });
      const after = (await rows(`users?select=role&id=eq.${member.id}`, tm))[0];
      if (after?.role !== 'user') throw new Error(`role became ${after?.role} (status ${attempt.status})`);
    });

    // guest
    const guest = await browser.newContext({ ...options, locale: 'he-IL' });
    try {
      const page = await guest.newPage();
      await step('a guest who opens the admin console stays on the private gate and sees no console', async () => {
        await page.goto('https://sod1820.co.il/2029/control', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.getByText('זהו מסך פרטי').first().waitFor({ timeout: 45000 });
        if (await page.getByRole('heading', { name: 'Control Plane' }).count()) throw new Error('console shown to a guest');
      });
    } finally { await guest.close(); }

    // member
    const asMember = await newSignedIn(options, member);
    try {
      await step('a signed-in member who opens the admin console stays on the private gate and sees no console', async () => {
        await asMember.page.goto('https://sod1820.co.il/2029/control', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await asMember.page.getByText('זהו מסך פרטי').first().waitFor({ timeout: 45000 });
        if (await asMember.page.getByRole('heading', { name: 'Control Plane' }).count()) throw new Error('console shown to a member');
      });
    } finally { await asMember.context.close(); }

    // administrator
    const asAdmin = await newSignedIn(options, admin);
    try {
      await step('the administrator stays on the admin console (Control Plane, internal)', async () => {
        await asAdmin.page.goto('https://sod1820.co.il/2029/control', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await asAdmin.page.getByRole('heading', { name: 'Control Plane' }).first().waitFor({ timeout: 60000 });
        if (!asAdmin.page.url().includes('/2029/control')) throw new Error(`url ${asAdmin.page.url()}`);
      });
      await step('after a reload the administrator is still on the console', async () => {
        await asAdmin.page.reload({ waitUntil: 'domcontentloaded' });
        await asAdmin.page.getByRole('heading', { name: 'Control Plane' }).first().waitFor({ timeout: 60000 });
      });
    } finally { await asAdmin.context.close(); }
  }
}
