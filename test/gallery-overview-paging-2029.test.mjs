import test from 'node:test';
import assert from 'node:assert/strict';
import { getGalleriesOverview } from '../src/lib/supabase.js';

// PF4: the public gallery catalog read issues the galleries read and the first three image pages together
// (4 sequential round trips -> 1). It must return exactly what the sequential reader returned.
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const gallery = (n = 69) => ({ id: id(n), wp_gallery_id: n, name: `גלרית ${n}` });
const image = (n) => ({ id: id(n + 1000), gallery_id: id(69), wp_gallery_id: 69, published: 1, min_tier: 0, curator_hidden: false, ordering: n, image_url: `https://example.test/${n}.png` });

function makeClient({ total, errorPages = [], galleriesError = false, log = [] } = {}) {
  const rows = Array.from({ length: total }, (_, n) => image(n));
  return {
    log,
    from(table) {
      const state = { table, start: 0 };
      const query = {};
      for (const key of ['select', 'eq', 'not', 'order']) query[key] = () => query;
      query.range = (a) => { state.start = a; return query; };
      query.then = (resolve, reject) => {
        log.push({ table, start: state.start, at: log.length });
        const result = table === 'galleries'
          ? { data: [gallery()], count: 1, error: galleriesError ? Error('offline galleries') : null }
          : errorPages.includes(state.start / 1000)
            ? { data: null, count: null, error: Error(`offline page ${state.start / 1000}`) }
            : { data: rows.slice(state.start, state.start + 1000), count: null, error: null };
        return Promise.resolve(result).then(resolve, reject);
      };
      return query;
    },
  };
}

// The pre-change algorithm, verbatim in behaviour (sequential pages, same stop rules).
async function sequentialReference(client) {
  const { data: gals, error: galleryError, count: galleryCount } = await client.from('galleries').select().order().range(0, 999);
  if (galleryError) throw galleryError;
  let imgs = [], from = 0, partial = galleryCount > (gals || []).length;
  while (true) {
    const { data, error } = await client.from('gallery_images').select().not().eq().eq().not().order().range(from, from + 999);
    if (error) throw error;
    if (!data || !data.length) break;
    imgs = imgs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
    if (from >= 10000) { partial = true; break; }
  }
  return { gals: gals || [], imgs, coverage: { partial } };
}

test('same rows, same coverage as the sequential reader for every corpus size around the page boundaries', async () => {
  for (const total of [0, 1, 999, 1000, 1001, 1999, 2000, 2195, 2999, 3000, 3001, 5000, 9999, 10000, 10500]) {
    const next = await getGalleriesOverview({ client: makeClient({ total }), publicSourceOnly: true });
    const old = await sequentialReference(makeClient({ total }));
    assert.deepEqual(next, old, `total ${total}`);
  }
});

test('galleries and the first three image pages are in flight together', async () => {
  const log = [];
  const client = makeClient({ total: 2195, log });
  const pending = getGalleriesOverview({ client, publicSourceOnly: true });
  // every read of the first wave has been started before any of them can have resolved (no await between them)
  await Promise.resolve();
  assert.deepEqual(log.map((q) => `${q.table}:${q.start}`), ['galleries:0', 'gallery_images:0', 'gallery_images:1000', 'gallery_images:2000']);
  const result = await pending;
  assert.equal(result.imgs.length, 2195);
  assert.equal(log.length, 4, 'today\'s 2,195 rows need exactly the four reads of the first wave');
  const sequential = makeClient({ total: 2195 });
  await sequentialReference(sequential);
  assert.equal(sequential.log.length, 4, 'same number of requests as before, now concurrent');
});

test('the 10,000-row bound is unchanged: ten pages, partial coverage', async () => {
  const client = makeClient({ total: 12000 });
  const result = await getGalleriesOverview({ client, publicSourceOnly: true });
  assert.equal(result.imgs.length, 10000);
  assert.equal(result.coverage.partial, true);
  assert.equal(client.log.filter((q) => q.table === 'gallery_images').length, 10);
});

test('a prefetched page that is never reached is never inspected; a reached page that failed still rejects', async () => {
  // 1,500 rows: page 1 is short, so page 2 (prefetched, failing) must not matter
  const ok = await getGalleriesOverview({ client: makeClient({ total: 1500, errorPages: [2] }), publicSourceOnly: true });
  assert.equal(ok.imgs.length, 1500);
  await assert.rejects(getGalleriesOverview({ client: makeClient({ total: 2500, errorPages: [1] }), publicSourceOnly: true }), /offline page 1/);
  await assert.rejects(getGalleriesOverview({ client: makeClient({ total: 500, errorPages: [0] }), publicSourceOnly: true }), /offline page 0/);
  await assert.rejects(getGalleriesOverview({ client: makeClient({ total: 500, galleriesError: true }), publicSourceOnly: true }), /offline galleries/);
});

test('the legacy (non-public) overview does not prefetch', async () => {
  const log = [];
  const client = makeClient({ total: 2500, log });
  await getGalleriesOverview({ client });
  assert.deepEqual(log.filter((q) => q.table === 'gallery_images').map((q) => q.start), [0, 1000, 2000]);
  assert.equal(log[1].at, 1, 'first image page starts only after the galleries read was issued');
});
