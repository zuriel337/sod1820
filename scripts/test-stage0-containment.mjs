import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import og from '../api/og.js';
import sitemap, { projectPublicUrls } from '../api/sitemap-public.js';
import { PUBLIC_CAPABILITY_KEYS, publicCapabilityForPath, publicCapabilityIsOpen } from '../src/lib/publicCapabilityRoutes.js';

const gated = {
  '/number': 'lock_number', '/number/1820': 'lock_number', '/2029/number/1820': 'lock_number',
  '/numbers': 'lock_convergence_tree', '/books': 'lock_books', '/book/daat-tevunot': 'lock_books',
  '/books/daat-tevunot': 'lock_books', '/heichal': 'lock_heichal', '/היכל': 'lock_heichal',
  '/heichal.html': 'lock_heichal', '/journey': 'lock_life_journey', '/journey-beta': 'lock_life_journey',
  '/2029/journey': 'lock_life_journey', '/מסע': 'lock_life_journey', '/forum': 'lock_forum',
  '/forum/123': 'lock_forum', '/cross': 'lock_cross', '/הצלבה': 'lock_cross', '/research': 'lock_research',
};
const publicPaths = ['/', '/world', '/els', '/code', '/codes', '/codes/published-code', '/post', '/post/published-post', '/old-post-slug', '/topic/98', '/community/chat', '/reality', '/numbering'];
const rows = (enabled, mode = 'all') => PUBLIC_CAPABILITY_KEYS.map(key => ({ key, enabled, mode }));
const response = () => ({ headers: {}, statusCode: null, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(c) { this.statusCode = c; return this; }, send(b) { this.body = b; return this; } });
const xmlFor = paths => `<?xml version="1.0"?><urlset>${paths.map(p => `<url><loc>https://sod1820.co.il${encodeURI(p)}</loc><lastmod>2026-10-13</lastmod></url>`).join('')}</urlset>`;

test('route aliases use existing capability owners; published content stays separate', () => {
  for (const [path, key] of Object.entries(gated)) {
    for (const variant of [path, encodeURI(path), `${path}/?q=1820#source`]) assert.equal(publicCapabilityForPath(variant)?.key, key, variant);
  }
  for (const path of publicPaths) assert.equal(publicCapabilityForPath(path), null, path);
});

test('anonymous projection requires one explicitly open, valid flag', () => {
  for (const key of PUBLIC_CAPABILITY_KEYS) {
    assert.equal(publicCapabilityIsOpen(rows(false), key), true);
    assert.equal(publicCapabilityIsOpen(rows(false, 'anon'), key), true);
    for (const value of [null, {}, [], rows(true), rows(true, 'anon'), [{ key, enabled: 'false', mode: 'all' }], [{ key, enabled: false }], [...rows(false), { key, enabled: false, mode: 'all' }]]) {
      assert.equal(publicCapabilityIsOpen(value, key), false, `${key}: ${JSON.stringify(value)}`);
    }
  }
});

test('sitemap closes gated families and preserves public URLs byte for byte', () => {
  const publicXml = xmlFor(publicPaths);
  const allXml = xmlFor([...Object.keys(gated), ...publicPaths]);
  for (const state of [null, [], rows(true), rows(true, 'anon')]) assert.equal(projectPublicUrls(allXml, state), publicXml);
  assert.equal(projectPublicUrls(allXml, rows(false)), allXml);
  const mixed = rows(true).map(row => ({ ...row, enabled: row.key !== 'lock_books' }));
  assert.match(projectPublicUrls(allXml, mixed), /\/book\/daat-tevunot/);
  assert.doesNotMatch(projectPublicUrls(allXml, mixed), /\/number\/1820/);
});

test('blocked crawler metadata never fetches capability content, including unavailable flags', async () => {
  const original = globalThis.fetch;
  try {
    for (const path of Object.keys(gated)) {
      for (const flagState of ['all', 'anon', 'missing', 'error', 'malformed', 'http-error']) {
        const calls = [];
        globalThis.fetch = async url => {
          calls.push(String(url));
          assert.match(String(url), /\/site_flags\?/);
          if (flagState === 'error') throw new Error('offline');
          return { ok: flagState !== 'http-error', json: async () => flagState === 'missing' ? [] : flagState === 'malformed' ? {} : rows(true, flagState) };
        };
        const res = response();
        await og({ query: { path, crawler: 'search' } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow', path);
        assert.equal(res.headers['cache-control'], 'no-store');
        assert.match(res.body, /האזור אינו פתוח לציבור כרגע/);
        assert.doesNotMatch(res.body, /http-equiv="refresh"/);
        assert.equal(calls.length, 1, `${path}: must read availability only`);
      }
    }
  } finally { globalThis.fetch = original; }
});

test('sitemap handler reads live flags, fails closed, and never caches an open projection', async () => {
  const original = globalThis.fetch;
  try {
    for (const unavailable of [false, true]) {
      globalThis.fetch = async url => {
        if (String(url).includes('/site_flags?')) {
          if (unavailable) throw new Error('offline');
          return { ok: true, json: async () => rows(true) };
        }
        return { ok: true, text: async () => xmlFor([...Object.keys(gated), ...publicPaths]) };
      };
      const res = response(); await sitemap({}, res);
      assert.equal(res.body, xmlFor(publicPaths));
      assert.equal(res.headers['cache-control'], 'no-store');
    }
  } finally { globalThis.fetch = original; }
});

test('Googlebot routes reach the guard; legacy HTML enters the same Heichal route', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  for (const path of Object.keys(gated).filter(p => !['/books/daat-tevunot', '/heichal.html'].includes(p))) {
    for (const variant of [path, encodeURI(path)]) {
      assert.ok(vercel.rewrites.some(r => new RegExp(`^${r.source}$`).test(variant) && r.destination.includes('crawler=search')), variant);
    }
  }
  assert.deepEqual(vercel.redirects.find(r => r.source === '/heichal.html'), { source: '/heichal.html', destination: '/heichal', permanent: false });
});
