import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../api/sitemap.js';
import { PUBLIC_READING_PROFILE_ID } from '../src/lib/publicReadingRelease2029.js';

const media = 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/fixture.mp4';
const posts = Array.from({ length: 1001 }, (_, i) => ({ id: i + 1, slug: `post-${i + 1}`, title: `Public title ${i + 1} & detail`,
  source: 'wordpress', tags: [], categories: [], date: '2026-11-01T00:00:00Z', modified: '2026-11-02T00:00:00Z' }));
const assets = [1, ...Array.from({length: 41}, (_, i) => i + 1), 1001, 9999].map((id, i) => ({
  public_id: (i + 1).toString(16).padStart(32, '0'), primary_source_type: 'post', primary_source_id: String(id),
  media_url: media, primary_page_url: `https://sod1820.co.il/post-${id}`, video_kind: 'selfhost',
  title: 'Aggregate title must not replace the source', google_indexable: true, first_seen_at: '2026-11-01T00:00:00Z',
}));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function invoke({ rows = posts, firstPostGate, postStarted, calls = [], failPosts = false, failAssets = false, legacy = false } = {}) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input), table = url.pathname.split('/').at(-1);
    assert.equal(url.origin, 'https://linswmnnkjxvweumprav.supabase.co');
    assert.ok(!options.method || options.method === 'POST' && table === 'sitemap_numbers');
    calls.push({ table, params: Object.fromEntries(url.searchParams) });
    if (table === 'posts') {
      if (url.searchParams.has('offset')) {
        assert.ok(url.searchParams.get('or'), 'existing publication predicate is required');
        if (url.searchParams.get('offset') === '0') { postStarted?.resolve(); await firstPostGate?.promise; }
        if (failPosts) return new Response('unavailable', { status: 503 });
        const from = Number(url.searchParams.get('offset'));
        const selected = url.searchParams.get('select').split(',');
        return Response.json(rows.slice(from, from + 1000).map(row => Object.fromEntries(selected.map(key => [key, row[key]]))));
      }
      // The old handler re-reads these; retaining this branch proves the old output
      // was valid while its avoidable request count fails the regression assertion.
      const ids = url.searchParams.get('id').slice(4, -1).split(',');
      return Response.json(rows.filter(row => ids.includes(String(row.id))));
    }
    if (table === 'video_media_assets_v1') {
      if (failAssets) throw Error('asset source unavailable');
      return Response.json(assets);
    }
    return Response.json([]);
  };
  const res = { headers: {}, setHeader(k,v) { this.headers[k.toLowerCase()] = v; }, status(n) { this.code = n; return this; }, send(b) { this.body = b; return this; } };
  try { await sitemap(legacy ? {} : { publicFoundationPreview: true, publicReadingProductionArtifact: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID }, res); }
  finally { globalThis.fetch = original; }
  return { ...res, calls };
}

test('sitemap reuses all admitted post pages for videos without re-reading source batches or losing URLs', async () => {
  const r = await invoke();
  assert.equal(r.code, 200);
  const locs = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const post of posts) assert.equal(locs.filter(loc => loc === `https://sod1820.co.il/${post.slug}`).length, 1);
  assert.ok(!locs.some(loc => loc.endsWith('/post-9999')), 'an asset cannot publish an absent source');
  assert.match(r.body, /<video:title>Public title 1001 &amp; detail<\/video:title>/);
  assert.doesNotMatch(r.body, /Aggregate title must not replace/);
  assert.deepEqual(r.calls.filter(c => c.table === 'posts').map(c => c.params.offset), ['0', '1000']);
});

test('independent video discovery starts while the first post page is still pending', async () => {
  const gate = deferred(), started = deferred(), calls = [];
  const result = invoke({ firstPostGate: gate, postStarted: started, calls });
  await started.promise;
  try { assert.ok(calls.some(c => c.table === 'video_media_assets_v1'), 'no sequential discovery waterfall'); }
  finally { gate.resolve(); await result; }
});

test('post reuse lasts one request: a removed source disappears on the next request', async () => {
  const first = await invoke();
  assert.match(first.body, /<loc>https:\/\/sod1820.co.il\/post-1001<\/loc>/);
  const next = await invoke({ rows: posts.slice(0, -1) });
  assert.equal(next.code, 200);
  assert.doesNotMatch(next.body, /<loc>https:\/\/sod1820.co.il\/post-1001<\/loc>/);
});

test('failed post or video discovery remains uncached 503, including simultaneous failure', async () => {
  for (const failure of [{ failPosts: true }, { failAssets: true }, { failPosts: true, failAssets: true }]) {
    const r = await invoke(failure);
    assert.equal(r.code, 503); assert.equal(r.headers['cache-control'], 'no-store');
    assert.doesNotMatch(r.body, /<urlset/);
  }
});

test('non-production sitemap keeps sequential discovery and its existing video path', async () => {
  const gate = deferred(), started = deferred(), calls = [];
  const result = invoke({ firstPostGate: gate, postStarted: started, calls, legacy: true });
  await started.promise;
  try { assert.ok(!calls.some(c => c.table === 'video_media_assets_v1')); }
  finally { gate.resolve(); }
  assert.equal((await result).code, 200);
});
