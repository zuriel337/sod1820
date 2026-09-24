// G3 Community Core — PR #636 two-phase insert/link executor fix.
// task_key=G3_COMMUNITY_CORE_PR636_TWO_PHASE_EXECUTOR_V1. Run:
//   npm run test:g3-community-core-pr636-two-phase-executor
//
// Live schema verification found `research_contributions_parent_id_fkey` is NOT DEFERRABLE /
// NOT INITIALLY DEFERRED. Even though `planImport`'s parent resolution is already
// order-independent (see test-g3-community-core-pr636-parent-reconstruction.mjs), the plan it
// emits still carries a reply's real desired parent_id on the very op that would insert it —
// so a naive one-write-per-op executor could still try to insert a child before its
// FK-referenced parent row exists, purely because of DB-execution order, and the live FK would
// reject it. This suite proves the two-phase executor (insert every row with parent_id=null
// first, link real parent_id only once every row in the batch exists) can never trip that FK,
// for child-before-parent order, arbitrary shuffled order, and a cross-batch already-imported
// parent — and that an unresolvable link is reported explicitly, never silently as complete.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { runImport, EXECUTOR_CONFIRMATION_PHRASE, ExecutorNotAuthorizedError } from './g3-community-foundation-runtime/executor.mjs';

const messages = JSON.parse(
  fs.readFileSync('test/fixtures/openweb-import/parent-reconstruction-order.json', 'utf8')
);

function freshState() {
  return {
    importedMessageIds: new Set(['ow-0999-already-imported']),
    linkedOpenwebUserIds: new Map(),
    contributorsByOpenwebUserId: new Map(),
  };
}

// A minimal in-memory ops implementation that enforces the exact same invariant as the live,
// NOT DEFERRABLE `research_contributions_parent_id_fkey`: inserting or linking a row against a
// parent_id that has not itself already been inserted throws. This is not a real DB — it is a
// pure/in-memory stand-in whose only job is to fail loudly the moment execution order would have
// violated the immediate FK, so these tests actually exercise that guarantee rather than assume it.
function makeFkAwareOps({ existingByMessageId = new Map() } = {}) {
  const existingIds = new Set(existingByMessageId.values());
  const rowsByMessageId = new Map();
  let nextId = 1;

  return {
    rowsByMessageId,
    async insertContribution(op) {
      if (op.contribution.parent_id !== null && !existingIds.has(op.contribution.parent_id)) {
        throw new Error(`FK_VIOLATION: insert referenced parent_id "${op.contribution.parent_id}" which does not exist yet`);
      }
      const id = `real-${nextId++}`;
      existingIds.add(id);
      rowsByMessageId.set(op.message_id, { ...op.contribution, id });
      return { id };
    },
    async skipDuplicate() {
      return { skipped: true };
    },
    async linkParent({ contribution_id, parent_id }) {
      if (!existingIds.has(parent_id)) {
        throw new Error(`FK_VIOLATION: link referenced parent_id "${parent_id}" which does not exist`);
      }
      for (const row of rowsByMessageId.values()) {
        if (row.id === contribution_id) {
          row.parent_id = parent_id;
          return { linked: true };
        }
      }
      throw new Error(`link target contribution_id "${contribution_id}" not found`);
    },
    async resolveExistingParentId(parentMessageId) {
      return existingByMessageId.get(parentMessageId) || null;
    },
  };
}

function assertCanonicalLinkage(rowsByMessageId) {
  const child = rowsByMessageId.get('ow-2002-child-first');
  const parent = rowsByMessageId.get('ow-2001-parent-later');
  const orphan = rowsByMessageId.get('ow-2003-genuinely-missing-parent');
  const existingChild = rowsByMessageId.get('ow-2004-child-of-already-imported');

  assert.ok(parent, 'parent row must exist');
  assert.ok(child, 'child row must exist');
  assert.equal(child.parent_id, parent.id, 'child-before-parent reply must link to its parent\'s real id');
  assert.equal(orphan.parent_id, null, 'a genuinely absent parent must stay null, never guessed');
  assert.equal(existingChild.parent_id, 'real-existing-899', 'a cross-batch existing parent must link via resolveExistingParentId');
}

test('phase 1 forces parent_id=null on every insert, regardless of the plan\'s desired parent_id', async () => {
  const seenParentIds = [];
  const ops = {
    async insertContribution(op) {
      seenParentIds.push(op.contribution.parent_id);
      return { id: `real-${op.message_id}` };
    },
    async skipDuplicate() {},
    async linkParent() {
      return { linked: true };
    },
    async resolveExistingParentId(parentMessageId) {
      return parentMessageId === 'ow-0999-already-imported' ? 'real-existing-899' : null;
    },
  };
  await runImport(messages, freshState(), { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops });
  assert.ok(seenParentIds.length > 0);
  assert.ok(seenParentIds.every((id) => id === null), 'every insertContribution call must see parent_id=null, never a planned/existing-via placeholder');
});

test('child-before-parent (real file order): the FK-aware ops never sees a violation, and phase 2 links correctly', async () => {
  const ops = makeFkAwareOps({ existingByMessageId: new Map([['ow-0999-already-imported', 'real-existing-899']]) });
  const result = await runImport(messages, freshState(), { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops });
  assert.equal(result.executed, true);
  assert.equal(result.completed, true);
  assert.deepEqual(result.linkFailures, []);
  assertCanonicalLinkage(ops.rowsByMessageId);
});

test('arbitrary shuffled order: the FK-aware ops never sees a violation, and the same logical linkage results', async () => {
  const shuffles = [
    [messages[3], messages[0], messages[2], messages[1]],
    [messages[1], messages[3], messages[0], messages[2]],
    [...messages].reverse(),
  ];
  for (const shuffled of shuffles) {
    const ops = makeFkAwareOps({ existingByMessageId: new Map([['ow-0999-already-imported', 'real-existing-899']]) });
    const result = await runImport(shuffled, freshState(), { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops });
    assert.equal(result.completed, true, `shuffled order ${JSON.stringify(shuffled.map((m) => m.message_id))} must complete without a link failure`);
    assertCanonicalLinkage(ops.rowsByMessageId);
  }
});

test('an unresolvable cross-batch parent is reported as an explicit link failure, never silently as complete', async () => {
  const ops = makeFkAwareOps({ existingByMessageId: new Map() }); // resolveExistingParentId will return null for everything
  const result = await runImport(messages, freshState(), { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops });
  assert.equal(result.executed, true);
  assert.equal(result.completed, false, 'a run with any unresolved link must never report completed:true');
  const failure = result.linkFailures.find((f) => f.message_id === 'ow-2004-child-of-already-imported');
  assert.ok(failure, 'the unresolved cross-batch link must appear in linkFailures');
  assert.equal(failure.reason, 'existing_parent_not_resolved');
  // The other, resolvable rows in the same batch must still have been linked correctly —
  // one unresolved row must never mask the rest of the batch.
  const child = ops.rowsByMessageId.get('ow-2002-child-first');
  const parent = ops.rowsByMessageId.get('ow-2001-parent-later');
  assert.equal(child.parent_id, parent.id);
});

test('a batch with any pending link but no linkParent ops implementation is refused, never silently skipped', async () => {
  const ops = {
    async insertContribution(op) {
      return { id: `real-${op.message_id}` };
    },
    async skipDuplicate() {},
    // linkParent intentionally omitted.
  };
  await assert.rejects(
    () => runImport(messages, freshState(), { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops }),
    ExecutorNotAuthorizedError
  );
});

test('duplicate/idempotency semantics are unchanged: an already-imported message is still routed to skipDuplicate, never re-inserted', async () => {
  const calls = [];
  const ops = makeFkAwareOps({ existingByMessageId: new Map([['ow-0999-already-imported', 'real-existing-899']]) });
  const wrappedOps = {
    ...ops,
    async skipDuplicate(op) {
      calls.push(op.message_id);
      return ops.skipDuplicate(op);
    },
  };
  const replayMessages = [...messages, messages[0]]; // replay the same message_id within the batch
  await runImport(replayMessages, freshState(), { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: wrappedOps });
  assert.deepEqual(calls, ['ow-2002-child-first']);
});
