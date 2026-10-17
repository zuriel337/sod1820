import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/og.js';
import { publicPostDocument } from '../src/lib/publicPostDocument.js';

const response = data => ({ ok: true, json: async () => data });
async function render(path, fetchImpl, crawler = 'search') {
  const previous = globalThis.fetch;
  const result = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(n) { this.code = n; return this; }, send(body) { this.body = body; return this; } };
  globalThis.fetch = fetchImpl;
  try { await handler({ query: { path, crawler } }, result); return result; }
  finally { globalThis.fetch = previous; }
}
const post = { title: 'כותרת', excerpt: 'תקציר בלבד', tags: [], content: '<p>פסקה ראשונה</p><p>תוכן מלא שלא נמצא בתקציר</p><a href="/number/1820">קישור מספר</a>' };

test('search gets full public text and source links; social remains a small card document', async () => {
  for (const crawler of ['search', '']) {
    const r = await render('/post/example', async (_, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return response([post]);
    }, crawler);
    assert.equal(r.code, 200);
    assert.equal(r.headers['x-robots-tag'], crawler ? 'index, follow' : undefined);
    if (crawler) {
      assert.match(r.body, /<article data-public-post-content>/);
      assert.match(r.body, /תוכן מלא שלא נמצא בתקציר/);
      assert.match(r.body, /href="https:\/\/sod1820.co.il\/number\/1820"/);
      assert.doesNotMatch(r.body, /http-equiv="refresh"/);
    } else assert.doesNotMatch(r.body, /data-public-post-content/);
  }
});

test('authored HTML is inert and unsafe links/scripts never execute', () => {
  const html = publicPostDocument('<p>A &amp; B &lt;safe&gt;</p><script>SECRET</script><style>HIDDEN</style><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.org/?a=1&amp;b=2" onclick="evil()">source</a><p>last paragraph</p>', 'https://sod1820.co.il/post/test');
  assert.doesNotMatch(html, /<script|<style|<img|onerror|onclick|javascript:|SECRET|HIDDEN/);
  assert.match(html, /A &amp; B &lt;safe&gt;/);
  assert.match(html, /href="https:\/\/example.org\/\?a=1&amp;b=2"/);
  assert.match(html, /last paragraph/);
});

for (const tag of ['טיוטה', 'פורום']) test(`unpublished ${tag} post cannot expose body or Article metadata`, async () => {
  const r = await render('/post/draft', async () => response([{ ...post, tags: [tag] }]));
  assert.equal(r.headers['x-robots-tag'], 'noindex, follow');
  assert.doesNotMatch(r.body, /תוכן מלא|data-public-post-content|"@type":"Article"/);
});

test('missing root and nested post paths both fail closed', async () => {
  for (const path of ['/missing-audit', '/post/missing-audit']) {
    const r = await render(path, async () => response([]));
    assert.equal(r.headers['x-robots-tag'], 'noindex, follow');
  }
});

for (const [raw, rpc, payload] of [
  ['1820', 'is_number_indexable', { p_value: 1820 }],
  ['123abc', 'is_phrase_indexable', { p_phrase: '123abc' }],
  [encodeURIComponent('ביטוי מאומת'), 'is_phrase_indexable', { p_phrase: 'ביטוי מאומת' }],
]) test(`${raw} uses canonical admission, with no indexable fallback`, async () => {
  for (const admission of [true, false, 'true', null, 'failure']) {
    let calls = 0;
    const r = await render('/number/' + raw, async (url, options) => {
      if (url.includes('/site_flags?')) return response([{ key: 'lock_number', enabled: false, mode: 'all' }]);
      if (url.includes('/rpc/')) {
        calls++;
        assert.ok(url.endsWith('/rpc/' + rpc));
        assert.deepEqual(JSON.parse(options.body), payload);
        assert.ok(options.signal instanceof AbortSignal);
        if (admission === 'failure') throw new Error('timeout');
        return response(admission);
      }
      assert.ok(url.includes('/number_anchors?'));
      return response([]);
    });
    assert.equal(calls, 1);
    assert.equal(r.headers['x-robots-tag'], admission === true ? 'index, follow' : 'noindex, follow');
    if (![true, false].includes(admission)) assert.equal(r.headers['cache-control'], 'no-store');
  }
});

test('closed capability performs no admission or content lookup', async () => {
  let calls = 0;
  const r = await render('/number/1820', async url => {
    calls++;
    assert.ok(url.includes('/site_flags?'));
    return response([{ key: 'lock_number', enabled: true, mode: 'all' }]);
  });
  assert.equal(calls, 1);
  assert.equal(r.headers['x-robots-tag'], 'noindex, follow');
});

test('post dependency failure is noindex and never cached as a valid page', async () => {
  const r = await render('/post/example', async () => ({ ok: false }));
  assert.equal(r.headers['x-robots-tag'], 'noindex, follow');
  assert.equal(r.headers['cache-control'], 'no-store');
});
