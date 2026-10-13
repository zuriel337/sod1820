import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPostCategories, postCategoryFilterNames } from '../src/lib/postCategoryIdentity.js';

test('elections resolves to the existing category; flight does not show it twice', () => {
  assert.deepEqual(canonicalPostCategories(['רמזי הגאולה']), ['רמזים חזקים']);
  assert.deepEqual(canonicalPostCategories(['תיעוד אירועים', 'רמזים חזקים', 'רמזי הגאולה']), ['תיעוד אירועים', 'רמזים חזקים']);
});
test('canonical and old URLs select the same category without omitting old source rows', () => {
  assert.deepEqual(postCategoryFilterNames('רמזים חזקים'), ['רמזים חזקים', 'רמזי הגאולה']);
  assert.deepEqual(postCategoryFilterNames('רמזי הגאולה'), postCategoryFilterNames('רמזים חזקים'));
  assert.deepEqual(postCategoryFilterNames('עלוני גאולה'), ['עלוני גאולה']);
});
test('only the exact unwanted label is normalized; no thematic or score inference', () => {
  const raw = ['רמזים מצדיקים', 'עלוני גאולה', 'תיעוד אירועים', 'זהב', 'יהלום'];
  assert.deepEqual(canonicalPostCategories(raw), raw);
  assert.deepEqual(canonicalPostCategories(null), []);
  assert.deepEqual(canonicalPostCategories([{ quality: 5, strength: 100 }]), []);
});
