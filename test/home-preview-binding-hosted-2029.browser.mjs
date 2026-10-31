// Real hosted guest reads with the actual Preview service worker. No login,
// model submission, message/reaction/upload/claim or profile mutation is exercised.
// Supply a short-lived Vercel access URL on stdin; never persist it or its cookie.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const origin = new URL(process.env.HOME_PREVIEW_ORIGIN).origin;
const sha = process.env.HOME_PREVIEW_SHA;
const branch = 'gpt/2029-home-loading-acceptance-20261031';
const out = process.env.HOME_PREVIEW_OUT || '/tmp/home-preview-hosted';
await mkdir(out, { recursive: true });
let access;
const input = createInterface({ input: process.stdin });
for await (const line of input) { access = line.trim(); input.close(); process.stdin.pause(); break; }
assert.equal(new URL(access).origin, origin);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(proxy ? { proxy } : {}) });
const cases = [], errors = [], models = [], blocked = [], reads = [];
const readRPCs = new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','fn_verses_by_gematria','lang_links_list','number_neighbors','fn_all_methods','world_group_source_arrivals_v2','rd_is_admin','fn_list_family','fn_name_protocol','fn_cross_research','community_feed_page','community_message_context','get_reality_videos']);
try {
  for (const width of [390,1440]) for (const theme of ['light','parchment','dark']) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'he-IL' });
    await context.addInitScript(theme => localStorage.setItem('sod-theme', theme), theme);
    // Additional harness protection; SW-owned traffic still uses the actual
    // shipped worker. No potentially mutating user control is submitted.
    await context.route('**/*', route => {
      const req = route.request(), u = new URL(req.url());
      if (['GET','HEAD','OPTIONS'].includes(req.method())) return route.continue();
      if (u.origin === 'https://linswmnnkjxvweumprav.supabase.co' && readRPCs.has(u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1])) return route.continue();
      blocked.push({ method: req.method(), path: u.pathname }); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => { if (/\/functions\/v1\//.test(new URL(req.url()).pathname)) models.push(new URL(req.url()).pathname); });
    page.on('response', response => { const u = new URL(response.url()); if (u.hostname === 'linswmnnkjxvweumprav.supabase.co') reads.push({ path: u.pathname, method: response.request().method(), status: response.status() }); });
    const authenticationURL = new URL(access); authenticationURL.pathname = '/preview-identity.json';
    try { await page.goto(authenticationURL.href, { waitUntil: 'domcontentloaded' }); }
    catch { throw new Error('Protected Preview access failed (access URL withheld)'); }
    const identity = await page.evaluate(() => fetch('/preview-identity.json').then(r => r.json()));
    assert.equal(identity.sha, sha); assert.equal(identity.branch, branch); assert.equal(identity.target,'preview');
    assert.equal(identity.transport,'existing-live-ai-analyze'); assert.equal(identity.product_writes,true);
    assert.deepEqual(identity.product_write_scope,['governed-community-actions','own-avatar','existing-verified-legacy-claim']);
    assert.equal(identity.general_profile_writes,false); assert.equal(identity.matrix_jobs,false); assert.equal(identity.edge_deploy,false);
    const worker = await page.evaluate(() => fetch('/preview-readonly-sw.js').then(r => r.text()));
    for (const name of ['realRazielPreview','communityPublishing','unifiedReadOnly']) assert.match(worker,new RegExp(`const ${name}=true`));
    const api = await page.evaluate(async () => { const r = await fetch('/api/contributor-self'); return { status:r.status, cache:r.headers.get('cache-control'), vary:r.headers.get('vary'), avatar:r.headers.get('X-Preview-Avatar-Updates'), body:await r.json() }; });
    assert.equal(api.status,401); assert.match(api.cache,/private.*no-store/); assert.match(api.vary,/Authorization/i);
    assert.equal(api.avatar,'true'); assert.equal(api.body.state,'login_required');
    for (const path of ['/2029','/community/chat','/2029/me/page-editor']) {
      const response = await page.goto(origin + path,{ waitUntil:'domcontentloaded' }); assert.equal(response.status(),200,path);
      await page.locator('.sod29-header').waitFor({ timeout:45000 });
      assert.equal(await page.locator('.sod29-header').count(),1,path);
      if (path === '/2029') {
        await page.locator('.h29').waitFor();
        await page.locator('.h29-hero, .sod29-home-now-card').first().waitFor();
        await page.locator('.sod29-living-ribbon').waitFor();
        assert.equal(await page.locator('.sod29-living-ribbon').count(),1);
        await page.locator('.els-hm__rig').waitFor();
        assert.equal(await page.locator('.els-hm__rig').first().evaluate(el => getComputedStyle(el).animationDuration),'20s');
        await page.locator('.h29-stream').scrollIntoViewIfNeeded();
        await page.locator('#reality-stream').waitFor();
        await page.evaluate(() => scrollTo(0,0));
        const orb = page.locator('.sod29-raziel-orb').filter({ visible:true }).first();
        assert.equal(await orb.isEnabled(),true,'received Preview Raziel UI remains available');
        await orb.click();
        const quiet = page.locator('[data-raziel-companion-quiet="true"]:visible');
        if (await quiet.count()) await quiet.click();
        const open = page.getByRole('button',{ name:'פתח שיחה', exact:true });
        if (await open.isVisible()) await open.click();
        const chat = page.locator('[data-raziel-native-chat="true"][data-raziel-session="shared"]:visible');
        await chat.waitFor(); assert.equal(await chat.count(),1);
        cases.push({ width,theme,path:'Raziel UI',sharedVisibleChat:1,submitted:false });
      } else if (path === '/community/chat') {
        await page.locator('[data-community-mode="connected-preview"]').waitFor();
        await page.locator('.sod29-community-feed article').first().waitFor({ timeout:45000 });
        assert.match(await page.locator('.sod29-community').innerText(),/התחברו כדי לפרסם/);
      } else await page.getByText('צריך להתחבר כדי לראות את האזור האישי',{ exact:true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,path);
      await page.screenshot({ path:`${out}/${path.includes('community')?'community':path.includes('page-editor')?'personal':'home'}-${width}-${theme}.png` });
      cases.push({ width,theme,path,rendered:true });
    }
    await context.close();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(models,[],'navigation/opening UI must not invoke any Edge/model function');
  const report = { sha,branch,origin,cases,errors,modelRequests:models,blocked,reads,data:'real public reads with actual hosted SW',
    productTestWrites:0,authenticatedModelReply:'NOT_TESTED',privateAccountData:'NOT_TESTED',authenticatedWrites:'NOT_TESTED' };
  await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({ sha,cases:cases.length,errors:errors.length,automaticModelCalls:models.length,productTestWrites:0 }));
} finally { await browser.close(); }
