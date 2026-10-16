import test from 'node:test';
import assert from 'node:assert/strict';
import { getEntityBundle } from '../src/lib/supabase.js';
import { getBundle } from '../src/lib/engine.js';

const VALUE = 91827; // Synthetic identity; no live records or canonical calculation.
const row = (id, overrides = {}) => ({
  id, name: id, description: '', image_url: `https://media.invalid/${id}.jpg`,
  thumb_url: null, gallery_id: 'synthetic', primary_value: VALUE,
  all_values: [VALUE], published: 1, curator_hidden: false, min_tier: 0,
  importance: 1, occurred_at: '2026-01-01', created_at: '2026-01-01',
  ...overrides,
});

// Replace only HTTP transport. The real reader, Supabase query builder and
// response/count decoding run unchanged. This tiny in-memory PostgREST model
// applies all predicates before order, exact count and the requested window.
function transport(t, rows, { failures = {}, omitCount = false } = {}) {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href);
    const headers = new Headers(init?.headers);
    requests.push({ url, headers, method: init?.method || 'GET' });
    assert.equal(url.hostname, 'linswmnnkjxvweumprav.supabase.co');
    const table = url.pathname.split('/').pop();
    if (table !== 'gallery_images') {
      assert.ok(['gematria_words', 'posts_by_number_strict', 'posts', 'insights', 'nodes', 'comments'].includes(table), `unexpected request: ${table}`);
      return new Response('[]', { headers: { 'content-type': 'application/json', 'content-range': '*/0' } });
    }
    const q = url.searchParams;
    const branch = q.has('primary_value') ? 'primary' : q.has('all_values') ? 'secondary' : 'text';
    if (failures[branch]) {
      return new Response(JSON.stringify({ code: '42501', message: 'synthetic denial' }), {
        status: 403, headers: { 'content-type': 'application/json' },
      });
    }
    let items = rows.filter(item => [...q].every(([field, predicate]) => {
      if (['select', 'order', 'limit', 'offset'].includes(field)) return true;
      if (predicate === 'not.is.true') return item[field] !== true;
      if (predicate.startsWith('eq.')) return item[field] != null && String(item[field]) === predicate.slice(3);
      if (predicate.startsWith('cs.')) {
        const values = predicate.slice(4, -1).split(',').map(Number);
        return Array.isArray(item[field]) && values.every(value => item[field].includes(value));
      }
      if (predicate.startsWith('ilike.')) return String(item[field]).includes(predicate.slice(7, -1));
      throw new Error(`unmodeled predicate ${field}=${predicate}`);
    }));
    for (const spec of (q.get('order') || '').split(',').reverse()) {
      if (!spec) continue;
      const [field, direction, nulls] = spec.split('.');
      items.sort((a, b) => {
        if (a[field] == null || b[field] == null) {
          if (a[field] == null && b[field] == null) return 0;
          return (a[field] == null ? 1 : -1) * (nulls === 'nullsfirst' ? -1 : 1);
        }
        const cmp = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
        return direction === 'desc' ? -cmp : cmp;
      });
    }
    const count = items.length;
    const offset = Number(q.get('offset') || 0);
    items = items.slice(offset, offset + Number(q.get('limit') || count));
    const fields = q.get('select').split(',');
    const body = items.map(item => Object.fromEntries(fields.map(field => [field, item[field]])));
    return new Response(JSON.stringify(body), { headers: {
      'content-type': 'application/json',
      ...(headers.get('prefer')?.includes('count=exact') && !omitCount
        ? { 'content-range': `${offset}-${offset + items.length - 1}/${count}` } : {}),
    } });
  });
  return requests;
}

const bundle = () => getEntityBundle({ term: String(VALUE), value: VALUE, isNumber: true });
const ids = result => result.galleries.map(item => item.id);
const galleryRequests = requests => requests.filter(req => req.url.pathname.endsWith('/gallery_images'));

for (const branch of ['primary', 'secondary']) {
  test(`${branch}: only published=1, nonhidden, public-tier rows enter items/count`, async t => {
    // Empty all_values isolates the primary query; a different primary_value
    // isolates the secondary query. Both must enforce publication independently.
    const membership = branch === 'primary' ? { all_values: [] } : { primary_value: -1 };
    const rows = [
      row('public-false', { ...membership, importance: 3 }),
      row('public-null', { ...membership, curator_hidden: null, importance: 2 }),
      ...[0, 2, null].map((published, i) => row(`unpublished-${i}`, { ...membership, published, importance: 100 })),
      row('hidden', { ...membership, curator_hidden: true, importance: 100 }),
      ...[1, 2, null].map((min_tier, i) => row(`restricted-${i}`, { ...membership, min_tier, importance: 100 })),
    ];
    const requests = transport(t, rows);
    const result = await bundle();
    assert.deepEqual(ids(result), ['public-false', 'public-null']);
    assert.equal(result.galleriesCount, branch === 'primary' ? 0 : 2, 'preserve existing exact secondary-population count');
    const queries = galleryRequests(requests);
    assert.equal(queries.length, 2);
    for (const { url } of queries) {
      assert.equal(url.searchParams.get('published'), 'eq.1', 'publication belongs in each server request');
      assert.equal(url.searchParams.get('curator_hidden'), 'not.is.true');
      assert.equal(url.searchParams.get('min_tier'), 'eq.0');
    }
  });
}

test('publication precedes both windows and exact count; primary wins, duplicates collapse, order is stable', async t => {
  const primaries = Array.from({ length: 30 }, (_, i) => row(`p${i}`, { importance: 100 - i }));
  const secondary = Array.from({ length: 50 }, (_, i) => row(`s${i}`, { primary_value: -1, importance: 200 - i }));
  const blocked = Array.from({ length: 50 }, (_, i) => row(`draft${i}`, { published: i % 2 ? 2 : 0, importance: 1000 }));
  const requests = transport(t, [...blocked, ...primaries, ...secondary]);
  const result = await bundle();
  assert.deepEqual(ids(result), [
    ...Array.from({ length: 24 }, (_, i) => `p${i}`),
    ...Array.from({ length: 40 }, (_, i) => `s${i}`),
  ]);
  assert.equal(result.galleriesCount, 80, 'exact count before 40-row window, including primary overlaps');
  const [pr, sr] = galleryRequests(requests);
  assert.equal(pr.url.searchParams.get('limit'), '24');
  assert.equal(sr.url.searchParams.get('limit'), '40');
  assert.equal(sr.headers.get('prefer'), 'count=exact');

  // A second dataset puts overlapping rows inside both windows. Secondary rank
  // never displaces primary-first order or duplicates its identities.
  t.mock.restoreAll();
  transport(t, [row('secondary', { primary_value: -1, importance: 99 }), row('overlap', { importance: 3 }), row('primary', { all_values: [], importance: 2 })]);
  const overlap = await bundle();
  assert.deepEqual(ids(overlap), ['overlap', 'primary', 'secondary']);
  assert.equal(overlap.galleriesCount, 2);
});

test('existing importance, occurrence and creation ordering survives the admission filter', async t => {
  transport(t, [
    row('older-creation', { created_at: '2025-01-01' }), row('newer-creation'),
    row('recent-occurrence', { occurred_at: '2026-02-01' }),
    row('important', { importance: 2 }), row('no-occurrence', { occurred_at: null }),
    row('no-importance', { importance: null }),
  ]);
  assert.deepEqual(ids(await bundle()), ['important', 'recent-occurrence', 'newer-creation', 'older-creation', 'no-occurrence', 'no-importance']);
});

for (const [label, rows] of [
  ['empty source', []],
  ['no admitted media', [row('draft', { published: 0 }), row('other-state', { published: 2 }), row('unknown', { published: null }), row('hidden', { curator_hidden: true }), row('premium', { min_tier: 1 })]],
]) {
  test(`${label} returns no media and zero count`, async t => {
    transport(t, rows);
    const result = await bundle();
    assert.deepEqual(ids(result), []);
    assert.equal(result.galleriesCount, 0);
  });
}

test('missing exact count retains the deduplicated item-count fallback', async t => {
  transport(t, [row('overlap'), row('secondary', { primary_value: -1 })], { omitCount: true });
  const result = await bundle();
  assert.deepEqual(ids(result), ['overlap', 'secondary']);
  assert.equal(result.galleriesCount, 2);
});

for (const failures of [{ primary: true }, { secondary: true }, { primary: true, secondary: true }]) {
  test(`HTTP failures remain bounded to their media reads: ${Object.keys(failures).join('+')}`, async t => {
    transport(t, [row('primary', { all_values: [] }), row('secondary', { primary_value: -1 })], { failures });
    const result = await bundle();
    assert.deepEqual(ids(result), [...(!failures.primary ? ['primary'] : []), ...(!failures.secondary ? ['secondary'] : [])]);
    assert.equal(result.galleriesCount, failures.primary && failures.secondary ? 0 : 1);
    assert.deepEqual(result.phrases, []);
    assert.deepEqual(result.posts, []);
  });
}

test('query-construction failure degrades only the media section', async t => {
  const { supabase } = await import('../src/lib/supabase.js');
  const realFrom = supabase.from.bind(supabase);
  transport(t, []);
  t.mock.method(supabase, 'from', table => {
    if (table === 'gallery_images') throw new Error('synthetic construction failure');
    return realFrom(table);
  });
  const result = await bundle();
  assert.deepEqual(ids(result), []);
  assert.equal(result.galleriesCount, 0);
  assert.deepEqual(result.posts, []);
});

test('engine getBundle consumer receives the same public numeric media contract', async t => {
  transport(t, [row('published'), row('unpublished', { published: 2 })]);
  const result = await getBundle({ term: 'synthetic-engine-media', value: VALUE, isNumber: true });
  assert.deepEqual(ids(result), ['published']);
  assert.equal(result.galleriesCount, 1);
});

test('text branch keeps its existing query shape and empty term performs no reads', async t => {
  const requests = transport(t, []);
  await getEntityBundle({ term: 'synthetic', value: null, isNumber: false });
  const [request] = galleryRequests(requests);
  assert.equal(request.url.searchParams.get('name'), 'ilike.%synthetic%');
  assert.equal(request.url.searchParams.get('limit'), '18');
  assert.equal(request.url.searchParams.has('published'), false, 'text branch is outside this numeric repair');
  const count = requests.length;
  assert.equal(await getEntityBundle({ term: '', value: null, isNumber: false }), null);
  assert.equal(requests.length, count);
});
