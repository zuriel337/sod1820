import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REVIEWED_SOURCE_WITNESSES as witnesses, witnessSource, verifiedCalculation, governedRelation, projectWorldSourceWitness, worldWitnessContext, isPublicWorldMethod } from './worldSourceConnections.js';
import { buildGallerySourceContext, buildTopicSourceContext } from './topicSourceContext.js';
import { gematriaTraceToFinding } from './gematriaTrace.js';
import { normalizeResearchContext } from './researchContext.js';
import { discoveryLocation, discoveryHref, discoveryDocumentedTimeline, projectWitnessClock, fetchWorldDiscovery } from './worldSourceConnections.js';
import { buildPublicPostImageContext } from './topicSourceContext.js';
const fixture = JSON.parse(fs.readFileSync(new URL('../../../test/fixtures/topic-source-context-pilot.json', import.meta.url)));
const trace = (expression, method, value, patch = {}) => gematriaTraceToFinding({ input: expression, method_key: method, result: value,
  method_version: 1, verification: { parity: true, trace_value: value, canonical_value: value }, trace_kind: 'LETTER_LEDGER', steps: [], ...patch });
const law = (from, to, patch = {}) => ({ cards: [{ ruleId: 'zero_scale_law', value: from, ruleVersion: 1,
  finding: { evidence: { facts: [{ input: from, rule_id: 'zero_scale_law', rule_version: 1, output: { scale_chain: [from, to] }, ...patch }] } } }] });
const train = witnesses.find((w) => w.id === 'water-train');
const india = buildTopicSourceContext({ ...fixture, topic: fixture.topics.find((t) => t.slug === 'india-axis'), occurrences: fixture.images });
const gallery = buildGallerySourceContext({ images: fixture.images.filter((r) => r.id === train.galleryImageId), occurrences: fixture.images, galleries: fixture.galleries });

test('documentary chronology guards the date witness and never turns an upload or folder into an event date', () => {
  const source = (text, patch = {}) => ({ text, item: { occurrences: [], ...patch } });
  const items = [
    { id: 'news', documentedDate: { value: '2020-10-02', quote: '02/10/2020', label: 'News publication', field: 'ocr' }, source: source('02/10/2020 report') },
    { id: 'post', source: source('', { postPlacement: { publishedAt: '2016-06-29T23:05:00' } }) },
    { id: 'changed', documentedDate: { value: '2017-05-23', quote: '23/5/2017', field: 'name' }, source: source('unrelated') },
    { id: 'upload', source: source('', { created_at: '2010-01-01', occurred_at: '2010-01-01', imageUrl: '/uploads/2010/01/image.jpg' }) },
  ];
  const timeline = discoveryDocumentedTimeline(items);
  assert.deepEqual(timeline.dated.map((r) => [r.id, r.date.kind]), [['post', 'post_publication'], ['news', 'documented_source_date_not_event_date']]);
  assert.deepEqual(timeline.undated.map((r) => r.id), ['changed', 'upload']);
  assert.deepEqual(items.map((r) => r.id), ['news', 'post', 'changed', 'upload']);
});

test('HTML image preserves one storage identity and original Post provenance without a gallery or Topic', () => {
  const imageUrl = 'https://example.test/storage/v1/object/public/media/source.jpg';
  const post = { id: 1222, slug: 'historical', source: 'wordpress', tags: [], date: '2024-11-01', author: 'Original author',
    content: `<h3>exact historical statement</h3><figure><img src="${imageUrl}" alt="original alt"><figcaption>Original caption</figcaption></figure>` };
  const locator = { postId: 1222, imageUrl, guards: ['exact historical statement'], label: 'Review context' };
  const item = buildPublicPostImageContext(post, locator);
  assert.equal(item.sourceIdentity.ref, `storage-object:${imageUrl}`);
  assert.equal(item.postPlacement.originalCaption, 'Original caption');
  assert.equal(item.postPlacement.originalCredit.author, 'Original author');
  assert.equal(item.postPlacement.dateBasis, 'posts.date_publication_not_event_date');
  assert.equal(item.occurrences.length, 1);
  assert.deepEqual(item.reopen.galleries, []);
  assert.equal(item.reopen.topicHref, null);
  for (const patch of [{ id: 83 }, { tags: ['טיוטה'] }, { source: 'gpt-draft' }, { home_hidden: true },
    { content: `<p>exact historical statement</p><a href="${imageUrl}">just a link</a>` },
    { content: `<img src="${imageUrl}"><p>unrelated text</p>` }]) {
    assert.equal(buildPublicPostImageContext({ ...post, ...patch }, locator), null);
  }
});
test('clock consumer preserves original PM display, uses live owner v2 and keeps same-occurrence dependency', async () => {
  const spec = witnesses.find((s) => s.id === 'wall-clock');
  const source = { sourceRef: 'gallery_images:clock', item: { access: { scope: 'public' }, sourceIdentity: { ref: 'storage-object:clock' } } };
  const result = await projectWitnessClock(spec, source, { moment_clock_law: 2 });
  assert.equal(result.originalDisplay, '4:24 PM');
  assert.equal(result.application.subject.value, 424);
  assert.equal(result.application.evidence.facts[0].operation, 'CLOCK_12H_CONCAT');
  assert.equal(result.application.evidence.facts[0].output.meridiem_context, 'PM');
  assert.equal(result.application.evidence.facts[0].independent_evidence, false);
  for (const versions of [{}, { moment_clock_law: 1 }]) assert.equal(await projectWitnessClock(spec, source, versions), null);
  assert.equal(await projectWitnessClock(spec, { ...source, item: { ...source.item, access: { scope: 'private' } } }, { moment_clock_law: 2 }), null);
  assert.equal(await projectWitnessClock({ ...spec, clock: { ...spec.clock, hour: 4 } }, source, { moment_clock_law: 2 }), null);
});
test('clock cannot relabel a representation as a downstream calculation or invent the target', async () => {
  const spec = witnesses.find((s) => s.id === 'clock-1445');
  const source = { sourceRef: 'source:planned-meeting', item: { access: { scope: 'public' }, sourceIdentity: { ref: 'one-occurrence' } } };
  const result = await projectWitnessClock(spec, source, { moment_clock_law: 2 });
  assert.equal(result.application.subject.value, 1445);
  assert.equal(result.application.source.engine, null);
  assert.equal(result.occurrence.subject.type, 'clock_time');
  assert.equal(await projectWitnessClock({ ...spec, clock: { ...spec.clock, target: 45 } }, source, { moment_clock_law: 2 }), null);
});
test('the same source returns to the exact step in either existing surface; invalid steps do not escape the reading', () => {
  const topicHref = discoveryHref('wall', 'see-my-back', '1237');
  assert.equal(topicHref, '/topic/1237#topic-discovery-wall--see-my-back');
  assert.equal(discoveryLocation(topicHref.slice(topicHref.indexOf('#')), '1237').id, 'see-my-back');
  assert.equal(discoveryLocation('#world-discovery-wall--clock-1445').id, 'wall-clock');
  const w = { id: 'see-my-back', title: 'Original', anchor: 'world-source-see-my-back', source: { sourceRef: 'source:one' } };
  const patch = worldWitnessContext(w, null, { href: topicHref, anchor: 'topic-discovery-wall--see-my-back', lens: 'topic' });
  const normalized = normalizeResearchContext(patch);
  assert.equal(normalized.selection.sourceRef, 'source:one');
  assert.equal(normalized.selection.locator, '#topic-discovery-wall--see-my-back');
  assert.equal(normalized.dimensions.surfaceFocus.href, topicHref);
  assert.equal(normalized.journey, null);
});
test('new reading admits neither denied sources nor unavailable Topic identities', async () => {
  let requestedTraces = 0;
  const result = await fetchWorldDiscovery('wall', { galleryReader: async () => ({ items: [], occurrencesTruncated: false }),
    postReader: async () => null, topicReader: async () => null, registryReader: async () => [],
    ruleReader: async () => ({}), traceReader: async () => { requestedTraces++; } });
  assert.deepEqual(result.items, []);
  assert.equal(result.coverage.sources, 0);
  assert.equal(result.missing.length, 8);
  assert.equal(requestedTraces, 0);
});

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
  assert.equal(context.dimensions.surfaceFocus.number, 2160);
  assert.equal(context.dimensions.surfaceFocus.type, 'number');
  assert.equal(context.dimensions.surfaceFocus.reference, witness.source.item.sourceIdentity.ref);
});

test('method entitlement/state is checked live before requesting a trace', () => {
  const publicRow = { active: true, in_engine: true, required_entitlement: 'public', version: 1 };
  assert.equal(isPublicWorldMethod(publicRow), true);
  for (const patch of [{ active: false }, { in_engine: false }, { required_entitlement: 'admin' }, { required_entitlement: null }, { version: null }])
    assert.equal(isPublicWorldMethod({ ...publicRow, ...patch }), false);
});

test('a Post paragraph can be read without acquiring a missing Topic', () => {
  const spec = witnesses.find((w) => w.id === 'flight-descent');
  const post = { id: 5112, slug: 'plane', tags: [], source: 'ai', content: '<p>טיסת Flydubai ירדה ביותר מ־14,000 רגל.</p>' };
  const source = witnessSource(spec, { post, topic: null });
  assert.ok(source);
  assert.equal(source.topicHref, null);
  assert.equal(source.topicSlug, null);
  assert.equal(source.sourceRef, 'posts:5112#quote-flight-descent');
});
