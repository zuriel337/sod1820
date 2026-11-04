// Offline Human-Gate preparation only; never imported by the application.
// node --use-env-proxy scripts/audit-revelation-gallery-batch-20261031.mjs --write
// Uses existing anonymous readers. No intake, publication, graph or product writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const inventory = new URL('docs/reviews/revelation-1237-source-inventory-20261028.md', root);
export const reportPath = new URL('docs/reviews/revelation-1237-source-review-batch-20261031.json', root);
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const hash = text => createHash('sha256').update(String(text ?? '')).digest('hex');
const chunks = (rows, size = 12) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));

export function historicalCandidates(text) {
  const out = new Map();
  for (const galleryId of [29, 81]) {
    const line = text.split('\n').find(s => s.startsWith(`- גלריה ${galleryId} `));
    assert.ok(line, 'preserve and read the original historical inventory');
    const match = line.match(/\((\d+)\): (.+)\.$/);
    assert.ok(match, 'historical list format must be explicit');
    const ids = match[2].split(',').map(s => Number(s.trim()));
    assert.ok(ids.every(Number.isSafeInteger));
    assert.equal(new Set(ids).size, Number(match[1]));
    out.set(galleryId, new Set(ids));
  }
  return out;
}

export function exactTextLocator(text, quote) {
  const start = typeof text === 'string' ? text.indexOf(quote) : -1;
  if (start < 0 || !quote) return null;
  return { field: 'gallery_images.ocr_text', start, end: start + quote.length,
    unit: 'utf16_code_units_of_existing_reader_trimmed_text', quote,
    extractedTextSha256: hash(text), state: 'stored_extraction_not_visual_verification' };
}

export function reviewOccurrence(item, { galleryId, history = new Set(), topics = [], findingPage = null, witnesses = [] } = {}) {
  assert.ok(uuid.test(item?.galleryImageId || ''), 'exact occurrence required');
  assert.equal(item.sourceRef, `gallery_images:${item.galleryImageId}`);
  assert.equal(item.access?.scope, 'public', 're-admit through existing public reader first');
  assert.ok(item.sourceIdentity?.ref, 'existing source identity is required');
  const lp = item.legacyPlacement;
  const extraction = item.intrinsic.extraction;
  const text = extraction.text || '';
  const hints = [];
  for (const quote of ['1237', '1,237', '3137', '3,137', 'התגלות', 'וראית את אחרי', 'נפתלי בנט', 'מירון']) {
    const locus = exactTextLocator(text, quote);
    if (locus) hints.push(locus);
  }
  const admittedFindings = (findingPage?.rows || []).map(r => ({ id: r.id,
    sourceRef: r.sourceRef, sourceOccurrenceRef: r.sourceOccurrenceRef || r.sourceRef,
    // The public DTO does not certify an active tree attachment.
    treeAttachment: 'requires_exact_finding_and_graph_reader' }));
  return {
    galleryId, wpImageId: lp.wpImageId, imageId: item.galleryImageId,
    sourceRef: item.sourceRef, sourceObjectRef: item.sourceIdentity.ref,
    sourceObjectBasis: item.sourceIdentity.basis,
    sourceHref: `/world?view=gallery&gallery=${galleryId}&image=${item.galleryImageId}#gallery-source-${item.galleryImageId}`,
    ordering: lp.ordering, originalCaptionSha256: hash(lp.originalCaption),
    storedTimeProvenance: lp.dateProvenance, timeRole: 'stored_provenance_not_verified_event_date',
    credit: { author: lp.originalCredit?.author || null, publication: lp.originalCredit?.publication || null },
    historical1237Candidate: history.has(lp.wpImageId),
    storedImageType: lp.imageType, storedInterpretationKind: item.intrinsic.interpretation.storedImageKind,
    storedNumbers: lp.storedNumbers, ocrNumbers: extraction.numbers,
    extraction: { present: Boolean(text), status: extraction.status, charactersReturned: text.length,
      possibleReaderTruncation: text.length >= 4000, sha256: hash(text),
      verification: 'stored_extraction_not_pixel_or_engine_verification' },
    searchHints: hints,
    publicAppearances: (item.occurrences || []).map(o => ({ imageId: o.provenance.sourceRef.slice('gallery_images:'.length),
      sourceRef: o.provenance.sourceRef, galleryId: o.legacyPlacement.wpGalleryId,
      wpImageId: o.legacyPlacement.wpImageId, ordering: o.legacyPlacement.ordering })),
    storedTopicMemberships: topics.filter(t => t.image_ids?.includes(item.galleryImageId))
      .map(t => ({ topicId: t.id, slug: t.slug, nodeId: t.node_id, nodeActive: t.nodeActive,
        relation: 'stored_image_membership_not_edge' })),
    existingReadTimeWitnesses: witnesses.filter(w => w.galleryImageId === item.galleryImageId).map(w => ({
      witnessId: w.id, origin: 'worldSourceConnections.REVIEWED_SOURCE_WITNESSES',
      state: 'existing_read_time_annotation_not_stored_finding_or_edge',
      exactOcrGuards: (w.guards || []).map(quote => exactTextLocator(text, quote)),
    })),
    existingPublicFindings: admittedFindings,
    findingCoverage: { hasMore: findingPage?.hasMore === true,
      omittedForReview: findingPage?.omittedForReview === true, omittedUnavailable: findingPage?.omittedUnavailable === true,
      basis: findingPage ? 'existing_source_filtered_public_finding_reader'
        : 'anonymous_view_has_no_approved_or_canonical_rows_for_this_object_public_appearances' },
    // This batch never scans/promotes graph relations; absence here is not absence globally.
    graphReview: { state: 'not_opened_in_this_intake_batch', inferredEdges: 0 },
    reviewState: admittedFindings.length ? 'existing_public_finding_requires_exact_review'
      : witnesses.some(w => w.galleryImageId === item.galleryImageId) ? 'recover_existing_annotation_before_new_intake'
      : history.has(lp.wpImageId) ? 'historical_candidate_requires_human_review'
      : 'public_occurrence_not_yet_classified_for_1237',
    productWrites: 0,
  };
}

export function groupSourceObjects(rows) {
  const grouped = new Map();
  for (const row of rows) {
    assert.ok(row.sourceObjectRef, 'never group by number, title, OCR or filename');
    if (!grouped.has(row.sourceObjectRef)) grouped.set(row.sourceObjectRef, []);
    grouped.get(row.sourceObjectRef).push(row.sourceRef);
  }
  return [...grouped].map(([sourceObjectRef, sourceRefs]) => ({ sourceObjectRef, sourceRefs }));
}

// Review proposals are pointers into existing public evidence, NOT submitted Intake records.
// Pin expression, method and value separately, and retain all exact source appearances.
export function prepareCalculationReviews(rows, profiles) {
  return [
    ['c22b5594-0e1d-4f9a-ba38-d30f598fec1d', 'התגלות', 'רגיל', 844, 'רגיל 844'],
    ['c22b5594-0e1d-4f9a-ba38-d30f598fec1d', 'התגלות', 'מסתתר', 1237, 'מסתתר רגיל 1237'],
    ['c22b5594-0e1d-4f9a-ba38-d30f598fec1d', 'התגלות', 'קדמי', 3137, 'משולש 3137'],
    ['d9842a5a-5313-4d32-8e58-5f07fa29b887', 'וראית את אחרי', 'רגיל', 1237, 'רגיל 1237'],
  ].map(([id, expression, methodKey, claimedValue, valueQuote]) => {
    const source = rows.find(r => r.imageId === id);
    if (!source) return { sourceRef: `gallery_images:${id}`, state: 'withheld_source_no_longer_admitted' };
    const profile = profiles.find(p => p.expression === expression)?.methods.find(m => m.methodKey === methodKey);
    const expressionLocator = source.searchHints.find(h => h.quote === expression) || null;
    const valueLocator = source.calculationLoci?.find(h => h.quote === valueQuote) || null;
    const matched = Boolean(profile && profile.value === claimedValue);
    return { sourceRef: source.sourceRef, sourceObjectRef: source.sourceObjectRef, sourceHref: source.sourceHref,
      expression, methodKey, displayLabel: profile?.displayLabel || null, claimedValue,
      expressionLocator, valueLocator, engineResult: profile?.value ?? null,
      definitionVersion: profile?.definitionVersion ?? null, dependencyVersion: profile?.dependencyVersion ?? null,
      calculationState: matched ? 'canonical_profile_matches_source_claim' : 'unverified_or_mismatch',
      reviewState: matched && expressionLocator && valueLocator ? 'prepared_for_human_gate_not_submitted' : 'source_or_engine_review_required',
      duplicatePolicy: 'reuse_existing_finding_if_found_on_source_object_or_appearance_before_any_intake',
      publicAppearanceRefs: source.publicAppearances.map(a => a.sourceRef),
      interpretation: 'separate_not_certified_by_calculation', newEdges: 0 };
  });
}

export function assertReadOnlyRequest(input, init = {}) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = String(init.method || input?.method || 'GET').toUpperCase();
  assert.equal(url.origin, 'https://linswmnnkjxvweumprav.supabase.co');
  assert.ok(['/rest/v1/gallery_images', '/rest/v1/galleries', '/rest/v1/topic_cards_public',
    '/rest/v1/world_contributor_research_v1', '/rest/v1/nodes', '/rest/v1/gematria_methods',
    '/rest/v1/rpc/fn_method_profile'].includes(url.pathname), 'bounded existing public read endpoints only');
  const rpc = url.pathname.split('/rpc/')[1] || null;
  assert.ok(!rpc || ['fn_method_profile'].includes(rpc), 'only preverified STABLE method-profile RPC allowed');
  assert.ok(['GET', 'HEAD', 'OPTIONS'].includes(method) || (method === 'POST' && rpc === 'fn_method_profile'), 'no product writes');
  if (method === 'POST') {
    const body = JSON.parse(init.body);
    assert.deepEqual(Object.keys(body).sort(), ['p_depth', 'p_phrase']);
    assert.equal(body.p_depth, 'value');
    assert.ok(['התגלות', 'וראית את אחרי'].includes(body.p_phrase));
  }
  return { method, path: url.pathname };
}

export async function runBatch({ write = false } = {}) {
  const nativeFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(assertReadOnlyRequest(input, init));
    return nativeFetch(input, init);
  };
  try {
    const { getPublicResearchClient } = await import('../src/lib/research/researchViewMode.js');
    const { getImagesByGallery } = await import('../src/lib/supabase.js');
    const { fetchGallerySourceContext } = await import('../src/lib/research/entityHubProjection.js');
    const { galleryOccurrenceItem, resolvePublicGallerySelection } = await import('../src/lib/research/topicSourceContext.js');
    const { fetchWorldPublicFindingsPage } = await import('../src/lib/research/worldPublicFindingReader.js');
    const { REVIEWED_SOURCE_WITNESSES } = await import('../src/lib/research/worldSourceConnections.js');
    const { fetchNumberMethodProfile } = await import('../src/lib/research/numberCoreProjection.js');
    const client = getPublicResearchClient();
    const checked = async q => { const r = await q; if (r.error) throw r.error; return r; };
    const history = historicalCandidates(await readFile(inventory, 'utf8'));
    const rows = [], galleries = [], partial = [];
    for (const galleryId of [29, 81]) {
      const listed = await getImagesByGallery(galleryId, { publicSourceOnly: true, throwOnError: true, client });
      assert.ok(listed.length < 1000, 'do not silently accept a capped listing');
      const ids = listed.map(r => r.id);
      const admitted = [];
      for (const batch of chunks(ids)) {
        const context = await fetchGallerySourceContext({ imageIds: batch, client });
        if (context.occurrencesTruncated) partial.push(`occurrences:${galleryId}`);
        for (const id of batch) {
          const selection = resolvePublicGallerySelection({ wpGalleryId: galleryId, scannedIds: batch, items: context.items }, id);
          const item = galleryOccurrenceItem(selection);
          if (item) admitted.push(item);
        }
      }
      const topicsById = new Map(), findingSourceRefs = new Set();
      for (const batch of chunks(admitted)) {
        const topicRead = await checked(client.from('topic_cards_public')
          .select('id,slug,node_id,image_ids').eq('status', 'approved')
          .overlaps('image_ids', batch.map(i => i.galleryImageId)).limit(200));
        if (topicRead.data.length === 200) partial.push(`topics:${galleryId}`);
        for (const t of topicRead.data) topicsById.set(t.id, t);
        const appearanceRefs = [...new Set(batch.flatMap(i => i.occurrences.map(o => o.provenance.sourceRef)))];
        for (const refs of chunks(appearanceRefs)) {
          const findings = await checked(client.from('world_contributor_research_v1')
            .select('id,source_ref').eq('privacy_scope', 'public').in('status', ['approved', 'canonical'])
            .or(refs.map(ref => `source_ref.like.${ref}*`).join(',')).limit(200));
          if (findings.data.length === 200) partial.push(`finding_prescan:${galleryId}`);
          for (const f of findings.data) {
            const base = f.source_ref.split('#')[0];
            if (refs.includes(base)) findingSourceRefs.add(base);
          }
        }
      }
      const nodeIds = [...new Set([...topicsById.values()].map(t => t.node_id).filter(id => uuid.test(id || '')))];
      const nodes = nodeIds.length ? (await checked(client.from('nodes').select('id,is_active').in('id', nodeIds))).data : [];
      for (const t of topicsById.values()) t.nodeActive = nodes.find(n => n.id === t.node_id)?.is_active ?? null;
      for (const item of admitted) {
        const relatedRefs = [...new Set(item.occurrences.map(o => o.provenance.sourceRef))].filter(ref => findingSourceRefs.has(ref));
        const pages = await Promise.all(relatedRefs.map(sourceRef => fetchWorldPublicFindingsPage({ client, sourceRef, pageSize: 50 })));
        const page = pages.length ? { rows: [...new Map(pages.flatMap(p => p.rows).map(r => [r.id, r])).values()],
          hasMore: pages.some(p => p.hasMore), omittedForReview: pages.some(p => p.omittedForReview),
          omittedUnavailable: pages.some(p => p.omittedUnavailable) } : null;
        if (page?.hasMore || page?.omittedForReview || page?.omittedUnavailable) partial.push(`findings:${item.sourceRef}`);
        const row = reviewOccurrence(item, { galleryId, history: history.get(galleryId),
          topics: [...topicsById.values()], findingPage: page, witnesses: REVIEWED_SOURCE_WITNESSES });
        row.calculationLoci = ['רגיל 844', 'מסתתר רגיל 1237', 'משולש 3137', 'רגיל 1237']
          .map(quote => exactTextLocator(item.intrinsic.extraction.text, quote)).filter(Boolean);
        rows.push(row);
      }
      const recovered = new Set(rows.filter(r => r.galleryId === galleryId && r.historical1237Candidate).map(r => r.wpImageId));
      galleries.push({ galleryId, listed: listed.length, admitted: admitted.length,
        historicalCandidates: history.get(galleryId).size, recoveredHistoricalCandidates: recovered.size,
        historicalCandidatesNotCurrentlyAdmitted: [...history.get(galleryId)].filter(id => !recovered.has(id)) });
    }
    const profiles = [];
    for (const expression of ['התגלות', 'וראית את אחרי']) {
      const methods = await fetchNumberMethodProfile(expression, { client });
      profiles.push({ expression, origin: 'fn_method_profile / existing fetchNumberMethodProfile',
        scope: 'calculation_profile_only_not_source_verification_or_intake', methods: methods.filter(m =>
          ['רגיל', 'מסתתר', 'משולש', 'קדמי'].includes(m.displayLabel)).map(m => ({
          methodKey: m.methodKey, displayLabel: m.displayLabel, value: m.computedValue,
          definitionVersion: m.definitionVersion, dependencyVersion: m.dependencyVersion })) });
    }
    const report = { checkedAt: new Date().toISOString(),
      scope: 'offline_review_batch_not_runtime_registry_or_intake',
      canonicalOwners: ['reality_graph_law:v8', 'research_intake_foundation_contract_law:v13', 'gematria_engine_law:v2'],
      historicalInventory: 'revelation-1237-source-inventory-20261028.md',
      coverage: { galleries, occurrences: rows.length, sourceObjects: groupSourceObjects(rows).length,
        ocrPresent: rows.filter(r => r.extraction.present).length,
        possibleOcrTruncation: rows.filter(r => r.extraction.possibleReaderTruncation).length,
        existingFindingOccurrences: rows.filter(r => r.existingPublicFindings.length).length,
        readTimeWitnessOccurrences: rows.filter(r => r.existingReadTimeWitnesses.length).length,
        topicMembershipOccurrences: rows.filter(r => r.storedTopicMemberships.length).length,
        partial: partial.length > 0, limits: [...new Set(partial)], visuallyReviewedAll: false },
      methodProfiles: profiles, preparedCalculationReviews: prepareCalculationReviews(rows, profiles),
      sourceObjects: groupSourceObjects(rows), occurrences: rows,
      boundaries: { productWrites: 0, newFindings: 0, newEdges: 0, publicationChanges: 0,
        sourceNumbersAreTagsNotProof: true, historicalCandidatesAreNotFindings: true,
        sharedStorageObjectDoesNotProveIndependentEvidence: true, noPrivateOrRawOcrDump: true },
      requests: { count: requests.length, methods: [...new Set(requests.map(r => r.method))],
        paths: [...new Set(requests.map(r => r.path))], productWrites: 0, modelCalls: 0 },
    };
    if (write) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ...report.coverage, profiles: report.methodProfiles, requests: report.requests }, null, 2));
    return report;
  } finally { globalThis.fetch = nativeFetch; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runBatch({ write: process.argv.includes('--write') });
}
