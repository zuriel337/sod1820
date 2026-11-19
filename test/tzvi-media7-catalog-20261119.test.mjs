import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCatalogGroupSourceMedia, WORLD_GROUP_SOURCE_READER } from '../src/lib/research/worldGroupSource.js';
import { buildContributorFindingsProjection } from '../src/lib/research/contributorFindingsProjection.js';
import { buildContributorSourceCatalogProjection } from '../src/lib/research/contributorSourceCatalogProjection.js';
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
test('unapproved IDs, other authors, and private sources never trigger the reader', async () => {
  for (const sources of [[source('outside', '2026-11-12')], [{ ...source(ids[0], '2026-11-12'), status: 'private' }], [{ ...source(ids[0], '2026-11-12'), contributor_id: 'other' }]]) {
    const result = await fetchCatalogGroupSourceMedia({ sources, contributor, rpc: () => assert.fail('unexpected RPC') });
    assert.deepEqual(result, { byId: {}, status: 'not_applicable' });
  }
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
