// Three publication tiers for ciphers (ZURIEL 26.11.2026): private / my page (open to all, no approval) / central library (admin approval).
// Static contract of the PROPOSED SQL plus the isolated-Postgres proof. The SQL is not applied anywhere by this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = 'supabase/proposed/els-publication-tiers-20261126/';
const read = path => readFileSync(root + path, 'utf8');
const code = sql => sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');

test('the proposal reuses the existing mechanisms: no new table, trigger or approval path; the library stays administrator-only', () => {
  const sql = code(read(dir + 'apply.sql'));
  assert.match(sql, /create policy public_read_self_published_els[^;]*using \(self_published = true and visibility = 'public'\)/);
  assert.match(sql, /els_records_private_not_self_published_chk/);
  assert.doesNotMatch(sql, /create (table|trigger|extension)/i);
  assert.doesNotMatch(sql, /decision_ledger|research_objects/i);
  assert.match(sql, /els_publish_truth_gate_v1/, 'making a record public passes the same replay gate');
  assert.match(sql, /suggest_add/, 'recommendations and library requests use the existing system_suggestions engine');
  assert.match(sql, /8f0fee181b926b258282859d5f861203/);
  assert.match(sql, /e5fb2afa044c0ec42640fa1584163dec/);
  assert.match(sql, /1e7974a49a86595aedec12276796d24c/);
  assert.match(sql, /revoke all on function public\.detect_els_strong_ciphers\(\)/);
  assert.match(sql, /revoke[^;]*els_strong_cipher_assessment/);
  assert.match(sql, /calibrated/, 'certainty is declared indicative, not calibrated');
  const rollback = read(dir + 'rollback.sql');
  assert.doesNotMatch(code(rollback), /create policy public_read_self_published_els/, 'rollback never recreates the leaking policy');
  assert.match(rollback, /drop constraint if exists els_records_private_not_self_published_chk/);
  assert.doesNotMatch(read(dir + 'optional-data-fix-one-row.sql'), /delete|drop/i);
});

test('owner wording separates the three states and never presents a request as approval', () => {
  const lib = read('src/components/experience2029/ElsSavedLibrary2029.jsx');
  const tiers = read('src/lib/elsSavedMatrix.js');
  for (const text of ['פרטי', 'בדף שלי (ציבורי)', 'ממתין לאישור הספרייה', 'בספרייה המרכזית']) assert.ok(tiers.includes(text), text);
  assert.match(lib, /הוספה לספרייה המרכזית נעשית רק באישור המנהל/);
  assert.match(lib, /מדד ראשוני בלבד/);
});

test('isolated PostgreSQL proof: private never readable, page tier, library request/approval, strong detector, existing ciphers untouched, rollback', { skip: !readdirSync('/usr/lib').includes('postgresql') && 'local PostgreSQL unavailable', timeout: 180000 }, () => {
  const run = spawnSync('bash', ['scripts/run-els-publication-tiers-sql-test.sh'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr + run.stdout.slice(-800));
  assert.match(run.stdout, /els-publication-tiers SQL: ok/);
});

test('deploy-order safety: the two new client RPCs degrade when the SQL is not applied yet (request_els_library_review, els_my_strong_ciphers)', () => {
  const lib = read('src/lib/elsMatrices.js');
  assert.match(lib, /request_els_library_review[\s\S]{0,260}PGRST202/);
  assert.match(lib, /els_my_strong_ciphers[\s\S]{0,260}PGRST202/);
  const manifest = JSON.parse(read('supabase/proposed/APPLY-BEFORE-DEPLOY.json'));
  for (const rpc of ['request_els_library_review', 'els_my_strong_ciphers']) assert.ok(manifest.apply_before_deploy.some(e => e.rpc === rpc && e.sql.includes('els-publication-tiers-20261126')), rpc);
});

test('cache: a cipher document is never CDN-kept, so withdrawing a cipher takes effect on the next request; the sitemap bound is documented', () => {
  // Static on purpose: importing the handler needs the generated review build, which this gate does not produce.
  const doc = read('public-reading-deploy/api/public-document.js');
  assert.match(doc, /PAGE_DOCUMENT_CDN_PAGES = Object\.freeze\(\{ "\/": "home", "\/community\/chat": "community-chat" \}\)/, 'no cipher address has a CDN-kept document');
  assert.match(doc, /res\.setHeader\("Cache-Control", "no-store"\)/);
  assert.match(doc, /\/\^\[0-9A-Za-z_-\]\{1,64\}\$\/\.test\(String\(post\.id/, 'a CDN-kept document needs a Post id; a cipher has none');
  assert.match(read('api/sitemap.js'), /SITEMAP_CACHE = 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400'/);
});

test('concurrency: the approval takes the same row lock as the owner withdrawal (proved by two real sessions in the SQL runner)', () => {
  assert.match(code(read(dir + 'apply.sql')), /select \* into r from public\.els_records where id = p_id for update;\s*if found and r\.visibility = 'private'/);
  assert.match(read('scripts/run-els-publication-tiers-sql-test.sh'), /RACE owner-first/);
});

test('grant hardening is a separate, narrow proposal: two functions, revoke from PUBLIC and anon, keep authenticated, with its own rollback', () => {
  const sql = code(read(dir + 'harden-grants.sql'));
  assert.match(sql, /revoke execute on function public\.request_els_library_review\(uuid, boolean\) from public, anon;/);
  assert.match(sql, /revoke execute on function public\.els_my_strong_ciphers\(\) from public, anon;/);
  assert.match(sql, /grant execute on function public\.request_els_library_review\(uuid, boolean\) to authenticated;/);
  assert.doesNotMatch(sql, /create |alter |drop |delete |update |insert /i, 'grants only: no object, policy or data change');
  assert.match(code(read(dir + 'rollback-harden-grants.sql')), /to public;/);
  assert.match(read('scripts/run-els-publication-tiers-sql-test.sh'), /grants: ok/);
});
