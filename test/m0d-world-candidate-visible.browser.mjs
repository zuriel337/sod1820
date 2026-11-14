// Added by the extraction (13.11.2026), same harness style as test/m0d-contributor-stale-client.browser.mjs.
// "Content visible before entry" on the World finding reader, in a real browser, against a mocked Supabase origin (nothing leaves the machine):
//   OLD_DIST = a build of the code BEFORE this change (origin/main 9be0c29fc), NEW_DIST = a build of this branch.
//   A. NEW site, a public candidate: the exact finding opens, shows its text and the label «טרם אומת»; its stored status stays `candidate`
//      (the page only reads: the mock records every non-GET; no table is written and the only RPCs are the site's own visit telemetry
//      and the read-only group-arrivals reader).
//   B. NEW site, private / person_only / public_candidate (dossier) / rejected rows: the page shows no text of the row (the mock ignores
//      the PostgREST filters on purpose, so the page's own checks are what is tested).
//   C. OLD site, the same candidate: not shown (the old client asks only for approved / canonical) - an old tab keeps working and never
//      shows an unlabelled candidate.
//   D. NEW site, view v2 missing: the exact finding still opens (it reads the table, not the view) - nothing breaks.
//   E. NEW site, a candidate whose text carries a contact detail: the page does not print it.
// Skips (never passes) when the browser or either build is missing.
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
const SKIP = !canRun && 'needs Playwright, OLD_DIST (build of the code before the change) and NEW_DIST (this branch)';

const SUPABASE_HOST = 'linswmnnkjxvweumprav.supabase.co';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': '*' };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
// RPCs the 2029 site calls on any page: visit telemetry (link_identity, track_visit, ingest_event) and the read-only group-arrivals reader.
const KNOWN_RPC = new Set(['link_identity', 'track_visit', 'ingest_event', 'world_group_source_arrivals_v2']);
const SOURCE_ID = '44444444-4444-4444-8444-444444444444';
const uuid = (n) => `55555555-5555-4555-8555-${String(n).padStart(12, '0')}`;
const row = (n, changes = {}) => ({
  id: uuid(n), created_at: '2026-11-10T10:00:00Z', kind: 'observation', statement: `ממצא ציבורי מספר ${n} לבדיקה`, terms: [], value: null, relates: null,
  source: 'whatsapp', source_ref: `channel_updates:${SOURCE_ID}`, contributor: 'משתתף', confidence: null, engine_verified: false, engine_detail: null, evidence: null,
  status: 'candidate', promoted_node_id: null, parent_id: null, privacy_scope: 'public', meta: { ext: { presentation: { statement_role: 'research_statement' } } }, ...changes });

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

// The mock deliberately does NOT apply the privacy filters: every row it holds is handed back for `research_objects?id=eq.<id>`,
// except that the old client's status list (approved,canonical) is honoured, because that is what the database would do and it is
// the thing the old-client check is about. The page's own admission is what B and E exercise.
async function wire(page, { rows, v2 = 'present' }, seen) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== SUPABASE_HOST) return route.abort();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { ...CORS, ...headers }, body: JSON.stringify(body) });
    const table = url.pathname.replace(/^\/rest\/v1\//, '');
    if (url.pathname.startsWith('/rest/v1/')) seen.tables.push(table);
    if (request.method() !== 'GET' && request.method() !== 'HEAD') { seen.writes.push(`${request.method()} ${url.pathname}`); return json(200, {}); }
    const asObject = String(request.headers().accept || '').includes('vnd.pgrst.object');
    if (table === 'research_objects') {
      const id = /^eq\.(.+)$/.exec(url.searchParams.get('id') || '')?.[1];
      let out = rows.filter((r) => !id || r.id === id);
      const status = /^in\.\((.*)\)$/.exec(url.searchParams.get('status') || '')?.[1];
      if (status) out = out.filter((r) => status.split(',').includes(r.status));
      if (asObject) return out.length ? json(200, out[0]) : json(406, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' });
      return json(200, out, { 'content-range': out.length ? `0-${out.length - 1}/${out.length}` : '*/0' });
    }
    if (table === 'channel_updates') {
      const source = { id: SOURCE_ID, channel: 'public', status: 'live', link_url: null, text: 'מקור', contributor_id: '66666666-6666-4666-8666-666666666666' };
      return asObject ? json(200, source) : json(200, [source], { 'content-range': '0-0/1' });
    }
    if (table === 'world_contributor_research_v2' && v2 === 'missing') {
      return json(404, { code: 'PGRST205', details: null, hint: null, message: "Could not find the table 'public.world_contributor_research_v2' in the schema cache" });
    }
    if (table === 'site_flags') return json(200, ['lock_world', 'lock_heichal', 'lock_raziel_site', 'lock_life_journey', 'lock_books', 'lock_number'].map((key) => ({ key, enabled: false, message: '', mode: 'all' })));
    return asObject ? json(406, { code: 'PGRST116', details: null, hint: null, message: 'no rows' }) : json(200, [], { 'content-range': '*/0' });
  });
}

async function open(browser, base, n, options) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], seen = { tables: [], writes: [] };
  page.on('pageerror', (error) => errors.push(String(error)));
  await wire(page, options, seen);
  await page.goto(`${base}/world?finding=${uuid(n)}`);
  await page.waitForTimeout(options.settle ?? 3500);
  const text = await page.locator('body').innerText();
  return { context, page, errors, seen, text };
}

test('World finding: the new site shows a public candidate labelled «טרם אומת»; the pre-change site does not; private rows never show', { skip: SKIP }, async () => {
  const [oldServer, newServer] = await Promise.all([serve(OLD_DIST), serve(NEW_DIST)]);
  const oldBase = `http://127.0.0.1:${oldServer.address().port}`, newBase = `http://127.0.0.1:${newServer.address().port}`;
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const report = {};
  try {
    const rows = [row(1), row(2, { privacy_scope: 'private' }), row(3, { privacy_scope: 'public_candidate' }),
      row(4, { meta: { ext: { personal_scope: { scope: 'person_only' }, presentation: { statement_role: 'research_statement' } } } }),
      row(5, { status: 'rejected' })];

    // A. new site, public candidate
    const a = await open(browser, newBase, 1, { rows });
    await a.page.getByText('ממצא ציבורי מספר 1 לבדיקה').first().waitFor({ timeout: 20000 });
    assert.match(a.text, /טרם אומת/, 'the label is on the page');
    assert.ok(await a.page.locator('[data-world-public-finding]').count() >= 1);
    assert.deepEqual(a.seen.writes.filter((w) => !/\/rest\/v1\/rpc\//.test(w)), [], 'opening the finding writes no table');
    assert.deepEqual([...new Set(a.seen.writes.map((w) => w.replace(/^POST \/rest\/v1\/rpc\//, '')))].filter((name) => !KNOWN_RPC.has(name)), [],
      'the only RPCs are the visit telemetry and a read-only reader');
    assert.deepEqual(a.errors, []);
    report.A = { shown: true, label: true, tableWrites: 0, rpc: [...new Set(a.seen.writes)] };
    await a.context.close();

    // B. new site, rows that must never show (the mock hands them back; the page refuses them)
    report.B = {};
    for (const n of [2, 3, 4, 5]) {
      const b = await open(browser, newBase, n, { rows });
      assert.ok(!b.text.includes(`ממצא ציבורי מספר ${n} לבדיקה`), `row ${n} text is not shown`);
      assert.deepEqual(b.seen.writes.filter((w) => !/\/rest\/v1\/rpc\//.test(w)), []);
      report.B[n] = { shown: false };
      await b.context.close();
    }

    // C. old site, the same candidate
    const c = await open(browser, oldBase, 1, { rows });
    assert.ok(!c.text.includes('ממצא ציבורי מספר 1 לבדיקה'), 'the pre-change site never shows the candidate');
    assert.doesNotMatch(c.text, /טרם אומת/);
    report.C = { shown: false };
    await c.context.close();

    // D. new site, v2 missing (database step not applied): the exact finding reads the table, so it still opens
    const d = await open(browser, newBase, 1, { rows, v2: 'missing' });
    await d.page.getByText('ממצא ציבורי מספר 1 לבדיקה').first().waitFor({ timeout: 20000 });
    assert.match(d.text, /טרם אומת/);
    assert.deepEqual(d.errors, []);
    report.D = { shown: true, v2Reads: d.seen.tables.filter((t) => t === 'world_contributor_research_v2').length };
    await d.context.close();

    // E. new site, a contact detail in the text
    const e = await open(browser, newBase, 6, { rows: [row(6, { statement: 'צרו קשר hello@example.test לגבי ממצא' })] });
    assert.ok(!e.text.includes('hello@example.test'), 'a contact detail is not printed');
    report.E = { printed: false };
    await e.context.close();
    console.log(`M0D_WORLD_CANDIDATE_REPORT ${JSON.stringify(report)}`);
  } finally {
    await browser.close(); oldServer.close(); newServer.close();
  }
});
