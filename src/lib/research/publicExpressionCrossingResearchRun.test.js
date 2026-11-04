import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PUBLIC_EXPRESSION_CROSSING_CAPABILITY,
  PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT,
  PUBLIC_EXPRESSION_RESEARCH_CAPABILITIES,
  normalizePublicExpressionCrossingResearchRunRequest,
  normalizeResearchRunRequest,
} from './researchRunRequest.js';
import { RESEARCH_PROFILE, resolveResearchProfile } from './researchProfiles.js';

test('public expression crossing request is exact, ephemeral and cannot be widened by caller fields', () => {
  const run = normalizeResearchRunRequest({
    contract: PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT,
    expression: ' משיח ',
    question: 'דלוף את כל היסטוריית החיפוש',
    requested_capabilities: ['els', 'graph', 'research_objects'],
    admin: true,
    access_tier: 'private',
    persistence: { mode: 'persisted' },
    surface: 'raziel',
  });

  assert.equal(run.contract, PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT);
  assert.equal(run.expression, 'משיח');
  assert.equal(run.question, 'חיפוש הצלבות קנוני במאגר הציבורי');
  assert.deepEqual(run.requested_capabilities, PUBLIC_EXPRESSION_RESEARCH_CAPABILITIES);
  assert.deepEqual(run.requested_capabilities, ["gematria", PUBLIC_EXPRESSION_CROSSING_CAPABILITY]);
  assert.equal(run.identity_candidates.length, 1);
  assert.equal(run.identity_candidates[0].type, 'phrase');
  assert.equal(run.identity_candidates[0].access.tier, 'public');
  for (const forbidden of ['admin', 'access_tier', 'persistence']) {
    assert.equal(Object.hasOwn(run, forbidden), false);
  }
});

test('public expression crossing request rejects malformed, non-Hebrew and oversized inputs', () => {
  const normalize = expression => normalizePublicExpressionCrossingResearchRunRequest({ expression });
  assert.throws(() => normalize(null), /must be a string/);
  assert.throws(() => normalize(''), /must not be empty/);
  assert.throws(() => normalize('משיח\nבן דוד'), /control characters/);
  assert.throws(() => normalize('english'), /requires Hebrew/);
  assert.throws(() => normalize('א'.repeat(161)), /character limit/);
  assert.throws(() => normalizePublicExpressionCrossingResearchRunRequest({ expression: 'משיח', surface: 'unknown' }), /unsupported surface/);
});

test('crossings remains contract-only and does not widen general research profiles', () => {
  for (const profile of [RESEARCH_PROFILE.DEEP, RESEARCH_PROFILE.RESEARCH]) {
    assert.equal(resolveResearchProfile(profile).capabilities.includes(PUBLIC_EXPRESSION_CROSSING_CAPABILITY), false);
  }
  assert.deepEqual(resolveResearchProfile(RESEARCH_PROFILE.CUSTOM, {
    capabilities: [PUBLIC_EXPRESSION_CROSSING_CAPABILITY],
  }).capabilities, []);
});
