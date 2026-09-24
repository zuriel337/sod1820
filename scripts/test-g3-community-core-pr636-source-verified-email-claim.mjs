// G3 Community Core — PR #636 source-verified email claim evidence.
// work_log.id=fac0eef7-2a08-42b1-bb72-c0286e51b7af, task_key=
// G3_COMMUNITY_CORE_PR636_SOURCE_VERIFIED_EMAIL_CLAIM_V1. Run:
//   node --test scripts/test-g3-community-core-pr636-source-verified-email-claim.mjs
//
// Covers the gap a live-code read against real corpus evidence found: planImport carried
// msg.author_email into contributors.email/visitor_identity.email regardless of
// msg.author_email_verified, so an unverified historical email could later satisfy
// contributors_claim_legacy's exact-match check exactly as if it had been independently
// verified. Only msg.author_email_verified === true may ever become claim evidence
// (planner.mjs sourceVerifiedEmail) — everything below exercises that gate, the deterministic
// same-batch/cross-batch evidence-accumulation (promotion) path, and the "never downgrade" rule,
// both at the pure-planner level and through the real atomic RPC adapter.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planImport } from './g3-community-foundation-runtime/planner.mjs';
import { resolveLegacyClaim } from './g3-community-foundation-runtime/identityBridge.mjs';
import { runImport, EXECUTOR_CONFIRMATION_PHRASE } from './g3-community-foundation-runtime/executor.mjs';
import { resolveImportState, createSupabaseOps } from './g3-community-foundation-runtime/opsAdapter.mjs';

function freshState() {
  return { importedMessageIds: new Set(), linkedOpenwebUserIds: new Map(), contributorsByOpenwebUserId: new Map() };
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

// ---- planImport: the gate itself ------------------------------------------------------------

test('planImport: a source-verified email becomes contributor + visitor_identity claim evidence', () => {
  const messages = [
    msg({ message_id: 'ow-v1', author_openweb_user_id: 'u-verified', author_email: 'verified@example.com', author_email_verified: true }),
  ];
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.message_id === 'ow-v1');
  assert.equal(op.contributor_op.email, 'verified@example.com');
  assert.equal(op.visitor_identity_op.email, 'verified@example.com');
});

test('planImport: an unverified (or missing-flag) email never becomes claim evidence — contributor stays manual-relink-only', () => {
  const messages = [
    msg({ message_id: 'ow-u1', author_openweb_user_id: 'u-unverified', author_email: 'unverified@example.com', author_email_verified: false }),
    msg({ message_id: 'ow-u2', author_openweb_user_id: 'u-noflag', author_email: 'noflag@example.com' }),
  ];
  const ops = planImport(messages, freshState());
  const op1 = ops.find((o) => o.message_id === 'ow-u1');
  const op2 = ops.find((o) => o.message_id === 'ow-u2');
  assert.equal(op1.contributor_op.email, null);
  assert.equal(op1.visitor_identity_op.email, null);
  assert.equal(op2.contributor_op.email, null, 'author_email_verified missing entirely must default to unverified, never assumed true');
  assert.equal(op2.visitor_identity_op.email, null);
});

test('planImport: a genuinely absent source email plans no crash and no email, verified flag or not', () => {
  const messages = [msg({ message_id: 'ow-noemail', author_openweb_user_id: 'u-noemail', author_email: null, author_email_verified: true })];
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.message_id === 'ow-noemail');
  assert.equal(op.contributor_op.email, null);
});

// ---- deterministic evidence accumulation across mixed rows -----------------------------------

test('planImport: same-batch mixed rows — an unverified row followed by a verified row for the same openweb_user_id upgrades the single planned contributor, never a second one', () => {
  const messages = [
    msg({ message_id: 'ow-mix-1', author_openweb_user_id: 'u-mix', author_email: 'mix@example.com', author_email_verified: false }),
    msg({ message_id: 'ow-mix-2', author_openweb_user_id: 'u-mix', author_email: 'mix@example.com', author_email_verified: true, parent_message_id: 'ow-mix-1' }),
  ];
  const ops = planImport(messages, freshState());
  const op1 = ops.find((o) => o.message_id === 'ow-mix-1');
  const op2 = ops.find((o) => o.message_id === 'ow-mix-2');

  assert.ok(op1.contributor_op, 'the first row still plans the one contributor create');
  assert.equal(op1.contributor_op.email, 'mix@example.com', 'planning is fully synchronous — the later verified row upgrades the still-pending create op before any execution');
  assert.equal(op2.contributor_op, null, 'the second row never plans a second contributor or a redundant op — it shares the first row\'s already-upgraded create');
  assert.equal(op1.contribution.author_contributor_id, op2.contribution.author_contributor_id);
});

test('planImport: same-batch mixed rows in the OPPOSITE order — verified first, unverified second — never downgrades', () => {
  const messages = [
    msg({ message_id: 'ow-mix-3', author_openweb_user_id: 'u-mix2', author_email: 'mix2@example.com', author_email_verified: true }),
    msg({ message_id: 'ow-mix-4', author_openweb_user_id: 'u-mix2', author_email: 'mix2@example.com', author_email_verified: false, parent_message_id: 'ow-mix-3' }),
  ];
  const ops = planImport(messages, freshState());
  const op1 = ops.find((o) => o.message_id === 'ow-mix-3');
  const op2 = ops.find((o) => o.message_id === 'ow-mix-4');
  assert.equal(op1.contributor_op.email, 'mix2@example.com');
  assert.equal(op2.contributor_op, null);
  assert.equal(op2.visitor_identity_op.email, null, 'the unverified second row itself carries no evidence, but must not erase the first row\'s verified one');
});

test('planImport: cross-batch promotion — an already-committed contributor with no email yet is upgraded via an explicit promote_email op, never re-created', () => {
  const state = freshState();
  state.contributorsByOpenwebUserId.set('u-committed', { id: 'real-contributor-uuid-1', dossier_settings: { visibility: 'private' }, email: null });
  const messages = [msg({ message_id: 'ow-promo-1', author_openweb_user_id: 'u-committed', author_email: 'promoted@example.com', author_email_verified: true })];
  const ops = planImport(messages, state);
  const op = ops.find((o) => o.message_id === 'ow-promo-1');

  assert.equal(op.contribution.author_contributor_id, 'real-contributor-uuid-1', 'must reuse the existing contributor id, never plan a new one');
  assert.ok(op.contributor_op, 'a promotion op must be planned');
  assert.equal(op.contributor_op.promote_email, true);
  assert.equal(op.contributor_op.id, 'real-contributor-uuid-1');
  assert.equal(op.contributor_op.email, 'promoted@example.com');
});

test('planImport: cross-batch — an already-committed contributor that already has an email is never touched again, verified or not', () => {
  const state = freshState();
  state.contributorsByOpenwebUserId.set('u-already', { id: 'real-contributor-uuid-2', dossier_settings: { visibility: 'private' }, email: 'already@example.com' });
  const messages = [msg({ message_id: 'ow-already-1', author_openweb_user_id: 'u-already', author_email: 'someone-else@example.com', author_email_verified: true })];
  const ops = planImport(messages, state);
  const op = ops.find((o) => o.message_id === 'ow-already-1');
  assert.equal(op.contributor_op, null, 'an existing verified email is never overwritten, even by a different verified email in a later row');
});

// ---- identityBridge: the caller-side half of the BOTH-verified invariant ---------------------

test('resolveLegacyClaim: a contributor with no claim-evidence email (unverified/missing source email) can never be claimed', () => {
  const contributor = { id: 'c-unverified', email: null, user_id: null };
  const caller = { id: 'u1', email: 'caller@example.com', emailConfirmed: true };
  const result = resolveLegacyClaim(contributor, caller);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'no_email_on_legacy_record_manual_relink_required');
});

test('resolveLegacyClaim: a contributor whose email is source-verified claim evidence is claimable by the exact, currently-confirmed match', () => {
  const contributor = { id: 'c-verified', email: 'verified@example.com', user_id: null };
  const caller = { id: 'u2', email: 'verified@example.com', emailConfirmed: true };
  const result = resolveLegacyClaim(contributor, caller);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, 'exact_confirmed_email_match');
});

test('resolveLegacyClaim: source-verified evidence alone is not enough — the caller\'s own email must also be confirmed', () => {
  const contributor = { id: 'c-verified-2', email: 'verified2@example.com', user_id: null };
  const caller = { id: 'u3', email: 'verified2@example.com', emailConfirmed: false };
  const result = resolveLegacyClaim(contributor, caller);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'caller_email_not_confirmed');
});

// ---- full atomic-adapter integration: promotion + never-downgrade actually land in the DB ----
//
// A minimal fake client mirroring g3_openweb_import_message's real transaction semantics
// (supabase/migrations/*_g3_community_core_pr636_source_verified_email_claim_v1.sql): stages
// every write of one call and commits them together, applies the same `email is null` guard on
// promotion, and the same COALESCE-on-conflict for visitor_identity.
function makeFakeClient() {
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
    if (fnName !== 'g3_openweb_import_message') return { data: null, error: { message: `unknown rpc ${fnName}` } };

    let contributorId = params.p_author_contributor_id || null;
    if (params.p_create_contributor) {
      contributorId = `fake-contributors-${nextId++}`;
      ensure('contributors').push({
        id: contributorId,
        display_name: params.p_contributor_display_name || 'OpenWeb Contributor',
        email: params.p_contributor_email,
        dossier_settings: params.p_contributor_dossier_settings || {},
      });
    } else if (params.p_promote_contributor_email && contributorId) {
      const row = ensure('contributors').find((r) => r.id === contributorId);
      if (row && (row.email === null || row.email === undefined)) row.email = params.p_contributor_email;
    }

    if (params.p_visitor) {
      const table = ensure('visitor_identity');
      const idx = table.findIndex((r) => r.visitor === params.p_visitor);
      if (idx >= 0) {
        table[idx] = {
          ...table[idx],
          email: params.p_visitor_email != null ? params.p_visitor_email : table[idx].email,
          last_seen: new Date().toISOString(),
        };
      } else {
        table.push({ visitor: params.p_visitor, email: params.p_visitor_email, last_seen: new Date().toISOString() });
      }
    }

    const contributionId = `fake-research_contributions-${nextId++}`;
    ensure('research_contributions').push({
      id: contributionId,
      author_user_id: params.p_author_user_id || null,
      author_contributor_id: contributorId,
      parent_id: null,
      body: params.p_body ?? null,
    });
    ensure('contribution_links').push({
      id: `fake-contribution_links-${nextId++}`,
      from_contribution_id: contributionId,
      target_type: 'openweb_message',
      target_id: params.p_provenance_target_id,
      relation_type: params.p_provenance_relation_type,
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

test('end-to-end: unverified row creates a contributor with no email; a later verified row (next batch) for the same openweb user promotes it; a still-later unverified row never erases the promoted email', async () => {
  const client = makeFakeClient();

  const batch1 = [msg({ message_id: 'ow-e2e-1', author_openweb_user_id: 'u-e2e', author_email: 'e2e@example.com', author_email_verified: false })];
  const state1 = await resolveImportState(client, batch1);
  await runImport(batch1, state1, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  const contributorId = client.tables.contributors[0].id;
  assert.equal(client.tables.contributors[0].email, null, 'an unverified row must never seed a claimable email');
  assert.equal(client.tables.visitor_identity[0].email, null);

  const batch2 = [msg({ message_id: 'ow-e2e-2', author_openweb_user_id: 'u-e2e', author_email: 'e2e@example.com', author_email_verified: true })];
  const state2 = await resolveImportState(client, batch2);
  assert.equal(state2.contributorsByOpenwebUserId.get('u-e2e').email, null, 'resolveImportState must surface the current (still-null) email so planImport can decide to promote');
  await runImport(batch2, state2, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  assert.equal(client.tables.contributors.length, 1, 'promotion updates the existing contributor row, never inserts a second one');
  assert.equal(client.tables.contributors[0].id, contributorId);
  assert.equal(client.tables.contributors[0].email, 'e2e@example.com', 'the source-verified row must promote the contributor email');
  assert.equal(client.tables.visitor_identity[0].email, 'e2e@example.com');

  const batch3 = [msg({ message_id: 'ow-e2e-3', author_openweb_user_id: 'u-e2e', author_email: 'spoofed-unverified@example.com', author_email_verified: false })];
  const state3 = await resolveImportState(client, batch3);
  assert.equal(state3.contributorsByOpenwebUserId.get('u-e2e').email, 'e2e@example.com', 'once promoted, resolveImportState must report the already-set email so no further promotion is attempted');
  await runImport(batch3, state3, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  assert.equal(client.tables.contributors.length, 1);
  assert.equal(client.tables.contributors[0].email, 'e2e@example.com', 'an unverified later row must never overwrite/downgrade an already source-verified email');
  assert.equal(client.tables.visitor_identity[0].email, 'e2e@example.com', 'visitor_identity must not be erased by a later unverified row either');
});

test('end-to-end: two distinct openweb_user_ids that both verify the same email stay two separate contributors, each independently claimable', async () => {
  const client = makeFakeClient();
  const messages = [
    msg({ message_id: 'ow-shared-a', author_openweb_user_id: 'u-shared-a', author_email: 'shared@example.com', author_email_verified: true }),
    msg({ message_id: 'ow-shared-b', author_openweb_user_id: 'u-shared-b', author_email: 'shared@example.com', author_email_verified: true }),
  ];
  const state = await resolveImportState(client, messages);
  await runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: createSupabaseOps(client) });
  assert.equal(client.tables.contributors.length, 2);
  assert.notEqual(client.tables.contributors[0].id, client.tables.contributors[1].id);
  assert.ok(client.tables.contributors.every((c) => c.email === 'shared@example.com'));
});
