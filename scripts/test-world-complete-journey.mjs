// Same complete journey against local Vite or the actual protected review URL.
// Positive source/calculation responses stay live. Only writes and the explicitly
// marked unavailable-source case are intercepted; no product data is written.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { localRpc, sql, TEST_USER, OTHER_USER } from './journey-source-test-db.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORLD_JOURNEY_BASE || 'http://127.0.0.1:4174';
const out = process.env.WORLD_JOURNEY_ARTIFACTS || '/workspace/artifacts/world-integration-verification/journey';
const share = process.env.WORLD_REVIEW_SHARE_FILE ? (await fs.readFile(process.env.WORLD_REVIEW_SHARE_FILE, 'utf8')).trim() : null;
const authenticated = process.env.WORLD_JOURNEY_AUTH === '1';
assert.ok(!authenticated || new URL(base).hostname === '127.0.0.1', 'synthetic auth only on local UI');
const personalRpcs = new Set(['research_state_snapshot_v1', 'research_state_apply_ops_v1', 'fn_research_path_append_v1', 'fn_research_path_resume_v1']);
const origin = '/world#world-discovery-wall--wall-clock';
const sourceRef = 'gallery_images:62ffc447-fd91-4027-9fe9-4a19d09679fd';
const readRpcs = new Set(['gematria_api', 'fn_method_profile', 'gematria_method_trace', 'fn_zero_scale', 'posts_by_number_strict', 'fn_number_lookup', 'fn_number_dossier', 'fn_number_journey', 'number_neighbors', 'fn_all_methods']);
const receipt = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), at: new Date().toISOString(), base, cases: [], blockedWrites: [], errors: [] };
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
let page;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    let missing = false;
    let principal = TEST_USER;
    if (authenticated) {
      await sql('truncate public.research_path_revisions, public.research_paths, public.user_research, public.research_items cascade;');
      const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: TEST_USER, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'fixture-only'].join('.');
      await context.addInitScript(auth => {
        if (!localStorage.getItem('fixture-auth-seeded')) {
          localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify(auth)); localStorage.setItem('fixture-auth-seeded', '1');
        }
      }, { access_token: jwt, refresh_token: 'fixture-only', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600,
        user: { id: TEST_USER, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {} } });
    }
    await context.route('**/*', async (route) => {
      const req = route.request(), url = new URL(req.url());
      if (process.env.LOCAL_VITE === '1' && url.origin === base && req.isNavigationRequest() && /^\/(world|2029\/number)\b/.test(url.pathname)) {
        const html = await context.request.get(`${base}/2029.html`);
        return route.fulfill({ contentType: 'text/html', body: await html.body() });
      }
      if (missing && url.pathname === '/rest/v1/gallery_images') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/)?.[1];
      if (authenticated && url.hostname === 'linswmnnkjxvweumprav.supabase.co') {
        const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        if (url.pathname.startsWith('/auth/v1/')) return json(url.pathname.endsWith('/user') ? { id: TEST_USER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } : {});
        if (url.pathname === '/rest/v1/users') return json({ id: principal, tier: 'member', role: 'user' });
        if (personalRpcs.has(rpc)) {
          try { return json(await localRpc(rpc, req.postDataJSON(), principal)); }
          catch (error) { return json({ code: '42501', message: error.message }, 403); }
        }
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || readRpcs.has(rpc)) {
          return route.continue({ headers: { ...req.headers(), authorization: `Bearer ${req.headers().apikey || ''}` } });
        }
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !(url.hostname === 'linswmnnkjxvweumprav.supabase.co' && readRpcs.has(rpc))) {
        receipt.blockedWrites.push({ method: req.method(), path: url.pathname });
        return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"read-only acceptance"}' });
      }
      return route.continue();
    });
    page = await context.newPage();
    page.on('pageerror', e => receipt.errors.push(e.message));
    if (share) { await page.goto(share, { waitUntil: 'domcontentloaded' }); await page.waitForURL(url => url.origin === base && !url.searchParams.has('_vercel_share')); }
    const storageKey = `sod_research_context_v2:${authenticated ? `user:${TEST_USER}` : 'guest'}`;
    const current = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), storageKey);
    const witness = page.locator('[data-discovery-witness="wall-clock"]');
    const ready = async () => {
      await witness.waitFor({ timeout: 90000 });
      await page.waitForFunction(() => { const img = document.querySelector('[data-discovery-witness="wall-clock"] img'); return img?.complete && img.naturalWidth > 0; });
    };
    const capture = name => page.screenshot({ path: `${out}/${name}-${width}.png` });
    await page.goto(`${base}${origin}`, { waitUntil: 'domcontentloaded' }); await ready();
    assert.match(await witness.innerText(), /ירושלים/);
    assert.match(await witness.innerText(), /חוק השעון/);
    assert.equal((await current()).journey, null, 'discovery does not start a journey');
    const identity = await witness.getAttribute('data-source-identity');
    await capture('world-source');
    await witness.getByRole('button', { name: /^פתח מקור מלא:/ }).click();
    const original = page.getByRole('link', { name: 'פתח מקור', exact: true });
    assert.match(await original.getAttribute('href'), /hnshya-bkvtl-b-424.jpeg$/);
    const popupReady = page.waitForEvent('popup'); await original.click(); const popup = await popupReady;
    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForFunction(() => [...document.images].some(img => img.complete && img.naturalWidth > 0));
    const originalUrl = popup.url(); await popup.screenshot({ path: `${out}/original-${width}.png` }); await popup.close();
    await page.keyboard.press('Escape');
    await witness.locator('[data-open-calculation="דונלד טראמפ"]').click();
    await page.waitForURL('**/2029/number/424?*');
    await page.locator('[data-expression-focus]').waitFor({ timeout: 90000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const panel = page.locator('[data-number-path-continuation]'); await panel.waitFor({ timeout: 90000 });
    let selected = await current();
    assert.equal(selected.selection.expression, 'דונלד טראמפ'); assert.equal(selected.selection.method, 'רגיל');
    assert.equal(selected.returnTo.href, origin); assert.equal(selected.returnTo.selection.sourceRef, sourceRef);
    assert.equal(selected.journey, null);
    await panel.getByRole('button', { name: 'התחל מסע מהבחירה', exact: true }).click();
    await page.waitForFunction(key => !!JSON.parse(sessionStorage.getItem(key))?.journey, storageKey);
    selected = await current(); const journeyRoot = selected.journey.root.id;
    assert.ok(selected.journey.pendingSteps.some(s => s.selection?.sourceRef === sourceRef));
    assert.ok(selected.journey.pendingSteps.some(s => s.selection?.expression === 'דונלד טראמפ' && s.selection?.method === 'רגיל'));
    assert.match(await panel.innerText(), /השמירה בחשבון היא פרטית/); await capture('explicit-journey');
    await panel.getByRole('button', { name: 'שמירה וחידוש', exact: true }).click();
    await page.getByRole('button', { name: 'שמור מסלול', exact: true }).click();
    if (authenticated) {
      await page.waitForSelector('[data-research-path-resume="available"]');
      const stored = await localRpc('fn_research_path_resume_v1', { p_path_id: null });
      assert.equal(stored.steps[0].selection.sourceRef, sourceRef); assert.equal(stored.steps[0].href, origin);
      assert.equal(stored.steps.length, 2); assert.equal(stored.representation.context.returnTo.href, origin);
      assert.equal((await localRpc('fn_research_path_resume_v1', { p_path_id: stored.path_id }, OTHER_USER)).ok, false);
      principal = null; await page.getByRole('button', { name: 'שמור מסלול', exact: true }).click();
      await page.getByText('המסלול לא עודכן', { exact: true }).waitFor(); principal = TEST_USER;
      assert.equal((await localRpc('fn_research_path_resume_v1', { p_path_id: stored.path_id })).revision_no, stored.revision_no);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await panel.getByRole('button', { name: 'שמירה וחידוש', exact: true }).click();
      await page.getByRole('button', { name: 'המשך מהמסלול השמור', exact: true }).click();
      await page.waitForSelector('[role="dialog"]', { state: 'detached' });
      await page.waitForFunction(key => JSON.parse(sessionStorage.getItem(key))?.journey?.revisionNo === 1, storageKey);
      await capture('private-save-resume');
    } else {
      await page.getByText('המסלול לא עודכן', { exact: true }).waitFor(); await capture('guest-save-denied');
    }
    await page.keyboard.press('Escape');
    // Reopen the actual source step in the existing Path. The shared Frame's
    // snapshot-return control is a separate owner dependency, recorded below.
    await panel.locator('summary').click();
    await panel.locator('ol li button').first().click();
    await page.waitForURL(`${base}${origin}`); await ready();
    assert.equal(await witness.getAttribute('data-source-identity'), identity);
    await page.waitForFunction(() => { const r = document.querySelector('[data-discovery-witness]')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < 420; });
    assert.equal((await current()).journey.root.id, journeyRoot);
    assert.equal((await current()).journey.kind, 'research_path');
    await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
    assert.equal((await current()).selection.sourceRef, sourceRef); assert.equal((await current()).journey.root.id, journeyRoot);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await capture('exact-return-reload');
    // This negative fixture exercises the actual source reader; it is not a
    // positive source or an authorization assertion based only on a URL.
    if (process.env.TEST_SOURCE_UNAVAILABLE !== '0') {
      missing = true; await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'המקור בתחנה הזו אינו זמין להצגה כעת' }).waitFor({ timeout: 90000 });
      assert.equal(await witness.count(), 0); assert.equal((await current()).journey.root.id, journeyRoot);
      missing = false; await page.getByRole('button', { name: 'בדיקה מחדש', exact: true }).click(); await ready();
    }
    receipt.cases.push({ width, pass: true, sourceRef, originalUrl, origin, method: 'רגיל', expression: 'דונלד טראמפ', explicitPersonalJourney: true, guestSaveDenied: !authenticated, privateSaveResumeAndOtherPrincipalDenied: authenticated, authEnvironment: authenticated ? 'synthetic auth + disposable PostgreSQL17; never production writes' : 'guest', returnControl: 'existing Path first source step', exactReturnAndReload: true, sourceUnavailableChecked: process.env.TEST_SOURCE_UNAVAILABLE !== '0' });
    await context.close(); console.log(`PASS complete World journey ${width}`);
  }
  assert.deepEqual(receipt.errors, []);
} catch (error) {
  receipt.failure = String(error.stack || error); await page?.screenshot({ path: `${out}/failure.png` }).catch(() => {}); throw error;
} finally {
  await fs.writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2)); await browser.close();
}
