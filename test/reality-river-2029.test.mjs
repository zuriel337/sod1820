import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGallerySourceContext, loadPublicRealityStream2029 } from '../src/lib/research/topicSourceContext.js';
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const gallery = { id: id(90), wp_gallery_id: 105, name: 'זרם המציאות' };
const row = n => ({ id: id(n), gallery_id: gallery.id, wp_gallery_id: 105, ordering: n,
  published: 1, min_tier: 0, curator_hidden: false, source: 'update',
  image_url: `https://example.test/${n}.png`, image_type: 'gematria', primary_value: 456, all_values: [456, 45],
  name: `עדכון 2/3/2021 תמונה ${n}`, description: 'הכיתוב הציבורי' });
const reader = rows => async ({ imageIds }) => ({ items: buildGallerySourceContext({
  images: rows.filter(r => imageIds.includes(r.id)), occurrences: rows, galleries: [gallery] }) });

test('stream composes existing selector and public reader, preserves stream order and exact source', async () => {
  const rows = [row(1), row(2)];
  const result = await loadPublicRealityStream2029({ listHints: async limit => {
    assert.equal(limit, 12);
    return [{ id: id(2), name: 'untrusted candidate caption', stream_at: '2026-10-31T10:00:00Z' }, { id: id(1) }];
  }, fetchSourceContext: reader(rows) });
  assert.deepEqual(result.items.map(r => r.galleryImageId), [id(2), id(1)]);
  assert.equal(result.items[0].sourceRef, `gallery_images:${id(2)}`);
  assert.equal(result.items[0].legacyPlacement.originalCaption, 'הכיתוב הציבורי');
  assert.ok(!JSON.stringify(result.items).includes('untrusted candidate caption'));
  assert.equal(result.items[0].streamAddedAt, '2026-10-31T10:00:00Z');
  assert.match(result.items[0].streamHref, /gallery=105&image=/);
  assert.equal(result.coverage.partial, true);
});
test('private, unavailable, stale and non-native occurrences are withheld; no selector content fallback', async () => {
  const rows = [row(1), { ...row(2), published: 0 }, { ...row(3), min_tier: 1 },
    { ...row(4), curator_hidden: true }, { ...row(5), wp_gallery_id: null, gallery_id: null }];
  const result = await loadPublicRealityStream2029({ listHints: async () => [...rows, { id: id(6) }], fetchSourceContext: reader(rows) });
  assert.deepEqual(result.items.map(r => r.galleryImageId), [id(1)]);
  assert.equal(result.withheld, 5);
});
test('shared public image retains selected occurrences, not sibling caption or extra appearances', async () => {
  const rows = [row(1), { ...row(2), image_url: row(1).image_url, description: 'הכיתוב השני' }, row(3)];
  const result = await loadPublicRealityStream2029({ listHints: async () => [rows[1], rows[0]], fetchSourceContext: reader(rows) });
  assert.deepEqual(result.items.map(r => r.galleryImageId), [id(2), id(1)]);
  assert.equal(result.items[0].description, 'הכיתוב השני');
  assert.equal(result.items[1].description, 'הכיתוב הציבורי');
});
test('bounded selector input and exact source errors do not turn into successful source data', async () => {
  let calls = 0;
  await loadPublicRealityStream2029({ listHints: async () => Array.from({length:40}, (_,i) => row(i+1)), fetchSourceContext: async ({imageIds}) => {
    calls++; assert.equal(imageIds.length,12); return {items:[]};
  } });
  assert.equal(calls,1);
  await assert.rejects(loadPublicRealityStream2029({ listHints: async () => [row(1)], fetchSourceContext: async () => { throw Error('source unavailable'); } }), /source unavailable/);
});
test('source no longer designated for stream is not shown, even if still public', async () => {
  const result=await loadPublicRealityStream2029({listHints:async()=>[row(1)],fetchSourceContext:reader([{...row(1),source:'hugeit_migration'}])});
  assert.equal(result.items.length,0);
});
