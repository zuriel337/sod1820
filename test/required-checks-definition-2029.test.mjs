// Pin of the REQUIRED CHECKS definition (docs/reviews/contracts-enforcement-20261113/required-checks.md and .json).
// It reads only repository files (.github/workflows/*.yml and the definition) - no network, no GitHub API, no ruleset.
// What it keeps true:
//   1. the pull-request check names derived from the workflows are exactly the ones the definition lists (a workflow that gains, loses or
//      renames a pull-request job, changes its trigger class (always / paths), its branch filter, its timeout or its other triggers fails here
//      and the definition has to be updated in the same change - a renamed job would otherwise break a required check silently);
//   2. the classic trap cannot be proposed: every name proposed as "required-now" is triggered on EVERY pull request to main (no paths filter),
//      has a unique name, has no job-level condition and is not live-state dependent;
//   3. the markdown lists exactly the required-now names;
//   4. the parser itself refuses the workflow shapes it does not understand (it must not read a matrix or a dynamic name wrongly).
// It does NOT change or read the repository ruleset: that stays a decision of ZURIEL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveChecks, parseWorkflow } from '../scripts/derive-pr-check-names.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = 'docs/reviews/contracts-enforcement-20261113/';
const def = JSON.parse(readFileSync(resolve(root, PKG + 'required-checks.json'), 'utf8'));
const derived = deriveChecks();
const key = (r) => r.workflow_file + '#' + r.job_id;
const pick = (r) => ({ check: r.check, workflow_file: r.workflow_file, job_id: r.job_id, pr_trigger: r.pr_trigger, pr_branches: r.pr_branches,
  also_on: r.also_on, timeout_minutes: r.timeout_minutes, duplicate_name: r.duplicate_name });

test('the pull-request check names derived from the workflows are exactly the ones the definition lists', () => {
  const have = new Map(derived.map((r) => [key(r), pick(r)]));
  const want = new Map(def.checks.map((r) => [key(r), pick(r)]));
  assert.deepEqual([...have.keys()].sort(), [...want.keys()].sort(), 'a pull-request job was added, removed or renamed: update required-checks.json (and required-checks.md) in the same change');
  for (const [k, w] of want) assert.deepEqual(have.get(k), w, k + ': trigger class, branch filter, timeout, other triggers or name changed');
});

test('every check name proposed as required is triggered on every pull request to main, unique, unconditional and independent of live state', () => {
  const req = def.checks.filter((r) => r.proposal.tier === 'required-now');
  assert.ok(req.length >= 9, 'the definition proposes at least the nine always-triggered checks');
  const names = derived.map((r) => r.check);
  for (const r of req) {
    const d = derived.find((x) => key(x) === key(r));
    assert.ok(d, r.check + ' is derived from the workflows');
    assert.equal(d.pr_trigger, 'always', r.check + ' has a paths filter: as a required check it would block every pull request that does not touch its paths ("Expected - Waiting for status")');
    assert.ok(Array.isArray(d.pr_branches) && d.pr_branches.includes('main'), r.check + ' is triggered by pull requests to main');
    assert.equal(names.filter((n) => n === r.check).length, 1, r.check + ' shares its name with another job: a required name must be unique');
    assert.equal(d.job_if, null, r.check + ' has a job-level condition: a skipped job counts as passed for a required check');
  }
  // live-state dependent checks are never proposed as required
  for (const r of def.checks.filter((x) => /canary/i.test(x.check))) assert.notEqual(r.proposal.tier, 'required-now', r.check + ' reads live production state');
  // path-filtered or duplicated names are never proposed as required-now
  for (const r of def.checks.filter((x) => x.pr_trigger === 'paths' || x.duplicate_name)) assert.notEqual(r.proposal.tier, 'required-now', r.check);
});

test('the markdown lists exactly the required-now names, and every required-now name is in its table', () => {
  const md = readFileSync(resolve(root, PKG + 'required-checks.md'), 'utf8');
  const block = /<!-- required-now:start -->([\s\S]*?)<!-- required-now:end -->/.exec(md);
  assert.ok(block, 'required-checks.md has the required-now block');
  const listed = [...block[1].matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]).sort();
  const want = def.checks.filter((r) => r.proposal.tier === 'required-now').map((r) => r.check).sort();
  assert.deepEqual(listed, want);
});

test('legacy-production-lock also runs on push to main, but its pull_request trigger carries no paths filter', () => {
  // legacy-production-lock also runs on push: its pull_request trigger must still carry no paths filter
  const lock = derived.find((r) => r.check === 'legacy-production-lock');
  assert.equal(lock.pr_trigger, 'always');
  assert.deepEqual(lock.also_on, ['push', 'workflow_dispatch']);
});

// ── the parser: shapes it reads, and shapes it must refuse instead of reading wrongly ──
const wf = (extra) => 'name: W\non:\n' + extra.on + '\njobs:\n' + extra.jobs + '\n';
test('parser: the check name is the job name when present, else the job id; the workflow name is not part of it', () => {
  const w = parseWorkflow(wf({ on: '  pull_request:\n    branches: [main]', jobs: '  a-job:\n    name: Visible Name\n    runs-on: ubuntu-latest\n  b-job:\n    runs-on: ubuntu-latest' }), 'x.yml');
  assert.deepEqual(w.jobs.map((j) => j.name), ['Visible Name', 'b-job']);
  assert.deepEqual(w.on.pull_request.branches, ['main']);
});
test('parser: a paths filter and a paths-ignore filter both make the pull-request trigger path-filtered; branches alone does not', () => {
  const path = (on) => { const w = parseWorkflow(wf({ on, jobs: '  j:\n    runs-on: x' }), 'x.yml'); const pr = w.on.pull_request; return !!(pr.paths || pr['paths-ignore']); };
  assert.equal(path('  pull_request:\n    paths:\n      - "a/**"'), true);
  assert.equal(path('  pull_request:\n    paths-ignore:\n      - "docs/**"'), true);
  assert.equal(path('  pull_request:\n    branches: [main]'), false);
  assert.equal(path('  pull_request:'), false);
});
test('parser: refuses a matrix, a reusable workflow call, a dynamic job name and an inline top-level "on"', () => {
  assert.throws(() => parseWorkflow(wf({ on: '  pull_request:', jobs: '  j:\n    strategy:\n      matrix:\n        n: [1, 2]\n    runs-on: x' }), 'x.yml'), /strategy.*not supported/);
  assert.throws(() => parseWorkflow(wf({ on: '  pull_request:', jobs: '  j:\n    uses: ./.github/workflows/y.yml' }), 'x.yml'), /uses.*not supported/);
  assert.throws(() => parseWorkflow(wf({ on: '  pull_request:', jobs: '  j:\n    name: build ${{ matrix.os }}\n    runs-on: x' }), 'x.yml'), /dynamic job name/);
  assert.throws(() => parseWorkflow('name: W\non: [push]\njobs:\n  j:\n    runs-on: x\n', 'x.yml'), /top-level "on:" must be a block mapping/);
});
test('parser: a schedule list and an empty dispatch are read as triggers, not as options', () => {
  const w = parseWorkflow('name: W\non:\n  workflow_dispatch: {}\n  schedule:\n    - cron: "17 */2 * * *"  # c\njobs:\n  j:\n    runs-on: x\n', 'x.yml');
  assert.deepEqual(Object.keys(w.on).sort(), ['schedule', 'workflow_dispatch']);
});
