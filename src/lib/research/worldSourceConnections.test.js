import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REVIEWED_SOURCE_WITNESSES as witnesses, witnessSource, verifiedCalculation, governedRelation, projectWorldSourceWitness, worldWitnessContext, isPublicWorldMethod } from './worldSourceConnections.js';
import { buildGallerySourceContext, buildTopicSourceContext } from './topicSourceContext.js';
import { gematriaTraceToFinding } from './gematriaTrace.js';
import { normalizeResearchContext } from './researchContext.js';
const fixture = JSON.parse(fs.readFileSync(new URL('../../../test/fixtures/topic-source-context-pilot.json', import.meta.url)));
const trace = (expression, method, value, patch = {}) => gematriaTraceToFinding({ input: expression, method_key: method, result: value,
  method_version: 1, verification: { parity: true, trace_value: value, canonical_value: value }, trace_kind: 'LETTER_LEDGER', steps: [], ...patch });
const law = (from, to, patch = {}) => ({ cards: [{ ruleId: 'zero_scale_law', value: from, ruleVersion: 1,
  finding: { evidence: { facts: [{ input: from, rule_id: 'zero_scale_law', rule_version: 1, output: { scale_chain: [from, to] }, ...patch }] } } }] });
const train = witnesses.find((w) => w.id === 'water-train');
const india = buildTopicSourceContext({ ...fixture, topic: fixture.topics.find((t) => t.slug === 'india-axis'), occurrences: fixture.images });
const gallery = buildGallerySourceContext({ images: fixture.images.filter((r) => r.id === train.galleryImageId), occurrences: fixture.images, galleries: fixture.galleries });

test('same water train remains one object/two historical placements without acquiring a Topic', () => {
  assert.equal(gallery.length, 1);
  assert.equal(gallery[0].occurrences.length, 2);
  assert.equal(gallery[0].reopen.topicHref, null);
  assert.deepEqual(gallery[0].contextRelations, []);
  assert.equal(gallery[0].sourceIdentity.ref, india.items.find((i) => i.galleryImageId === train.galleryImageId).sourceIdentity.ref);
  assert.deepEqual(gallery[0].occurrences.map((o) => [o.legacyPlacement.wpGalleryId, o.legacyPlacement.ordering]), [[28, 0], [54, 6]]);
});
test('gallery projection rechecks permissions on both selected source and duplicate appearances', () => {
  for (const patch of [{ published: 0 }, { min_tier: 1 }, { curator_hidden: true }]) {
    const rows = fixture.images.map((r) => ({ ...r, ...patch }));
    assert.deepEqual(buildGallerySourceContext({ images: rows, occurrences: rows }), []);
  }
  const hidden = { ...fixture.images.find((r) => r.id === train.galleryImageId), id: 'hidden', curator_hidden: true, description: 'SECRET' };
  assert.doesNotMatch(JSON.stringify(buildGallerySourceContext({ images: fixture.images.slice(0, 1), occurrences: [hidden] })), /SECRET/);
});
test('witness rejects missing or changed source quote despite matching numeric tags', () => {
  assert.ok(witnessSource(train, { india }));
  const changed = structuredClone(india);
  changed.items.find((i) => i.galleryImageId === train.galleryImageId).intrinsic.extraction.text = '216 2160 same numbers without source context';
  assert.equal(witnessSource(train, { india: changed }), null);
  assert.equal(witnessSource(train, { india: { items: [] } }), null);
});
test('post witness requires its exact source region; draft or unrelated text never admits', () => {
  const spec = witnesses.find((w) => w.id === 'date-718');
  const post = { id: 5112, slug: 'plane', tags: [], source: 'ai', content: `<div ${spec.postMarker}="v1">${spec.guards.join(' · ')}</div></section>` };
  assert.ok(witnessSource(spec, { post }));
  for (const patch of [{ tags: ['טיוטה'] }, { source: 'gpt-draft' }, { home_hidden: true }, { content: spec.guards.join(' ') }]) {
    assert.equal(witnessSource(spec, { post: { ...post, ...patch } }), null);
  }
});
test('only exact expression/method/value/version/parity can become verified calculation', () => {
  const request = { expression: 'חכמה', method: 'מילוי בלבד גדול', expected: 1820 };
  const valid = trace(request.expression, request.method, 1820);
  assert.ok(verifiedCalculation(request, valid));
  for (const bad of [trace('חכמה', 'מילוי', 1820), trace('חכמה', request.method, 613), trace('יראה', request.method, 1820),
    trace('חכמה', request.method, 1820, { method_version: null }), trace('חכמה', request.method, 1820, { verification: { parity: false } })]) {
    assert.equal(verifiedCalculation(request, bad), null);
  }
});
test('zero law consumes supplied chain and version; rejects decimal, digit reversal, unreturned target', () => {
  const request = { from: 216, to: 2160, ruleId: 'zero_scale_law' };
  assert.equal(governedRelation(request, law(216, 2160)).independentEvidence, false);
  assert.equal(governedRelation(request, law(216, 21600)), null);
  assert.equal(governedRelation(request, law(216, 2160, { rule_version: 2 })), null);
  for (const [from, to] of [['1.4', 14], [4.5, 45], ['19:45', 1945], [37, 73]]) {
    assert.equal(governedRelation({ from, to, ruleId: 'zero_scale_law' }, law(216, 2160)), null);
  }
});
test('a failed component calculation cannot retain the numeric bridge or be replaced by regular', async () => {
  const source = witnessSource(train, { india });
  const seen = [];
  const out = await projectWorldSourceWitness(train, source, { traceReader: async (method, expression) => {
    seen.push(method); return method === 'מילוי גדול' ? null : trace(expression, method, method === 'מילוי' ? 950 : 216);
  }, lawReader: async () => { throw Error('must not request a bridge whose target is unavailable'); } });
  assert.equal(out.relations[0].verified, null);
  assert.deepEqual(seen, ['רגיל', 'מילוי גדול', 'מילוי']);
  assert.equal(out.calculations[1].verified, null);
  assert.ok(out.calculations[0].verified);
});
test('unavailable law keeps source and calculations without fabricated relation', async () => {
  const spec = witnesses.find((w) => w.id === 'india-health');
  const out = await projectWorldSourceWitness(spec, { sourceRef: 'gallery_images:test' }, {
    traceReader: async (method, expression) => trace(expression, method, expression === 'דוד' ? 14 : 45), lawReader: async () => ({ cards: [] }),
  });
  assert.ok(out.calculations.every((c) => c.verified));
  assert.ok(out.relations.every((r) => !r.verified));
});
test('World selection uses existing calculation fields and retains source/exact return; no automatic Path', async () => {
  const witness = await projectWorldSourceWitness(train, witnessSource(train, { india }), {
    traceReader: async (method, expression) => trace(expression, method, method === 'מילוי גדול' ? 2160 : method === 'מילוי' ? 950 : 216),
    lawReader: async () => law(216, 2160),
  });
  const context = normalizeResearchContext(worldWitnessContext(witness, witness.calculations[1].verified));
  assert.equal(context.selection.entityType, 'number');
  assert.equal(context.selection.method, 'מילוי גדול');
  assert.equal(context.selection.resultValue, 2160);
  assert.equal(context.selection.sourceRef, `gallery_images:${train.galleryImageId}`);
  assert.equal(context.selection.locator, '#world-source-water-train');
  assert.equal(context.journey, null);
  assert.equal(context.dimensions.calculationSelection, undefined);
});

test('method entitlement/state is checked live before requesting a trace', () => {
  const publicRow = { active: true, in_engine: true, required_entitlement: 'public', version: 1 };
  assert.equal(isPublicWorldMethod(publicRow), true);
  for (const patch of [{ active: false }, { in_engine: false }, { required_entitlement: 'admin' }, { required_entitlement: null }, { version: null }])
    assert.equal(isPublicWorldMethod({ ...publicRow, ...patch }), false);
});
