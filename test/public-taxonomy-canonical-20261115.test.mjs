// URL continuity (15.11.2026): a category/tag page has ONE canonical address - the documented hyphen form.
// Evidence (live read-only crawl 15.11.2026): /category/סוד%20החשמל (space) answers 200 with the same title as /category/סוד-החשמל, both
// `index, follow`, each declaring ITSELF as canonical; the sitemap lists only the hyphen form; Search Console shows 31 clicks on the spaced
// duplicate (82 on the hyphen address). The route convention (postsTaxonomyRoute2029) maps hyphens to spaces, so both addresses are the same label.
import test from 'node:test';
import assert from 'node:assert/strict';
import ogHandler from '../api/og.js';
import { PUBLIC_READING_PROFILE_ID } from '../src/lib/publicReadingRelease2029.js';

const SITE = 'https://sod1820.co.il';

async function ask(path) {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (/\/rest\/v1\/posts\?/.test(u)) {
      return { ok: true, status: 200, headers: new Headers({ 'content-range': '0-0/1' }),
        json: async () => [{ id: 1, title: 'פוסט', tags: ['מימד חמש'], categories: ['סוד החשמל', 'מימד חמש'], image_url: null, thumb_url: null }], text: async () => '[]' };
    }
    return { ok: true, status: 200, headers: new Headers({ 'content-range': '*/0' }), json: async () => [], text: async () => '[]' };
  };
  const res = { h: new Map(), code: 200, body: '', setHeader(k, v) { this.h.set(String(k).toLowerCase(), v); }, status(c) { this.code = c; return this; }, send(b) { this.body = String(b); return this; } };
  try {
    await ogHandler({ method: 'GET', url: '/api/og?path=' + encodeURIComponent(path), headers: { host: 'sod1820.co.il', 'x-forwarded-proto': 'https' },
      publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true, publicRequestedPath: path,
      publicReadingSearch: '', query: { path, crawler: 'search' } }, res);
  } finally { globalThis.fetch = previous; }
  return { status: res.code, canonical: (res.body.match(/rel="canonical" href="([^"]*)/) || [])[1], ogUrl: (res.body.match(/property="og:url" content="([^"]*)/) || [])[1],
    robots: (res.body.match(/name="robots" content="([^"]*)/) || [])[1], title: (res.body.match(/<title>([^<]*)<\/title>/) || [])[1] };
}

const HYPHEN = '/category/' + encodeURIComponent('סוד-החשמל');
const SPACED = '/category/' + encodeURIComponent('סוד החשמל'); // ...%20...

test('the hyphen address is the canonical address and is unchanged', async () => {
  const a = await ask(HYPHEN);
  assert.equal(a.status, 200);
  assert.equal(a.canonical, SITE + HYPHEN);
  assert.equal(a.ogUrl, SITE + HYPHEN);
});

test('the spaced address (same label) declares the hyphen address as canonical and og:url, not itself', async () => {
  const a = await ask(SPACED);
  assert.equal(a.status, 200);
  assert.equal(a.canonical, SITE + HYPHEN, 'a second indexable address for the same category must consolidate on the sitemap address');
  assert.equal(a.ogUrl, SITE + HYPHEN);
  assert.doesNotMatch(a.canonical, /%20| /);
});

test('tags follow the same convention and a spaced address never becomes its own canonical', async () => {
  const spaced = '/tag/' + encodeURIComponent('מימד חמש');
  const a = await ask(spaced);
  assert.equal(a.status, 200);
  assert.equal(a.canonical, SITE + '/tag/' + encodeURIComponent('מימד-חמש'));
});
