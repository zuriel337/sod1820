// G3 Community Core — PR #636 final-blockers fix: dry-run-import.mjs CLI state contract.
// task_key=G3_COMMUNITY_CORE_PR636_FINAL_BLOCKERS_FIX_V1. Run:
//   npm run test:g3-community-core-pr636-dry-run-cli
//
// Exercises the actual CLI entrypoint (spawned as a real child process, exactly as an operator
// would invoke it), not planImport()/loadState() imported directly, so a state-contract mismatch
// between dry-run-import.mjs and planner.mjs (the bug this task fixes) is caught the way it would
// actually surface: reading the fixtures from disk and parsing the CLI's own stdout.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(__dirname, 'g3-community-foundation-runtime', 'dry-run-import.mjs');

function runCli() {
  const stdout = execFileSync('node', [cliPath], { cwd: repoRoot, encoding: 'utf8' });
  return JSON.parse(stdout);
}

test('CLI dry-run: an already-linked OpenWeb identity stays author_user_id-linked, no new contributor planned', () => {
  const { ops } = runCli();
  const op = ops.find((o) => o.message_id === 'ow-1002');
  assert.ok(op, 'expected an op for ow-1002 (authored by the already-linked ow-user-dana)');
  assert.equal(op.op, 'insert_contribution');
  assert.equal(
    op.contribution.author_user_id,
    '11111111-1111-1111-1111-111111111111',
    'prior-state.json links ow-user-dana to this uid — the CLI must replay that, not re-derive it'
  );
  assert.equal(op.contribution.author_contributor_id, null);
  assert.equal(op.contributor_op, null, 'an already-linked identity must never plan a new soft contributor row');
});

test('CLI dry-run: a message already present in prior-state.importedMessageIds is skipped, not re-inserted', () => {
  const { ops } = runCli();
  const op = ops.find((o) => o.message_id === 'ow-0999-already-imported');
  assert.ok(op, 'expected an op for ow-0999-already-imported');
  assert.equal(op.op, 'skip_duplicate');
});

test('CLI dry-run: the loadState() field names match planImport()\'s actual state contract', () => {
  // A silent name mismatch (e.g. the legacy usersByVerifiedEmail/contributorsByEmail shape)
  // would make loadState() hand planImport() empty Maps for every prior-state field, so every
  // message would fall through to "new contributor" instead of the two assertions above. Guard
  // the summary shape directly as a second signal, independent of the two per-message checks.
  const { summary } = runCli();
  assert.ok(summary.insert_contribution > 0);
  assert.ok(summary.skip_duplicate > 0);
});
