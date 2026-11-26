// "Private always guarantees privacy" (ZURIEL 26.11.2026). Static contract of the PROPOSED SQL plus the isolated-Postgres proof.
// The SQL is not applied anywhere by this test; the runner uses a disposable local database only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = 'supabase/proposed/els-private-guarantee-20261126/';
const read = path => readFileSync(root + path, 'utf8');

test('the proposal only tightens one policy and one function: no new table, trigger, mechanism, decision-ledger write or approval', () => {
  const sql = read(dir + 'apply.sql').split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
  assert.match(sql, /create policy public_read_self_published_els[^;]*using \(self_published = true and visibility = 'public'\)/);
  assert.doesNotMatch(sql, /create (table|trigger|index|extension)/i);
  assert.doesNotMatch(sql, /decision_ledger|research_objects|moderate_els_matrix/i);
  assert.doesNotMatch(sql, /v_status :=\s*'published'|update\s+public\.els_records\s+set[^;]*?(?<![.\w])status\s*=\s*'published'/i, 'publication by the owner never sets the moderation-approved status');
  assert.match(sql, /els_publish_truth_gate_v1/, 'making a private record public passes the same replay gate as a public save');
  assert.match(sql, /e5fb2afa044c0ec42640fa1584163dec/, 'guard pins the live function fingerprint');
  assert.match(sql, /\(self_published = true\)/, 'guard pins the live policy');
  const rollback = read(dir + 'rollback.sql');
  assert.match(rollback, /using \(self_published = true\)/);
  assert.doesNotMatch(read(dir + 'optional-data-fix-one-row.sql'), /delete|drop/i, 'the optional data fix rewrites one flag only');
});

test('the owner-facing wording says that showing in the public file is a publication, not approval', () => {
  const lib = read('src/components/experience2029/ElsSavedLibrary2029.jsx');
  assert.match(lib, /אינו הופך לממצא מאושר|לא יהפוך לממצא מאושר/);
  assert.match(lib, /withheld:/);
});

test('isolated PostgreSQL proof: guest, member, owner and admin paths, explicit publication, withdrawal, the public ciphers untouched, rollback', { skip: !readdirSync('/usr/lib').includes('postgresql') && 'local PostgreSQL unavailable', timeout: 180000 }, () => {
  const run = spawnSync('bash', ['scripts/run-els-private-guarantee-sql-test.sh'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr + run.stdout.slice(-800));
  assert.match(run.stdout, /els-private-guarantee SQL: ok/);
});
