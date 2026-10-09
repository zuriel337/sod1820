import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { chromium } = pw.default || pw;
const base = process.env.WORLD_STORY_BASE || 'http://127.0.0.1:4175';
const out = process.env.WORLD_LAWS_ARTIFACTS || '/workspace/artifacts/world-source-laws-20261009';
await fs.mkdir(out, { recursive: true });
const receipt = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), at: new Date().toISOString(),
  environment: 'isolated Vite; live anonymous public reads; remote writes blocked; no live auth', cases: [], errors: [], blocked: [], sources: [] };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
let page;
try {
  for (const width of (process.env.TEST_WIDTHS || '1440,390').split(',').map(Number)) for (const theme of (process.env.TEST_THEMES || 'dark,light,parchment').split(',')) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    await context.addInitScript((value) => localStorage.setItem('sod-theme', value), theme);
    let missingLaw = false;
    await context.route('**/*', async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base && request.isNavigationRequest() && /^\/(world|topic|post|2029\/number)\b/.test(url.pathname)) {
        const html = await context.request.get(`${base}/2029.html`);
        return route.fulfill({ contentType: 'text/html', body: await html.body() });
      }
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/)?.[1];
      if (missingLaw && rpc === 'fn_zero_scale') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"negative fixture: law unavailable"}' });
      const read = ['GET','HEAD','OPTIONS'].includes(request.method()) || (url.hostname === 'linswmnnkjxvweumprav.supabase.co'
        && ['gematria_api','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','number_neighbors','fn_all_methods'].includes(rpc));
      if (!read) { receipt.blocked.push({ method: request.method(), path: url.pathname }); return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"read-only browser"}' }); }
      return route.continue();
    });
    page = await context.newPage();
    page.on('pageerror', (error) => receipt.errors.push(error.message));
    const capture = async (name) => page.screenshot({ path: `${out}/${name}-${theme}-${width}.png` });
    const saved = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')));
    const exactReturn = async () => {
      // Number exposes a stable exact-return action in its focus ribbon. Its mobile
      // navigation drawer can close while the asynchronous method profile settles.
      if (new URL(page.url()).pathname.startsWith('/2029/number/')) {
        await page.locator('[data-expression-focus]').getByRole('button', { name: /^↩/ }).click();
        return;
      }
      if (width < 700) await page.getByRole('button', { name: 'פתח ניווט' }).click();
      await page.getByRole('button', { name: 'חזרה מדויקת', exact: true }).filter({ visible: true }).first().click();
    };
    const selectDirection = async (name, first) => {
      await page.getByRole('button', { name, exact: false }).click();
      await page.locator(`[data-witness="${first}"]`).waitFor({ timeout: 60000 });
    };
    await page.goto(`${base}/world`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'כיווני המשך' }).waitFor({ timeout: 60000 });
    await page.getByRole('navigation', { name: 'כיווני המשך' }).scrollIntoViewIfNeeded();
    await capture('directions');
    await selectDirection('הקשר ל־7 באוקטובר', 'date-718');
    const dates = page.locator('[data-witness="date-718"]');
    assert.equal(await dates.locator('[data-law="shitat_haechad_alef_law"]').count(), 1);
    assert.match(await dates.innerText(), /1718 → 1000 \+ 718/);
    assert.equal(await page.locator('[data-witness]').count(), 4);
    await dates.getByText('הקטע המדויק מן הפוסט', { exact: true }).click();
    assert.match(await dates.locator('blockquote').innerText(), /סלי עלמה מור/);
    await dates.getByText('הקטע המדויק מן הפוסט', { exact: true }).click();
    await capture('october');
    await selectDirection('הודו ו־14–45', 'india-health');
    const health = page.locator('[data-witness="india-health"]');
    assert.equal(await health.locator('[data-law="zero_scale_law"]').count(), 2);
    assert.match(await health.innerText(), /140 ↔ 14/);
    const train = page.locator('[data-witness="water-train"]');
    assert.match(await train.innerText(), /מקור אחד · 2 הופעות/);
    assert.match(await train.innerText(), /216 ↔ 2160/);
    await capture('india-laws');
    await health.getByRole('button', { name: /פתח מקור:/ }).click();
    await page.getByRole('dialog').waitFor();
    const imageHref = await page.getByRole('link', { name: 'פתח מקור', exact: true }).getAttribute('href');
    assert.match(imageHref, /hvdv-450\.jpg$/);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'פתח מקור', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(), imageHref);
    await popup.waitForFunction(() => [...document.images].some((img) => img.complete && img.naturalWidth > 0));
    await popup.screenshot({ path: `${out}/health-original-${theme}-${width}.png` });
    await popup.close(); await page.keyboard.press('Escape');
    assert.equal((await saved()).journey, null);
    assert.equal(new URL(page.url()).hash, '#world-source-india-health');
    await health.locator('[data-calculation="רגיל"]').first().click();
    await page.waitForURL('**/2029/number/14?*');
    await page.locator('[data-expression-focus]').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.selection?.expression === 'דוד');
    assert.equal((await saved()).returnTo.selection.sourceRef, 'gallery_images:6232be42-82a3-41ac-b4d3-004a21e48c7f');
    const numberSelectionSourceRetained = (await saved()).selection.sourceRef != null;
    assert.equal((await saved()).selection.method, 'רגיל');
    assert.equal((await saved()).returnTo.href, '/world#world-source-india-health');
    await capture('number-source');
    await exactReturn();
    await health.waitFor({ timeout: 60000 });
    await page.waitForFunction(() => { const r = document.getElementById('world-source-india-health')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < 500; });
    await health.getByRole('button', { name: 'לטופיק — באותה תמונה' }).click();
    await page.waitForURL('**/topic/india-axis#topic-source-6232be42-82a3-41ac-b4d3-004a21e48c7f');
    await page.locator('#topic-source-6232be42-82a3-41ac-b4d3-004a21e48c7f').waitFor({ timeout: 60000 });
    await capture('topic-source');
    await exactReturn(); await health.waitFor({ timeout: 60000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await health.waitFor({ timeout: 60000 });
    await page.waitForFunction(() => { const r = document.getElementById('world-source-india-health')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < 500; });
    await capture('world-exact-return');
    await selectDirection('מה נפתח בחכמה 73', 'wisdom-methods');
    const wisdom = page.locator('[data-witness="wisdom-methods"]');
    assert.equal(await wisdom.getByRole('button', { name: 'לטופיק — באותה תמונה' }).count(), 0, 'no invented Topic membership');
    await wisdom.getByText('כל השיטות ופירוט החישוב', { exact: true }).click();
    const composite = wisdom.locator('[data-composite-trace]');
    await composite.waitFor();
    assert.equal(await wisdom.locator('[data-spelling-source="ui_transitional_unverified"]').count(), 1, 'ordinary Miluy reuses shared Stage with honest spelling provenance');
    assert.equal(await wisdom.locator('[data-calculation-detail="מילוי בלבד גדול"] [data-method-key="מילוי"]').count(), 0, 'unsupported composite never falls back to ordinary Miluy');
    assert.match(await composite.innerText(), /1893/); assert.match(await composite.innerText(), /73/); assert.match(await composite.innerText(), /1820/);
    await composite.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'expanded shared method stage has no horizontal overflow');
    await capture('wisdom-composite');
    await wisdom.locator('[data-calculation="מילוי בלבד גדול"]').click();
    await page.waitForURL('**/2029/number/1820?*');
    assert.equal(new URL(page.url()).searchParams.get('method'), 'מילוי בלבד גדול');
    await page.waitForFunction(() => { const c = JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')); return c?.selection?.expression === 'חכמה' && c.selection.method === 'מילוי בלבד גדול'; });
    assert.equal((await saved()).returnTo.selection.sourceRef, 'gallery_images:c502fa89-96f1-495b-aeb7-b16deaaa96b3');
    await capture('wisdom-number');
    await exactReturn(); await wisdom.waitFor({ timeout: 60000 });
    await page.waitForFunction(() => { const r = document.getElementById('world-source-wisdom-methods')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < 500; });
    await capture('wisdom-return');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
    receipt.sources = await page.locator('[data-witness]').evaluateAll((items) => items.map((item) => ({ witness: item.dataset.witness, sourceIdentity: item.dataset.sourceIdentity })));
    missingLaw = true;
    await selectDirection('הודו ו־14–45', 'india-health');
    assert.equal(await health.locator('[data-law="zero_scale_law"]').count(), 0);
    assert.equal(await health.locator('[data-law="unavailable"]').count(), 2);
    assert.equal(await health.locator('[data-calculation="רגיל"]').count(), 2, 'source and calculation survive a law outage');
    await capture('law-unavailable');
    receipt.cases.push({ width, theme, status: 'PASS', sourceOpened: true, originalLoaded: true, numberExactFocusAndReturn: true,
      topicSameImageReturn: true, reloadExact: true, numberSelectionSourceRetained, compositeMethodPreserved: true, lawFailureClosed: true, noAutomaticPath: true });
    await fs.writeFile(`${out}/browser-receipt.json`, JSON.stringify(receipt, null, 2));
    console.log(`PASS World source laws ${theme} ${width}`);
    await context.close();
  }
  assert.deepEqual(receipt.errors, []);
} catch (error) {
  receipt.failure = error.stack;
  if (page && !page.isClosed()) await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(`${out}/browser-receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
