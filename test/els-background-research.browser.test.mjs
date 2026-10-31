// Built page, Frame, ResearchProvider and existing canonical adapters. ALL external IO is
// intercepted; iframe, corpus responses, auth and model replies below are declared test fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { applyResearchOps, emptyResearchState } from '../src/lib/research/researchSyncState.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const dist = fileURLToPath(new URL('../dist', import.meta.url));
const uid = '11111111-1111-4111-8111-111111111111';
const axis = { entityType: 'els', term: 'תורה', corpus: 'torah', skip: 50, dir: 1, start: 5 };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const iframe = `<!doctype html><html><body>Engine transport fixture<script>
window.__loads=[];addEventListener('message',event=>{if(event.data?.type==='load-matrix')window.__loads.push(event.data.item);});
window.__publish=state=>parent.postMessage({source:'tzofen',type:'state',...state},location.origin);
parent.postMessage({source:'tzofen',type:'ready'},location.origin);</script></body></html>`;

test('non-AI research survives route unmount, remains independent of Raziel, returns exactly and cancels', { timeout: 180000 }, async () => {
  assert.ok(existsSync(join(dist, '2029.html')), 'build:2029 first');
  const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8'));
  const eager = new Set();
  function visit(key) { if(eager.has(key))return;eager.add(key);for(const dep of manifest[key]?.imports || [])visit(dep); }
  visit(Object.keys(manifest).find(key => manifest[key].src?.endsWith('2029.html') || key === '2029.html'));
  assert.ok(manifest['src/lib/research/elsBackgroundResearch.js'], 'bounded executor has its own lazy chunk');
  assert.equal(eager.has('src/lib/research/elsBackgroundResearch.js'), false, 'executor not loaded with global shell');
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://test').pathname));
    if (/tzofen(?:-standalone)?\.html$/.test(path)) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(iframe); return; }
    const file = join(dist, path);
    const asset = file.startsWith(dist + '/') && existsSync(file) && statSync(file).isFile() ? file : join(dist, '2029.html');
    res.writeHead(200, { 'content-type': mime[extname(asset)] || 'application/octet-stream' }); res.end(readFileSync(asset));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
  const errors = [];
  try {
    for (const theme of ['light', 'parchment', 'dark']) for (const width of [320, 390, 1440]) {
      let cloud = { ...emptyResearchState(), revision: 0, context: {
        subject: { id: 'תורה', type: 'phrase', label: 'תורה', href: '/code' }, lens: 'els', selection: axis,
      } };
      const calls = []; let ai = 0, release;
      const user = { id: uid, email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} };
      const jwt = [{ alg: 'HS256', typ: 'JWT' }, { sub: uid, role: 'authenticated', exp: 2200000000 }, 'test-only'].map((x, i) => i === 2 ? x : Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(({ user, jwt, theme, selection }) => {
        localStorage.setItem('sod-theme', theme);
        localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'test-only', expires_at: 2200000000, expires_in: 3600, token_type: 'bearer', user }));
        const key = 'sod_research_context_v2:user:' + user.id;
        if (window === window.top && !sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ subject: { id: 'תורה', type: 'phrase', label: 'תורה', href: '/code' }, lens: 'els', selection }));
      }, { user, jwt, theme, selection: axis });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
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
        } else if (url.pathname.includes('ai-analyze')) { ai++; body = { v: 1, answer: 'תשובת בדיקה בלבד', sources: [], grounding: 'interpretation' }; }
        else if (url.pathname.includes('els-search-bridge')) {
          const b = req.postDataJSON(); calls.push(b);
          if (b.op === 'verify') body = { result: { contract: 'els_occurrence_replay_v1', status: 'OK', verification_state: 'MATCH', corpus_id: 'fixture', input: { normalized: b.term }, occurrence: { skip: b.skip, dir: b.dir, start: b.start, end: b.start + b.skip * b.dir * (b.term.length - 1), positions: Array.from(b.term, (_, i) => b.start + i * b.skip * b.dir) } } };
          else if (b.op === 'page') {
            if (b.term === 'אמת') await new Promise(resolve => { release = resolve; });
            body = { result: { contract: 'els_search_page_v1', status: 'OK', corpus_id: 'fixture', input: { normalized: b.term }, hits: [{ skip: 86, dir: 1, start: 1200, end: 1372, positions: [1200, 1286, 1372] }], completion: { executed: true, has_more: false, truncated: false } } };
          }
        }
        await route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
      });
      await page.goto(origin + '/code?mode=research');
      await page.getByRole('button', { name: 'חיפוש מתקדם', exact: true }).click();
      const advanced = page.locator('[data-els-advanced-search]');
      const checkFormLayout = async () => {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Advanced ${width}/${theme}`);
        assert.equal(await advanced.locator('button[type=submit]:visible').count(), 1, 'one primary action');
        const issues = await advanced.locator('button:visible, input:visible, select:visible, textarea:visible, summary:visible').evaluateAll(nodes => nodes.flatMap(node => {
          const checkbox = ['checkbox', 'radio'].includes(node.type);
          const target = checkbox ? node.closest('label') : node;
          const box = target.getBoundingClientRect();
          const failures = [];
          if (box.height < 43.5 || box.width < 43.5) failures.push(`target: ${node.getAttribute('aria-label') || node.textContent}`);
          if (!checkbox && parseFloat(getComputedStyle(node).fontSize) < 16) failures.push(`font: ${node.getAttribute('aria-label') || node.textContent}`);
          return failures;
        }));
        assert.deepEqual(issues, [], `Advanced controls ${width}/${theme}`);
      };
      await checkFormLayout();
      assert.equal(await advanced.locator('details').evaluate(el => el.open), false, 'optional tools stay collapsed');
      await page.getByLabel('מונח לחיפוש מתקדם').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.getByLabel('טקסט לחיפוש מתקדם').evaluate(el => el === document.activeElement), true, 'keyboard follows input order');
      if (process.env.ELS_SCREENSHOT_DIR) {
        mkdirSync(process.env.ELS_SCREENSHOT_DIR, { recursive: true });
        await page.getByLabel('מונח לחיפוש מתקדם').scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(process.env.ELS_SCREENSHOT_DIR, `advanced-built-${width}-${theme}.png`) });
      }
      await page.getByText('אפשרויות נוספות · היפוכים ובדיקה ברקע', { exact: true }).click();
      await page.getByRole('radio', { name: 'בדוק גם היפוכים וסדר מילים', exact: true }).check();
      await checkFormLayout();
      assert.equal(calls.filter(x => x.op === 'page').length, 0, 'opening/changing controls does not search');
      assert.equal(ai, 0);
      await page.getByRole('radio', { name: 'בדיקת ביטויים ברקע · ללא AI', exact: true }).check();
      await page.getByLabel('מונח לחיפוש מתקדם').fill('אמת');
      await page.getByLabel('מילות המשך למחקר').fill('חסד');
      await page.getByLabel('דילוג מקסימלי').fill('200');
      await page.locator('iframe').first().evaluate(el=>el.contentWindow.__publish({status:'ok',term:'תורה',termRaw:'תורה',scope:'torah',verification:{state:'MATCH',corpus_id:'fixture'},
        axis:{hitId:'50_1_5',start:5,skip:50,direction:'fwd',length:4},geometry:{cw:40},
        ui:{ctxR:1,windowSize:'small',windowRequested:'small',zoom:1.6,fit:false,heat:true,niqqud:false,showN:2,findingRadius:null},
        findings:[{t:'אמת',color:'#112233',shown:['49_1_25'],sourceHits:[]}]}));
      const start = page.getByRole('button', { name: 'התחל בדיקה ברקע', exact: true });
      try { await start.click(); } catch (error) { throw new Error(`${width}/${theme}: ${JSON.stringify({ calls, selection: cloud.context?.selection, errors, panel: await page.locator('[data-els-advanced-search]').innerText() })}`, { cause: error }); }
      await page.locator('[data-els-research-task="RUNNING"]').waitFor();
      await page.waitForFunction(() => document.querySelector('[data-els-research-task]')?.textContent.includes('בודק: אמת'));
      assert.equal(ai, 0);
      await page.evaluate(() => { history.pushState({}, '', '/2029'); dispatchEvent(new PopStateEvent('popstate')); });
      await page.getByRole('button', { name: 'עכשיו · סורק', exact: true }).click();
      const activity = page.getByLabel('מעקב מחקר ללא AI');
      await activity.waitFor();
      assert.match(await activity.innerText(), /תורה/);
      assert.equal(calls.filter(x => x.op === 'page').length, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}/${theme}`);
      // Real global conversation remains available; research never sets its busy state.
      await page.keyboard.press('Escape');
      await page.locator('.sod29-command-island .sod29-raziel-orb').click();
      const chat = page.locator(width >= 1000 ? '[data-raziel-companion-view="open"] [data-raziel-native-chat="true"]' : '.sod29-frame-panel [data-raziel-native-chat="true"]');
      await chat.getByRole('textbox', { name: 'שאלה לרזיאל', exact: true }).fill('שאלת בדיקה בזמן המחקר');
      assert.equal(await chat.getByRole('button', { name: 'שלח', exact: true }).isEnabled(), true);
      assert.equal(ai, 0);
      release();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'עכשיו · תוצאות', exact: true }).click();
      await page.locator('[data-els-research-task="COMPLETE"]').waitFor();
      assert.equal(calls.filter(x => x.op === 'page').length, 2);
      await page.getByRole('button', { name: 'חזור למופע ולתוצאות המחקר', exact: true }).click();
      await page.locator('[data-els-research-task="COMPLETE"]').waitFor();
      const frame = page.frameLocator('iframe').first();
      await frame.locator('body').waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some(f => f.contentWindow.__loads?.some(item => item.hitId === '50_1_5')));
      assert.equal(calls.filter(x => x.op === 'page').length, 2, 'return does not rerun the research');
      assert.equal(await page.locator('[data-els-research-task] details').count(), 2);
      const restored = await page.locator('iframe').first().evaluate(el=>el.contentWindow.__loads.find(item=>item.hitId==='50_1_5'));
      assert.equal(restored.view.zoom,1.6);
      assert.deepEqual(restored.words,[{t:'אמת',color:'#112233',sh:['49_1_25'],sourceShown:[]}]);
      const resultActivity = page.locator('[data-els-research-task="COMPLETE"]');
      await resultActivity.scrollIntoViewIfNeeded();
      assert.equal(await resultActivity.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'activity fits its own panel');
      assert.deepEqual(await resultActivity.locator('button').evaluateAll(nodes => nodes.filter(n => { const r=n.getBoundingClientRect();return r.width<43.5||r.height<43.5; }).map(n=>n.textContent)), [], 'touch targets');
      if (process.env.ELS_SCREENSHOT_DIR) { mkdirSync(process.env.ELS_SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: join(process.env.ELS_SCREENSHOT_DIR, `background-research-${width}-${theme}.png`) }); }
      await page.locator('[data-els-research-task] details summary').first().click();
      const verifiesBefore = calls.filter(x => x.op === 'verify').length;
      await page.locator('[data-els-research-task] details').first().getByRole('button').click();
      await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some(f => f.contentWindow.__loads?.some(item => item.hitId === '86_1_1200')));
      assert.equal(calls.filter(x => x.op === 'verify').length, verifiesBefore + 1, 'result opens only after canonical replay');
      assert.equal(ai, 0);
      page.on('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'נקה תוצאה זמנית', exact: true }).click();
      // Exact return may remount the form; choose the same existing background action explicitly.
      await page.getByRole('button', { name: 'חיפוש מתקדם', exact: true }).click();
      const extra = page.locator('.els29-advanced-options');
      if (!await extra.evaluate(el => el.open)) await extra.locator('summary').click();
      await page.getByRole('radio', { name: 'בדיקת ביטויים ברקע · ללא AI', exact: true }).check();
      await page.getByLabel('מונח לחיפוש מתקדם').fill('אמת'); await page.getByLabel('מילות המשך למחקר').fill('חסד');
      await page.getByLabel('דילוג מקסימלי').fill('200');
      await start.click();
      await page.waitForFunction(() => document.querySelector('[data-els-research-task]')?.textContent.includes('בודק: אמת'));
      await page.getByRole('button', { name: 'עצור מחקר', exact: true }).click();
      release();
      await page.locator('[data-els-research-task="CANCELLED"]').waitFor();
      await page.waitForTimeout(150);
      assert.equal(calls.filter(x => x.op === 'page').length, 3, 'cancel sends no next term');
      await page.reload();
      await page.getByRole('button', { name: 'חיפוש מתקדם', exact: true }).click();
      await page.getByLabel('מונח לחיפוש מתקדם').waitFor();
      assert.equal(await page.getByLabel('מעקב מחקר ללא AI').count(), 0, 'reload does not pretend to restore a memory-only task');
      assert.equal(calls.filter(x => x.op === 'page').length, 3, 'reload never auto-restarts a scan');
      assert.equal(ai, 0);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
