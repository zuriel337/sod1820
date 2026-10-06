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

test('invalid explicit verification state fails closed instead of becoming not_tested', () => {
  const result = makeResearchAdmissionEnvelope({
    sourceType: 'automation_output',
    sourceRef: 'automation:invalid-verification',
    intrinsicPayload: { payload: 'candidate' },
    verification: { state: 'verified_by_human', owner: 'caller_supplied' },
  });

  assert.equal(result.admitted, false);
  assert.equal(result.reason, 'invalid_verification_state');
  assert.equal(result.invalidVerificationState, 'verified_by_human');
  assert.equal(Object.hasOwn(result, 'verification'), false);
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

// ---- Gallery Representation/Dependency Pilot (GALLERY_REPRESENTATION_DEPENDENCY_PILOT_V1) ----
import {
  composeGalleryArtifactGroups,
  resolveGalleryArtifactIdentity,
} from '../src/lib/researchAdmission.js';

const BASE = 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/';
const URL_A = `${BASE}2019/03/vath-mvshl-bkl.jpg`;
const URL_B = `${BASE}2019/06/alvl-htshat.jpg`;
const pub = { published: 1, curator_hidden: false, min_tier: 0, curation_status: 'ok' };
const A = [
  { id: '139f5db7', image_url: URL_A, wp_gallery_id: 29, primary_value: 1472, image_type: 'gematria', ocr_status: 'done', ocr_numbers: [1472] },
  { id: 'e8dccc13', image_url: URL_A, wp_gallery_id: 74, primary_value: 1472, image_type: 'gematria' },
  { id: '36805818', image_url: URL_A, wp_gallery_id: 83, primary_value: 14, image_type: 'hint', ocr_status: 'done', ocr_numbers: [14] },
  { id: '9b7fe25c', image_url: URL_A, wp_gallery_id: 89, primary_value: 16, image_type: 'gematria' },
].map((r) => ({ ...pub, ...r }));
const B = [
  { id: '029aabc4', image_url: URL_B, primary_value: 45 },
  { id: '789592ca', image_url: URL_B, primary_value: 45 },
  { id: 'c2f91df9', image_url: URL_B, primary_value: 851 },
].map((r) => ({ ...pub, ...r }));
const adm = (rows) => rows.map((r) => galleryImageToResearchAdmission(r));

test('strong identity: exact canonical storage object only', () => {
  const id = resolveGalleryArtifactIdentity(URL_A);
  assert.equal(id.resolved, true);
  assert.equal(id.key, 'storage://media/uploads/2019/03/vath-mvshl-bkl.jpg');
  assert.equal(id.originalUrl, URL_A);
});

test('fixture A: one artifact, four placements, no elected value', () => {
  const out = composeGalleryArtifactGroups(adm(A));
  assert.equal(out.artifactGroups.length, 1);
  const g = out.artifactGroups[0];
  assert.equal(g.placementRefs.length, 4);
  assert.deepEqual(g.placements.map((p) => p.primaryValue), [1472, 1472, 14, 16]);
  assert.equal(Object.hasOwn(g, 'primaryValue'), false);
  assert.equal(g.dependencyClass, 'SAME_ARTIFACT/REPRESENTATION');
  assert.equal(g.independentEvidenceContribution, 1);
  assert.equal(g.placementVariance.isTruthConflict, false);
  assert.equal(g.placementVariance.hasImageTypeVariance, true);
});

test('fixture B and A+B: lineage count 2, placements 7', () => {
  const b = composeGalleryArtifactGroups(adm(B));
  assert.deepEqual(b.artifactGroups[0].placements.map((p) => p.primaryValue), [45, 45, 851]);
  const ab = composeGalleryArtifactGroups(adm([...A, ...B]));
  assert.equal(ab.artifactGroups.length, 2);
  assert.equal(ab.placementCount, 7);
  assert.equal(ab.evidenceLineageCount, 2);
});

test('image_type and row-local meaning are not intrinsic artifact truth', () => {
  const [a] = adm(A);
  assert.deepEqual(Object.keys(a.intrinsicPayload).sort(), ['artifactKey', 'imageUrl']);
  assert.equal(a.placementContext.imageType, 'gematria');
  assert.equal(a.placementContext.isArtifactTruth, false);
  assert.equal(a.source.ref, 'gallery_images:139f5db7');
  assert.equal(a.semanticRole, 'representation');
});

test('duplicated input row is deduped by placement id', () => {
  const out = composeGalleryArtifactGroups(adm([...A, ...A]));
  assert.equal(out.placementCount, 4);
  assert.equal(out.artifactGroups[0].placementRefs.length, 4);
});

test('non-strong URLs never merge, even with same filename/OCR/value', () => {
  const rows = [
    'https://example.com/storage/v1/object/public/media/uploads/2019/03/vath-mvshl-bkl.jpg',
    '/uploads/2019/03/vath-mvshl-bkl.jpg',
    `${URL_A}?token=abc`,
    `${URL_A}#x`,
    'http://[bad',
    'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/sign/media/x.jpg',
    'https://other.supabase.co/storage/v1/object/public/media/uploads/2019/03/vath-mvshl-bkl.jpg',
    null,
  ].map((u, i) => ({ id: `u${i}`, image_url: u, primary_value: 1472, ocr_numbers: [1472] }));
  const out = composeGalleryArtifactGroups(adm(rows));
  assert.equal(out.artifactGroups.length, 0);
  assert.equal(out.unresolvedPlacements.length, rows.length);
  assert.equal(out.evidenceLineageCount, 0);
  assert.ok(out.unresolvedPlacements.every((u) => u.dependencyClass === 'UNKNOWN'));
  assert.ok(out.unresolvedPlacements.every((u) => !('independentEvidenceContribution' in u)));
  assert.equal(out.strongArtifactLineageCount, 0);
  assert.equal(out.unresolvedLineageCount, rows.length);
});

test('OCR stays extraction, non-fact, placement-scoped', () => {
  const a = adm(A);
  assert.equal(a[0].extraction.isFact, false);
  assert.deepEqual(a[0].extraction.numbers, [1472]);
  assert.deepEqual(a[2].extraction.numbers, [14]);
  const g = composeGalleryArtifactGroups(a).artifactGroups[0];
  assert.equal(g.independentEvidenceContribution, 1);
});

test('hidden placement metadata is not lifted when caller filters it out', () => {
  const rows = [
    { ...A[0] },
    { ...A[2], curator_hidden: true, min_tier: 3, primary_value: 999, image_type: 'secret', name: 'HIDDEN' },
  ];
  const out = composeGalleryArtifactGroups(adm(rows), { isVisible: (x) => x.placementContext.access.curatorHidden !== true });
  const g = out.artifactGroups[0];
  assert.equal(g.placementRefs.length, 1);
  assert.equal(out.placementCount, 1);
  const s = JSON.stringify(out);
  assert.ok(!s.includes('HIDDEN') && !s.includes('999') && !s.includes('secret') && !s.includes('36805818'));
  assert.deepEqual(g.placementVariance.primaryValues, [1472]);
  assert.equal(g.placements[0].access.minTier, 0);
});

test('encoded separator inside an object segment is not a path separator', () => {
  const enc = resolveGalleryArtifactIdentity(`${BASE}a%2Fb.jpg`);
  const real = resolveGalleryArtifactIdentity(`${BASE}a/b.jpg`);
  assert.equal(enc.resolved, true);
  assert.equal(enc.key, 'storage://media/uploads/a%2Fb.jpg');
  assert.notEqual(enc.key, real.key);
});

test('grouped and unresolved placements retain full filtered context', () => {
  const rows = [
    { ...A[0], name: 'N', related_post_id: 'p1', source: 'wp', ocr_text: 't' },
    { id: 'u1', image_url: 'http://[bad', primary_value: 5 },
  ];
  const out = composeGalleryArtifactGroups(adm(rows));
  const p = out.artifactGroups[0].placements[0];
  assert.equal(p.placementContext.name, 'N');
  assert.equal(p.historicalContext.relatedPostId, 'p1');
  assert.equal(p.source.provenance.source, 'wp');
  assert.equal(p.extraction.text, 't');
  assert.equal(out.unresolvedPlacements[0].placementContext.primaryValue, 5);
  assert.equal(out.unresolvedPlacements[0].source.ref, 'gallery_images:u1');
});
