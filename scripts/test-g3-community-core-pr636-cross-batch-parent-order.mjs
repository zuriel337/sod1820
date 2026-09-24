// G3 Community Core — PR #636 cross-batch dependency-safe import ordering fix.
// task_key=G3_COMMUNITY_CORE_PR636_CROSS_BATCH_PARENT_ORDER_V1. Run:
//   npm run test:g3-community-core-pr636-cross-batch-parent-order
//
// Real-corpus import rehearsal (the real 41,080-row OpenWeb export) found that
// `runBoundedImport` batches raw CSV order: at the default batchSize=500, 9,583 of 32,116
// present parent refs have their parent later in the file than the child, which — without this
// fix — lands the parent in a *later* batch than the child. Once the child's batch has already
// committed with parent_id=null, nothing ever revisits it: the loss is permanent. This suite
// exercises `orderMessagesForBoundedImport` directly (pure function, no DB) and `runBoundedImport`
// end-to-end (through the real `createSupabaseOps` adapter against an in-memory fake Supabase
// client) to prove the fix, never a real Supabase project.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { EXECUTOR_CONFIRMATION_PHRASE } from './g3-community-foundation-runtime/executor.mjs';
import {
  createSupabaseOps,
  orderMessagesForBoundedImport,
  runBoundedImport,
} from './g3-community-foundation-runtime/opsAdapter.mjs';

// ---- Minimal in-memory fake Supabase client (same query-builder shape as
// test-g3-community-core-pr636-phase3-ops-adapter.mjs; not a general-purpose fake, just enough
// surface for opsAdapter.mjs). ----------------------------------------------------------------
function makeFakeClient() {
  const tables = {};
  let nextId = 1;
  const ensure = (name) => (tables[name] = tables[name] || []);

  function from(table) {
    const rows = ensure(table);
    const builder = {
      _filters: [],
      _patch: null,
      select() {
        return this;
      },
      eq(col, val) {
        this._filters.push((r) => r[col] === val);
        return this;
      },
      in(col, vals) {
        this._filters.push((r) => vals.includes(r[col]));
        return this;
      },
      limit() {
        return this;
      },
      async maybeSingle() {
        const matched = rows.filter((r) => this._filters.every((f) => f(r)));
        return { data: matched[0] || null, error: null };
      },
      async single() {
        const matched = rows.filter((r) => this._filters.every((f) => f(r)));
        return matched.length ? { data: matched[0], error: null } : { data: null, error: { message: 'not_found' } };
      },
      insert(row) {
        const withId = { id: row.id || `fake-${table}-${nextId++}`, ...row };
        rows.push(withId);
        this._filters = [(r) => r === withId];
        return this;
      },
      update(patch) {
        this._patch = patch;
        return this;
      },
      async upsert(row, opts) {
        const conflictCol = (opts && opts.onConflict) || 'id';
        const idx = rows.findIndex((r) => r[conflictCol] === row[conflictCol]);
        if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
        else rows.push({ ...row });
        return { error: null };
      },
      then(resolve) {
        if (this._patch) {
          const matched = rows.filter((r) => this._filters.every((f) => f(r)));
          for (const r of matched) Object.assign(r, this._patch);
          resolve({ data: matched, error: null });
          return;
        }
        const matched = rows.filter((r) => this._filters.every((f) => f(r)));
        resolve({ data: matched, error: null });
      },
    };
    return builder;
  }

  return { tables, from };
}

function msg(overrides) {
  return {
    message_id: 'ow-default',
    body: 'hello',
    moderation_state: 'approved',
    created_at: '2020-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---- orderMessagesForBoundedImport: pure function, no DB -------------------------------------

test('orderMessagesForBoundedImport: leaves an already parent-before-child array untouched', () => {
  const messages = [msg({ message_id: 'ow-p' }), msg({ message_id: 'ow-c', parent_message_id: 'ow-p' })];
  const ordered = orderMessagesForBoundedImport(messages);
  assert.deepEqual(ordered.map((m) => m.message_id), ['ow-p', 'ow-c']);
});

test('orderMessagesForBoundedImport: moves a later parent ahead of an earlier child', () => {
  const messages = [msg({ message_id: 'ow-c', parent_message_id: 'ow-p' }), msg({ message_id: 'ow-p' })];
  const ordered = orderMessagesForBoundedImport(messages);
  const parentPos = ordered.findIndex((m) => m.message_id === 'ow-p');
  const childPos = ordered.findIndex((m) => m.message_id === 'ow-c');
  assert.ok(parentPos < childPos, 'parent must be ordered before its child');
});

test('orderMessagesForBoundedImport: a parent_message_id absent from the whole message set is not an ordering concern (no reorder, no throw)', () => {
  const messages = [
    msg({ message_id: 'ow-1', parent_message_id: 'ow-never-in-set' }),
    msg({ message_id: 'ow-2' }),
  ];
  const ordered = orderMessagesForBoundedImport(messages);
  assert.deepEqual(ordered.map((m) => m.message_id), ['ow-1', 'ow-2'], 'original relative order preserved');
});

test('orderMessagesForBoundedImport: stable tie-break — independent rows keep their original relative order', () => {
  const messages = [msg({ message_id: 'ow-a' }), msg({ message_id: 'ow-b' }), msg({ message_id: 'ow-c' })];
  const ordered = orderMessagesForBoundedImport(messages);
  assert.deepEqual(ordered.map((m) => m.message_id), ['ow-a', 'ow-b', 'ow-c']);
});

test('orderMessagesForBoundedImport: multi-level chain fully reversed in input resolves to root -> child -> grandchild', () => {
  const messages = [
    msg({ message_id: 'ow-grandchild', parent_message_id: 'ow-child' }),
    msg({ message_id: 'ow-child', parent_message_id: 'ow-root' }),
    msg({ message_id: 'ow-root' }),
  ];
  const ordered = orderMessagesForBoundedImport(messages);
  assert.deepEqual(ordered.map((m) => m.message_id), ['ow-root', 'ow-child', 'ow-grandchild']);
});

test('orderMessagesForBoundedImport: never rewrites a row\'s own fields, only output position', () => {
  const messages = [msg({ message_id: 'ow-c', parent_message_id: 'ow-p', created_at: '2026-01-02T00:00:00Z' }), msg({ message_id: 'ow-p', created_at: '2026-01-01T00:00:00Z' })];
  const ordered = orderMessagesForBoundedImport(messages);
  const child = ordered.find((m) => m.message_id === 'ow-c');
  assert.equal(child.created_at, '2026-01-02T00:00:00Z', 'chronology is never rewritten by reordering');
});

test('orderMessagesForBoundedImport: self-referencing message (own parent_message_id === own message_id) fails closed', () => {
  const messages = [msg({ message_id: 'ow-self', parent_message_id: 'ow-self' })];
  assert.throws(() => orderMessagesForBoundedImport(messages), /ow-self/);
});

test('orderMessagesForBoundedImport: a two-node cycle fails closed instead of silently dropping the link', () => {
  const messages = [
    msg({ message_id: 'ow-x', parent_message_id: 'ow-y' }),
    msg({ message_id: 'ow-y', parent_message_id: 'ow-x' }),
  ];
  assert.throws(() => orderMessagesForBoundedImport(messages), (err) => {
    assert.match(err.message, /invalid dependency graph/);
    assert.match(err.message, /ow-x/);
    assert.match(err.message, /ow-y/);
    return true;
  });
});

// ---- runBoundedImport end-to-end: batchSize=1, real cross-batch execution --------------------

test('runBoundedImport: batchSize=1, parent later in input resolves across batches (previously permanently null)', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-cb-child', parent_message_id: 'ow-cb-parent' }), msg({ message_id: 'ow-cb-parent' })];
  const result = await runBoundedImport(client, messages, { batchSize: 1, execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE });

  assert.equal(result.completed, true);
  assert.equal(result.batches.length, 2);

  const rows = client.tables.research_contributions;
  const links = client.tables.contribution_links.filter((l) => l.target_type === 'openweb_message');
  const contributionIdByMessageId = new Map(links.map((l) => [l.target_id, l.from_contribution_id]));
  const parentId = contributionIdByMessageId.get('ow-cb-parent');
  const childRow = rows.find((r) => r.id === contributionIdByMessageId.get('ow-cb-child'));

  assert.ok(parentId, 'parent row must have been committed');
  assert.equal(childRow.parent_id, parentId, 'child must resolve to the real, previously-committed parent row, not null');
});

test('runBoundedImport: batchSize=1, multi-level chain fully reversed in input resolves at every level', async () => {
  const client = makeFakeClient();
  const messages = [
    msg({ message_id: 'ow-mc-grandchild', parent_message_id: 'ow-mc-child' }),
    msg({ message_id: 'ow-mc-child', parent_message_id: 'ow-mc-root' }),
    msg({ message_id: 'ow-mc-root' }),
  ];
  const result = await runBoundedImport(client, messages, { batchSize: 1, execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE });

  assert.equal(result.completed, true);
  assert.equal(result.batches.length, 3);
  const rows = client.tables.research_contributions;
  assert.equal(rows.length, 3);

  const links = client.tables.contribution_links;
  const provenanceByMessageId = new Map();
  for (const link of links) {
    if (link.target_type !== 'openweb_message') continue;
    provenanceByMessageId.set(link.target_id, link.from_contribution_id);
  }
  const rootId = provenanceByMessageId.get('ow-mc-root');
  const childId = provenanceByMessageId.get('ow-mc-child');
  const grandchildId = provenanceByMessageId.get('ow-mc-grandchild');
  const rootRow = rows.find((r) => r.id === rootId);
  const childRow = rows.find((r) => r.id === childId);
  const grandchildRow = rows.find((r) => r.id === grandchildId);

  assert.equal(rootRow.parent_id, null, 'root has no parent');
  assert.equal(childRow.parent_id, rootId, 'child resolves to root across a batch boundary');
  assert.equal(grandchildRow.parent_id, childId, 'grandchild resolves to child across a batch boundary');
});

// ---- Real-corpus-derived invariant fixture ----------------------------------------------------
//
// test/fixtures/openweb-import/cross-batch-parent-order.json encodes the exact class the
// real-archive rehearsal found: a 3-level chain stored in fully reversed file order (root last,
// with the *earliest* created_at of the three — parent_timestamp_always_before_child holds, just
// like the real 32,116-row evidence), split by batchSize=1 so every level crosses a batch
// boundary. Before this fix, all three rows would import with parent_id=null.
test('runBoundedImport: real-corpus-derived fixture — parent later in file, earlier timestamp, cross-batch — every level links', async () => {
  const messages = JSON.parse(
    fs.readFileSync(new URL('../test/fixtures/openweb-import/cross-batch-parent-order.json', import.meta.url), 'utf8')
  );
  assert.equal(messages.length, 3);

  // Confirms the fixture actually encodes the real-corpus invariant before relying on it: parent
  // rows appear later in the raw array than their children, yet each parent's created_at is
  // earlier than its child's.
  const byId = new Map(messages.map((m) => [m.message_id, m]));
  for (const m of messages) {
    if (!m.parent_message_id) continue;
    const parent = byId.get(m.parent_message_id);
    const parentIndex = messages.indexOf(parent);
    const childIndex = messages.indexOf(m);
    assert.ok(parentIndex > childIndex, 'fixture must encode parent-later-in-file, per real-corpus evidence');
    assert.ok(new Date(parent.created_at) < new Date(m.created_at), 'fixture must encode parent-timestamp-earlier, per real-corpus evidence');
  }

  const client = makeFakeClient();
  const result = await runBoundedImport(client, messages, { batchSize: 1, execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE });

  assert.equal(result.completed, true);
  assert.equal(result.batches.length, 3, 'batchSize=1 over 3 rows crosses a batch boundary at every level');

  const rows = client.tables.research_contributions;
  const links = client.tables.contribution_links.filter((l) => l.target_type === 'openweb_message');
  const contributionIdByMessageId = new Map(links.map((l) => [l.target_id, l.from_contribution_id]));

  for (const m of messages) {
    const row = rows.find((r) => r.id === contributionIdByMessageId.get(m.message_id));
    assert.ok(row, `row for ${m.message_id} must exist`);
    if (m.parent_message_id) {
      const expectedParentId = contributionIdByMessageId.get(m.parent_message_id);
      assert.equal(row.parent_id, expectedParentId, `${m.message_id} must resolve its real parent_id, never null, across the batch boundary`);
    } else {
      assert.equal(row.parent_id, null);
    }
  }
});

// ---- Cycle detection fails the whole bounded run closed, never silently drops the link -------

test('runBoundedImport: a cyclic dependency in the input fails closed (throws) rather than silently importing with a dropped link', async () => {
  const client = makeFakeClient();
  const messages = [
    msg({ message_id: 'ow-cycle-a', parent_message_id: 'ow-cycle-b' }),
    msg({ message_id: 'ow-cycle-b', parent_message_id: 'ow-cycle-a' }),
  ];
  await assert.rejects(
    () => runBoundedImport(client, messages, { batchSize: 1, execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE }),
    /invalid dependency graph/
  );
  assert.equal((client.tables.research_contributions || []).length, 0, 'a rejected cyclic run must never partially write');
});
