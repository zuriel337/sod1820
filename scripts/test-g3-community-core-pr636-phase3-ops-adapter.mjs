// G3 Community Core — PR #636 Phase 3 concrete Supabase ops adapter.
// task_key=G3_COMMUNITY_CORE_PR636_PHASE3_OPS_ADAPTER_V1. Run:
//   npm run test:g3-community-core-pr636-phase3-ops-adapter
//
// These tests exercise opsAdapter.mjs against a small in-memory fake Supabase client (the same
// `.from(table).select()/.insert()/.update()/.upsert()/.rpc()` shape supabase-js exposes) — never
// a real Supabase project. No canonical write API is called anywhere in this file.
//
// Since task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_MESSAGE_IMPORT_V1, insertContribution's five
// separate writes are one `client.rpc('g3_openweb_import_message', ...)` call — the fake client's
// `rpc()` below models that as a single atomic unit (stages every write, commits all-or-nothing),
// mirroring the real Postgres function's transaction semantics closely enough that every test in
// this file exercises the same external contract as before. Failure-injection/rollback coverage
// for that atomicity itself lives in
// scripts/test-g3-community-core-pr636-atomic-message-import.mjs.
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

  // Mirrors cl_openweb_message_derived_from_uniq (see the PR #636 final-blockers migration): at
  // most one contribution_links row may exist for a given (target_type='openweb_message',
  // target_id, relation_type='derived_from') triple. Lets tests simulate the DB-level race the
  // real partial unique index guards against, without a live Postgres.
  function violatesOpenwebMessageUniqueIndex(insertTable, row) {
    if (insertTable !== 'contribution_links') return false;
    if (row.target_type !== 'openweb_message' || row.relation_type !== 'derived_from') return false;
    return ensure('contribution_links').some(
      (r) =>
        r.target_type === 'openweb_message' && r.relation_type === 'derived_from' && r.target_id === row.target_id
    );
  }

  function from(table) {
    const rows = ensure(table);
    const builder = {
      _filters: [],
      _patch: null,
      _deleting: false,
      _insertError: null,
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
        if (this._insertError) return { data: null, error: this._insertError };
        const matched = rows.filter((r) => this._filters.every((f) => f(r)));
        return matched.length ? { data: matched[0], error: null } : { data: null, error: { message: 'not_found' } };
      },
      insert(row) {
        if (violatesOpenwebMessageUniqueIndex(table, row)) {
          this._insertError = {
            code: '23505',
            message: 'duplicate key value violates unique constraint "cl_openweb_message_derived_from_uniq"',
          };
          this._filters = [() => false];
          return this;
        }
        const withId = { id: row.id || `fake-${table}-${nextId++}`, ...row };
        rows.push(withId);
        this._filters = [(r) => r === withId];
        return this;
      },
      delete() {
        this._deleting = true;
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
        if (this._insertError) {
          resolve({ data: null, error: this._insertError });
          return;
        }
        if (this._deleting) {
          const matched = rows.filter((r) => this._filters.every((f) => f(r)));
          for (const r of matched) {
            const idx = rows.indexOf(r);
            if (idx >= 0) rows.splice(idx, 1);
          }
          resolve({ data: matched, error: null });
          return;
        }
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

  // Fakes g3_openweb_import_message (see supabase/migrations/*_g3_community_core_pr636_atomic_
  // message_import_v1.sql): stages every write this call would make and only commits them to
  // `tables` together, at the very end — so a provenance conflict (or, in the dedicated
  // failure-injection test file, a simulated mid-call failure) leaves zero rows behind, exactly
  // like an aborted Postgres function invocation rolling back its own transaction.
  async function rpc(fnName, params) {
    if (fnName !== 'g3_openweb_import_message') {
      return { data: null, error: { message: `fake client: unknown rpc "${fnName}"` } };
    }
    if (violatesOpenwebMessageUniqueIndex('contribution_links', {
      target_type: 'openweb_message',
      relation_type: 'derived_from',
      target_id: params.p_provenance_target_id,
    })) {
      return {
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "cl_openweb_message_derived_from_uniq"',
        },
      };
    }

    // Atomic parent link (task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_PARENT_LINK_V1): mirrors the
    // real RPC's own resolve-or-fail-closed contract — a present p_parent_message_id that does
    // not resolve via contribution_links is an inconsistency the caller (planner.mjs) should
    // never have produced, never a silent null.
    let parentId = null;
    if (params.p_parent_message_id) {
      const parentLink = ensure('contribution_links').find(
        (r) => r.target_type === 'openweb_message' && r.relation_type === 'derived_from' && r.target_id === params.p_parent_message_id
      );
      if (!parentLink) {
        return {
          data: null,
          error: { message: `g3_openweb_import_message: expected parent openweb_message ${params.p_parent_message_id} not found via contribution_links` },
        };
      }
      parentId = parentLink.from_contribution_id;
    }

    const contributorId = params.p_create_contributor
      ? `fake-contributors-${nextId++}`
      : params.p_author_contributor_id || null;
    const contributionId = `fake-research_contributions-${nextId++}`;

    if (params.p_create_contributor) {
      ensure('contributors').push({
        id: contributorId,
        slug: params.p_contributor_slug,
        display_name: params.p_contributor_display_name || 'OpenWeb Contributor',
        kind: 'external',
        email: params.p_contributor_email,
        source: params.p_contributor_source,
        dossier_settings: params.p_contributor_dossier_settings || {},
      });
    }
    if (params.p_visitor) {
      const table = ensure('visitor_identity');
      const idx = table.findIndex((r) => r.visitor === params.p_visitor);
      const row = { visitor: params.p_visitor, email: params.p_visitor_email, last_seen: new Date().toISOString() };
      if (idx >= 0) table[idx] = row;
      else table.push(row);
    }
    ensure('research_contributions').push({
      id: contributionId,
      intent: params.p_intent,
      origin: params.p_origin,
      research_state: params.p_research_state,
      status: params.p_status,
      parent_id: parentId,
      author_user_id: params.p_author_user_id || null,
      author_contributor_id: contributorId,
      author_name: params.p_author_name || null,
      body: params.p_body ?? null,
      reactions: params.p_reactions || {},
      created_at: params.p_created_at,
    });
    ensure('contribution_links').push({
      id: `fake-contribution_links-${nextId++}`,
      from_contribution_id: contributionId,
      target_type: 'openweb_message',
      target_id: params.p_provenance_target_id,
      relation_type: params.p_provenance_relation_type,
      note: params.p_provenance_note,
    });
    if (params.p_identity_target_id) {
      ensure('contribution_links').push({
        id: `fake-contribution_links-${nextId++}`,
        from_contribution_id: contributionId,
        target_type: 'openweb_user',
        target_id: params.p_identity_target_id,
        relation_type: params.p_identity_relation_type,
      });
    }

    return { data: { id: contributionId, contributor_id: contributorId }, error: null };
  }

  return { tables, from, rpc };
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
  assert.equal(reply.parent_id, parent.id, 'the atomic RPC must resolve the real parent id in the same call as the insert');
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

test('fail-closed: a present-but-unresolvable expected parent aborts the run rather than silently inserting null (task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_PARENT_LINK_V1)', async () => {
  const client = makeFakeClient();
  // Simulate inconsistent/corrupted provenance directly: state claims 'ow-ghost-parent' was
  // already imported, but no matching contribution_links row actually exists in the DB. This is
  // the failure path resolveImportState itself can never produce on its own (it derives
  // importedMessageIds FROM contribution_links) — it exercises the atomic RPC's fail-closed
  // handling of a caller expectation that disagrees with live provenance. Before the atomic
  // parent-link fix this surfaced as a soft `linkFailures` entry from executor.mjs's separate
  // phase-2 link step; now planner.mjs's non-null `parent_message_id` reaches the same atomic
  // call as the insert, so an unresolvable-but-expected parent must reject the whole call instead
  // of ever landing a row with a silently null parent_id for a dependency believed present.
  const messages = [
    msg({ message_id: 'ow-ok' }),
    msg({ message_id: 'ow-bad-child', parent_message_id: 'ow-ghost-parent' }),
  ];
  const state = { importedMessageIds: new Set(['ow-ghost-parent']), linkedOpenwebUserIds: new Map(), contributorsByOpenwebUserId: new Map() };

  await assert.rejects(
    () => runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) })
  );
  const okRow = client.tables.research_contributions.find((r) => r.body === 'hello');
  assert.ok(okRow, 'the unrelated row processed before the failing one in the same batch must still have been inserted');
  assert.equal(
    client.tables.research_contributions.length,
    1,
    'the row whose expected parent could not be resolved must never be committed with a silently null parent_id'
  );
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

// ---- PR #636 final-blockers fix: DB-level provenance race (cl_openweb_message_derived_from_uniq) ---
//
// resolveImportState()/skipDuplicate() are a read-before-write check: they cannot see a
// concurrent writer's contribution_links row that commits after that read but before this
// call's own insert. This simulates exactly that loss — the fake client raises the same
// unique_violation (23505) the real partial index would — and asserts insertContribution backs
// out its own orphaned research_contributions row and resolves to the row that actually won.
test('insertContribution: a DB-level provenance conflict resolves to the winner and leaves no orphan row', async () => {
  const client = makeFakeClient({
    research_contributions: [{ id: 'existing-contrib-id', body: 'the concurrent winner’s row' }],
    contribution_links: [
      {
        id: 'existing-link-id',
        from_contribution_id: 'existing-contrib-id',
        target_type: 'openweb_message',
        target_id: 'ow-race-1',
        relation_type: 'derived_from',
      },
    ],
  });
  const ops = createSupabaseOps(client);

  const op = {
    contribution: {
      id: 'planned:ow-race-1',
      intent: 'community_message',
      origin: 'openweb',
      research_state: 'active',
      status: 'approved',
      parent_id: null,
      author_user_id: null,
      author_contributor_id: null,
      author_name: 'Racer',
      body: 'this batch lost the race',
      reactions: {},
      created_at: '2026-01-01T00:00:00Z',
    },
    contributor_op: null,
    visitor_identity_op: null,
    provenance_link: {
      target_type: 'openweb_message',
      target_id: 'ow-race-1',
      relation_type: 'derived_from',
      note: '{}',
    },
    identity_link: null,
  };

  const result = await ops.insertContribution(op);

  assert.equal(result.skipped, true);
  assert.equal(result.id, 'existing-contrib-id', 'must resolve to whichever contribution actually won the race');
  assert.equal(
    client.tables.research_contributions.length,
    1,
    'the losing call\'s own research_contributions row must be rolled back, never left as an orphan duplicate'
  );
  assert.equal(client.tables.research_contributions[0].id, 'existing-contrib-id');
  assert.equal(
    client.tables.contribution_links.filter((l) => l.target_id === 'ow-race-1').length,
    1,
    'still exactly one provenance link for this source message, never two'
  );
});
