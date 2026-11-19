import test from 'node:test';
import assert from 'node:assert/strict';
import { fullscanDisplaySourceRefs, buildContributorFindingsProjection } from '../src/lib/research/contributorFindingsProjection.js';
import { fetchWorldPublicFindingById } from '../src/lib/research/worldPublicFindingReader.js';
import { fetchZviSourceFindingsPage } from '../src/lib/research/worldZviApprovedFindings2029.js';

const contributor = { id: 'c66f0464-0928-490e-be9b-66d8a87e7fc8', slug: 'tzvi-opoc', display_name: 'צבי' };
const cases = [
  ['73f034f7-3622-4f84-ae51-3da3ab626c47', '7c9c19af-ada2-48e5-9037-f135378608eb', 'fullscan:yair-erech-221', '98d127e6-f22c-4fc7-bce2-8ed5d8b61057', 'AC50D0807B53F90CDCD95C27C693BEE0'],
  ['762cb2fb-c54f-4f4a-b5a1-50684d244c64', '8ca07498-5fba-4686-b5d9-c539ab03c193', 'fullscan:nisan-nisim-makel-170', '74adef58-8838-4cba-b13a-c03bb788d7f7', 'AC55C90E0C16CEB8DC146BD1F8020BFB'],
];
const fixtures = cases.map(([id, gallery, fragment, sourceId, image]) => {
  const artifact = `gallery_images:${gallery}`, occurrence = `channel_updates:${sourceId}`;
  return {
    row: { id, kind: 'equality', statement: 'ממצא המקור', value: 221, terms: ['יאיר'], status: 'canonical', privacy_scope: 'public',
      source_ref: `${artifact}#${fragment}`, meta: { source_media: { artifact_ref: artifact, occurrence_ref: occurrence }, source_refs: [artifact, occurrence] } },
    source: { id: sourceId, status: 'live', contributor_id: contributor.id, expires_at: null, text: 'הודעת מקור',
      image_url: `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/broadcasts/${image}.jpg` },
    occurrence,
  };
});

test('Fullscan2 display grouping preserves raw source, semantic fragment and gallery evidence', () => {
  for (const { row, source, occurrence } of fixtures) {
    const before = JSON.stringify(row);
    const displaySourceRefs = fullscanDisplaySourceRefs([row], [source], contributor);
    assert.deepEqual(displaySourceRefs, { [row.id]: occurrence });
    const projection = buildContributorFindingsProjection({ contributor, researchObjects: [row], sourceMessages: [source], displaySourceRefs });
    assert.equal(projection.sourceGroups.length, 1);
    const group = projection.sourceGroups[0];
    assert.equal(group.sourceRef, occurrence);
    assert.equal(group.findingCount, 1);
    assert.equal(group.rows[0].source_ref, row.source_ref);
    assert.deepEqual(group.universalFindings[0].evidence.refs, [row.source_ref]);
    assert.equal(JSON.stringify(row), before);
  }
});

test('no display substitution without a fresh matching public source', () => {
  for (const { row, source } of fixtures) {
    for (const sources of [[], [{ ...source, status: 'private' }], [{ ...source, contributor_id: null }],
      [{ ...source, contributor_id: 'other' }], [{ ...source, expires_at: '2000-01-01' }], [{ ...source, expires_at: 'invalid' }],
      [{ ...source, image_url: source.image_url.replace('.jpg', '-changed.jpg') }]]) {
      assert.deepEqual(fullscanDisplaySourceRefs([row], sources, contributor), {});
    }
    assert.deepEqual(fullscanDisplaySourceRefs([row], [source], { ...contributor, id: 'other' }), {});
  }
});

test('identity and both declared provenance axes must match; access state is never promoted', () => {
  for (const { row, source } of fixtures) {
    for (const delta of [{ id: 'other' }, { source_ref: row.source_ref.split('#')[0] }, { privacy_scope: 'private' }, { status: 'candidate' },
      { meta: {} }, { meta: { ...row.meta, source_refs: [row.meta.source_media.artifact_ref] } },
      { meta: { ...row.meta, source_media: { ...row.meta.source_media, occurrence_ref: 'channel_updates:other' } } },
      { meta: { ...row.meta, ext: { personal_scope: { scope: 'person_only' } } } }]) {
      assert.deepEqual(fullscanDisplaySourceRefs([{ ...row, ...delta }], [source], contributor), {});
    }
  }
});

test('exact detail and source list re-admit the channel, preserve raw provenance and fail closed on revocation', async () => {
  for (const { row, source, occurrence } of fixtures) {
    const record = { ...row, created_at: '2026-11-01T10:00:00Z', meta: { ...row.meta,
      ext: { presentation: { statement_role: 'research_statement' } } } };
    let visible = true;
    const calls = [];
    const client = { from(table) {
      calls.push(table);
      const data = table === 'research_objects' ? record : table === 'world_contributor_research_v1' ? [record]
        : table === 'channel_updates' ? visible ? source : null : [];
      const b = { select: () => b, eq: () => b, in: () => b, or: () => b, order: () => b, limit: () => b,
        maybeSingle: async () => ({ data }), then: (resolve, reject) => Promise.resolve({ data }).then(resolve, reject) };
      return b;
    } };
    const detail = await fetchWorldPublicFindingById(row.id, { publicClient: () => client, cache: true });
    assert.ok(detail.sourceHref.includes(source.id));
    assert.ok(JSON.stringify(detail).includes(row.source_ref));
    const page = await fetchZviSourceFindingsPage({ client, sourceRef: occurrence });
    assert.equal(page.rows.length, 1);
    assert.equal(page.rows[0].sourceRef, occurrence);
    assert.equal(page.rows[0].sourceOccurrenceRef, row.source_ref);
    assert.equal(calls.includes('gallery_images'), false);
    visible = false;
    await assert.rejects(fetchWorldPublicFindingById(row.id, { publicClient: () => client, cache: true }), /public_finding_source_unavailable/);
    assert.equal((await fetchZviSourceFindingsPage({ client, sourceRef: occurrence })).rows.length, 0);
  }
});
