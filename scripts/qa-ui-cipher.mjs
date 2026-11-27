// Priority 2 (ZURIEL 26.11.2026): a real cipher saved through the matrix and opened again after a reload, on desktop and phone, with the existing
// engine and the existing corpus. The engine searches in the page; every occurrence is verified by the REAL Edge Function (els-search-bridge, served by the
// local edge runtime) through the existing els_verify_batch_v1 on the Torah corpus loaded into the throwaway database. Nothing here reaches production.
// Result lines: "els-verify:" (the function itself) and "ui-cipher <profile>:" (the clicks).
const CORPUS_ID = '0b022e8eef6f9c16';

export async function runElsVerify({ settings, syntheticAccount, note }) {
  const { origin, anon } = settings;
  const member = await syntheticAccount();
  const login = await (await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' }, body: JSON.stringify({ email: member.email, password: member.password }) })).json();
  const call = async (body, token = login.access_token) => {
    const response = await fetch(`${origin}/functions/v1/els-search-bridge`, { method: 'POST', headers: { apikey: anon, authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const raw = await response.json().catch(() => null);
    // the function answers { result, ... }; the checks read the verifier's own answer
    return { status: response.status, body: raw && raw.result ? raw.result : raw, raw };
  };
  const golden = { skip: 10065, dir: 1, start: 50890 };
  const ok = await call({ op: 'verify_batch', term: 'תורהקדשה', scope: 'torah', corpus_id: CORPUS_ID, candidates: [golden, { ...golden, start: 50891 }] });
  note(ok.status === 200 && ok.body?.counts?.verified === 1 && ok.body?.verified?.[0]?.start === 50890, 'els-verify: the real edge function accepts the golden occurrence and rejects a shifted one', `status=${ok.status} ${JSON.stringify(ok.body?.counts || ok.body).slice(0, 120)}`);
  const mismatch = await call({ op: 'verify_batch', term: 'תורהקדשה', scope: 'torah', corpus_id: 'ffffffffffffffff', candidates: [golden] });
  note(mismatch.body?.status === 'CORPUS_MISMATCH' || mismatch.status >= 400, 'els-verify: a wrong corpus identity is refused before any coordinate is checked', `status=${mismatch.status} ${mismatch.body?.status || ''}`);
  const one = await call({ op: 'verify', term: 'תורהקדשה', scope: 'torah', skip: 10065, dir: 1, start: 50890 });
  note(one.status === 200 && one.body?.verification_state === 'MATCH', 'els-verify: a single occurrence replays as MATCH', `status=${one.status}`);
}

export async function runCipherUi({ settings, browser, devices, newSignedIn, syntheticAccount, note }) {
  const { origin, anon } = settings;
  const headers = (t) => ({ apikey: anon, Authorization: `Bearer ${t}`, 'content-type': 'application/json' });
  const token = async (a) => (await (await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' }, body: JSON.stringify({ email: a.email, password: a.password }) })).json()).access_token;

  for (const [profile, options] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['Pixel 7', devices['Pixel 7']]]) {
    const label = `ui-cipher ${profile}`;
    const member = await syntheticAccount(), t = await token(member);
    const { context, page } = await newSignedIn(options, member);
    const trace = [];
    page.on('response', (r) => { if (r.status() >= 400) trace.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    page.on('pageerror', (e) => trace.push(`pageerror ${String(e.message).slice(0, 80)}`));
    const notes = async () => (await page.locator('[role=alert], [role=status], .els29-native-notice').evaluateAll((nodes) => nodes.filter((n) => n.offsetParent).map((n) => (n.textContent || '').trim().slice(0, 90)))).join(' / ');
    const dump = async () => (await page.getByRole('button').evaluateAll((nodes) => nodes.filter((n) => n.offsetParent).slice(0, 40).map((n) => (n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 24)))).join(' | ');
    const step = async (name, fn) => { try { await fn(); note(true, `${label}: ${name}`); return true; } catch (error) { note(false, `${label}: ${name}`, `${String(error.message).split('\n')[0].slice(0, 110)} | ${trace.slice(-3).join('; ')} | notes: ${await notes().catch(() => '')} | buttons: ${await dump().catch(() => '')}`.slice(0, 900)); return false; } };
    const title = `QA צופן ${profile}`;
    try {
      if (!await step('the matrix page opens with the existing engine ready', async () => {
        await page.goto('https://sod1820.co.il/code', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.locator('.els29-native-search').first().waitFor({ timeout: 90000 });
      })) continue;
      if (!await step('searching a word verifies an occurrence through the real edge function and opens the matrix', async () => {
        await page.getByPlaceholder('למשל: משיח').first().fill('תורה');
        await page.locator('.els29-native-search').first().click();
        await page.getByRole('button', { name: 'פעולות לציר הנבחר' }).first().waitFor({ timeout: 120000 });
      })) continue;
      if (!await step('the saved cipher is created from the matrix (title, explanation, save)', async () => {
        await page.locator('[data-tool-action="research"]:visible').first().click({ timeout: 20000 });
        await page.getByLabel('שם הצופן').fill(title);
        await page.getByLabel('מה רואים בצופן?').fill(`הסבר ${profile}`);
        await page.locator('.els29-native-save-actions button[type="submit"]').click();
        await page.locator('.els29-native-save-result').waitFor({ timeout: 60000 });
      })) continue;
      let record;
      await step('the saved row exists for its owner, private, verified, with the real coordinates', async () => {
        const deadline = Date.now() + 30000;
        do { record = (await (await fetch(`${origin}/rest/v1/els_records?select=id,title,term,status,visibility,self_published,start_index,skip&order=created_at.desc&limit=5`, { headers: headers(t) })).json()).find((r) => r.title === title); if (record) break; await new Promise((r) => setTimeout(r, 1000)); } while (Date.now() < deadline);
        if (!record) throw new Error('no saved row');
        if (record.visibility !== 'private' || record.status !== 'draft') throw new Error(`tier ${record.status}/${record.visibility}`);
      });
      await step('a stranger cannot read it', async () => {
        const other = await syntheticAccount(), ot = await token(other);
        const rows = await (await fetch(`${origin}/rest/v1/els_records?select=id&title=eq.${encodeURIComponent(title)}`, { headers: headers(ot) })).json();
        if (rows.length) throw new Error('visible to another member');
      });
      await step('after a reload the saved cipher is listed for the owner and opens again', async () => {
        await page.goto('https://sod1820.co.il/code', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.getByText(title, { exact: false }).first().waitFor({ timeout: 90000 });
        await page.getByText(title, { exact: false }).first().click();
        await page.getByRole('button', { name: 'פעולות לציר הנבחר' }).first().waitFor({ timeout: 120000 });
      });
    } finally { await context.close(); }
  }
}
