// Pin of the contracts-and-enforcement package (docs/reviews/contracts-enforcement-20261113/): the documented scope is the real scope.
// Reads repository files and `git grep` only - no network, no database, no workflow is run.
//   1. the manifest (package-files.json) lists files that exist, the package directories hold no unlisted file, and extraction-map.md names
//      every manifest file (a file added to the package without a line in the map fails here);
//   2. the counts the README states are the counts the runners pin (scenarios, lifecycle cases, database cases, order cases, required names);
//   3. CL-16 stays a SEPARATE database step: its plan has no dependency, matches its files by sha256, lists exactly the proposal and its
//      rollback; nothing in the code half (scripts, src, api, Edge functions, the smoke and its library) refers to the proposal file; the
//      proposal header no longer claims a dependency on M0;
//   4. ci-wiring.md only names files that exist, and says that the G1 base-versus-head checks need PR_BASE_SHA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = 'docs/reviews/contracts-enforcement-20261113';
const CL16_DIR = 'docs/reviews/g1-rule-guard-cl16-20261112';
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');
const sha256 = (rel) => createHash('sha256').update(readFileSync(resolve(root, rel))).digest('hex');
const manifest = JSON.parse(read(PKG + '/package-files.json'));
const manifestPaths = manifest.files.map((f) => f.path);

function walk(dirRel) {
  const out = [];
  for (const name of readdirSync(resolve(root, dirRel))) {
    const rel = dirRel + '/' + name;
    if (statSync(resolve(root, rel)).isDirectory()) out.push(...walk(rel)); else out.push(rel);
  }
  return out;
}

test('manifest: every listed file exists, the package directories hold nothing unlisted, and the extraction map names every file', () => {
  assert.ok(manifestPaths.length > 40, 'the manifest lists the whole package');
  assert.equal(new Set(manifestPaths).size, manifestPaths.length, 'no path is listed twice');
  for (const p of manifestPaths) assert.ok(existsSync(resolve(root, p)), 'listed but missing: ' + p);
  // recorded results grow with every run (results-*/ directories) and are not part of the fixed scope
  const inPkg = [...walk(PKG), ...walk(CL16_DIR)].filter((p) => !/\/results-[^/]+\//.test(p));
  assert.deepEqual(inPkg.filter((p) => !manifestPaths.includes(p)), [], 'files in the package directories that the manifest does not list');
  assert.deepEqual(walk(CL16_DIR), [CL16_DIR + '/apply-plan.json'], 'the CL-16 directory holds its apply plan and nothing else');
  const map = read(PKG + '/extraction-map.md');
  for (const p of manifestPaths) assert.ok(map.includes(p), 'extraction-map.md does not mention ' + p);
  for (const f of manifest.files) assert.ok(f.source && f.kind, 'every file has a kind and a source: ' + f.path);
});

test('the counts in the README are the counts the runners pin', () => {
  const readme = read(PKG + '/README.md');
  const block = /<!-- counts:start -->([\s\S]*?)<!-- counts:end -->/.exec(readme);
  assert.ok(block, 'README.md has the counts block');
  const stated = Object.fromEntries([...block[1].matchAll(/^([a-z0-9_]+)=(\d+)$/gm)].map((m) => [m[1], Number(m[2])]));
  const num = (rel, re) => { const m = re.exec(read(rel)); assert.ok(m, rel + ' pins its count'); return Number(m[1]); };
  const required = JSON.parse(read(PKG + '/required-checks.json')).checks.filter((c) => c.proposal.tier === 'required-now').length;
  assert.deepEqual(stated, {
    ci_scenarios: num(PKG + '/enforcement-proof/run-ci-scenarios.sh', /EXPECTED_SCENARIOS=(\d+)/),
    lifecycle_cases: num('scripts/run-g1-rule-guard-sql-test.sh', /EXPECTED_CASES=(\d+)/),
    db_cases: num(PKG + '/enforcement-proof/run-db-scenarios.sh', /EXPECTED_DB_CASES=(\d+)/),
    order_cases: num(PKG + '/cl16-order-evidence/run.sh', /"\$N" -eq (\d+)/),
    required_now: required,
    reader_checks: stated.reader_checks, // pinned structurally inside scripts/check-g1-laws-snapshot-reader.mjs (EXPECTED_CHECKS), not parsed here
    g1_smoke_tests: stated.g1_smoke_tests, // counted by `node --test`, stated for the reader; the smoke is run by its own CI step
  });
  assert.ok(stated.reader_checks === 18 && stated.g1_smoke_tests === 51);
});

test('CL-16 is a separate database step: independent plan, exact files, no reference from the code half, no stated dependency on M0', () => {
  const plan = JSON.parse(read(CL16_DIR + '/apply-plan.json'));
  assert.deepEqual(plan.depends_on_tracks, []);
  assert.equal(plan.steps.length, 1);
  const step = plan.steps[0];
  assert.deepEqual(step.depends_on, []);
  assert.equal(step.file, 'supabase/proposed/20261112200000_g1_rule_guard_cl16.sql');
  assert.equal(step.rollback, 'supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql');
  assert.equal(sha256(step.file), step.sha256, 'the plan names the proposal by its sha256');
  assert.equal(sha256(step.rollback), step.rollback_sha256, 'the plan names the rollback by its sha256');
  assert.match(plan.sequencing.relative_to_M0, /^free\./);
  const header = read(step.file).split('\n').slice(0, 16).join('\n');
  assert.doesNotMatch(header, /only\s+AFTER the M0 SQL steps/, 'the header must not claim a dependency on M0');
  assert.match(header, /NO technical dependency on any M0 SQL step/);
  // the code half never refers to the proposal: the only files outside the database step that name it are the two SQL runners
  const hits = execFileSync('git', ['-C', root, 'grep', '-l', '-F', 'g1_rule_guard_cl16', '--', 'scripts', 'src', 'api', 'supabase/functions', 'public-reading-deploy', 'server', 'middleware.js', 'middleware-core.js', '.github'], { encoding: 'utf8' }).split('\n').filter(Boolean).sort();
  assert.deepEqual(hits, ['scripts/run-g1-laws-snapshot-reader-test.sh', 'scripts/run-g1-rule-guard-sql-test.sh'], 'only the two SQL runners may name the CL-16 proposal');
  // the reviewed list of SQL files that touch the rule tree is a list of files, each with an order verdict
  const writers = JSON.parse(read(PKG + '/cl16-rule-tree-writers.json'));
  assert.ok(writers.reviewed.length >= 4);
  for (const w of writers.reviewed) assert.ok(w.file && w.access && w.effect_of_cl16 && w.order_against_cl16, 'each reviewed file has a verdict: ' + w.file);
});

test('ci-wiring.md names only existing files, and says the base-versus-head checks need PR_BASE_SHA', () => {
  const doc = read(PKG + '/ci-wiring.md');
  assert.match(doc, /PR_BASE_SHA/);
  assert.match(doc, /G1_BASE_SHA/);
  const fences = [...doc.matchAll(/```(?:yaml|)\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
  const files = new Set([...fences.matchAll(/(?:^|[\s"'=])((?:scripts|test|docs|src|audits|tests|supabase)\/[A-Za-z0-9_.\/-]+\.(?:sh|mjs|js|sql|json))(?=[\s"']|$)/gm)].map((m) => m[1]));
  assert.ok(files.size >= 8, 'the document names the files it wires');
  for (const f of files) assert.ok(existsSync(resolve(root, f)), 'ci-wiring.md names a file that does not exist: ' + f);
});

test('the documents the README promises exist', () => {
  for (const n of ['README.md', 'extraction-map.md', 'ci-wiring.md', 'cl16-database-step.md', 'required-checks.md', 'gaps.md', 'restriction-sources.md'])
    assert.ok(existsSync(resolve(root, PKG + '/' + n)), n);
  const readme = read(PKG + '/README.md');
  for (const n of ['extraction-map.md', 'ci-wiring.md', 'cl16-database-step.md', 'required-checks.md', 'gaps.md', 'restriction-sources.md']) assert.ok(readme.includes(n), 'README.md does not mention ' + n);
});
