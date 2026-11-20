import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCatalogGroupSourceMedia, WORLD_GROUP_SOURCE_READER } from '../src/lib/research/worldGroupSource.js';
import { buildContributorFindingsProjection } from '../src/lib/research/contributorFindingsProjection.js';
import { buildContributorSourceCatalogProjection } from '../src/lib/research/contributorSourceCatalogProjection.js';
import { buildWorldContributorPublicMaterial } from '../src/lib/research/worldPeopleSourcesProjection.js';
const contributor = { id: 'writer', slug: 'tzvi-opoc' };
const ids = ['94cab26c-02cb-4eb3-ae32-61fee950dfea', '9fd28f82-5619-4161-9840-c957842d99fd'];
const source = (id, at) => ({ id, created_at: at, status: 'live', contributor_id: 'writer', image_url: 'storage-object:00000000-0000-0000-0000-000000000001' });
const url = 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/source/original.jpg';
const row = s => ({ id: s.id, created_at: s.created_at, group_proof: true, proof_basis: 'verified_phone_unique', contributor_slug: 'tzvi-opoc', group_channel: 'torat-haremez', media_kind: 'image', media_url: url });
const sources = [source(ids[0], '2026-11-12T12:00:00Z'), source(ids[1], '2026-11-11T12:00:00Z')];
test('Media7 uses raw page cursor, exact admitted IDs and retains the original source locator', async () => {
  const before = JSON.stringify(sources), calls = [];
  const result = await fetchCatalogGroupSourceMedia({ sources, contributor, rpc: async (name, args, options) => {
    calls.push(args); assert.equal(name, WORLD_GROUP_SOURCE_READER); assert.deepEqual(options, { get: true });
    return { data: calls.length === 1 ? [row(sources[0]), ...Array.from({ length: 39 }, (_, i) => ({ id: `other-${i}`, created_at: '2026-11-12T00:00:00Z' }))] : [row(sources[1])] };
  } });
  assert.equal(result.status, 'ok'); assert.equal(calls.length, 2);
  assert.equal(calls[1].p_before, '2026-11-12T00:00:00Z');
  assert.equal(JSON.stringify(sources), before);
  const projection = buildContributorFindingsProjection({ contributor, sourceMessages: sources.map(s => ({ ...s, publicMedia: result.byId[s.id] })) });
  const catalog = buildContributorSourceCatalogProjection(projection);
  assert.equal(catalog.items.length, 2); assert.ok(catalog.items.every(s => s.media.url === url));
  assert.ok(projection.sourceGroups.every(g => g.source.imageUrl.startsWith('storage-object:')));
});
test('invalid IDs, other authors, and private sources never trigger the reader', async () => {
  for (const sources of [[source('outside', '2026-11-12')], [{ ...source(ids[0], '2026-11-12'), status: 'private' }], [{ ...source(ids[0], '2026-11-12'), contributor_id: 'other' }]]) {
    const result = await fetchCatalogGroupSourceMedia({ sources, contributor, rpc: () => assert.fail('unexpected RPC') });
    assert.deepEqual(result, { byId: {}, status: 'not_applicable' });
  }
});
test('a new source uses server evidence without adding its ID to a static list', async () => {
  const fresh = source('61724472-9d81-414c-a911-e00eab0caf38', '2026-11-10T12:00:00Z');
  const before = JSON.stringify(fresh);
  const admitted = await fetchCatalogGroupSourceMedia({ sources: [fresh], contributor,
    rpc: async () => ({ data: [row(fresh)] }) });
  assert.equal(admitted.status, 'ok');
  assert.equal(admitted.byId[fresh.id].url, url);
  assert.equal(JSON.stringify(fresh), before);
  const absent = await fetchCatalogGroupSourceMedia({ sources: [fresh], contributor,
    rpc: async () => ({ data: [] }) });
  assert.deepEqual(absent, { byId: {}, status: 'unavailable' });
  const other = await fetchCatalogGroupSourceMedia({ sources: [fresh], contributor: { ...contributor, slug: 'shachar-kandro' },
    rpc: () => assert.fail('other contributor catalog is outside this batch') });
  assert.equal(other.status, 'not_applicable');
});
test('evidence-backed video uses its public URL and poster without changing the source', async () => {
  const video = source('0c7a4f04-ea80-42ff-af93-db86339ddab2', '2026-11-10T12:00:00Z');
  const videoUrl = url.replace('original.jpg', 'original.mp4');
  const result = await fetchCatalogGroupSourceMedia({ sources: [video], contributor,
    rpc: async () => ({ data: [{ ...row(video), media_kind: 'video', media_url: videoUrl, thumb_url: url }] }) });
  assert.deepEqual(result.byId[video.id], { kind: 'video', url: videoUrl, thumbUrl: url });
  const projection = buildContributorFindingsProjection({ contributor,
    sourceMessages: [{ ...video, publicMedia: result.byId[video.id] }] });
  const catalog = buildContributorSourceCatalogProjection(projection);
  const material = buildWorldContributorPublicMaterial({ identity: contributor,
    findings: { ...projection, mode: 'public_view' }, sourceCatalog: catalog, publications: {} });
  const card = material.items.find(item => item.sourceRef === `channel_updates:${video.id}`);
  assert.equal(card.mediaKind, 'video');
  assert.equal(card.mediaUrl, videoUrl);
  assert.equal(card.posterUrl, url);
  assert.equal(video.image_url, 'storage-object:00000000-0000-0000-0000-000000000001');
});
test('unresolved catalog targets cannot expand the existing 32-page request budget', async () => {
  const old = source('61724472-9d81-414c-a911-e00eab0caf38', '2026-01-01T00:00:00Z');
  let calls = 0;
  const result = await fetchCatalogGroupSourceMedia({ sources: [...sources, old], contributor,
    rpc: async () => { calls++; return { data: Array.from({ length: 40 }, (_, i) => ({
      id: `unrelated-${calls}-${i}`, created_at: new Date(Date.parse('2026-11-12T12:00:00Z') - calls * 60000).toISOString(),
    })) }; } });
  assert.equal(calls, 32); assert.deepEqual(result, { byId: {}, status: 'unavailable' });
});
test('missing proof, wrong writer, private URL and timestamp drift fail closed', async () => {
  for (const delta of [{ group_proof: false }, { contributor_slug: 'shimon-haimov' }, { media_url: url.replace('/public/', '/sign/') }, { created_at: '2026-11-01' }]) {
    const result = await fetchCatalogGroupSourceMedia({ sources: [sources[0]], contributor, rpc: async () => ({ data: [{ ...row(sources[0]), ...delta }] }) });
    assert.equal(result.status, 'unavailable'); assert.deepEqual(result.byId, {});
  }
});
test('timestamp boundary ties and failed pages remain unknown, never fabricate a URL or loop', async () => {
  let calls = 0;
  const result = await fetchCatalogGroupSourceMedia({ sources: [sources[1]], contributor, rpc: async () => { calls++; return { data: Array.from({ length: 40 }, (_, i) => ({ id: `other-${i}`, created_at: sources[1].created_at })) }; } });
  assert.equal(calls, 1); assert.equal(result.status, 'unavailable'); assert.deepEqual(result.byId, {});
  assert.equal((await fetchCatalogGroupSourceMedia({ sources, contributor, rpc: async () => { throw new Error('offline'); } })).status, 'unavailable');
});
