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

// ---- Search Index Gate (task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_GATE_V1) -----------
// Candidate-only index eligibility: mere number/URL/video/social chat is never sufficient;
// an actual research-bearing signal (gematria/numeric relation, cipher/ELS/method, verse/
// entity relation, or explicit interpretive connection) is required.

test('index gate: a random number with no research-bearing signal is not index-eligible', () => {
  const c = classifyContribution({ id: 'g1', body: 'קניתי 3 ספרים ו-12 עטים בחנות', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
  assert.deepEqual(c.index_eligibility.reasons, []);
});

test('index gate: a YouTube link with no authored research text is not index-eligible', () => {
  const c = classifyContribution({ id: 'g2', body: 'https://youtube.com/watch?v=abc123', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
});

test('index gate: a generic external URL alone is not index-eligible', () => {
  const c = classifyContribution({ id: 'g3', body: 'https://example.com/article', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
});

test('index gate: small talk is not index-eligible', () => {
  const c = classifyContribution({ id: 'g4', body: 'מה שלומך היום?', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
});

test('index gate: reaction-only text is not index-eligible', () => {
  const c = classifyContribution({ id: 'g5', body: 'וואו מדהים!!!', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
});

test('index gate: an explicit gematria relation claim is index-eligible', () => {
  const c = classifyContribution({ id: 'g6', body: 'המילה אהבה עולה בגימטריה לערך 13', parent_id: null });
  assert.equal(c.index_eligibility.eligible, true);
  assert.ok(c.index_eligibility.reasons.includes('gematria_relation'));
});

test('index gate: a verse reference with an interpretive connection is index-eligible', () => {
  const c = classifyContribution({ id: 'g7', body: 'בראשית א:א "בראשית ברא" מרמז על תחילת הבריאה', parent_id: null });
  assert.equal(c.index_eligibility.eligible, true);
  assert.ok(c.index_eligibility.reasons.includes('verse_or_entity_reference'));
  assert.ok(c.index_eligibility.reasons.includes('interpretive_connection'));
});

test('index gate: an ELS/cipher/method statement is index-eligible', () => {
  const c = classifyContribution({ id: 'g8', body: 'מצאתי צופן אתב"ש במילה הזו שמצביע על קשר עמוק', parent_id: null });
  assert.equal(c.index_eligibility.eligible, true);
  assert.ok(c.index_eligibility.reasons.includes('cipher_or_method_operation'));
});

// Corpus calibration (task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_CORPUS_CALIBRATION_V1):
// 2196 of 2317 real-corpus rows tagged with only a verse/entity-reference reason had no other
// corroborating signal — a sole entity/link mention is a scan candidate, never final-eligible
// on its own. It needs an authored interpretive connection alongside it.
test('index gate: an internal entity link alone is a scan candidate but not index-eligible', () => {
  const c = classifyContribution({ id: 'g9', body: 'ראו /number/1237 — יש כאן קשר מעניין', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
  assert.deepEqual(c.index_eligibility.reasons, []);
  assert.equal(c.index_eligibility.scan_candidate, true);
  assert.ok(c.index_eligibility.candidate_reasons.includes('internal_entity_reference'));
});

test('index gate: an internal entity link plus an explicit interpretive connection is index-eligible', () => {
  const c = classifyContribution({ id: 'g9b', body: 'ראו /number/1237 — זה מרמז על קשר עמוק', parent_id: null });
  assert.equal(c.index_eligibility.eligible, true);
  assert.ok(c.index_eligibility.reasons.includes('internal_entity_reference'));
  assert.ok(c.index_eligibility.reasons.includes('interpretive_connection'));
});

test('index gate: a verse reference alone (no interpretive connection) is a scan candidate but not index-eligible', () => {
  const c = classifyContribution({ id: 'g9c', body: 'קראתי היום פרק בספר תהלים', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
  assert.ok(c.index_eligibility.scan_candidate);
  assert.ok(c.index_eligibility.candidate_reasons.includes('verse_or_entity_reference'));
});

// ---- real-corpus false-positive regressions (corpus calibration) ------------------------

test('index gate FP regression: ordinary Hebrew "השמות" must not match the book שמות', () => {
  const c = classifyContribution({ id: 'fp1', body: 'אני אוהב את השמות שבחרנו לילדים שלנו', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
  assert.deepEqual(c.index_eligibility.reasons, []);
  assert.ok(!c.index_eligibility.candidate_reasons.includes('verse_or_entity_reference'));
});

test('index gate FP regression: an external URL path segment (e.g. /world/...) is never an internal reference', () => {
  const c = classifyContribution({
    id: 'fp2',
    body: 'ראו את הכתבה הזו https://cnn.com/world/some-story-2024 — מעניין',
    parent_id: null,
  });
  assert.deepEqual(c.extraction.internal_links, []);
  assert.equal(c.index_eligibility.eligible, false);
});

test('index gate FP regression: digits inside a URL (query params/timecodes) are never a numeric-relation operand', () => {
  const c = classifyContribution({
    id: 'fp3',
    body: 'יש כאן קשר בגימטריה https://example.com/watch?v=12345&t=95',
    parent_id: null,
  });
  assert.equal(c.index_eligibility.eligible, false);
  assert.ok(!c.index_eligibility.reasons.includes('gematria_relation'));
});

test('index gate FP regression: mere mention/rejection of גימטריה with no operand is not index-eligible', () => {
  const c = classifyContribution({ id: 'fp4', body: 'גימטריה לא תופס אצלי בכלל', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
  assert.deepEqual(c.index_eligibility.reasons, []);
});

test('index gate FP regression: a bibliographic reference (e.g. רמז ע"ו) is not index-eligible', () => {
  const c = classifyContribution({ id: 'fp5', body: 'ראו הערה 3, רמז ע"ו בספר', parent_id: null });
  assert.equal(c.index_eligibility.eligible, false);
  assert.deepEqual(c.index_eligibility.reasons, []);
});

test('index gate: decision_ledger candidate payload carries index_eligible + reasons, never alters status', () => {
  const eligible = classifyContribution({ id: 'g10', body: 'המילה חיים עולה בגימטריה ל-68', parent_id: null });
  const eligibleCandidate = toDecisionLedgerCandidate(eligible);
  assert.equal(eligibleCandidate.candidate.index_eligible, true);
  assert.ok(Array.isArray(eligibleCandidate.candidate.index_eligibility_reasons));
  assert.ok(eligibleCandidate.candidate.index_eligibility_reasons.length > 0);
  assert.equal(eligibleCandidate.status, 'pending');
  assert.equal(eligibleCandidate.human_decision, null);

  const ineligible = classifyContribution({ id: 'g11', body: 'מה נשמע?', parent_id: null });
  const ineligibleCandidate = toDecisionLedgerCandidate(ineligible);
  assert.equal(ineligibleCandidate.candidate.index_eligible, false);
  assert.deepEqual(ineligibleCandidate.candidate.index_eligibility_reasons, []);
});

test('index gate: decision_ledger candidate also carries the scan_candidate prefilter tier, kept separate from index_eligible', () => {
  // Sole entity mention: a scan candidate (prefilter hit) that is NOT final-index-eligible —
  // the two tiers must be visibly distinct in the same candidate JSON.
  const soleEntityMention = classifyContribution({ id: 'g12', body: 'קראתי היום פרק בספר תהלים', parent_id: null });
  const candidate = toDecisionLedgerCandidate(soleEntityMention);
  assert.equal(candidate.candidate.index_eligible, false);
  assert.equal(candidate.candidate.scan_candidate, true);
  assert.ok(candidate.candidate.scan_candidate_reasons.includes('verse_or_entity_reference'));

  const noSignal = classifyContribution({ id: 'g13', body: 'מה נשמע?', parent_id: null });
  const noSignalCandidate = toDecisionLedgerCandidate(noSignal);
  assert.equal(noSignalCandidate.candidate.scan_candidate, false);
  assert.deepEqual(noSignalCandidate.candidate.scan_candidate_reasons, []);
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
