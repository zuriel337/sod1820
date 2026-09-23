// G3 Community Core 2029 Phase 2 — focused tests for the pure-logic seams added in this
// branch (identity bridge, classification/extraction, bounded executor gating). Run:
//   npm run test:g3-community-core-2029-phase2
//
// SQL-level guarantees (RLS re-application in community_stream_projection/community_search_
// facts/fn_raziel_community_intel_scoped, the contributors_claim_legacy authority checks) are
// NOT executable-tested here — no live DB write/migration is authorized in this branch. The
// SQL text was read and reasoned about live against the exact live predicates (rc_public_read,
// contributors_read, fn_raziel_research_intel_scoped) it re-applies; see
// docs/g3-community-core-2029-phase2-shadow-branch-notes.md. This mirrors the same,
// explicitly-stated limitation Phase 1's own test suite carries.
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveLegacyClaim } from './g3-community-foundation-runtime/identityBridge.mjs';
import { classifyContribution, toDecisionLedgerCandidate } from './g3-community-foundation-runtime/classificationSeam.mjs';
import { runImport, ExecutorNotAuthorizedError, EXECUTOR_CONFIRMATION_PHRASE } from './g3-community-foundation-runtime/executor.mjs';

// ---- identity bridge --------------------------------------------------------------------
// Phase 2.1 (task_key=G3_COMMUNITY_CORE_2029_PHASE2_1_INTEGRITY_FIXES_V1) added the confirmed-
// email requirement to resolveLegacyClaim/contributors_claim_legacy; caller.email/emailConfirmed
// replaces the Phase 2 caller.verifiedEmail shape. See docs/g3-community-core-2029-phase2-1-
// integrity-fixes-branch-notes.md and scripts/test-g3-community-core-2029-phase2-1-integrity.mjs
// for the new confirmed-email-specific coverage.

test('identity bridge: exact confirmed-email match on an unclaimed legacy row is eligible', () => {
  const contributor = { id: 'c1', email: 'a@example.com', user_id: null };
  const caller = { id: 'u1', email: 'a@example.com', emailConfirmed: true };
  const r = resolveLegacyClaim(contributor, caller);
  assert.equal(r.eligible, true);
  assert.equal(r.contributor_id, 'c1');
  assert.equal(r.user_id, 'u1');
});

test('identity bridge: case/whitespace-insensitive match still resolves', () => {
  const contributor = { id: 'c1', email: '  A@Example.com ', user_id: null };
  const caller = { id: 'u1', email: 'a@example.com', emailConfirmed: true };
  assert.equal(resolveLegacyClaim(contributor, caller).eligible, true);
});

test('identity bridge: already-claimed row is never re-claimable (no auto-link)', () => {
  const contributor = { id: 'c1', email: 'a@example.com', user_id: 'someone-else' };
  const caller = { id: 'u1', email: 'a@example.com', emailConfirmed: true };
  const r = resolveLegacyClaim(contributor, caller);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'already_claimed');
});

test('identity bridge: email mismatch is refused', () => {
  const contributor = { id: 'c1', email: 'a@example.com', user_id: null };
  const caller = { id: 'u1', email: 'b@example.com', emailConfirmed: true };
  assert.equal(resolveLegacyClaim(contributor, caller).reason, 'email_mismatch');
});

test('identity bridge: no email on the legacy record requires manual relink, never auto-match', () => {
  const contributor = { id: 'c1', email: null, user_id: null };
  const caller = { id: 'u1', email: 'b@example.com', emailConfirmed: true };
  assert.equal(resolveLegacyClaim(contributor, caller).reason, 'no_email_on_legacy_record_manual_relink_required');
});

// ---- classification / extraction seam ----------------------------------------------------

test('classification: a reply is always forced to תגובה, never multi-labeled', () => {
  const c = classifyContribution({ id: 'x1', body: 'מה דעתך? https://sod1820.co.il/number/1237', parent_id: 'parent-1' });
  assert.deepEqual(c.labels, ['תגובה']);
});

test('classification: a non-reply can carry more than one label at once', () => {
  const c = classifyContribution({ id: 'x2', body: 'ראו https://example.com/x — האם 1237 קשור למקור הזה?', parent_id: null });
  assert.ok(c.labels.includes('שאלה'));
  assert.ok(c.labels.includes('מקור'));
  assert.ok(c.labels.includes('גימטריה'));
});

test('classification: extracts numbers, sources, and internal links distinctly', () => {
  const c = classifyContribution({ id: 'x3', body: 'ראו /number/1237 וגם https://example.com/topic/foo, הערך 5776', parent_id: null });
  // Digits embedded inside a URL/domain are extracted too — the same behavior the live
  // chat_search_facts number-extraction regex already has; not "fixed" beyond that convention.
  assert.deepEqual(c.extraction.numbers.sort((a, b) => a - b), [1237, 5776]);
  assert.deepEqual(c.extraction.sources, ['https://example.com/topic/foo,']);
  assert.ok(c.extraction.internal_links.includes('/number/1237'));
});

test('classification: a calculable claim is a canonical-engine handoff pointer, never a computed value', () => {
  const c = classifyContribution({ id: 'x4', body: 'הערך הוא 613', parent_id: null });
  assert.equal(c.extraction.canonical_engine_handoff.engine, 'number_dossier');
  assert.deepEqual(c.extraction.canonical_engine_handoff.numbers, [613]);
});

test('classification (intent) never sets status/research_state — decision_ledger candidate is always pending, never human_decision', () => {
  const c = classifyContribution({ id: 'x5', body: 'שיתוף רגיל', parent_id: null });
  const candidate = toDecisionLedgerCandidate(c);
  assert.equal(candidate.status, 'pending');
  assert.equal(candidate.human_decision, null);
  assert.ok(!('research_state' in candidate));
  assert.ok(!('publish' in candidate) && !('canonical' in candidate));
});

test('classification: short/ambiguous text carries high uncertainty, never a false-confident score', () => {
  const c = classifyContribution({ id: 'x6', body: 'ok', parent_id: null });
  assert.ok(c.uncertainty >= 0.8);
});

// ---- bounded archive import executor ------------------------------------------------------

const messages = [{ message_id: 'm1', body: 'hi', author_openweb_user_id: null, author_email: null, moderation_state: 'published', likes: 0, dislikes: 0, created_at: '2020-01-01T00:00:00Z' }];
const state = { importedMessageIds: [], linkedOpenwebUserIds: new Map(), contributorsByOpenwebUserId: new Map() };

test('executor: default call is dry-run only, never touches ops', async () => {
  let called = false;
  const ops = { insertContribution: async () => { called = true; }, skipDuplicate: async () => { called = true; } };
  const result = await runImport(messages, state, { ops });
  assert.equal(result.executed, false);
  assert.ok(Array.isArray(result.plan) && result.plan.length === 1);
  assert.equal(called, false);
});

test('executor: execute:true without the exact confirmation phrase is refused', async () => {
  const ops = { insertContribution: async () => {}, skipDuplicate: async () => {} };
  await assert.rejects(
    () => runImport(messages, state, { execute: true, confirm: 'wrong-phrase', ops }),
    ExecutorNotAuthorizedError
  );
});

test('executor: execute:true with the correct phrase but no ops implementation is refused', async () => {
  await assert.rejects(
    () => runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops: null }),
    ExecutorNotAuthorizedError
  );
});

test('executor: execute:true + correct phrase + ops implementation runs the plan through the supplied callbacks only', async () => {
  const calls = [];
  const ops = {
    insertContribution: async (op) => { calls.push(op.message_id); return { id: 'planned-1' }; },
    skipDuplicate: async (op) => { calls.push(`skip:${op.message_id}`); },
  };
  const result = await runImport(messages, state, { execute: true, confirm: EXECUTOR_CONFIRMATION_PHRASE, ops });
  assert.equal(result.executed, true);
  assert.deepEqual(calls, ['m1']);
});
