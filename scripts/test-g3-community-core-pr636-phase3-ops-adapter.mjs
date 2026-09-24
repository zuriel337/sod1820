// G3 Community Core — PR #636 Phase 3 concrete Supabase ops adapter.
// task_key=G3_COMMUNITY_CORE_PR636_PHASE3_OPS_ADAPTER_V1. Run:
//   npm run test:g3-community-core-pr636-phase3-ops-adapter
//
// These tests exercise opsAdapter.mjs against a small in-memory fake Supabase client (the same
// `.from(table).select()/.insert()/.update()/.upsert()` shape supabase-js exposes) — never a real
// Supabase project. No canonical write API is called anywhere in this file.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runImport, EXECUTOR_CONFIRMATION_PHRASE } from './g3-community-foundation-runtime/executor.mjs';
import {
  resolveImportState,
  preflightImport,
  createSupabaseOps,
  runBoundedImport,
} from './g3-community-foundation-runtime/opsAdapter.mjs';

// ---- Minimal in-memory fake Supabase client ---------------------------------------------------
// Supports exactly the query-builder shape opsAdapter.mjs uses: select/eq/in/limit/maybeSingle
// (read, thenable), insert/select/single (write + read-back), update/eq (thenable write),
// upsert(row, {onConflict}) (write). Not a general-purpose fake — just enough surface.
function makeFakeClient(seed = {}, { failUpdates = false } = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
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
      // Makes `await client.from(t).select().eq(...)` work without an explicit terminal call,
      // exactly like supabase-js's thenable PostgrestFilterBuilder.
      then(resolve) {
        if (this._patch) {
          if (failUpdates) {
            resolve({ data: null, error: { message: 'simulated_update_failure' } });
            return;
          }
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

test('anonymous message: no contributor/visitor_identity row created', async () => {
  const client = makeFakeClient();
  const state = await resolveImportState(client, [msg({ message_id: 'ow-1' })]);
  const result = await runImport([msg({ message_id: 'ow-1' })], state, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(client.tables.contributors, undefined);
  assert.equal(client.tables.visitor_identity, undefined);
  assert.equal(client.tables.research_contributions.length, 1);
  assert.equal(client.tables.research_contributions[0].author_contributor_id, null);
});

test('identified openweb user: private contributor + visitor_identity created, no PII in contribution_links', async () => {
  const client = makeFakeClient();
  const messages = [
    msg({ message_id: 'ow-2', author_openweb_user_id: 'u1', author_email: 'real@example.com', author_display_name: 'Real Name' }),
  ];
  const state = await resolveImportState(client, messages);
  await runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });

  assert.equal(client.tables.contributors.length, 1);
  assert.equal(client.tables.contributors[0].dossier_settings.visibility, 'private');
  assert.equal(client.tables.visitor_identity.length, 1);
  assert.equal(client.tables.visitor_identity[0].visitor, 'openweb:u1');

  for (const link of client.tables.contribution_links) {
    assert.equal(link.email, undefined, 'contribution_links must never carry an email field');
    if (link.note) assert.ok(!link.note.includes('real@example.com'), 'provenance note must never leak the source email');
  }
});

test('two same-batch messages from the same openweb user share one contributor row (no duplicate contributor)', async () => {
  const client = makeFakeClient();
  const messages = [
    msg({ message_id: 'ow-3', author_openweb_user_id: 'u2' }),
    msg({ message_id: 'ow-4', author_openweb_user_id: 'u2', parent_message_id: 'ow-3' }),
  ];
  const state = await resolveImportState(client, messages);
  const result = await runImport(messages, state, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(client.tables.contributors.length, 1);
  const rows = client.tables.research_contributions;
  assert.equal(rows.length, 2);
  const [parent, reply] = rows;
  assert.equal(reply.parent_id, parent.id, 'phase-2 link must apply the real parent id after phase 1');
});

test('replay (idempotency): re-processing the same message_id in a later batch returns the existing contribution, never a duplicate insert', async () => {
  const client = makeFakeClient();
  const batch1 = [msg({ message_id: 'ow-5' })];
  const state1 = await resolveImportState(client, batch1);
  await runImport(batch1, state1, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  assert.equal(client.tables.research_contributions.length, 1);
  const originalId = client.tables.research_contributions[0].id;

  const batch2 = [msg({ message_id: 'ow-5' })];
  const state2 = await resolveImportState(client, batch2);
  assert.ok(state2.importedMessageIds.has('ow-5'), 'preflight state must see ow-5 as already imported');
  const result2 = await runImport(batch2, state2, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });

  assert.equal(client.tables.research_contributions.length, 1, 'no duplicate row inserted');
  assert.equal(result2.results[0].op, 'skip_duplicate');
  assert.equal(result2.results[0].result.existing_contribution_id, originalId);
});

test('cross-batch parent resolution: a reply in batch 2 links to its parent imported in batch 1', async () => {
  const client = makeFakeClient();
  const parentMsg = [msg({ message_id: 'ow-parent' })];
  const state1 = await resolveImportState(client, parentMsg);
  await runImport(parentMsg, state1, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  const parentId = client.tables.research_contributions[0].id;

  const childMsg = [msg({ message_id: 'ow-child', parent_message_id: 'ow-parent' })];
  const state2 = await resolveImportState(client, childMsg);
  const result2 = await runImport(childMsg, state2, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });

  assert.equal(result2.completed, true);
  const childRow = client.tables.research_contributions.find((r) => r.body === 'hello' && r.id !== parentId);
  assert.equal(childRow.parent_id, parentId);
});

test('genuinely absent parent: a reply whose parent was never imported keeps parent_id null forever, no failure', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-orphan-child', parent_message_id: 'ow-never-imported' })];
  const state = await resolveImportState(client, messages);
  const result = await runImport(messages, state, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(result.linkFailures.length, 0);
  assert.equal(client.tables.research_contributions[0].parent_id, null);
});

test('partial failure: an unresolvable cross-batch parent is reported in linkFailures, run is not marked completed, other rows are unaffected', async () => {
  const client = makeFakeClient();
  // Simulate inconsistent/corrupted provenance directly: state claims 'ow-ghost-parent' was
  // already imported, but no matching contribution_links row actually exists in the DB, so
  // resolveExistingParentId legitimately cannot find it. This is the failure path
  // resolveImportState itself can never produce on its own (it derives importedMessageIds FROM
  // contribution_links) — it exercises the executor/ops adapter's defensive handling directly.
  const messages = [
    msg({ message_id: 'ow-ok' }),
    msg({ message_id: 'ow-bad-child', parent_message_id: 'ow-ghost-parent' }),
  ];
  const state = { importedMessageIds: new Set(['ow-ghost-parent']), linkedOpenwebUserIds: new Map(), contributorsByOpenwebUserId: new Map() };
  const result = await runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });

  assert.equal(result.completed, false);
  assert.equal(result.linkFailures.length, 1);
  assert.equal(result.linkFailures[0].message_id, 'ow-bad-child');
  const okRow = client.tables.research_contributions.find((r) => r.body === 'hello');
  assert.ok(okRow, 'the unrelated row in the same batch must still have been inserted');
});

test('preflightImport performs zero writes', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-6', author_openweb_user_id: 'u3' })];
  const { plan, state } = await preflightImport(client, messages);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].op, 'insert_contribution');
  for (const rows of Object.values(client.tables)) assert.equal(rows.length, 0, 'preflight must never write a row');
  assert.equal(state.importedMessageIds.size, 0);
});

test('runBoundedImport: two small batches, second batch sees the first batch as already-imported state with no separate checkpoint store', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-b1' }), msg({ message_id: 'ow-b2', parent_message_id: 'ow-b1' })];
  const result = await runBoundedImport(client, messages, {
    batchSize: 1,
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
  });
  assert.equal(result.completed, true);
  assert.equal(result.batches.length, 2);
  const rows = client.tables.research_contributions;
  assert.equal(rows.length, 2);
  const [parent, child] = rows;
  assert.equal(child.parent_id, parent.id, 'batch 2 must resolve its parent from batch 1 via live provenance, not an in-memory handoff');
});

test('runBoundedImport halts before the next batch when a batch reports linkFailures', async () => {
  // failUpdates simulates a real, unexpected DB failure on the one call phase 2 linking makes
  // (`ops.linkParent`'s `.update(...).eq(...)`) — never an FK violation, exactly the kind of
  // failure the module header describes as a genuine infra error, not a resolution gap.
  const client = makeFakeClient({}, { failUpdates: true });
  const batch1 = [msg({ message_id: 'ow-halt-1' })]; // no reply: unaffected by failUpdates
  const batch2 = [msg({ message_id: 'ow-halt-2', parent_message_id: 'ow-halt-1' })]; // cross-batch link: will fail
  const batch3 = [msg({ message_id: 'ow-halt-3' })]; // must never run once batch 2 fails

  const result = await runBoundedImport(client, [...batch1, ...batch2, ...batch3], {
    batchSize: 1,
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
  });

  assert.equal(result.completed, false);
  assert.equal(result.batches.length, 2, 'batch 3 must never be attempted once batch 2 reports a link failure');
  assert.equal(result.batches[1].linkFailures.length, 1);
  assert.equal(client.tables.research_contributions.length, 2, 'only batch 1 and batch 2 inserts happened; batch 3 never ran');
});

test('dry-run (execute:false) never touches the client', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-7', author_openweb_user_id: 'u4' })];
  const result = await runBoundedImport(client, messages, { batchSize: 10, execute: false });
  assert.equal(result.batches[0].executed, false);
  for (const rows of Object.values(client.tables)) assert.equal(rows.length, 0, 'dry-run must never write a row');
});
