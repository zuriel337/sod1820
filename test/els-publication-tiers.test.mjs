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
