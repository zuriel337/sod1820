import test from 'node:test';
import assert from 'node:assert/strict';
import { runNumberMathProfile } from './numberMathProfileFinding.js';

test('number math profile becomes a truth-safe Universal Finding without auto-promotion', () => {
  const out = runNumberMathProfile(496, { provenance: { generatedAt: '2026-09-17T00:00:00.000Z', inputRef: 'test:496' } });
  assert.equal(out.profile.arithmetic.abundance_class, 'perfect');
  assert.equal(out.universal_findings.length, 1);
  const finding = out.universal_findings[0];
  assert.equal(finding.kind, 'number_math_profile');
  assert.equal(finding.stage, null);
  assert.equal(finding.status, null);
  assert.equal(finding.verification.verification_state, 'not_tested');
  assert.equal(finding.verification.engine_method_tested, 'number_math_profile');
  assert.equal(finding.subject.value, 496);
  assert.ok(finding.evidence.refs.includes('OEIS:A000396'));
  assert.ok(finding.evidence.refs.includes('OEIS:A000217'));
  assert.equal(out.truth_lifecycle.automatic_canonical_promotion, false);
  assert.equal(out.truth_lifecycle.automatic_publication, false);
});

test('bounded factorization stays visibly incomplete in the Finding projection', () => {
  const value = 1000003 * 1000033;
  const out = runNumberMathProfile(value, { budget: { maxFactorChecks: 10 } });
  const finding = out.universal_findings[0];
  assert.equal(out.coverage.factorization_complete, false);
  assert.equal(finding.projection.dimensions.factorization_complete, false);
  assert.equal(finding.evidence.facts[0].abundance_class, null);
  assert.equal(finding.verification.verification_state, 'not_tested');
});
