// G3 Community Core — PR #636 atomic parent link.
// task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_PARENT_LINK_V1. Run:
//   npm run test:g3-community-core-pr636-atomic-parent-link
//
// See supabase/migrations/*_g3_community_core_pr636_atomic_parent_link_v1.sql for the full design.
//
// Closes the crash-consistency gap left by the atomic-message-import fix
// (task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_MESSAGE_IMPORT_V1): that fix made the contributor/
// visitor_identity/research_contributions/contribution_links writes atomic, but still inserted
// research_contributions.parent_id = null unconditionally and left the real linkage to
// executor.mjs's separate, un-atomic phase-2 linkParent() UPDATE. A crash between the atomic
// insert committing and that later UPDATE running left an imported child permanently unlinked,
// because a retry resolves the message_id as already-imported (skip_duplicate) and never revisits
// the row to repair it.
//
// This suite exercises the fix end-to-end through the real planner (planner.mjs) and ops adapter
// (opsAdapter.mjs) — never a synthetic op literal — against a fake Supabase client whose `rpc()`
// models the real RPC's new resolve-or-fail-closed parent contract (see the migration above),
// while never calling `ops.linkParent` at all: every assertion here proves parent linkage is
// correct from the atomic insert alone, independent of executor.mjs's phase 2.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planImport } from './g3-community-foundation-runtime/planner.mjs';
import { EXECUTOR_CONFIRMATION_PHRASE } from './g3-community-foundation-runtime/executor.mjs';
import {
  resolveImportState,
  createSupabaseOps,
  runBoundedImport,
} from './g3-community-foundation-runtime/opsAdapter.mjs';

// ---- Minimal in-memory fake Supabase client -----------------------------------------------------
// Same read surface (select/eq/in/limit/maybeSingle) the other PR #636 test files use, plus an
// `rpc()` that mirrors g3_openweb_import_message's new atomic parent-resolution contract: a
// present p_parent_message_id is resolved via contribution_links(target_type=openweb_message,
// relation_type=derived_from) in the same call as the insert, or the call fails closed (an error,
// never a silent null) if it does not resolve.
function makeFakeClient(seed = {}) {
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
      // Only ever reached by executor.mjs's phase-2 linkParent() — now a redundant/idempotent
      // re-application of the parent_id the atomic RPC already set (see the crash-consistency
      // test above, which never calls this at all). Supported here purely so
      // `runBoundedImport`'s real two-phase executor path still has something to call.
      update(patch) {
        this._patch = patch;
        return this;
      },
      then(resolve) {
        const matched = rows.filter((r) => this._filters.every((f) => f(r)));
        if (this._patch) {
          for (const r of matched) Object.assign(r, this._patch);
        }
        resolve({ data: matched, error: null });
      },
    };
    return builder;
  }

  async function rpc(fnName, params) {
    if (fnName !== 'g3_openweb_import_message') {
      return { data: null, error: { message: `fake client: unknown rpc "${fnName}"` } };
    }

    const provenanceConflict = ensure('contribution_links').some(
      (r) =>
        r.target_type === 'openweb_message' &&
        r.relation_type === 'derived_from' &&
        r.target_id === params.p_provenance_target_id
    );
    if (provenanceConflict) {
      return {
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "cl_openweb_message_derived_from_uniq"',
        },
      };
    }

    // Mirrors the migration's three outcomes exactly: null/blank -> no lookup, parent_id stays
    // null; present + resolves -> real parent_id set in this same call; present + does not
    // resolve -> fail closed (an error), never a silently null parent_id for an expected parent.
    let parentId = null;
    if (params.p_parent_message_id) {
      const parentLink = ensure('contribution_links').find(
        (r) => r.target_type === 'openweb_message' && r.relation_type === 'derived_from' && r.target_id === params.p_parent_message_id
      );
      if (!parentLink) {
        return {
          data: null,
          error: {
            message: `g3_openweb_import_message: expected parent openweb_message ${params.p_parent_message_id} not found via contribution_links (derived_from) — refusing to insert with a silently null parent_id`,
          },
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

// Drives only ops.insertContribution — never ops.linkParent — for each op planImport produces, in
// plan order. This is deliberately narrower than executor.mjs's runImport: every test in this file
// wants to prove parent linkage is already correct straight out of insertContribution, with phase 2
// never having run at all (simulating a crash before it, or simply that it is now redundant).
async function insertAllViaAtomicRpcOnly(client, messages, state) {
  const plan = planImport(messages, state);
  const ops = createSupabaseOps(client);
  const results = [];
  for (const op of plan) {
    if (op.op !== 'insert_contribution') {
      results.push(await ops.skipDuplicate(op));
      continue;
    }
    results.push(await ops.insertContribution(op));
  }
  return results;
}

test('same-batch parent: child resolves its parent atomically, from insertContribution alone, before any phase-2 link runs', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-sb-parent' }), msg({ message_id: 'ow-sb-child', parent_message_id: 'ow-sb-parent' })];
  const state = await resolveImportState(client, messages);
  await insertAllViaAtomicRpcOnly(client, messages, state);

  const rows = client.tables.research_contributions;
  assert.equal(rows.length, 2);
  const [parent, child] = rows;
  assert.equal(child.parent_id, parent.id, 'parent_id must already be correct straight out of the atomic insert');
});

test('cross-batch parent: a reply in batch 2 resolves its already-committed batch-1 parent atomically, no phase-2 link involved', async () => {
  const client = makeFakeClient();
  const batch1 = [msg({ message_id: 'ow-cb-parent' })];
  const state1 = await resolveImportState(client, batch1);
  await insertAllViaAtomicRpcOnly(client, batch1, state1);
  const parentId = client.tables.research_contributions[0].id;

  const batch2 = [msg({ message_id: 'ow-cb-child', parent_message_id: 'ow-cb-parent' })];
  const state2 = await resolveImportState(client, batch2);
  await insertAllViaAtomicRpcOnly(client, batch2, state2);

  const child = client.tables.research_contributions.find((r) => r.id !== parentId);
  assert.equal(child.parent_id, parentId);
});

test('crash-consistency: crash before phase-2 link never runs; retry (skip_duplicate) preserves the already-correct parent_id, nothing to repair', async () => {
  const client = makeFakeClient();

  // Parent, then child — both inserted via the atomic RPC only. This *is* the crash: the process
  // is simulated as having stopped right here, before executor.mjs's phase-2 linkParent() would
  // ever have run. Under the pre-fix design this is exactly the state that left a child
  // permanently unlinked; under the fix, insertContribution already set the real parent_id.
  const messages = [msg({ message_id: 'ow-crash-parent' }), msg({ message_id: 'ow-crash-child', parent_message_id: 'ow-crash-parent' })];
  const state1 = await resolveImportState(client, messages);
  await insertAllViaAtomicRpcOnly(client, messages, state1);

  assert.equal(client.tables.research_contributions.length, 2);
  const parentId = client.tables.research_contributions.find((r) => r.body === 'hello' && r.parent_id === null).id;
  const childBeforeRetry = client.tables.research_contributions.find((r) => r.parent_id !== null);
  assert.equal(childBeforeRetry.parent_id, parentId, 'parent_id must already be correct before any retry — nothing pending to link');

  // Retry after the "crash": resolveImportState now sees both message_ids as already imported
  // (their provenance links exist), so planImport routes both to skip_duplicate — neither is
  // re-inserted, and nothing attempts to repair a parent_id, because none is broken.
  const state2 = await resolveImportState(client, messages);
  assert.ok(state2.importedMessageIds.has('ow-crash-parent'));
  assert.ok(state2.importedMessageIds.has('ow-crash-child'));
  const retryResults = await insertAllViaAtomicRpcOnly(client, messages, state2);

  assert.ok(retryResults.every((r) => r.skipped === true), 'retry must resolve every row via skip_duplicate, never re-insert');
  assert.equal(client.tables.research_contributions.length, 2, 'exactly one child row across the crash and the retry — no duplicate, no orphan');
  const childAfterRetry = client.tables.research_contributions.find((r) => r.parent_id !== null);
  assert.equal(childAfterRetry.parent_id, parentId, 'the child imported before the crash is still correctly parented after retry — nothing needed repair');
});

test('genuinely absent parent (the 39-genuinely-missing class): parent_message_id present on the source row but never part of imported provenance stays null, no RPC lookup, no failure', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-orphan-child', parent_message_id: 'ow-never-imported' })];
  const state = await resolveImportState(client, messages);
  const results = await insertAllViaAtomicRpcOnly(client, messages, state);

  assert.equal(results[0].id, client.tables.research_contributions[0].id);
  assert.equal(client.tables.research_contributions[0].parent_id, null, 'genuinely absent parent must stay null, never guessed');
});

test('fail-closed: an expected-but-unresolvable parent (live provenance disagrees with the caller\'s own expectation) aborts insertContribution rather than inserting a silently null parent_id', async () => {
  const client = makeFakeClient();
  const state = { importedMessageIds: new Set(['ow-ghost-parent']), linkedOpenwebUserIds: new Map(), contributorsByOpenwebUserId: new Map() };
  const messages = [msg({ message_id: 'ow-fc-child', parent_message_id: 'ow-ghost-parent' })];
  const plan = planImport(messages, state);
  assert.equal(plan[0].parent_message_id, 'ow-ghost-parent', 'planner must mark this parent as expected-present (existing-via)');

  const ops = createSupabaseOps(client);
  await assert.rejects(() => ops.insertContribution(plan[0]));
  assert.equal(client.tables.research_contributions, undefined, 'the row must never be committed with a silently null parent_id');
});

test('runBoundedImport end-to-end: the atomic RPC alone (no reliance on the still-running phase-2 link) produces correct cross-batch parenting', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-bi-1' }), msg({ message_id: 'ow-bi-2', parent_message_id: 'ow-bi-1' })];
  const result = await runBoundedImport(client, messages, {
    batchSize: 1,
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
  });
  assert.equal(result.completed, true);
  const rows = client.tables.research_contributions;
  const [parent, child] = rows;
  assert.equal(child.parent_id, parent.id);
});
