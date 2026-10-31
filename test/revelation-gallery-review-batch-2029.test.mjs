import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { historicalCandidates, exactTextLocator, groupSourceObjects, reviewOccurrence,
  prepareCalculationReviews, assertReadOnlyRequest, reportPath } from '../scripts/audit-revelation-gallery-batch-20261031.mjs';

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const inventory = await readFile(new URL('../docs/reviews/revelation-1237-source-inventory-20261028.md', import.meta.url), 'utf8');
const history = historicalCandidates(inventory);
const backend = 'https://linswmnnkjxvweumprav.supabase.co';

test('reuses historical 48+17 inventory rather than creating a second authority', () => {
  assert.equal(history.get(29).size, 48);
  assert.equal(history.get(81).size, 17);
  for (const g of report.coverage.galleries) {
    assert.equal(g.historicalCandidates, history.get(g.galleryId).size);
    assert.equal(g.recoveredHistoricalCandidates + g.historicalCandidatesNotCurrentlyAdmitted.length, g.historicalCandidates);
  }
});

test('all current cohort rows keep exact occurrence, original ordering and native route', () => {
  assert.equal(report.occurrences.length, report.coverage.occurrences);
  assert.equal(new Set(report.occurrences.map(r => r.sourceRef)).size, report.occurrences.length);
  for (const row of report.occurrences) {
    assert.ok([29, 81].includes(row.galleryId));
    assert.equal(row.sourceRef, `gallery_images:${row.imageId}`);
    assert.ok(row.sourceHref.includes(`gallery=${row.galleryId}&image=${row.imageId}#gallery-source-${row.imageId}`));
    assert.equal(row.historical1237Candidate, history.get(row.galleryId).has(row.wpImageId));
    assert.ok(Number.isFinite(row.ordering));
    assert.equal(row.timeRole, 'stored_provenance_not_verified_event_date');
  }
});

test('same storage object retains separate appearances, never independent evidence count', () => {
  assert.equal(groupSourceObjects(report.occurrences).length, report.coverage.sourceObjects);
  const repeated = report.sourceObjects.filter(g => g.sourceRefs.length > 1);
  assert.ok(repeated.length > 0);
  const sample = report.occurrences.find(r => r.wpImageId === 2650);
  assert.equal(sample.publicAppearances.length, 3);
  assert.equal(new Set(sample.publicAppearances.map(o => o.imageId)).size, 3);
  for (const o of sample.publicAppearances) assert.equal(o.sourceRef, `gallery_images:${o.imageId}`);
  assert.equal(report.boundaries.sharedStorageObjectDoesNotProveIndependentEvidence, true);
});

test('shared number, filename or caption cannot merge different source objects', () => {
  const grouped = groupSourceObjects([{ sourceObjectRef: 'object:a', sourceRef: 'row:1', value: 1237 },
    { sourceObjectRef: 'object:b', sourceRef: 'row:2', value: 1237 }]);
  assert.equal(grouped.length, 2);
  assert.throws(() => groupSourceObjects([{ sourceRef: 'row:1', value: 1237 }]));
});

test('stored extraction locators preserve exact spelling and explicit coordinate system', () => {
  const text = '🦑 וראית את אחרי = 1237';
  const locus = exactTextLocator(text, 'וראית את אחרי');
  assert.equal(text.slice(locus.start, locus.end), locus.quote);
  assert.equal(locus.start, 3);
  assert.equal(locus.extractedTextSha256.length, 64);
  assert.equal(exactTextLocator(text, 'וראית את אחורי'), null);
  assert.equal(exactTextLocator(text, ''), null);
});

test('review helper refuses a private or nonexact occurrence even with matching tags', () => {
  const id = 'c22b5594-0e1d-4f9a-ba38-d30f598fec1d';
  assert.throws(() => reviewOccurrence({ galleryImageId: id, sourceRef: `gallery_images:${id}`, access: { scope: 'private' } }));
  assert.throws(() => reviewOccurrence({ galleryImageId: id, sourceRef: 'number:1237', access: { scope: 'public' } }));
});

test('existing witness annotations and stored Topic membership are not promoted findings or edges', () => {
  for (const row of report.occurrences) {
    for (const t of row.storedTopicMemberships) assert.equal(t.relation, 'stored_image_membership_not_edge');
    for (const w of row.existingReadTimeWitnesses) assert.equal(w.state, 'existing_read_time_annotation_not_stored_finding_or_edge');
    assert.equal(row.graphReview.inferredEdges, 0);
    assert.equal(row.graphReview.state, 'not_opened_in_this_intake_batch');
  }
  const topic = report.occurrences.flatMap(r => r.storedTopicMemberships).find(t => t.slug === '1237');
  assert.equal(topic.nodeActive, false, 'record current inactive state without activating it');
});

test('source claims for 1237 and 3137 keep separate registered method identity and profile proof', () => {
  const proposed = report.preparedCalculationReviews;
  assert.equal(proposed.length, 4);
  for (const p of proposed) {
    assert.equal(p.claimedValue, p.engineResult);
    assert.equal(p.reviewState, 'prepared_for_human_gate_not_submitted');
    assert.ok(p.expressionLocator && p.valueLocator);
    assert.ok(p.definitionVersion != null);
    assert.equal(p.newEdges, 0);
    assert.equal(p.interpretation, 'separate_not_certified_by_calculation');
  }
  const triangle = proposed.find(p => p.claimedValue === 3137);
  assert.equal(triangle.expression, 'התגלות');
  assert.equal(triangle.methodKey, 'קדמי');
  assert.equal(triangle.displayLabel, 'משולש');
  assert.equal(proposed.find(p => p.expression === 'התגלות' && p.claimedValue === 1237).methodKey, 'מסתתר');
});

test('source withdrawal, absent locus or engine mismatch cannot produce ready review proposal', () => {
  const withdrawn = prepareCalculationReviews([], report.methodProfiles);
  assert.ok(withdrawn.every(p => p.state === 'withheld_source_no_longer_admitted'));
  const mismatch = prepareCalculationReviews(report.occurrences, []);
  assert.ok(mismatch.every(p => p.reviewState === 'source_or_engine_review_required'));
  const missingLocus = prepareCalculationReviews(report.occurrences.map(r => ({ ...r, calculationLoci: [] })), report.methodProfiles);
  assert.ok(missingLocus.every(p => p.reviewState === 'source_or_engine_review_required'));
});

test('network guard forbids product writes, auth/model calls and unapproved RPCs', () => {
  assert.doesNotThrow(() => assertReadOnlyRequest(`${backend}/rest/v1/gallery_images`));
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) assert.throws(() => assertReadOnlyRequest(`${backend}/rest/v1/research_objects`, { method }));
  assert.throws(() => assertReadOnlyRequest(`${backend}/rest/v1/rpc/admin_research_review`));
  assert.throws(() => assertReadOnlyRequest(`${backend}/auth/v1/user`));
  assert.throws(() => assertReadOnlyRequest('https://api.openai.com/v1/responses'));
  assert.throws(() => assertReadOnlyRequest(`${backend}/rest/v1/rpc/fn_method_profile`, { method: 'POST', body: JSON.stringify({ p_phrase: 'other', p_depth: 'value' }) }));
  assert.doesNotThrow(() => assertReadOnlyRequest(`${backend}/rest/v1/rpc/fn_method_profile`, { method: 'POST',
    body: JSON.stringify({ p_phrase: 'התגלות', p_depth: 'value' }) }));
});

test('manifest contains no raw OCR dump or new published findings and declares limited review', () => {
  for (const row of report.occurrences) {
    assert.equal(Object.hasOwn(row, 'ocr_text'), false);
    assert.equal(Object.hasOwn(row.extraction, 'text'), false);
    assert.equal(row.productWrites, 0);
  }
  assert.equal(report.coverage.visuallyReviewedAll, false);
  assert.equal(report.boundaries.newFindings, 0);
  assert.equal(report.boundaries.newEdges, 0);
  assert.equal(report.boundaries.publicationChanges, 0);
  assert.equal(report.requests.modelCalls, 0);
  assert.equal(report.scope, 'offline_review_batch_not_runtime_registry_or_intake');
});
