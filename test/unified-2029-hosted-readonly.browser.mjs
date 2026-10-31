// Hosted real public reads only. No login impersonation, model call or product write.
// The temporary Vercel access URL is supplied on stdin and never saved or logged.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const origin = new URL(process.env.UNIFIED_PREVIEW_ORIGIN).origin;
const sha = process.env.UNIFIED_PREVIEW_SHA;
const out = process.env.UNIFIED_PREVIEW_OUT || '/tmp/unified-hosted-acceptance';
await mkdir(out, { recursive: true });
let access;
for await (const line of createInterface({ input: process.stdin })) { access = line.trim(); break; }
assert.equal(new URL(access).origin, origin);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(proxy ? { proxy } : {}) });
const cases = [], errors = [], models = [], blocked = [];
const readRPCs = new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','fn_verses_by_gematria','lang_links_list','number_neighbors','fn_all_methods','world_group_source_arrivals_v2','rd_is_admin','fn_list_family','fn_name_protocol','fn_cross_research','community_feed_page','community_message_context']);
try {
  for (const width of [320,390,1440]) for (const theme of ['light','parchment','dark']) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: 'he-IL' });
    await context.addInitScript(theme => localStorage.setItem('sod-theme', theme), theme);
    await context.route('**/*', route => {
      const req = route.request(), u = new URL(req.url());
      if (u.origin === origin || ['GET','HEAD','OPTIONS'].includes(req.method())) return route.continue();
      if (u.origin === 'https://linswmnnkjxvweumprav.supabase.co' && readRPCs.has(u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1])) return route.continue();
      blocked.push({ method: req.method(), path: u.pathname }); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => { if (/\/functions\/v1\/(ai-analyze|research-run|wa-raziel|els-live-reading)$/.test(new URL(req.url()).pathname)) models.push(new URL(req.url()).pathname); });
    try { await page.goto(access, { waitUntil: 'domcontentloaded' }); }
    catch { throw new Error('Protected Preview access failed (access URL withheld)'); }
    const identity = await page.evaluate(() => fetch('/preview-identity.json').then(r => r.json()));
    assert.equal(identity.sha, sha); assert.equal(identity.transport, 'existing-live-ai-analyze');
    assert.equal(identity.product_writes, false); assert.equal(identity.matrix_jobs, false);
    const api = await page.evaluate(async () => { const r = await fetch('/api/contributor-self'); return { status: r.status, type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), body: await r.json() }; });
    assert.equal(api.status,401); assert.match(api.type,/json/); assert.match(api.cache,/no-store/);
    assert.equal(api.body.state,'login_required');
    for (const path of ['/2029','/world','/2029/posts','/books','/code','/community/chat','/2029/journey','/2029/number/73','/heichal','/login']) {
      const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(),200,path);
      await page.locator('.sod29-header').waitFor({ timeout: 30000 });
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.sod29-header').count(),1,path);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,path);
      if (['/2029','/world','/2029/posts'].includes(path)) {
        await page.locator('.sod29-living-ribbon').waitFor();
        assert.equal(await page.locator('.sod29-living-ribbon').count(),1,path);
      }
      if (path === '/world') await page.screenshot({ path: `${out}/world-${width}-${theme}.png` });
      cases.push({ width, theme, path, rendered: true });
    }
    await context.close();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(models,[],'navigation must never call a model');
  const report = { sha, origin, cases, errors, modelRequests: models, blocked, data: 'real public reads', realAuthenticatedModelReply: 'NOT_TESTED_REQUIRES_OWNER_LOGIN', productTestWrites: 0 };
  await writeFile(`${out}/results.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify({ sha, cases: cases.length, errors: errors.length, automaticModelCalls: models.length, productTestWrites: 0 }));
} finally { await browser.close(); }
