// G3 Community Core — PR #636 atomic per-message OpenWeb import.
// task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_MESSAGE_IMPORT_V1. Run:
//   npm run test:g3-community-core-pr636-atomic-message-import
//
// See docs/g3-community-core-pr636-atomic-message-import-branch-notes.md and
// supabase/migrations/*_g3_community_core_pr636_atomic_message_import_v1.sql for the full design.
//
// scripts/test-g3-community-core-pr636-phase3-ops-adapter.mjs already covers the *happy-path*
// external contract (anonymous/identified authors, replay, cross-batch parent linking, the
// provenance-race resolution) against a fake client whose `rpc()` always commits-or-conflicts as
// one atomic unit. This file exercises the property that made the atomic RPC necessary in the
// first place: an arbitrary failure *inside* the multi-table write must roll back every write that
// call made, not just stop making new ones — the exact partial-commit gap the old five-separate-
// client-calls insertContribution() had. A real Postgres function invocation gets this for free
// (an uncaught exception aborts the whole call); this fake client's `rpc()` models the same
// all-or-nothing commit so the *adapter's* handling of that contract (never assume partial state,
// never manually patch up an orphan) is what's actually under test here.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runImport, EXECUTOR_CONFIRMATION_PHRASE } from './g3-community-foundation-runtime/executor.mjs';
import { resolveImportState, createSupabaseOps } from './g3-community-foundation-runtime/opsAdapter.mjs';

// ---- In-memory fake Supabase client with injectable mid-RPC failure ---------------------------
//
// Same `.from(table)` read surface scripts/test-g3-community-core-pr636-phase3-ops-adapter.mjs
// uses (just enough for resolveImportState/resolveContributionIdByOpenwebMessage), plus an `rpc()`
// that can be told to fail after a specific staged step via `failAfterStep`. Because every write is
// only pushed into `tables` in the final commit block — after every failure checkpoint has been
// passed — a failure at any checkpoint leaves `tables` completely unchanged for that call, exactly
// mirroring an aborted Postgres transaction.
function makeFakeClient({ failAfterStep = null } = {}) {
  const tables = {};
  let nextId = 1;
  const ensure = (name) => (tables[name] = tables[name] || []);

  function from(table) {
    const rows = ensure(table);
    const builder = {
      _filters: [],
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
      then(resolve) {
        const matched = rows.filter((r) => this._filters.every((f) => f(r)));
        resolve({ data: matched, error: null });
      },
    };
    return builder;
  }

  async function rpc(fnName, params) {
    if (fnName !== 'g3_openweb_import_message') {
      return { data: null, error: { message: `fake client: unknown rpc "${fnName}"` } };
    }

    // Checkpoints in the exact order g3_openweb_import_message's SQL body performs its writes:
    // contributor -> visitor_identity -> research_contributions -> provenance link -> identity
    // link. `failAfterStep` names the step that just "succeeded" inside the (simulated)
    // transaction before the whole call aborts — nothing gets committed either way.
    const checkpoint = (step) => {
      if (failAfterStep === step) {
        return { data: null, error: { code: 'SIMULATED', message: `simulated_failure_after_${step}` } };
      }
      return null;
    };

    let contributorId = params.p_author_contributor_id || null;
    if (params.p_create_contributor) {
      contributorId = `fake-contributors-${nextId++}`;
      const failure = checkpoint('contributor_created');
      if (failure) return failure;
    }

    if (params.p_visitor) {
      const failure = checkpoint('visitor_upserted');
      if (failure) return failure;
    }

    const contributionId = `fake-research_contributions-${nextId++}`;
    {
      const failure = checkpoint('contribution_inserted');
      if (failure) return failure;
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
    {
      const failure = checkpoint('provenance_inserted');
      if (failure) return failure;
    }

    if (params.p_identity_target_id) {
      const failure = checkpoint('identity_linked');
      if (failure) return failure;
    }

    // Commit — only reached once every checkpoint above has been passed uninjected.
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
      parent_id: null,
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

  return { tables, from, rpc, setFailAfterStep: (step) => (failAfterStep = step) };
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

function countRows(client, table) {
  return (client.tables[table] || []).length;
}

// ---- Failure-injection: each critical boundary ------------------------------------------------
// Every case: the injected failure must leave zero rows in every table the call would have
// touched (true atomicity — not just "stopped early"), and a clean retry afterward must produce
// exactly one of each expected row, never a duplicate from the failed attempt.

test('failure injection: contributor created, then failure — no contributor, no contribution, no links survive; retry creates exactly one of each', async () => {
  const client = makeFakeClient({ failAfterStep: 'contributor_created' });
  const messages = [msg({ message_id: 'ow-fi-1', author_openweb_user_id: 'u-fi-1' })];
  const state = await resolveImportState(client, messages);

  await assert.rejects(() =>
    runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) })
  );
  assert.equal(countRows(client, 'contributors'), 0, 'no orphan contributor after the injected failure');
  assert.equal(countRows(client, 'research_contributions'), 0);
  assert.equal(countRows(client, 'contribution_links'), 0);

  client.setFailAfterStep(null);
  const stateRetry = await resolveImportState(client, messages);
  const result = await runImport(messages, stateRetry, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(countRows(client, 'contributors'), 1, 'exactly one soft contributor after retry');
  assert.equal(countRows(client, 'research_contributions'), 1, 'exactly one message contribution after retry');
  assert.equal(
    client.tables.contribution_links.filter((l) => l.target_id === 'ow-fi-1' && l.target_type === 'openweb_message').length,
    1,
    'exactly one provenance link after retry'
  );
});

test('failure injection: visitor_identity upsert, then failure — nothing survives; retry succeeds cleanly', async () => {
  const client = makeFakeClient({ failAfterStep: 'visitor_upserted' });
  const messages = [msg({ message_id: 'ow-fi-2', author_openweb_user_id: 'u-fi-2' })];
  const state = await resolveImportState(client, messages);

  await assert.rejects(() =>
    runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) })
  );
  assert.equal(countRows(client, 'contributors'), 0);
  assert.equal(countRows(client, 'visitor_identity'), 0);
  assert.equal(countRows(client, 'research_contributions'), 0);
  assert.equal(countRows(client, 'contribution_links'), 0);

  client.setFailAfterStep(null);
  const stateRetry = await resolveImportState(client, messages);
  const result = await runImport(messages, stateRetry, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(countRows(client, 'visitor_identity'), 1);
  assert.equal(countRows(client, 'research_contributions'), 1);
});

test('failure injection: contribution inserted, then provenance-link failure — no half-authored orphan; retry produces exactly one contribution', async () => {
  const client = makeFakeClient({ failAfterStep: 'contribution_inserted' });
  const messages = [msg({ message_id: 'ow-fi-3' })];
  const state = await resolveImportState(client, messages);

  await assert.rejects(() =>
    runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) })
  );
  assert.equal(
    countRows(client, 'research_contributions'),
    0,
    'the contribution this call was about to insert must not survive as an unlinked orphan'
  );
  assert.equal(countRows(client, 'contribution_links'), 0);

  client.setFailAfterStep(null);
  const stateRetry = await resolveImportState(client, messages);
  const result = await runImport(messages, stateRetry, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(countRows(client, 'research_contributions'), 1, 'exactly one message contribution after retry');
  assert.equal(
    client.tables.contribution_links.filter((l) => l.target_id === 'ow-fi-3').length,
    1,
    'exactly one provenance link after retry'
  );
});

test('failure injection: provenance link inserted, then identity-link failure — contribution+provenance also roll back; retry leaves exactly one contribution, one provenance link, at most one soft contributor', async () => {
  const client = makeFakeClient({ failAfterStep: 'identity_linked' });
  const messages = [msg({ message_id: 'ow-fi-4', author_openweb_user_id: 'u-fi-4' })];
  const state = await resolveImportState(client, messages);

  await assert.rejects(() =>
    runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) })
  );
  assert.equal(
    countRows(client, 'research_contributions'),
    0,
    'provenance succeeding does not make the contribution durable if identity-link then fails — the whole call rolls back'
  );
  assert.equal(countRows(client, 'contribution_links'), 0);
  assert.equal(countRows(client, 'contributors'), 0);

  client.setFailAfterStep(null);
  const stateRetry = await resolveImportState(client, messages);
  const result = await runImport(messages, stateRetry, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });
  assert.equal(result.completed, true);
  assert.equal(countRows(client, 'research_contributions'), 1, 'exactly one message contribution after retry');
  assert.equal(
    client.tables.contribution_links.filter((l) => l.target_id === 'ow-fi-4' && l.target_type === 'openweb_message').length,
    1,
    'exactly one provenance link after retry'
  );
  assert.equal(countRows(client, 'contributors'), 1, 'at most one soft contributor for the source user after retry');
});

// ---- Replay / concurrent duplicate around the atomic RPC contract ------------------------------

test('replay: re-running insertContribution for an already-imported message_id after a real RPC round-trip still resolves via contribution_links, never re-inserts', async () => {
  const client = makeFakeClient();
  const messages = [msg({ message_id: 'ow-replay-1' })];
  const state1 = await resolveImportState(client, messages);
  await runImport(messages, state1, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  assert.equal(countRows(client, 'research_contributions'), 1);
  const originalId = client.tables.research_contributions[0].id;

  const state2 = await resolveImportState(client, messages);
  assert.ok(state2.importedMessageIds.has('ow-replay-1'));
  const result2 = await runImport(messages, state2, {
    execute: true,
    confirm: EXECUTOR_CONFIRMATION_PHRASE,
    ops: createSupabaseOps(client),
  });

  assert.equal(countRows(client, 'research_contributions'), 1, 'no duplicate row on replay');
  assert.equal(result2.results[0].op, 'skip_duplicate');
  assert.equal(result2.results[0].result.existing_contribution_id, originalId);
});

test('concurrent duplicate: two batches race the same message_id through the atomic RPC — the loser rolls back completely and resolves to the winner, never a second research_contributions row', async () => {
  const client = makeFakeClient();
  const messageId = 'ow-concurrent-1';

  // Batch A observes pre-write state (nothing imported yet) and calls insertContribution first —
  // this is the writer that actually wins. Batch B *also* observed pre-write state before A
  // committed (the exact race window cl_openweb_message_derived_from_uniq exists for) — its own
  // op is built the same way, simulating two workers that both passed the read-before-write check.
  const opA = buildInsertOp(msg({ message_id: messageId }));
  const opB = buildInsertOp(msg({ message_id: messageId }));

  const ops = createSupabaseOps(client);
  const resultA = await ops.insertContribution(opA);
  assert.equal(resultA.skipped, undefined, 'the first writer must not see itself as skipped');
  assert.equal(countRows(client, 'research_contributions'), 1);

  const resultB = await ops.insertContribution(opB);
  assert.equal(resultB.skipped, true, 'the second, losing writer must resolve as skipped');
  assert.equal(resultB.id, resultA.id, 'the loser must resolve to the exact contribution the winner created');
  assert.equal(
    countRows(client, 'research_contributions'),
    1,
    'the losing call must leave no second/orphaned research_contributions row — atomic rollback, not a manual delete'
  );
  assert.equal(
    client.tables.contribution_links.filter((l) => l.target_id === messageId && l.target_type === 'openweb_message').length,
    1,
    'still exactly one provenance link for this source message'
  );
});

// planImport's op shape for a single non-reply message, built the same way executor.mjs's phase 1
// builds it (parent_id forced null) — reused by the concurrent-duplicate test above so both
// "batches" call insertContribution with the exact op shape the real executor would pass.
function buildInsertOp(message) {
  const isReply = Boolean(message.parent_message_id);
  return {
    contribution: {
      intent: isReply ? 'תגובה' : 'תצפית',
      origin: 'openweb',
      research_state: isReply ? 'discussion' : 'idea',
      status: 'approved',
      parent_id: null,
      author_user_id: null,
      author_contributor_id: null,
      author_name: message.author_display_name || null,
      body: message.body,
      reactions: {},
      created_at: message.created_at,
    },
    contributor_op: null,
    visitor_identity_op: null,
    provenance_link: {
      target_type: 'openweb_message',
      target_id: message.message_id,
      relation_type: 'derived_from',
      note: JSON.stringify({ url: null, url_kind: null, original_moderation_state: message.moderation_state, parent_message_id: message.parent_message_id || null, representation_payload_missing: false }),
    },
    identity_link: null,
  };
}
