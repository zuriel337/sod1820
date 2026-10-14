import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { fetchHomePostCards2029, HOME_POST_CARD_COLUMNS } from '../src/lib/research/homePostCards2029.js';

function clientFor(rows, body = { id: 5018, content: 'God = 26 יהוה = 26', excerpt: 'source' }, bodyStatus = 200) {
  const requests = [];
  const client = createClient('https://example.supabase.co', 'anon', { auth: { persistSession: false }, global: {
    fetch: async (url, init) => {
      const u = new URL(url); requests.push({ u, headers: new Headers(init.headers) });
      const detail = u.searchParams.has('id');
      return new Response(JSON.stringify(detail ? body : rows), { status: detail ? bodyStatus : 200, headers: { 'Content-Type': 'application/json' } });
    },
  } });
  return { client, requests };
}
test('bounded category cards preserve admission and order, without exact count or full bodies', async () => {
  const row = { id: 2, slug: 'film', categories: ['הצופן בסרטים'], title: 'Film' };
  const s = clientFor([row]); const result = await fetchHomePostCards2029({ category: 'הצופן בסרטים', limit: 30, client: s.client });
  assert.deepEqual(result.posts, [row]); const request = s.requests[0];
  assert.equal(request.u.searchParams.get('select'), HOME_POST_CARD_COLUMNS);
  assert.ok(!HOME_POST_CARD_COLUMNS.split(',').includes('content'));
  assert.equal(request.u.searchParams.get('order'), 'modified.desc.nullslast');
  assert.equal(request.u.searchParams.get('limit'), '30');
  assert.ok(request.u.searchParams.get('categories').startsWith('ov.'));
  assert.deepEqual(request.u.searchParams.getAll('tags'), ['not.cs.{טיוטה}', 'not.cs.{פורום}']);
  assert.equal(request.headers.has('prefer'), false);
  await assert.rejects(fetchHomePostCards2029({ category: 'שבילי שפה', limit: 61, client: s.client }), RangeError);
  await assert.rejects(fetchHomePostCards2029({ category: 'שבילי שפה', limit: Infinity, client: s.client }), RangeError);
});
test('only the admitted language feature reads its authored body; other cards are unchanged', async () => {
  const rows = [{ id: 5018, slug: 'language', home_hidden: false }, { id: 5, slug: 'other' }];
  const s = clientFor(rows); const result = await fetchHomePostCards2029({ category: 'שבילי שפה', limit: 24, client: s.client });
  assert.equal(s.requests.length, 2); assert.equal(s.requests[1].u.searchParams.get('id'), 'eq.5018');
  assert.ok(s.requests[1].u.searchParams.has('categories')); assert.equal(s.requests[1].u.searchParams.get('home_hidden'), 'eq.false');
  assert.equal(result.posts[0].content, 'God = 26 יהוה = 26'); assert.deepEqual(result.posts[1], rows[1]);
});
test('unadmitted/hidden language source does not fetch a body; body errors preserve card content', async () => {
  for (const rows of [[{ id: 3 }], [{ id: 5018, home_hidden: true }]]) {
    const s = clientFor(rows); await fetchHomePostCards2029({ category: 'שבילי שפה', limit: 24, client: s.client }); assert.equal(s.requests.length, 1);
  }
  const rows = [{ id: 5018, home_hidden: false, slug: 'language' }];
  const s = clientFor(rows, { message: 'unavailable' }, 503);
  assert.deepEqual((await fetchHomePostCards2029({ category: 'שבילי שפה', limit: 24, client: s.client })).posts, rows);
});
