import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { entryPrimaryReads2029, postBySlugRead, latestPostCardsRead, applyPostRead, postReadUrl } from '../src/lib/postReadQueries2029.js';
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
