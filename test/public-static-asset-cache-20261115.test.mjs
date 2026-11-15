// Static files of the public site (the four preloaded fonts, the brand images and the twelve versioned Post backgrounds) were answered `no-store`
// by the DEPLOYED configuration (public-reading-deploy/vercel.json): the browser fetched about 73 KB of fonts and the Post background again on every
// hard load. The cache rules existed only in the root vercel.json, which production does not build from, and the test that guards them read that
// file, so it stayed green (PERFORMANCE-RECOMMENDATIONS-20261107.md section 6.1, ranked first, never applied).
// This pins the DEPLOYED file: documents stay uncacheable, only content-hashed files are immutable (and the hash is the file's own), the unhashed fonts and
// brand images get a bounded lifetime, and the rules name existing files, so a missing file under the same folder is not matched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { POST_BACKGROUND_ASSETS_2029 } from '../src/lib/research/postBackground2029.js';

const config = JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json', import.meta.url), 'utf8'));
const rules = config.headers;
const cacheOf = rule => rule.headers.find(header => header.key.toLowerCase() === 'cache-control')?.value;
const lastIndexOf = source => rules.findLastIndex(rule => rule.source === source);
const catchAll = lastIndexOf('/(.*)');
const backgrounds = [...new Set(Object.values(POST_BACKGROUND_ASSETS_2029).flatMap(item => [item.mobile, item.preview, item.desktop]))];
const FONTS = ['NotoSansHebrew-Regular.ttf', 'NotoSansHebrew-Bold.ttf', 'Rubik-Hebrew.woff2', 'Rubik-Latin.woff2'];
const BRAND = ['app-icon-3f8a2a2fdc0a.png', 'apple-touch-icon-180-3f8a2a2fdc0a.png', 'canonical-lockup-128.webp', 'canonical-lockup-384.webp', 'favicon-3f8a2a2fdc0a.ico', 'icon-48-3f8a2a2fdc0a.png'];
const fontsSource = `/fonts/(${FONTS.join('|')})`, brandSource = `/brand/2029/(${BRAND.join('|')})`;

// The subset of Vercel's source syntax this file uses: literal paths, `(.*)` for any suffix, a group of alternatives, `:name(a|b)`. Literal dots are escaped first.
const matcher = source => new RegExp('^' + source.replace(/\(\.\*\)/g, '\u0001').replace(/:[A-Za-z_]+\(([^)]*)\)/g, '($1)').replace(/\./g, '\\.').replace(/\u0001/g, '.*') + '$');
const cachingRules = rules.filter(rule => { const value = cacheOf(rule); return value && value !== 'no-store'; });
const matchingCache = path => cachingRules.filter(rule => matcher(rule.source).test(path)).map(rule => rule.source);

test('documents and every other address stay uncacheable by default: the catch-all is unchanged', () => {
  assert.ok(catchAll >= 0);
  assert.equal(cacheOf(rules[catchAll]), 'no-store');
  assert.ok(rules[catchAll].headers.some(header => header.key === 'Content-Security-Policy'), 'the catch-all still carries the document policy');
});

test('all twelve versioned Post backgrounds are immutable in the deployed config, placed after the catch-all, and their name carries their own hash', () => {
  assert.equal(backgrounds.length, 12);
  for (const href of backgrounds) {
    const index = lastIndexOf(href);
    assert.ok(index > catchAll, `${href} must come after the catch-all so that it takes precedence`);
    assert.equal(cacheOf(rules[index]), 'public, max-age=31536000, immutable');
    assert.deepEqual(rules[index].headers.map(header => header.key), ['Cache-Control'], 'only the cache lifetime is set');
    const file = new URL('../public' + href, import.meta.url);
    assert.ok(existsSync(file), `${href} exists in public/`);
    // A year of immutability is safe only if a changed file must change its name: the 12 hex digits are the start of the file's own SHA-256.
    assert.equal(/-([a-f0-9]{12})\.webp$/.exec(href)?.[1], createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12), `${href}: the name's hash is the file's hash`);
  }
});

test('self-hosted fonts and brand images (names without a content hash) get a bounded lifetime, never immutable, and only for files that exist', () => {
  const fonts = rules[lastIndexOf(fontsSource)], brand = rules[lastIndexOf(brandSource)];
  assert.ok(fonts && brand, 'both rules exist');
  assert.ok(lastIndexOf(fontsSource) > catchAll && lastIndexOf(brandSource) > catchAll);
  assert.equal(cacheOf(fonts), 'public, max-age=604800, stale-while-revalidate=86400');
  assert.equal(cacheOf(brand), 'public, max-age=86400, stale-while-revalidate=604800');
  const html = readFileSync(new URL('../2029.html', import.meta.url), 'utf8');
  for (const file of FONTS) {
    assert.ok(existsSync(new URL('../public/fonts/' + file, import.meta.url)), `${file} exists`);
    assert.match(html, new RegExp('/fonts/' + file.replace('.', '\\.')), `${file} is used by the document`);
    assert.deepEqual(matchingCache('/fonts/' + file), [fontsSource]);
  }
  for (const file of BRAND) {
    assert.ok(existsSync(new URL('../public/brand/2029/' + file, import.meta.url)), `${file} exists`);
    assert.deepEqual(matchingCache('/brand/2029/' + file), [brandSource]);
  }
});

test('a missing file under the same folders, a document and the worker are not matched by any cache rule', () => {
  for (const path of ['/fonts/does-not-exist.woff2', '/fonts/', '/fonts', '/brand/2029/does-not-exist.png', '/brand/2029/source-logos/x.png', '/brand/other.png',
    '/', '/2029', '/post/some-post', '/some-original-address', '/sw.js', '/public-reading-sw.js', '/api/og', '/sitemap.xml']) {
    assert.deepEqual(matchingCache(path), [], `${path} must stay no-store`);
  }
  assert.deepEqual(matchingCache('/assets/2029-abc123.js'), ['/assets/(.*)']);
});

test('immutable is reserved for content-hashed files; no other address receives a public lifetime', () => {
  const allowedPublic = new Set(['/assets/(.*)', '/(favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png)', fontsSource, brandSource, ...backgrounds]);
  for (const rule of cachingRules) {
    assert.ok(allowedPublic.has(rule.source), `${rule.source} must not be cacheable`);
    if (/immutable/.test(cacheOf(rule))) assert.ok(rule.source === '/assets/(.*)' || /-[a-f0-9]{12}\.webp$/.test(rule.source), `${rule.source} is not content-hashed`);
  }
});

test('the service worker files stay uncacheable', () => {
  const worker = rules.find(rule => rule.source.startsWith('/:worker('));
  assert.ok(worker);
  assert.equal(cacheOf(worker), 'no-store');
  assert.ok(rules.indexOf(worker) > Math.max(...cachingRules.map(rule => rules.indexOf(rule))), 'the worker rule is still the last one');
});
