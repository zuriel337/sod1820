import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const module = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { chromium } = module.default || module;
const base = process.env.WORLD_STORY_BASE || 'http://127.0.0.1:4176';
const out = process.env.WORLD_DISCOVERY_ARTIFACTS || '/workspace/artifacts/world-1237-discovery/browser';
await fs.mkdir(out, { recursive: true });
const receipt = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), at: new Date().toISOString(),
  environment: 'isolated Vite; live anon public reads; only read-only RPCs allowed; no live authentication',
  cases: [], errors: [], blocked: [], coverage: null, negative: [] };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
let page;
try {
  for (const width of (process.env.TEST_WIDTHS || '1440,390').split(',').map(Number)) for (const theme of (process.env.TEST_THEMES || 'dark,light,parchment').split(',')) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript((value) => localStorage.setItem('sod-theme', value), theme);
    let fixture = null;
    // Capture the browser's real anonymous response before applying negative cases.
    // route.fetch uses Node's network stack, which may not share the browser proxy.
    const publicGalleryResponses = new Map();
    context.on('response', async (response) => {
      if (!fixture && new URL(response.url()).pathname === '/rest/v1/gallery_images' && response.status() === 200) {
        try { publicGalleryResponses.set(response.url(), await response.json()); } catch { /* An aborted navigation has no body. */ }
      }
    });
    await context.route('**/*', async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base && request.isNavigationRequest() && /^\/(world|topic|post|2029\/number)\b/.test(url.pathname)) {
        const html = await context.request.get(`${base}/2029.html`);
        return route.fulfill({ contentType: 'text/html', body: await html.body() });
      }
      if (fixture === 'clock' && url.pathname === '/rest/v1/nodes' && url.searchParams.get('rule_id')?.includes('moment_clock_law')) {
        return route.fulfill({ contentType: 'application/json', body: '[]' });
      }
      if (['hidden', 'changed'].includes(fixture) && url.pathname === '/rest/v1/gallery_images'
        && (url.searchParams.get('id')?.includes('62ffc447-fd91-4027-9fe9-4a19d09679fd')
          || url.searchParams.get('image_url')?.includes('hnshya-bkvtl-b-424.jpeg'))) {
        const data = publicGalleryResponses.get(request.url());
        if (data) {
          const body = Array.isArray(data) ? data.map((r) => r.id === '62ffc447-fd91-4027-9fe9-4a19d09679fd'
            ? fixture === 'hidden' ? { ...r, curator_hidden: true, description: 'DENIED_SECRET' } : { ...r, ocr_text: '424 but no Jerusalem clock witness' } : r) : data;
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        }
        receipt.errors.push('No captured public response for negative gallery fixture');
        return route.fulfill({ status: 503, contentType: 'application/json', body: '[]' });
      }
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/)?.[1];
      const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || (url.hostname === 'linswmnnkjxvweumprav.supabase.co'
        && ['gematria_api', 'fn_method_profile', 'gematria_method_trace', 'fn_zero_scale', 'posts_by_number_strict', 'fn_number_lookup',
          'fn_number_dossier', 'fn_number_journey', 'number_neighbors', 'fn_all_methods'].includes(rpc));
      if (!read) { receipt.blocked.push({ method: request.method(), path: url.pathname }); return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"read-only browser"}' }); }
      return route.continue();
    });
    page = await context.newPage();
    page.on('pageerror', (error) => receipt.errors.push(error.message));
    const saved = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')));
    const witness = () => page.locator('[data-discovery-witness]');
    const capture = (name) => page.screenshot({ path: `${out}/${name}-${theme}-${width}.png` });
    const ready = async (id) => {
      await page.locator(`[data-discovery-witness="${id}"]`).waitFor({ timeout: 60000 });
      await page.waitForFunction(() => { const image = document.querySelector('[data-discovery-witness] .sod29-canonical-media-figure img'); return image?.complete && image.naturalWidth > 0; });
    };
    const go = async (reading, id, topic = null) => {
      const target = `${base}${topic ? `/topic/${topic}#topic` : '/world#world'}-discovery-${reading}--${id}`;
      if (page.url() === target) await page.reload({ waitUntil: 'domcontentloaded' });
      else await page.goto(target, { waitUntil: 'domcontentloaded' });
      await ready(id);
    };
    const exactReturn = async () => {
      if (new URL(page.url()).pathname.startsWith('/2029/number/')) {
        await page.locator('[data-expression-focus]').getByRole('button', { name: /^↩/ }).click(); return;
      }
      if (width < 700) await page.getByRole('button', { name: 'פתח ניווט' }).click();
      await page.getByRole('button', { name: 'חזרה מדויקת', exact: true }).filter({ visible: true }).first().click();
    };
    const assertPosition = async () => {
      await page.waitForFunction(() => { const r = document.querySelector('[data-discovery-witness]')?.getBoundingClientRect(); return r && r.top >= 0 && r.top < 420; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    };
    await page.goto(`${base}/world`, { waitUntil: 'domcontentloaded' }); await ready('wall-clock');
    await capture('world-opening');
    await witness().getByRole('button', { name: /^פתח מקור מלא:/ }).click();
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('link', { name: 'פתח מקור', exact: true }).getAttribute('href'), /hnshya-bkvtl-b-424.jpeg$/);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'פתח מקור', exact: true }).click();
    const popup = await popupPromise; await popup.waitForLoadState('domcontentloaded');
    await popup.waitForFunction(() => [...document.images].some((img) => img.complete && img.naturalWidth > 0));
    await popup.screenshot({ path: `${out}/wall-original-${theme}-${width}.png` }); await popup.close();
    await page.keyboard.press('Escape');
    assert.equal(new URL(page.url()).hash, '#world-discovery-wall--wall-clock');
    assert.equal((await saved()).journey, null);
    await page.reload({ waitUntil: 'domcontentloaded' }); await ready('wall-clock'); await assertPosition();
    assert.equal(await witness().locator('[data-discovery-clock="2"]').count(), 1);
    const sourceIdentity = await witness().getAttribute('data-source-identity');
    await capture('wall-clock');
    await witness().locator('[data-open-calculation="דונלד טראמפ"]').click();
    await page.waitForURL('**/2029/number/424?*');
    await page.locator('[data-expression-focus]').waitFor({ timeout: 60000 });
    assert.equal((await saved()).returnTo.href, '/world#world-discovery-wall--wall-clock');
    assert.equal((await saved()).returnTo.selection.sourceRef, 'gallery_images:62ffc447-fd91-4027-9fe9-4a19d09679fd');
    assert.equal((await saved()).selection.method, 'רגיל');
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-expression-focus]').waitFor({ timeout: 60000 });
    await exactReturn(); await ready('wall-clock'); await assertPosition();
    await witness().getByRole('button', { name: /^424 — משיח בן דוד/ }).click();
    await page.waitForURL('**/topic/424-mashiach-ben-david#topic-discovery-wall--wall-clock'); await ready('wall-clock');
    assert.equal(await witness().getAttribute('data-source-identity'), sourceIdentity);
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.selection?.sourceRef === 'gallery_images:62ffc447-fd91-4027-9fe9-4a19d09679fd');
    await capture('topic-424');
    await exactReturn(); await ready('wall-clock'); await assertPosition();

    // Every step/transition uses the actual reader; no fabricated public content fixtures.
    const routes = await page.evaluate(async () => {
      const m = await import('/src/lib/research/worldSourceConnections.js');
      return m.WORLD_DISCOVERY_READINGS.map((r) => ({ id: r.id, steps: r.steps }));
    });
    const visited = [];
    for (const r of routes) {
      await go(r.id, r.steps[0]);
      for (let i = 0; i < r.steps.length; i++) {
        const id = r.steps[i]; await ready(id); visited.push(id);
        assert.doesNotMatch(await witness().innerText(), /אין חישוב מאומת זמין/);
        if (id === 'see-my-back') {
          assert.match(await witness().innerText(), /מקור אחד · 3 הופעות/);
          await witness().getByText('הכיתובים, הקרדיטים והמיקומים המקוריים', { exact: true }).click();
          assert.equal(await witness().locator('[data-original-occurrence]').count(), 3);
          assert.equal(await witness().getByRole('link', { name: 'לגלריה המקורית — בסדר השמור', exact: true }).count(), 3);
          await capture('three-historical-placements');
        }
        if (id === 'light-rail-45') { assert.match(await witness().innerText(), /45 רכבות, 450 נוסעים/); await capture('rail-45-450'); }
        if (id === 'clock-1445') {
          assert.equal(await witness().locator('[data-number-reading]').count(), 1);
          assert.equal(await witness().locator('[data-discovery-clock="2"]').count(), 1); await capture('clock-1445');
        }
        if (id === 'wisdom-methods') {
          await witness().getByText('לפתוח את החישובים והשיטות', { exact: false }).click();
          assert.equal(await witness().locator('[data-discovery-method]').count(), 7);
          assert.match(await witness().locator('[data-discovery-composite]').innerText(), /1893.*73.*1820/);
          await capture('wisdom-methods');
        }
        if (id === 'revelation-hidden') { await witness().getByText('לפתוח את החישובים והשיטות', { exact: false }).click(); await capture('revelation-mistater'); }
        if (id === 'delegates-1237') { assert.match(await witness().innerText(), /סף המינוי בסיבוב הראשון/); await capture('delegates-source'); }
        if (theme === 'dark' && ['india-health', 'water-train'].includes(id)) {
          const label = id === 'india-health' ? /^הציר ההודי/ : /^הודו — נקודת היראה/;
          await witness().getByRole('button', { name: label }).click();
          await page.locator('[data-source-selected="true"]').waitFor({ timeout: 60000 });
          assert.equal((await saved()).returnTo.href, `/world#world-discovery-rails--${id}`);
          await capture(`stored-topic-${id}`);
          await exactReturn(); await ready(id); await assertPosition();
        }
        if (i + 1 < r.steps.length) await page.locator(`[data-transition-to="${r.steps[i + 1]}"]`).getByRole('button').click();
      }
      console.log(`WALK ${width} ${theme} ${r.id} complete`);
    }
    for (const topic of ['1237', 'trump']) {
      await go('wall', 'see-my-back', topic);
      await witness().locator('[data-open-calculation="וראית את אחרי"]').click();
      await page.waitForURL('**/2029/number/1237?*'); await page.locator('[data-expression-focus]').waitFor({ timeout: 60000 });
      assert.equal((await saved()).returnTo.href, `/topic/${topic}#topic-discovery-wall--see-my-back`);
      await exactReturn(); await ready('see-my-back'); await assertPosition();
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready('see-my-back'); await assertPosition();
      assert.equal((await saved()).selection.sourceRef, 'gallery_images:d9842a5a-5313-4d32-8e58-5f07fa29b887');
      await capture(`topic-${topic}-return`);
    }
    if (!receipt.coverage) receipt.coverage = await page.evaluate(async () => {
      const m = await import('/src/lib/research/worldSourceConnections.js');
      return Promise.all(m.WORLD_DISCOVERY_READINGS.map(async (r) => {
        const p = await m.fetchWorldDiscovery(r.id); return { route: r.id, ...p.coverage, missing: p.missing,
          timeline: m.discoveryDocumentedTimeline(p.items),
          sources: p.items.map((w) => ({ id: w.id, identity: w.dependencyKey, ref: w.source.sourceRef, image: w.source.item.imageUrl,
            text: w.source.text, reason: w.reason, kind: w.relationKind, boundary: w.boundary, topics: w.topicLinks,
            occurrences: w.source.item.occurrences.map((o) => o.legacyPlacement || o.postPlacement),
            clock: w.clock ? { version: w.clock.rule_version, occurrence: w.clock.occurrence, application: w.clock.application } : null })),
          calculations: p.items.flatMap((w) => w.calculations.map((c) => ({ expression: c.expression, method: c.method, value: c.verified?.value,
            version: c.verified?.trace.method_version, parity: c.verified?.trace.verification?.parity }))) };
      }));
    });
    if (theme === 'dark') {
      for (fixture of ['hidden', 'changed']) {
        const target = `${base}/world#world-discovery-wall--wall-clock`;
        if (page.url() === target) await page.reload({ waitUntil: 'domcontentloaded' });
        else await page.goto(target, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'המקור בתחנה הזו אינו זמין להצגה כעת' }).waitFor({ timeout: 60000 });
        assert.equal(await witness().count(), 0); assert.doesNotMatch(await page.locator('#world-discovery').innerText(), /DENIED_SECRET/);
        receipt.negative.push({ fixture, width, pass: true });
      }
      fixture = 'clock'; await go('wall', 'wall-clock');
      assert.equal(await witness().locator('[data-discovery-clock]').count(), 0);
      assert.match(await witness().innerText(), /חוק השעון אינו זמין/);
      receipt.negative.push({ fixture, width, pass: true });
      fixture = null; await page.reload({ waitUntil: 'domcontentloaded' }); await ready('wall-clock');
      assert.equal(await witness().locator('[data-discovery-clock="2"]').count(), 1);
    }
    receipt.cases.push({ width, theme, pass: true, visited, sourceIdentity, exactWorldAndTopicReloadReturn: true, noAutomaticJourney: true });
    console.log(`PASS ${width} ${theme} · ${visited.length} source steps`);
    await context.close();
  }
  assert.deepEqual(receipt.errors, []);
  assert.ok(receipt.coverage.every((r) => !r.missing.length && r.calculations.every((c) => c.parity === true)));
} catch (error) {
  receipt.failure = String(error.stack || error);
  if (page) await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
