import test from 'node:test';
import assert from 'node:assert/strict';
import { publicReadingContinuation, galleryImageFragment2029 } from '../src/lib/publicReadingRelease2029.js';
import { galleryReadingFilters2029, projectGalleryReading2029, galleryReadingHref2029 } from '../src/lib/research/topicSourceContext.js';

const image = '8dd7b41e-522b-4b06-8a4a-4990c6819c2d';

test('the archive and gallery-updates carry an old gallery selector and original reading position to the gallery', () => {
  for (const path of ['/archive', '/gallery-updates']) {
    assert.equal(publicReadingContinuation(path, '?tab=galleries'), '/gallery');
    const search = '?source=original%20post&tab=galleries&gal=87&offset=12&take=24&a=1&a=2';
    const target = '/gallery?source=original%20post&gallery=87&offset=12&take=24&a=1&a=2';
    for (const prefix of ['gallery-source-', 'pool-']) {
      const hash = '#' + prefix + image;
      assert.equal(publicReadingContinuation(path, search, hash), target + hash);
      assert.equal(publicReadingContinuation(path, '', hash), '/gallery' + hash);
      assert.equal(galleryImageFragment2029(hash), image);
    }
    assert.equal(publicReadingContinuation(path, '?image=' + image), '/gallery?image=' + image);
  }
  assert.equal(galleryImageFragment2029('#gallery-source-unknown'), null);
  assert.equal(publicReadingContinuation('/gallery', '?gallery=87'), null);
});

test('historic number and stream entries retain the filtered collection they addressed', () => {
  assert.equal(publicReadingContinuation('/archive', '?tab=reality'), '/reality');
  assert.equal(publicReadingContinuation('/archive', '?q=786'), '/gallery?tab=reality&nums=786');
  assert.equal(publicReadingContinuation('/archive', '?tab=pool&num=786'), '/gallery?tab=pool&nums=786');
  for (const search of ['?tab=reality&set=123', '?tab=pool', '?tab=cascade', '?q=original', '?tab=pool&nums=5,unknown'])
    assert.equal(publicReadingContinuation('/archive', search), null);
  const seeds = [
    { id: 'update', source: 'update', primary_value: 786 },
    { id: 'pool', source: 'manual', all_values: [14] },
    { id: 'related-only', source: 'update', related_values: [786] },
  ];
  const catalog = {items: [{wpGalleryId: 87, originalName: 'מקור', entries: seeds}]};
  for (const [legacy, expected] of [['?q=786', ['update']], ['?tab=pool&nums=14,786', ['update','pool']]]) {
    const href = publicReadingContinuation('/archive', legacy);
    const search = new URL(href, 'https://sod1820.co.il').search;
    const f = galleryReadingFilters2029(search);
    const selected = projectGalleryReading2029(catalog, f).items[0];
    assert.deepEqual(selected.entries.map(row => row.id).sort(), expected.sort());
    assert.equal(galleryReadingFilters2029(new URL(galleryReadingHref2029(search, {galleryId:87}), 'https://sod1820.co.il').search).archiveTab, f.archiveTab);
  }
});
