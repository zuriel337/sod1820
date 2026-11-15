// URL continuity (15.11.2026): the canonical of an imported WordPress post must be the address the edge actually serves.
// Evidence (live read-only crawl 15.11.2026, Search Console 17.6-10.11): `/<slug>/` is answered 308 -> `/<slug>` by the permanent rule
// `/(.+)/ -> /$1` of public-reading-deploy/vercel.json; the sitemap lists `/<slug>`; Google serves and clicks `/<slug>` (98% of the clicks of
// these posts). Before this change the page declared `https://sod1820.co.il/<slug>/` (lower-case hex, trailing slash) as its canonical and
// og:url - an address that itself redirects back - on the server document (api/og.js) and, through publicPostHref, in the client (applySeo).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ogHandler from '../api/og.js';
import sitemapHandler from '../api/sitemap.js';
import { PUBLIC_READING_PROFILE_ID } from '../src/lib/publicReadingRelease2029.js';
import { publicPostHref, publicPostUrl, postAddressSlug } from '../src/lib/publicPostUrls.js';

const SITE = 'https://sod1820.co.il';
const prd = JSON.parse(fs.readFileSync(new URL('../public-reading-deploy/vercel.json', import.meta.url), 'utf8'));
const slashRule = prd.redirects.find(r => r.source === '/(.+)/');

// Same row shape as public.posts for an imported WordPress record: lower-case percent-encoded slug, link with the original trailing slash.
const SLUG_TEXT = 'תפילה-לרפואה-של-רבי-שלמה-יהודה-הינוקא';
const wpRow = {
  id: 321, wp_id: 20001, source: 'wordpress', slug: encodeURIComponent(SLUG_TEXT).toLowerCase(),
  link: `${SITE}/${encodeURIComponent(SLUG_TEXT).toLowerCase()}/`,
  title: 'תפילה לרפואה', excerpt: 'תפילה לרפואה שלמה.', content: '<p>תפילה לרפואה שלמה.</p>', image_url: null,
  date: '2020-01-01T00:00:00+00:00', modified: '2020-01-02T00:00:00+00:00', tags: [], categories: [], author: null,
};
const aiRow = { id: 5135, wp_id: null, source: 'ai', slug: 'native-post', link: null, title: 'פוסט מודרני', excerpt: 'x', content: '<p>x</p>', image_url: null,
  date: '2026-11-11T00:00:00+00:00', modified: null, tags: [], categories: [], author: null };

async function ask(path, row) {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    const hit = /\/rest\/v1\/posts\?/.test(u) && row && (decodeURIComponent(u).includes('slug=eq.' + decodeURIComponent(row.slug)) || u.includes('slug=eq.' + row.slug));
    return { ok: true, status: 200, headers: new Headers({ 'content-range': '*/0' }), json: async () => (hit ? [row] : []), text: async () => '[]' };
  };
  const res = { h: new Map(), code: 200, body: '', setHeader(k, v) { this.h.set(String(k).toLowerCase(), v); }, status(c) { this.code = c; return this; }, send(b) { this.body = String(b); return this; } };
  try {
    await ogHandler({ method: 'GET', url: '/api/og?path=' + encodeURIComponent(path), headers: { host: 'sod1820.co.il', 'x-forwarded-proto': 'https' },
      publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true, publicRequestedPath: path,
      publicReadingSearch: '', query: { path, crawler: 'search' } }, res);
  } finally { globalThis.fetch = previous; }
  return { status: res.code, canonical: (res.body.match(/rel="canonical" href="([^"]*)/) || [])[1], ogUrl: (res.body.match(/property="og:url" content="([^"]*)/) || [])[1], body: res.body };
}

test('the edge rule that makes a trailing-slash post address redirect is the one this contract is built on', () => {
  assert.ok(slashRule, 'public-reading-deploy/vercel.json must still carry /(.+)/ -> /$1');
  assert.equal(slashRule.destination, '/$1');
  assert.equal(slashRule.permanent, true);
});

test('server document: the canonical and og:url of an imported WordPress post are slash-free and are not themselves redirected', async () => {
  const path = '/' + SLUG_TEXT;
  const a = await ask(path, wpRow);
  assert.equal(a.status, 200);
  const expected = SITE + '/' + encodeURIComponent(SLUG_TEXT);
  assert.equal(a.canonical, expected, 'canonical must be the served form: no trailing slash, standard upper-case percent-encoding (the form the sitemap lists)');
  assert.equal(a.ogUrl, expected);
  const canonicalPath = new URL(a.canonical).pathname;
  assert.doesNotMatch(canonicalPath, /^\/(.+)\/$/, 'the canonical address must not match the permanent trailing-slash redirect');
  assert.equal(decodeURIComponent(canonicalPath), path);
});

test('client address contract: publicPostHref / publicPostUrl of an imported WordPress post equal the served form (applySeo uses it as the canonical path)', () => {
  assert.equal(publicPostHref(wpRow), '/' + encodeURIComponent(SLUG_TEXT));
  assert.equal(publicPostUrl(wpRow), SITE + '/' + encodeURIComponent(SLUG_TEXT));
  assert.equal(postAddressSlug(publicPostHref(wpRow)), SLUG_TEXT);
  assert.equal(publicPostHref(wpRow, { search: '?p=20001', hash: '#source-region-7' }), '/' + encodeURIComponent(SLUG_TEXT) + '?p=20001#source-region-7');
});

test('native posts keep /post/<slug>; their canonical is unchanged', async () => {
  const a = await ask('/post/native-post', aiRow);
  assert.equal(a.canonical, SITE + '/post/native-post');
  assert.equal(publicPostHref(aiRow), '/post/native-post');
});

test('an address stored with a non-WordPress provenance keeps its root address, without the trailing slash', () => {
  assert.equal(publicPostHref({ source: 'ai', slug: 'unknown', link: '/unknown/' }), '/unknown');
  assert.equal(publicPostHref({ source: 'unknown_migration', slug: 'source' }), '/source');
});

// DEF-002 contract, both owners together: the sitemap must list exactly the address the page declares as canonical.
async function sitemapLocs(row) {
  const previous = globalThis.fetch;
  globalThis.fetch = async (raw) => {
    const url = new URL(raw);
    if (url.pathname === '/rest/v1/posts') return new Response(JSON.stringify([row]), { headers: { 'content-range': '0-0/1' } });
    return new Response('[]', { headers: { 'content-range': '*/0' } });
  };
  const res = { code: null, headers: {}, setHeader(k, v) { this.headers[String(k).toLowerCase()] = v; }, status(c) { this.code = c; return this; }, send(b) { this.body = b; return this; } };
  try {
    await sitemapHandler({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true }, res);
  } finally { globalThis.fetch = previous; }
  assert.equal(res.code, 200);
  return [...String(res.body).matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]);
}

test('the sitemap lists exactly the canonical the page declares (server canonical == sitemap <loc>)', async () => {
  const page = await ask('/' + SLUG_TEXT, wpRow);
  const locs = await sitemapLocs(wpRow);
  const postLocs = locs.filter(loc => loc.includes('%'));
  assert.equal(postLocs.length, 1, 'the one imported WordPress post is listed once');
  assert.equal(postLocs[0], page.canonical, 'sitemap <loc> and page canonical must be the same address');
  assert.doesNotMatch(new URL(postLocs[0]).pathname, /\/$/);
});
