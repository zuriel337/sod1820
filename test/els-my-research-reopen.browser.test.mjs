// "My Research" opens an ELS finding in the cipher (ZURIEL 18.11.2026): built page, Frame, ResearchProvider and the real cloud sync
// adapter. All external IO is intercepted; the engine iframe is a transport fixture that records every load and publishes the states
// the canonical engine would. Acceptance: a finding saved from the cipher, after a reload, opens /code in Research on the same matrix
// with the same occurrence_id; the same occurrence typed in another spelling is the same finding; the same coordinates in the Tanakh
// are another finding. Run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { applyResearchOps, emptyResearchState } from '../src/lib/research/researchSyncState.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const dist = fileURLToPath(new URL('../dist', import.meta.url));
const uid = '11111111-1111-4111-8111-111111111111';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const iframe = `<!doctype html><html><body>Engine transport fixture<script>
window.__loads=[];addEventListener('message',event=>{if(event.data?.type==='load-matrix')window.__loads.push(event.data.item);});
window.__publish=state=>parent.postMessage({source:'tzofen',type:'state',...state},location.origin);
parent.postMessage({source:'tzofen',type:'ready'},location.origin);</script></body></html>`;
const TORAH = 'torah-fixture-corpus', TANAKH = 'tanakh-fixture-corpus';
// The engine state after an exact occurrence opened: the same letters and coordinates, with the engine's own occurrence_id.
const engineState = ({ termRaw, term = 'התשפז', scope = 'torah', corpus = TORAH }) => ({ status: 'ok', term, termRaw, scope,
  verification: { state: 'MATCH', corpus_id: corpus }, axis: { hitId: '50_1_5', start: 5, skip: 50, direction: 'fwd', length: 5,
    occurrence_id: `els:${corpus}:${term}:50:1:5` }, geometry: { cw: 40, S: 50, r0: 0, r1: 6, c0: 0, mainCol: 5 },
  ui: { ctxR: 1, windowSize: 'small', windowRequested: 'small', zoom: 1, fit: true, heat: false, niqqud: false, showN: 2, findingRadius: null },
  occurrence: { index: 0, count: 1, capped: false }, findings: [] });

test('My Research reopens a saved ELS finding on its exact occurrence after a reload; spellings merge, corpora do not', { timeout: 240000 }, async () => {
  assert.ok(existsSync(join(dist, '2029.html')), 'npm run build first');
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://test').pathname));
    if (/tzofen(?:-standalone)?\.html$/.test(path)) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(iframe); return; }
    const file = join(dist, path);
    const asset = file.startsWith(dist + '/') && existsSync(file) && statSync(file).isFile() ? file : join(dist, '2029.html');
    res.writeHead(200, { 'content-type': mime[extname(asset)] || 'application/octet-stream' }); res.end(readFileSync(asset));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) });
  const errors = [];
  try {
    let cloud = { ...emptyResearchState(), revision: 0 };
    const user = { id: uid, email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} };
    const jwt = [{ alg: 'HS256', typ: 'JWT' }, { sub: uid, role: 'authenticated', exp: 2200000000 }, 'test-only'].map((x, i) => i === 2 ? x : Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ user, jwt }) => {
      localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'test-only', expires_at: 2200000000, expires_in: 3600, token_type: 'bearer', user }));
    }, { user, jwt });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === origin) return route.continue();
      if (url.hostname !== 'linswmnnkjxvweumprav.supabase.co') return route.abort();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let body = [];
      if (url.pathname === '/auth/v1/user') body = user;
      else if (url.pathname.endsWith('/users')) body = { id: uid, display_name: 'בודק', role: 'user' };
      else if (url.pathname.endsWith('/site_flags')) body = ['lock_world', 'lock_els', 'lock_raziel_site', 'lock_books', 'lock_number'].map(key => ({ key, enabled: false, mode: 'all' }));
      else if (url.pathname.endsWith('/research_state_snapshot_v1')) body = cloud;
      else if (url.pathname.endsWith('/research_state_apply_ops_v1')) {
        const b = req.postDataJSON(); cloud = { ...applyResearchOps(cloud, b.p_ops), revision: cloud.revision + 1 };
        body = { ok: true, batch_id: b.p_batch_id, applied_revision: cloud.revision, snapshot: cloud };
      }
      await route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
    });
    const engine = () => page.frameLocator('iframe').first();
    const publish = state => page.locator('iframe').first().evaluate((el, state) => el.contentWindow.__publish(state), state);
    const addToResearch = async state => {
      await publish(state);
      const save = page.getByRole('button', { name: 'הוסף למחקר', exact: true });
      if (!(await save.isVisible().catch(() => false))) await page.locator('.els29-native-toolstrip').getByRole('button', { name: 'שמירה', exact: true }).click();
      await save.waitFor();
      await page.waitForFunction(() => !document.querySelector('button[disabled]') || [...document.querySelectorAll('button')].some(b => b.textContent === 'הוסף למחקר' && !b.disabled));
      await save.click();
      await page.getByText('הממצא נוסף לתיק המחקר שלך.').waitFor();
    };
    await page.goto(origin + '/code?mode=research');
    await engine().locator('body').waitFor();
    const els = () => (cloud.cart || []).filter(e => e?.finding?.kind === 'els');
    // 1. The same occurrence twice in two spellings, then the same coordinates in the Tanakh.
    await addToResearch(engineState({ termRaw: 'התשפ״ז' }));
    await page.waitForFunction(() => true); await expectCart(1);
    await addToResearch(engineState({ termRaw: 'התשפז' }));
    await addToResearch(engineState({ termRaw: 'התשפ״ז', scope: 'tanakh', corpus: TANAKH }));
    await expectCart(2);
    async function expectCart(n) {
      for (let i = 0; i < 100 && els().length !== n; i++) await new Promise(r => setTimeout(r, 100));
      assert.equal(els().length, n, JSON.stringify(els().map(e => [e.id, e.title])));
    }
    const [torah, tanakh] = ['torah', 'tanakh'].map(scope => els().find(e => e.finding.source.corpus === scope));
    assert.equal(torah.finding.identity.sourceIdentity, `els:${TORAH}:התשפז:50:1:5`, 'the finding is the engine occurrence');
    assert.equal(tanakh.finding.identity.sourceIdentity, `els:${TANAKH}:התשפז:50:1:5`, 'the same coordinates in the Tanakh are another finding');
    assert.equal(torah.title, 'התשפ״ז', 'the spelling it was first saved with stays for display');
    assert.equal(torah.link, `/code?mode=research&finding=${encodeURIComponent(torah.id)}`);
    // 2. Reload, open My Research, click each finding: /code in Research, loading the exact occurrence of its own corpus.
    for (const saved of [torah, tanakh]) {
      await page.goto(origin + '/2029');
      await page.locator('.sod29-header-workspace:visible').first().click();
      // My Research: the personal area's "research and saved" card, then the finding in its list.
      await page.locator('[data-panel-kind="workspace"]').getByRole('button', { name: /^המחקר והשמורים/ }).click();
      const row = page.locator('[data-research-bucket="cart"] .sod29-workspace-follow-open').filter({ hasText: saved.title });
      await page.locator('[data-research-bucket="cart"]').first().waitFor();
      const target = saved === torah ? row.first() : row.last();
      await target.click();
      await page.waitForURL(url => url.pathname === '/code' && url.searchParams.get('mode') === 'research' && url.searchParams.get('finding') === saved.id);
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.__loads?.length > 0, null, { timeout: 30000 });
      const loaded = await page.locator('iframe').first().evaluate(el => el.contentWindow.__loads.at(-1));
      assert.equal(loaded.occurrenceId, saved.finding.identity.sourceIdentity, `${saved.finding.source.corpus}: the exact occurrence is requested`);
      assert.equal(loaded.scope, saved.finding.source.corpus);
      assert.deepEqual([loaded.skip, loaded.dir, loaded.start, loaded.hitId], [50, 1, 5, '50_1_5']);
      // The engine opens that occurrence: the page shows the same matrix, in Research, with the same occurrence_id.
      const opened = engineState({ termRaw: saved.title, scope: loaded.scope, corpus: loaded.scope === 'tanakh' ? TANAKH : TORAH });
      await publish(opened);
      assert.equal(opened.axis.occurrence_id, saved.finding.identity.sourceIdentity);
      assert.equal(await page.locator('.els29-mode-selector').getByRole('button', { name: 'מחקר', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.getByText(/לא נפתח|לא שוחזר|לא הצלחנו לשחזר/).count(), 0, 'no restore error');
    }
    // 3. A finding saved before this change (hitId identity, a /research?finding= link, a snapshot without the id) still opens the
    //    cipher from My Research on the same occurrence, through the compatibility path (hitId + scope).
    const oldId = 'uf1:els:%D7%99%D7%A9%D7%9F:50_1_5';
    const older = { ...torah, id: oldId, ref: oldId, title: 'ישן', label: 'ישן', link: `/research?finding=${encodeURIComponent(oldId)}`,
      finding: { ...torah.finding, id: oldId, subject: { ...torah.finding.subject, key: 'ישן', label: 'ישן' }, identity: { sourceIdentity: '50_1_5', occurrence: { hitId: '50_1_5', skip: 50, dir: 1, start: 5 } },
        verification: { ...torah.finding.verification, engine_result: { corpus: 'torah', hitId: '50_1_5', skip: 50, dir: 1, start: 5 } },
        projection: { ...torah.finding.projection, journeySnapshot: { ...torah.finding.projection.journeySnapshot, axis: { ...torah.finding.projection.journeySnapshot.axis, occurrenceId: undefined } } } } };
    cloud = { ...cloud, cart: [...cloud.cart, older], revision: cloud.revision + 1 };
    await page.goto(origin + '/2029');
    await page.locator('.sod29-header-workspace:visible').first().click();
    await page.locator('[data-panel-kind="workspace"]').getByRole('button', { name: /^המחקר והשמורים/ }).click();
    await page.locator('[data-research-bucket="cart"] .sod29-workspace-follow-open').filter({ hasText: 'ישן' }).click();
    await page.waitForURL(url => url.pathname === '/code' && url.searchParams.get('mode') === 'research' && url.searchParams.get('finding') === oldId);
    await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.__loads?.length > 0, null, { timeout: 30000 });
    const compat = await page.locator('iframe').first().evaluate(el => el.contentWindow.__loads.at(-1));
    assert.equal(compat.occurrenceId, undefined, 'no id is invented for an older finding');
    assert.deepEqual([compat.scope, compat.hitId, compat.skip, compat.dir, compat.start], ['torah', '50_1_5', 50, 1, 5]);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
