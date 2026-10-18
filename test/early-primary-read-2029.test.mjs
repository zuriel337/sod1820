import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { matchRoutes } from 'react-router-dom';
import { entryPrimaryReads2029, isPublicWorldPostRow, postBySlugRead, postCardBySlugRead, HOME_STORY_POST_COLUMNS_2029, WORLD_FLIGHT_POST_SLUG, latestPostCardsRead, applyPostRead, postReadUrl } from '../src/lib/postReadQueries2029.js';
import { postRowToWorldUpdate } from '../src/lib/research/worldDiscoveryStream.js';
import { startPrimaryReads2029, createEarlyReadFetch2029 } from '../src/lib/earlyPrimaryRead2029.js';

test('head URL and client URL are identical for original slug variants and latest-card reads', async () => {
  for (const definition of [postBySlugRead('hello'), postBySlugRead('%D7%A9%D7%9C%D7%95%D7%9D'), postBySlugRead('a,b'), latestPostCardsRead({ limit: 16 })]) {
    let seen;
    const client = createClient('https://example.supabase.co', 'anon', { auth: { persistSession: false }, global: { fetch: async url => { seen = url; return new Response('[]', { headers: { 'Content-Type': 'application/json' } }); } } });
    await applyPostRead(client, definition);
    assert.equal(String(seen), postReadUrl('https://example.supabase.co', definition));
  }
  assert.equal(entryPrimaryReads2029('/number/1820').length, 0);
  assert.equal(entryPrimaryReads2029('/post/a/b').length, 0);
});
test('definitions preserve original reader URL semantics, including encoded and reserved-character slugs', async () => {
  let seen;
  const client = createClient('https://example.supabase.co', 'anon', { auth: { persistSession: false }, global: { fetch: async url => { seen = String(url); return new Response('[]'); } } });
  for (const slug of ['hello', '%D7%A9%D7%9C%D7%95%D7%9D', 'a,b', 'a(b)', 'a"b']) {
    const decoded = decodeURIComponent(slug), encoded = encodeURIComponent(decoded).toLowerCase();
    await client.from('posts').select('*').in('slug', [...new Set([slug, decoded, encoded])]).limit(1);
    assert.equal(postReadUrl('https://example.supabase.co', postBySlugRead(slug)), seen);
  }
  await client.from('posts').select('id, slug, title, image_url, thumb_url, date, modified, tags, home_hidden')
    .eq('home_hidden', false).not('slug', 'is', null).order('modified', { ascending: false, nullsFirst: false }).limit(21);
  assert.equal(postReadUrl('https://example.supabase.co', latestPostCardsRead({ limit: 16 })), seen);
});
test('entry Hebrew/escaped route uses the real router parameter and the same client query', async () => {
  for (const segment of ['hello', 'שלום', '%D7%A9%D7%9C%D7%95%D7%9D', '%d7%a9%d7%9c%d7%95%d7%9d', 'a%2Fb', 'a%252Fb', 'a%2525', 'a%2Cb']) {
    const pathname = `/post/${segment}`;
    const slug = matchRoutes([{ path: '/post/:slug' }], pathname).at(-1).params.slug;
    let seen;
    const client = createClient('https://example.supabase.co', 'anon', { auth: { persistSession: false }, global: { fetch: async url => { seen = String(url); return new Response('[]'); } } });
    await applyPostRead(client, postBySlugRead(slug));
    for (const path of [pathname, `${pathname}/`])
      assert.equal(postReadUrl('https://example.supabase.co', entryPrimaryReads2029(path)[0]), seen);
  }
  assert.deepEqual(entryPrimaryReads2029('/post/%broken'), []);
});
test('encoded Hebrew boot and actual router reader share one anonymous request', async () => {
  const pathname = '/post/%D7%A9%D7%9C%D7%95%D7%9D';
  const slug = matchRoutes([{ path: '/post/:slug' }], pathname).at(-1).params.slug;
  let bootCalls = 0, normalCalls = 0;
  const host = { localStorage: { getItem: () => null }, location: { pathname }, setTimeout() {},
    fetch: async () => { bootCalls++; return new Response('[{"id":1}]'); } };
  const urls = entryPrimaryReads2029(pathname).map(d => postReadUrl('https://example.supabase.co', d));
  startPrimaryReads2029({ route: pathname, urls, anonKey: 'anon', host });
  const fetch = createEarlyReadFetch2029({ anonKey: 'anon', host, baseFetch: async () => { normalCalls++; return new Response('[{"id":2}]'); } });
  const client = createClient('https://example.supabase.co', 'anon', { auth: { persistSession: false }, global: { fetch } });
  const result = await applyPostRead(client, postBySlugRead(slug));
  assert.deepEqual(result.data, [{ id: 1 }]);
  assert.equal(bootCalls, 1); assert.equal(normalCalls, 0);
});
function setup({ storedSession = null, pathname = '/' } = {}) {
  let bootCalls = 0, normalCalls = 0;
  const host = { localStorage: { getItem: () => storedSession }, location: { pathname }, setTimeout() {},
    fetch: async () => { bootCalls++; return new Response('[{"id":1}]', { headers: { 'Content-Type': 'application/json' } }); } };
  const baseFetch = async () => { normalCalls++; return new Response('[{"id":2}]'); };
  const url = 'https://example.supabase.co/rest/v1/posts?select=id';
  startPrimaryReads2029({ route: '/', urls: [url], anonKey: 'anon', host });
  const fetch = createEarlyReadFetch2029({ anonKey: 'anon', host, baseFetch });
  const init = { headers: { apikey: 'anon', authorization: 'Bearer anon', 'Accept-Profile': 'public' } };
  return { host, url, fetch, init, counts: () => ({ bootCalls, normalCalls }) };
}
test('simultaneous initial consumers receive independent bodies; later reads fetch fresh', async () => {
  const s = setup();
  const [a, b] = await Promise.all([s.fetch(s.url, s.init), s.fetch(s.url, s.init)]);
  assert.deepEqual(await a.json(), [{ id: 1 }]); assert.deepEqual(await b.json(), [{ id: 1 }]);
  assert.deepEqual(await (await s.fetch(s.url, s.init)).json(), [{ id: 2 }]);
  assert.deepEqual(s.counts(), { bootCalls: 1, normalCalls: 1 });
});
test('authenticated startup never prefetches and authenticated client reads never adopt public responses', async () => {
  const a = setup({ storedSession: '{}' }); await a.fetch(a.url, a.init);
  assert.deepEqual(a.counts(), { bootCalls: 0, normalCalls: 1 });
  const b = setup(); await b.fetch(b.url, { headers: { ...b.init.headers, authorization: 'Bearer user-token' } });
  assert.equal(b.counts().normalCalls, 1);
});
test('profile/count/range/method/route differences bypass the handoff', async () => {
  for (const extra of [{ headers: { prefer: 'count=exact' } }, { headers: { range: '0-2' } }, { headers: { 'Accept-Profile': 'private' } }, { method: 'POST' }]) {
    const s = setup(); await s.fetch(s.url, { ...s.init, ...extra, headers: { ...s.init.headers, ...extra.headers } });
    assert.equal(s.counts().normalCalls, 1);
  }
  const s = setup({ pathname: '/world' }); await s.fetch(s.url, s.init); assert.equal(s.counts().normalCalls, 1);
});
test('HTTP failure, rejection, stale handoff and aborted consumer preserve normal error behavior', async () => {
  for (const promise of [Promise.resolve(new Response('error', { status: 500 })), Promise.reject(new Error('network'))]) {
    const s = setup(); s.host.__sodPrimaryReads2029.get(s.url).promise = promise;
    assert.deepEqual(await (await s.fetch(s.url, s.init)).json(), [{ id: 2 }]);
  }
  const stale = setup(); stale.host.__sodPrimaryReads2029.get(stale.url).created -= 16000;
  await stale.fetch(stale.url, stale.init); assert.equal(stale.counts().normalCalls, 1);
  const aborted = setup(); const controller = new AbortController(); controller.abort();
  await assert.rejects(aborted.fetch(aborted.url, { ...aborted.init, signal: controller.signal }), { name: 'AbortError' });
});
test('an aborted consumer stops immediately without aborting another initial consumer', async () => {
  const s = setup(); let complete;
  s.host.__sodPrimaryReads2029.get(s.url).promise = new Promise(resolve => { complete = resolve; });
  const controller = new AbortController();
  const cancelled = s.fetch(s.url, { ...s.init, signal: controller.signal });
  const other = s.fetch(s.url, s.init);
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  complete(new Response('[{"id":3}]'));
  assert.deepEqual(await (await other).json(), [{ id: 3 }]);
  assert.equal(s.counts().normalCalls, 0);
});

test('Home story card read: the post lookup with only the card columns, nothing else changed', async () => {
  for (const slug of ['hello', '%D7%A9%D7%9C%D7%95%D7%9D', 'a,b', 'a(b)', 'a"b', WORLD_FLIGHT_POST_SLUG]) {
    const full = postBySlugRead(slug), card = postCardBySlugRead(slug);
    assert.deepEqual({ ...card, columns: null }, { ...full, columns: null }, 'same table, filters and limit');
    assert.equal(full.columns, '*');
    assert.equal(card.columns, HOME_STORY_POST_COLUMNS_2029);
    let seen;
    const client = createClient('https://example.supabase.co', 'anon', { auth: { persistSession: false }, global: { fetch: async url => { seen = String(url); return new Response('[]', { headers: { 'Content-Type': 'application/json' } }); } } });
    await applyPostRead(client, card);
    assert.equal(seen, postReadUrl('https://example.supabase.co', card));
    const asked = new URL(seen).searchParams, fullUrl = new URL(postReadUrl('https://example.supabase.co', full)).searchParams;
    assert.equal(asked.get('slug'), fullUrl.get('slug'));
    assert.equal(asked.get('limit'), '1');
    assert.equal(asked.get('select'), HOME_STORY_POST_COLUMNS_2029);
  }
  const columns = HOME_STORY_POST_COLUMNS_2029.split(',');
  for (const needed of ['id', 'slug', 'title', 'tags', 'home_hidden', 'source', 'categories', 'date', 'thumb_url', 'image_url']) assert.ok(columns.includes(needed), needed);
  for (const unwanted of ['content', 'excerpt', 'author', '*']) assert.ok(!columns.includes(unwanted), unwanted);
  // World is access-gated, so its regular reader owns the unchanged full-row read only after Locked opens.
  assert.deepEqual(entryPrimaryReads2029('/world'), []);
  assert.deepEqual(entryPrimaryReads2029('/world/'), []);
  assert.equal(entryPrimaryReads2029('/post/hello')[0].columns, '*');
});
test('Home story card admission is the same on the card columns as on the whole row', () => {
  const whole = { id: 5107, slug: 'flydubai-fz1073-363-14000-remzei-geula', title: 'טיסה', tags: ['חדשות'], home_hidden: false, source: 'ai', categories: ['רמזי גאולה'],
    date: '2026-10-01T10:00:00Z', modified: '2026-10-02T10:00:00Z', created_at: '2026-10-01T09:00:00Z', thumb_url: 't', image_url: 'i', content: '<p>x</p>', excerpt: 'e', author: 'a' };
  const variants = [{}, { tags: ['טיוטה'] }, { tags: ['פורום'] }, { home_hidden: true }, { source: 'gpt-draft' }, { source: 'web' }, { source: 'uploaded_file' },
    { title: '' }, { title: '<b> </b>' }, { title: '&#160;' }, { slug: '' }, { id: null }, { thumb_url: null, image_url: null }, { tags: null }];
  const narrow = row => Object.fromEntries(HOME_STORY_POST_COLUMNS_2029.split(',').filter(c => c in row).map(c => [c, row[c]]));
  for (const change of variants) {
    const row = { ...whole, ...change };
    assert.equal(Boolean(postRowToWorldUpdate(narrow(row))), Boolean(postRowToWorldUpdate(row)), JSON.stringify(change));
    assert.equal(isPublicWorldPostRow(narrow(row)), Boolean(postRowToWorldUpdate(row)), `shared admission: ${JSON.stringify(change)}`);
  }
});
