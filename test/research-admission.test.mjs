import test from 'node:test';
import assert from 'node:assert/strict';
import {
  galleryImageToResearchAdmission,
  makeResearchAdmissionEnvelope,
} from '../src/lib/researchAdmission.js';

test('OCR remains extraction and never becomes Fact or canonical state', () => {
  const result = galleryImageToResearchAdmission({
    id: 'abc',
    image_url: 'https://example.invalid/x.jpg',
    image_type: 'document',
    ocr_status: 'done',
    ocr_text: 'משיח = 358',
    ocr_numbers: [358],
    ocr_meta: { gematria: { phrase: 'משיח', values: { ragil: 358 } } },
  }, { projectionReason: 'related to number 358' });

  assert.equal(result.admitted, true);
  assert.equal(result.semanticRole, 'representation');
  assert.equal(result.extraction.epistemicRole, 'extraction');
  assert.equal(result.extraction.isFact, false);
  assert.equal(result.verification.state, 'not_tested');
  assert.equal(result.governance.canonical, false);
  assert.equal(result.governance.published, false);
  assert.equal(result.governance.humanGateRequiredForCanonicalPromotion, true);
});

test('engine verification does not become governance', () => {
  const result = makeResearchAdmissionEnvelope({
    sourceType: 'document',
    sourceRef: 'document:1',
    intrinsicPayload: { title: 'source' },
    extraction: { status: 'done', text: 'משיח = 358' },
    verification: { state: 'match', owner: 'canonical_gematria_engine' },
    projectionReason: 'verified calculation is relevant to the active anchor',
  });

  assert.equal(result.verification.state, 'match');
  assert.equal(result.governance.canonical, false);
  assert.equal(result.governance.humanGateRequiredForCanonicalPromotion, true);
});

test('automation output is candidate/extraction only and is never Human Gate', () => {
  const result = makeResearchAdmissionEnvelope({
    sourceType: 'automation_output',
    sourceRef: 'automation:run-1',
    intrinsicPayload: { payload: 'candidate' },
    automation: { producer: 'worker', runRef: 'run-1' },
    projectionReason: 'research queue preview',
  });

  assert.equal(result.automation.outputRole, 'extraction_or_candidate');
  assert.equal(result.automation.isHumanGate, false);
  assert.equal(result.governance.canonical, false);
});

test('legacy graph relations cannot be treated as truth authority by the 2029 admission boundary', () => {
  const result = galleryImageToResearchAdmission({ id: 'abc' }, {
    projectionReason: 'legacy context inspection',
    legacyRelations: [{ relationType: 'contains', to: 'number:358' }],
  });

  assert.equal(result.legacyRelations[0].authority, 'compatibility_only');
  assert.equal(result.legacyRelations[0].verified, false);
  assert.equal(result.legacyRelations[0].eligibleForTruthProjection, false);
});

test('historical order stays distinct from current projection reason', () => {
  const result = galleryImageToResearchAdmission({
    id: 'abc',
    gallery_id: 'gallery-1',
    wp_gallery_id: 77,
    wp_image_id: 99,
    ordering: 4,
  }, { projectionReason: 'current anchor relation' });

  assert.equal(result.historicalContext.ordering, 4);
  assert.equal(result.historicalContext.orderKnown, true);
  assert.equal(result.projection.reason, 'current anchor relation');
});

test('missing source identity fails closed', () => {
  assert.deepEqual(galleryImageToResearchAdmission({}), {
    admitted: false,
    reason: 'missing_source_identity',
  });
});
