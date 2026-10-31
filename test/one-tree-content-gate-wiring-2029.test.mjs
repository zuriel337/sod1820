import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ONE_TREE_ACCEPTANCE_TESTS, OFFLINE_TEST_PRELOAD, runOneTreeAcceptance } from '../scripts/test-one-tree-content-contract.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('existing npm builds and isolation CI invoke the same acceptance command without weakening the Legacy lock', () => {
  const { scripts } = JSON.parse(read('package.json'));
  assert.equal(scripts['test:one-tree-content'], 'node scripts/test-one-tree-content-contract.mjs');
  assert.equal(scripts.prebuild, 'node scripts/test-legacy-production-lock.mjs && npm run test:one-tree-content');
  assert.equal(scripts['prebuild:2029'], 'npm run test:one-tree-content');
  const workflow = read('.github/workflows/2029-isolation-gate.yml');
  assert.match(workflow, /name: One Tree content contract acceptance\s+run: npm run test:one-tree-content/);
  for (const path of ['src/lib/research/**', 'src/components/research/**', 'test/**',
    'scripts/test-one-tree-content-contract.mjs', 'docs/reviews/one-tree-unified-findings-contract-20261030.md']) {
    assert.ok(workflow.includes(`"${path}"`), `CI must trigger for ${path}`);
  }
});

test('acceptance includes behavioral readers, exact source return, graph, method and privacy tests; not only a branch compiler', () => {
  for (const path of ['test/world-all-source-findings-2029.test.mjs', 'test/world-public-reader-contract-2029.test.mjs',
    'test/gallery-source-findings-one-tree-2029.test.mjs', 'test/one-tree-connection-regressions-2029.test.mjs',
    'test/revelation-1237-gate-2029.test.mjs', 'test/topic-expression-focus-2029.test.mjs']) {
    assert.ok(ONE_TREE_ACCEPTANCE_TESTS.includes(path));
  }
  assert.equal(new Set(ONE_TREE_ACCEPTANCE_TESTS).size, ONE_TREE_ACCEPTANCE_TESTS.length);
});

test('nonzero exit, signal and unavailable runner fail closed rather than passing a build', () => {
  for (const result of [{ status: 1, signal: null }, { status: null, signal: 'SIGTERM' },
    { error: new Error('runner unavailable') }]) {
    assert.throws(() => runOneTreeAcceptance({ spawn: () => result }));
  }
  assert.doesNotThrow(() => runOneTreeAcceptance({ spawn: () => ({ status: 0, signal: null }) }));
});

test('fixture acceptance rejects an accidental network call before it can leave the process', () => {
  const result = spawnSync(process.execPath, ['--import', OFFLINE_TEST_PRELOAD, '--input-type=module',
    '-e', 'await fetch("https://example.invalid/never-sent")'], { encoding: 'utf8', timeout: 10_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ONE_TREE_ACCEPTANCE_FORBIDS_NETWORK/);
});
