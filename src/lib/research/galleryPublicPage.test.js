import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the actual public adapter with an in-memory PostgREST query double.
// RLS is not replaced: this tests the additional application publication gate.
const source = readFileSync(new URL('../supabase.js', import.meta.url), 'utf8');
const body = source.split('export async function getGalleryPage(')[1].split('\nexport async function createTopicCardDraft')[0];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const reader = new AsyncFunction('supabase', 'options', `return await (async function(${body})(options);`);
const rows = [
  { id: 'public', image_url: 'public.jpg', curator_hidden: false, published: 1, min_tier: 0 },
  { id: 'hidden', image_url: 'hidden.jpg', curator_hidden: true, published: 1, min_tier: 0 },
  { id: 'draft', image_url: 'draft.jpg', curator_hidden: false, published: 0, min_tier: 0 },
  { id: 'alternate', image_url: 'alternate.jpg', curator_hidden: false, published: 2, min_tier: 0 },
  { id: 'tier', image_url: 'tier.jpg', curator_hidden: false, published: 1, min_tier: 1 },
];
function client() {
  let data = rows;
  const q = {
    select() { return q; },
    eq(k, v) { data = data.filter(r => r[k] === v); return q; },
    not(k, op, v) { data = data.filter(r => r[k] !== v); return q; },
    order() { return q; },
    range() { return Promise.resolve({ data, count: data.length, error: null }); },
  };
  return { from: () => q };
}
test('public gallery page excludes unpublished, alternate publication, hidden and tier material', async () => {
  const result = await reader(client(), {});
  assert.deepEqual(result.data.map(r => r.id), ['public']);
  assert.equal(result.count, 1);
});
test('existing admin hidden review retains its separate query; public caller defaults remain fail closed', async () => {
  const result = await reader(client(), { hidden: 'only' });
  assert.deepEqual(result.data.map(r => r.id), ['hidden']);
});
