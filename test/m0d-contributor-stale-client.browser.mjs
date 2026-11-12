// M0-D (round 4): a tab left open during the site deploy, and the mandatory rollback order, in a real browser.
// Two BUILT sites run side by side against one mocked Supabase origin (nothing leaves the machine):
//   OLD_DIST = the site that is live now (a build of the live commit, e.g. `git worktree add <dir> ed30dc05b && npm run build`;
//              round 4 ran it with 146f2f0e7, whose contributor readers are identical)
//   NEW_DIST = this branch (default: ./dist from `npm run build`)
// The mock answers world_contributor_research_v1 with a verified finding only, and world_contributor_research_v2 (when it
// "exists") with the same finding plus a public candidate. The checks follow the release and rollback order:
//   A. SQL step 11 applied, old tab still open (old code): it reads v1 only and never sees the candidate.
//   B. New site with v2: it reads v2; the candidate is on the page.
//   C. Rollback step 1 (v2 dropped) while the new site is still live: PGRST205 -> it reads v1, no fault, no candidate.
//   D. A permission error on v2 is NOT a missing view: no silent fallback to v1.
// Skips (never passes) when either build or the browser is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const OLD_DIST = process.env.OLD_DIST ? resolve(process.env.OLD_DIST) : null;
const NEW_DIST = resolve(process.env.NEW_DIST || join(root, 'dist'));
const req = createRequire(import.meta.url);
let pw = null; try { pw = req('playwright'); } catch { /* optional local browser tooling */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (pw && existsSync(pw.chromium.executablePath()) ? pw.chromium.executablePath() : undefined);
const canRun = Boolean(pw && OLD_DIST && existsSync(join(OLD_DIST, '2029.html')) && existsSync(join(NEW_DIST, '2029.html')));
const SKIP = !canRun && 'needs Playwright, OLD_DIST (build of the live commit) and NEW_DIST (this branch)';

const SUPABASE_HOST = 'linswmnnkjxvweumprav.supabase.co';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': '*' };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const SLUG = 'm0d-test-writer';
const CONTRIBUTOR = { id: '00000000-0000-4000-8000-00000000c0de', slug: SLUG, display_name: 'כותב בדיקה', role: null, kind: 'person', wa_names: ['כותב בדיקה'] };
const row = (id, status, statement) => ({
  id, created_at: '2026-11-10T10:00:00Z', kind: 'finding', statement, terms: ['משיח'], value: 358, relates: null, source: 'whatsapp',
  source_ref: null, contributor: 'כותב בדיקה', confidence: null, engine_verified: true, engine_detail: null, evidence: null, status,
  promoted_node_id: null, parent_id: null, meta: {}, privacy_scope: 'public', source_contributor_id: CONTRIBUTOR.id,
});
const VERIFIED = row('11111111-1111-4111-8111-111111111111', 'approved', 'ממצא מאושר לבדיקה');
const CANDIDATE = row('22222222-2222-4222-8222-222222222222', 'candidate', 'ממצא מועמד לבדיקה');

function serve(dist) {
  const html = readFileSync(join(dist, '2029.html'));
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    const file = join(dist, path);
    if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) {
      response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      return response.end(readFileSync(file));
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    return response.end(html);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

// v2: 'present' | 'missing' (PGRST205, the view was never created or was dropped) | 'denied' (42501)
async function wire(page, state, log) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== SUPABASE_HOST) return route.abort();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { ...CORS, ...headers }, body: JSON.stringify(body) });
    const table = url.pathname.replace(/^\/rest\/v1\//, '');
    if (url.pathname.startsWith('/rest/v1/')) log.push(table);
    if (request.method() !== 'GET' && request.method() !== 'HEAD') return json(200, {});
    if (table === 'contributors') {
      return String(request.headers().accept || '').includes('vnd.pgrst.object') ? json(200, CONTRIBUTOR) : json(200, [CONTRIBUTOR]);
    }
    if (table === 'world_contributor_research_v1') return json(200, [VERIFIED], { 'content-range': '0-0/1' });
    if (table === 'world_contributor_research_v2') {
      if (state.v2 === 'missing') return json(404, { code: 'PGRST205', details: null, hint: null, message: "Could not find the table 'public.world_contributor_research_v2' in the schema cache" });
      if (state.v2 === 'denied') return json(401, { code: '42501', details: null, hint: null, message: 'permission denied for view world_contributor_research_v2' });
      return json(200, [VERIFIED, CANDIDATE], { 'content-range': '0-1/2' });
    }
    if (table === 'site_flags') return json(200, ['lock_world', 'lock_heichal', 'lock_raziel_site', 'lock_life_journey', 'lock_books', 'lock_number'].map((key) => ({ key, enabled: false, message: '', mode: 'all' })));
    return json(200, [], { 'content-range': '*/0' });
  });
}

async function visit(browser, base, state) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], log = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await wire(page, state, log);
  await page.goto(`${base}/community/researcher/${SLUG}`);
  await page.getByText('ממצא מאושר לבדיקה').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);   // let every paged read settle
  return { context, page, errors, log, text: await page.locator('body').innerText() };
}

test('stale tab and rollback order: old code reads v1 only; new code reads v2, falls back only when v2 is missing', { skip: SKIP }, async () => {
  const [oldServer, newServer] = await Promise.all([serve(OLD_DIST), serve(NEW_DIST)]);
  const oldBase = `http://127.0.0.1:${oldServer.address().port}`, newBase = `http://127.0.0.1:${newServer.address().port}`;
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const report = {};
  try {
    // A. SQL step 11 applied (v2 exists with a candidate) while a tab of the live site is still open.
    const a = await visit(browser, oldBase, { v2: 'present' });
    assert.ok(a.log.includes('world_contributor_research_v1'), 'old code reads v1');
    assert.ok(!a.log.includes('world_contributor_research_v2'), 'old code never reads v2');
    assert.ok(!a.text.includes('ממצא מועמד לבדיקה'), 'the old tab never shows the candidate');
    assert.equal(await a.page.locator('[data-public-research-status="candidate"]').count(), 0, 'no candidate element in the old tab');
    assert.deepEqual(a.errors, []);
    report.A = { reads: [...new Set(a.log)].filter((t) => t.startsWith('world_contributor')), candidateShown: a.text.includes('ממצא מועמד לבדיקה') };
    await a.context.close();

    // B. New site, v2 present: reads v2 and shows the candidate.
    const b = await visit(browser, newBase, { v2: 'present' });
    assert.ok(b.log.includes('world_contributor_research_v2'), 'new code reads v2');
    assert.ok(!b.log.includes('world_contributor_research_v1'), 'no v1 read while v2 answers');
    assert.ok(b.text.includes('ממצא מועמד לבדיקה'), 'the candidate is on the page');
    // The candidate carries its public label, and the verified finding stays ahead of it (Human-Gate tier first).
    const labels = await b.page.locator('[data-public-research-status]').evaluateAll((nodes) => nodes.map((node) => [node.dataset.publicResearchStatus, node.textContent.trim()]));
    assert.ok(labels.some(([status, text]) => status === 'candidate' && text === 'טרם אומת'), `candidate labelled "טרם אומת": ${JSON.stringify(labels)}`);
    assert.ok(labels.findIndex(([status]) => status === 'approved') < labels.findIndex(([status]) => status === 'candidate'), 'verified first, then the candidate');
    assert.deepEqual(b.errors, []);
    report.B = { reads: [...new Set(b.log)].filter((t) => t.startsWith('world_contributor')), candidateShown: true, labels };
    await b.context.close();

    // C. Rollback step 1: v2 dropped while the new site is still live.
    const c = await visit(browser, newBase, { v2: 'missing' });
    assert.deepEqual([...new Set(c.log)].filter((t) => t.startsWith('world_contributor')), ['world_contributor_research_v2', 'world_contributor_research_v1'], 'v2 first, then v1 after PGRST205');
    assert.ok(!c.text.includes('ממצא מועמד לבדיקה'));
    assert.deepEqual(c.errors, []);
    report.C = { reads: [...new Set(c.log)].filter((t) => t.startsWith('world_contributor')), candidateShown: false };
    await c.context.close();

    // D. A permission error on v2 is not a missing view: no fallback to v1.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const log = [];
    await wire(page, { v2: 'denied' }, log);
    await page.goto(`${newBase}/community/researcher/${SLUG}`);
    await page.waitForTimeout(6000);
    assert.ok(log.includes('world_contributor_research_v2'));
    assert.ok(!log.includes('world_contributor_research_v1'), 'a permission error never falls back to v1');
    report.D = { reads: [...new Set(log)].filter((t) => t.startsWith('world_contributor')) };
    await context.close();
    console.log(`M0D_STALE_CLIENT_REPORT ${JSON.stringify(report)}`);
  } finally {
    await browser.close(); oldServer.close(); newServer.close();
  }
});
