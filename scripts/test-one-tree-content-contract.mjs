// Executable acceptance under the EXISTING reality_graph_law v8 / project_codex.id18.
// Test orchestration only: not a content registry, runtime reader or new contract owner.
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ONE_TREE_ACCEPTANCE_TESTS = Object.freeze([
  'test/one-tree-content-gate-wiring-2029.test.mjs',
  'test/one-tree-branch-contract-2029.test.mjs',
  'test/one-tree-connection-regressions-2029.test.mjs',
  'test/world-all-source-findings-2029.test.mjs',
  'test/world-public-finding-reader-2029.test.mjs',
  'test/world-public-reader-contract-2029.test.mjs',
  'test/gallery-source-findings-one-tree-2029.test.mjs',
  'test/gallery-editorial-reading-2029.test.mjs',
  'test/revelation-1237-gate-2029.test.mjs',
  'test/topic-expression-focus-2029.test.mjs',
]);

// Acceptance runs on synthetic backend fixtures. An accidental live fetch is a failure,
// never a silent read/write/model call during a build. No credentials needed in CI.
export const OFFLINE_TEST_PRELOAD = 'data:text/javascript,' + encodeURIComponent(
  'globalThis.fetch = () => { throw new Error("ONE_TREE_ACCEPTANCE_FORBIDS_NETWORK"); };'
);

export function runOneTreeAcceptance({ spawn = spawnSync } = {}) {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  assert.ok(ONE_TREE_ACCEPTANCE_TESTS.length > 0);
  for (const path of ONE_TREE_ACCEPTANCE_TESTS) assert.ok(statSync(new URL(`../${path}`, import.meta.url)).isFile(), path);
  const result = spawn(process.execPath, ['--import', OFFLINE_TEST_PRELOAD, '--test', ...ONE_TREE_ACCEPTANCE_TESTS],
    { cwd, stdio: 'inherit', timeout: 120_000 });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, 'One Tree acceptance did not complete');
  assert.equal(result.status, 0, 'One Tree content contract acceptance failed; build must stop');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runOneTreeAcceptance();
