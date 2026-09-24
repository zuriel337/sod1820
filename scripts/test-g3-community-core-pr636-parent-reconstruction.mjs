// G3 Community Core — PR #636 parent reconstruction fix.
// task_key=G3_COMMUNITY_CORE_PR636_PARENT_RECONSTRUCTION_V1. Run:
//   npm run test:g3-community-core-pr636-parent-reconstruction
//
// A real 41,080-row OpenWeb export dry-run found the source file is not chronologically
// ordered: of 32,116 replies whose parent message IS present in the export, 15,839 of those
// parent rows appear LATER in the file than the child that references them. The Phase 1
// planner's single forward pass only registered messageIdToPlannedContributionId as it went,
// so any such later-appearing parent resolved to parent_id=null purely because of source file
// order — not because the parent was actually missing. This suite pins the fix: parent
// resolution must be independent of the messages array's order, and a genuinely absent parent
// (never present anywhere in the export) must still resolve to null, with provenance
// (parent_message_id) preserved rather than guessed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { planImport } from './g3-community-foundation-runtime/planner.mjs';

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

test('a reply resolves parent_id even when its parent appears LATER in the source file (order-independent)', () => {
  const ops = planImport(messages, freshState());
  const parent = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-2001-parent-later');
  const child = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-2002-child-first');
  assert.ok(parent, 'parent must still be planned even though it is emitted after its child in the ops list');
  assert.ok(child);
  assert.equal(child.contribution.parent_id, parent.contribution.id);
  assert.equal(child.contribution.intent, 'תגובה');
  assert.equal(child.contribution.research_state, 'discussion');
});

test('a genuinely absent parent (never present anywhere in the batch or prior import) stays unresolved, never guessed', () => {
  const ops = planImport(messages, freshState());
  const orphan = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-2003-genuinely-missing-parent');
  assert.ok(orphan);
  assert.equal(orphan.contribution.parent_id, null);
  const note = JSON.parse(orphan.provenance_link.note);
  assert.equal(note.parent_message_id, 'ow-9999-never-in-export', 'provenance must preserve the source parent reference even when unresolved');
});

test('a reply to a message already imported in a prior batch (not in this batch at all) still resolves via existing-via, regardless of batch order', () => {
  const ops = planImport(messages, freshState());
  const child = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-2004-child-of-already-imported');
  assert.ok(child);
  assert.equal(child.contribution.parent_id, 'existing-via:ow-0999-already-imported');
});

test('order-independence holds symmetrically: reversing the batch produces the exact same parent_id resolutions', () => {
  const forward = planImport(messages, freshState());
  const reversed = planImport([...messages].reverse(), freshState());

  const byMessageId = (ops) =>
    new Map(ops.filter((o) => o.op === 'insert_contribution').map((o) => [o.message_id, o.contribution.parent_id]));

  const forwardParents = byMessageId(forward);
  const reversedParents = byMessageId(reversed);
  assert.deepEqual(Object.fromEntries(forwardParents), Object.fromEntries(reversedParents));
});
