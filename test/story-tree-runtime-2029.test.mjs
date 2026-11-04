import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchStoryTreeSequence2029 } from '../src/lib/research/worldSourceConnections.js';
import { fetchPublicWorldPostSource } from '../src/lib/research/entityHubProjection.js';

const anchor = '3a2804ac-c8c9-4b2f-83c4-b99f47c15c1f';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const root = { kind: 'graph-entity', identity: { entityRef: `node:${anchor}`, sourceIdentity: { nodeId: anchor } }, source: { sourceRef: `node:${anchor}` } };
const relation = n => ({ kind: 'graph-relation', identity: { relationRef: `edge:${uuid(n)}` }, source: { sourceRef: `edge:${uuid(n)}` }, projection: { relations: [{ id: uuid(n), fromNodeId: anchor, toNodeId: uuid(n + 100), from: { id: anchor, type: 'number' }, to: { id: uuid(n + 100), type: 'post', href: `/post/story-${n}` }, relationType: 'documents' }] } });
const post = n => ({ id: n, slug: `story-${n}`, title: `Story ${n}`, excerpt: '<p>A public summary</p>', source: 'uploaded_file', tags: [], author: 'Author' });
const fixtures = [root, relation(1), relation(2)];

test('bounded existing readers preserve order, source identity and exact edges without full bodies', async () => {
  const calls = [];
  const result = await fetchStoryTreeSequence2029({ anchorNodeId: anchor,
    graphReader: async (id, options) => { assert.equal(id, anchor); assert.equal(options.relationLimit, 50); return fixtures; },
    postReader: async options => { calls.push(options); return post(Number(options.postSlug.slice(6))); } });
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.stories.map(s => s.sourceRef), ['posts:1', 'posts:2']);
  assert.equal(result.stories[0].relation.edgeRef, `edge:${uuid(1)}`);
  assert.equal(result.stories[0].relation.fromNodeRef, `node:${anchor}`);
  assert.equal(result.stories[0].relation.toNodeRef, `node:${uuid(101)}`);
  assert.equal(result.stories[0].summary, 'A public summary');
  assert.ok(calls.every(c => c.includeContent === false));
  assert.equal(result.ordering, 'input_not_chronology');
});
test('invalid or unavailable canonical anchor prevents all post reads', async () => {
  let calls = 0;
  for (const [id, findings] of [['invalid', fixtures], [anchor, fixtures.slice(1)], [anchor, [{ ...root, source: { sourceRef: 'node:wrong' } }, relation(1)]]]) {
    const result = await fetchStoryTreeSequence2029({ anchorNodeId: id, graphReader: async () => findings, postReader: async () => { calls++; return post(1); } });
    assert.equal(result.status, 'unavailable'); assert.deepEqual(result.stories, []);
  }
  assert.equal(calls, 0);
});
test('draft, hidden, wrong-source and withdrawn sources never leak story content', async () => {
  for (const row of [null, { ...post(1), tags: ['טיוטה'] }, { ...post(1), home_hidden: true }, { ...post(1), source: 'gpt-draft' }, post(99)]) {
    const result = await fetchStoryTreeSequence2029({ anchorNodeId: anchor, graphReader: async () => [root, relation(1)], postReader: async () => row });
    assert.equal(result.status, 'partial'); assert.equal(result.stories.length, 0);
    assert.ok(!JSON.stringify(result).includes('Story 99'));
  }
});
test('eight-source cap, malformed edge and failures report partial coverage, not corpus absence', async () => {
  let calls = 0;
  const result = await fetchStoryTreeSequence2029({ anchorNodeId: anchor,
    graphReader: async () => [root, ...Array.from({ length: 12 }, (_, i) => relation(i + 1))],
    postReader: async ({ postSlug }) => { calls++; return post(Number(postSlug.slice(6))); } });
  assert.equal(calls, 8); assert.equal(result.stories.length, 8); assert.equal(result.status, 'partial');
  const error = await fetchStoryTreeSequence2029({ anchorNodeId: anchor, graphReader: async () => { throw Error('offline'); } });
  assert.equal(error.status, 'error');
  const missing = await fetchStoryTreeSequence2029({ anchorNodeId: anchor, graphReader: async () => [root, relation(1)], postReader: async () => { throw Error('offline'); } });
  assert.equal(missing.status, 'partial'); assert.equal(missing.stories.length, 0);
});
test('conflicting exact edges and non-post candidates cannot trigger source reads', async () => {
  let calls = 0;
  const conflict = structuredClone(relation(1)); conflict.projection.relations[0].toNodeId = uuid(999); conflict.projection.relations[0].to.id = uuid(999);
  const result = await fetchStoryTreeSequence2029({ anchorNodeId: anchor,
    graphReader: async () => [root, relation(1), conflict, { ...relation(2), kind: 'candidate' }],
    postReader: async () => { calls++; return post(1); } });
  assert.equal(calls, 0); assert.equal(result.status, 'partial');
});

function client(row, error = null) {
  const calls = [];
  const query = Object.fromEntries(['select', 'eq', 'in', 'limit'].map(key => [key, (...args) => { calls.push([key, ...args]); return query; }]));
  query.maybeSingle = async () => ({ data: row, error });
  return { calls, from(table) { calls.push(['from', table]); return query; } };
}
test('public post reader keeps id/content default, adds exact bounded lightweight slug reads', async () => {
  const byId = client(post(1));
  assert.equal((await fetchPublicWorldPostSource({ postId: 1, client: byId })).id, 1);
  assert.ok(byId.calls.find(c => c[0] === 'select')[1].includes('content'));
  assert.deepEqual(byId.calls.find(c => c[0] === 'eq'), ['eq', 'id', 1]);
  const bySlug = client(post(1));
  await fetchPublicWorldPostSource({ postSlug: 'story-1', includeContent: false, client: bySlug });
  assert.ok(!bySlug.calls.find(c => c[0] === 'select')[1].includes('content'));
  assert.deepEqual(bySlug.calls.find(c => c[0] === 'limit'), ['limit', 2]);
  const unused = client(post(1));
  for (const options of [{ postId: 'bad', postSlug: 'story-1' }, { postSlug: '../oops' }, { postSlug: 'x%2fy' }]) {
    assert.equal(await fetchPublicWorldPostSource({ ...options, client: unused }), null);
  }
  assert.equal(unused.calls.length, 0);
  assert.equal(await fetchPublicWorldPostSource({ postId: 1, client: client({ ...post(1), tags: ['טיוטה'] }) }), null);
  await assert.rejects(fetchPublicWorldPostSource({ postSlug: 'story-1', client: client(null, Error('ambiguous')) }), /ambiguous/);
});
