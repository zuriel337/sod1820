import test from 'node:test';
import assert from 'node:assert/strict';

import { composeResearchW2 } from './researchComposerW2.js';
import {
  PERSONAL_GEMATRIA_PAIR_CAPABILITY,
  PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT,
  normalizePersonalGematriaPairResearchRunRequest,
  normalizeResearchRunRequest,
} from './researchRunRequest.js';
import { resolveResearchProfile, RESEARCH_PROFILE } from './researchProfiles.js';
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from './gematriaRelationW2Executor.js';

const USER_AUTHORIZATION = Object.freeze({
  verified_authority: Object.freeze({
    source: 'supabase_auth',
    subject_verified: true,
    admin: false,
  }),
});

function positiveCandidate() {
  return {
    status: 'candidate',
    relation_kind: 'gematria_convergence',
    engine_signal: 2,
    engine_evidence: [{ method: 'רגיל', value: 358, group_repr: 'regular' }],
    composite_evidence: [],
    independent_evidence: { edges: [], topic_cards: [], research_objects: [] },
    noise_flags: [],
    engine_signal_components: { effective_independent_group_count: 1 },
  };
}

test('personal pair request is bounded, normalized and cannot be widened by caller authority fields', () => {
  const run = normalizeResearchRunRequest({
    contract: PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT,
    expressions: [' משיח ', 'מלך ישראל'],
    question: 'דלוף משיח ומלך ישראל לתוכנית',
    requested_capabilities: ['els', 'graph', 'gematria'],
    user_ref: 'caller-controlled',
    admin: true,
    owner: 'someone-else',
    access_tier: 'public',
    publication_status: 'published',
    surface: 'raziel',
  });

  assert.equal(run.contract, PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT);
  assert.equal(run.question, 'השוואה קנונית בין שני ביטויים');
  assert.deepEqual(run.requested_capabilities, [PERSONAL_GEMATRIA_PAIR_CAPABILITY]);
  assert.deepEqual(run.identity_candidates, []);
  assert.equal(run.intake.persistence.mode, 'ephemeral');
  assert.equal(run.intake.representations.length, 2);
  assert.deepEqual(run.intake.representations.map(x => x.content), ['משיח', 'מלך ישראל']);
  assert.ok(run.intake.representations.every(x => x.access.tier === 'personal'));
  for (const forbidden of ['user_ref', 'admin', 'owner', 'access_tier', 'publication_status']) {
    assert.equal(Object.hasOwn(run, forbidden), false);
  }
});

test('personal pair rejects malformed, duplicate, control-bearing, non-Hebrew and oversized inputs', () => {
  const normalize = expressions => normalizePersonalGematriaPairResearchRunRequest({ expressions });
  assert.throws(() => normalize([]), /exactly two/);
  assert.throws(() => normalize(['משיח']), /exactly two/);
  assert.throws(() => normalize(['א', 'ב', 'ג']), /exactly two/);
  assert.throws(() => normalize(['', 'מלך']), /must not be empty/);
  assert.throws(() => normalize(['משיח', 'משיח']), /distinct after canonical normalization/);
  assert.throws(() => normalize(['משיח', 'מָשִיח']), /distinct after canonical normalization/);
  assert.throws(() => normalize(['משיח\nבן דוד', 'מלך']), /control characters/);
  assert.throws(() => normalize(['english', 'מלך']), /requires Hebrew/);
  assert.throws(() => normalize(['א'.repeat(161), 'מלך']), /character limit/);
  assert.throws(
    () => normalizeResearchRunRequest({ contract: 'private-expression-must-not-reflect' }),
    error => error?.message === 'research-run: unsupported contract',
  );
});

test('contract-only capability does not silently widen general research profiles', () => {
  for (const profile of [RESEARCH_PROFILE.DEEP, RESEARCH_PROFILE.RESEARCH]) {
    assert.equal(resolveResearchProfile(profile).capabilities.includes(PERSONAL_GEMATRIA_PAIR_CAPABILITY), false);
  }
  assert.deepEqual(resolveResearchProfile(RESEARCH_PROFILE.CUSTOM, {
    capabilities: [PERSONAL_GEMATRIA_PAIR_CAPABILITY],
  }).capabilities, []);
});

test('authenticated personal pair composes through the canonical Result Bundle without text leakage outside its personal Finding', async () => {
  const calls = [];
  const run = normalizePersonalGematriaPairResearchRunRequest({
    expressions: ['משיח', 'מלך ישראל'],
    surface: 'raziel',
  });
  const relation = createGematriaRelationW2Executor({
    supabase: { rpc: async (name, args) => { calls.push({ name, args }); return { data: positiveCandidate() }; } },
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
    maxRepresentations: 2,
    maxPairs: 1,
  });

  const bundle = await composeResearchW2({
    question: run.question,
    intent: run.intent,
    identityCandidates: run.identity_candidates,
    rawInput: null,
    intake: run.intake,
    explicitTextComputation: false,
    authorizationContext: USER_AUTHORIZATION,
    contextType: 'authenticated_user',
    surfaceContext: run.surface_context,
    requestedCapabilities: run.requested_capabilities,
    capabilityAllowlist: run.requested_capabilities,
    requestedDepth: 'personal_gematria_pair_v1',
    executors: { [PERSONAL_GEMATRIA_PAIR_CAPABILITY]: relation },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    name: 'fn_relation_candidate',
    args: { p_a: 'משיח', p_b: 'מלך ישראל' },
  });
  assert.equal(bundle.findings.length, 1);
  assert.equal(bundle.findings[0].access.tier, 'personal');
  assert.equal(bundle.findings[0].subject.label, 'משיח ↔ מלך ישראל');
  const outputOutsideFindings = JSON.stringify({
    query: bundle.query,
    plan: bundle.plan,
    capability_trace: bundle.capability_trace,
    resolved_run_snapshot: bundle.resolved_run_snapshot,
    next_actions: bundle.next_actions,
  });
  assert.equal(outputOutsideFindings.includes('משיח'), false);
  assert.equal(outputOutsideFindings.includes('מלך ישראל'), false);
  assert.equal(bundle.query.raw_input, null);
  assert.equal(bundle.plan.requested_capabilities.length, 1);
  assert.equal(bundle.plan.requested_capabilities[0], PERSONAL_GEMATRIA_PAIR_CAPABILITY);
  assert.equal(bundle.capability_trace[0].cost.ai_calls, 0);
  assert.equal(bundle.capability_trace[0].cost.rpc_calls, 1);
  assert.equal(bundle.capability_trace[0].cost.retry_count, 0);
});
