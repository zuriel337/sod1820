// Static files of the public site (the four preloaded fonts, the brand images and the twelve versioned Post backgrounds) were answered `no-store`
// by the DEPLOYED configuration (public-reading-deploy/vercel.json): the browser fetched about 73 KB of fonts and the Post background again on every
// hard load. The cache rules existed only in the root vercel.json, which production does not build from, and the test that guards them read that
// file, so it stayed green (PERFORMANCE-RECOMMENDATIONS-20261107.md section 6.1, ranked first, never applied).
// This pins the DEPLOYED file: documents stay uncacheable, only content-hashed files are immutable, and the unhashed folders get a bounded lifetime.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { POST_BACKGROUND_ASSETS_2029 } from '../src/lib/research/postBackground2029.js';

const config = JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json', import.meta.url), 'utf8'));
const rules = config.headers;
const cacheOf = rule => rule.headers.find(header => header.key.toLowerCase() === 'cache-control')?.value;
const lastIndexOf = source => rules.findLastIndex(rule => rule.source === source);
const catchAll = lastIndexOf('/(.*)');
const backgrounds = [...new Set(Object.values(POST_BACKGROUND_ASSETS_2029).flatMap(item => [item.mobile, item.preview, item.desktop]))];

test('documents and every other address stay uncacheable by default: the catch-all is unchanged', () => {
  assert.ok(catchAll >= 0);
  assert.equal(cacheOf(rules[catchAll]), 'no-store');
  assert.ok(rules[catchAll].headers.some(header => header.key === 'Content-Security-Policy'), 'the catch-all still carries the document policy');
});

test('all twelve versioned Post backgrounds are immutable in the deployed config and placed after the catch-all', () => {
  assert.equal(backgrounds.length, 12);
  for (const href of backgrounds) {
    const index = lastIndexOf(href);
    assert.ok(index > catchAll, `${href} must come after the catch-all so that it takes precedence`);
    assert.equal(cacheOf(rules[index]), 'public, max-age=31536000, immutable');
    assert.deepEqual(rules[index].headers.map(header => header.key), ['Cache-Control'], 'only the cache lifetime is set');
    assert.match(href, /-[a-f0-9]{12}\.webp$/, 'immutable is safe only for a content-hashed name');
    assert.ok(existsSync(new URL('../public' + href, import.meta.url)), `${href} exists in public/`);
  }
});

test('self-hosted fonts and brand images (names without a hash) get a bounded lifetime, never immutable', () => {
  const fonts = rules[lastIndexOf('/fonts/(.*)')], brand = rules[lastIndexOf('/brand/(.*)')];
  assert.ok(lastIndexOf('/fonts/(.*)') > catchAll && lastIndexOf('/brand/(.*)') > catchAll);
  assert.equal(cacheOf(fonts), 'public, max-age=604800, stale-while-revalidate=86400');
  assert.equal(cacheOf(brand), 'public, max-age=86400, stale-while-revalidate=604800');
  for (const file of ['NotoSansHebrew-Regular.ttf', 'NotoSansHebrew-Bold.ttf', 'Rubik-Hebrew.woff2', 'Rubik-Latin.woff2']) {
    assert.ok(existsSync(new URL('../public/fonts/' + file, import.meta.url)), `${file} is served from /fonts/`);
    assert.match(readFileSync(new URL('../2029.html', import.meta.url), 'utf8'), new RegExp('/fonts/' + file.replace('.', '\\.')));
  }
});

test('immutable is reserved for content-hashed files; no other address receives a public lifetime', () => {
  const allowedPublic = new Set(['/assets/(.*)', '/(favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png)', '/fonts/(.*)', '/brand/(.*)', ...backgrounds]);
  for (const rule of rules) {
    const value = cacheOf(rule);
    if (!value || value === 'no-store') continue;
    assert.ok(allowedPublic.has(rule.source), `${rule.source} must not be cacheable`);
    if (/immutable/.test(value)) assert.ok(rule.source === '/assets/(.*)' || /-[a-f0-9]{12}\.webp$/.test(rule.source), `${rule.source} is not content-hashed`);
  }
});

test('the service worker files stay uncacheable and are not matched by a static rule', () => {
  const worker = rules.find(rule => rule.source.startsWith('/:worker('));
  assert.ok(worker);
  assert.equal(cacheOf(worker), 'no-store');
  for (const source of ['/fonts/(.*)', '/brand/(.*)', ...backgrounds]) assert.doesNotMatch('/sw.js', new RegExp('^' + source.replace(/\(\.\*\)/g, '.*').replace(/\./g, '\\.') + '$'));
});
