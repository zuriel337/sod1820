// URL follow-ups of the 15.11 audit decided by ZURIEL on 18.11.2026 (route matrix §8.13, items 5d and 7).
// - /community/researcher/panzer answered 404: the person page resolves a non-numeric segment by contributors.slug ("israel-panzer"),
//   while "panzer" is the contributor's text code (see test/public-sitemap-researcher-identity-20261115.test.mjs). Decision: permanent redirect.
// - /sitemap_index.xml is the old WordPress/Yoast sitemap address; the current sitemap is /sitemap.xml. Decision: permanent redirect.
// Both forms of the old researcher address reach the final address in ONE hop: the explicit rules sit before the trailing-slash rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contributorHref } from '../src/lib/supabase.js';

const config = JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json', import.meta.url), 'utf8'));
const rules = config.redirects;
const indexOf = source => rules.findIndex(rule => rule.source === source);
const SLASH = indexOf('/(.+)/');

const EXPECTED = [
  ['/community/researcher/panzer', '/community/researcher/israel-panzer'],
  ['/community/researcher/panzer/', '/community/researcher/israel-panzer'],
  ['/sitemap_index.xml', '/sitemap.xml'],
];

test('the decided follow-up redirects are permanent and point at the final address', () => {
  for (const [source, destination] of EXPECTED) {
    const rule = rules.find(r => r.source === source);
    assert.ok(rule, `missing redirect for ${source}`);
    assert.equal(rule.destination, destination);
    assert.equal(rule.permanent, true);
  }
});

test('they are matched before the trailing-slash rule, so each is one hop', () => {
  assert.ok(SLASH >= 0, 'the /(.+)/ rule is still in force');
  for (const [source] of EXPECTED) assert.ok(indexOf(source) < SLASH, `${source} must come before /(.+)/`);
});

test('their destinations are not themselves redirected (no chain)', () => {
  for (const [, destination] of EXPECTED) {
    assert.equal(indexOf(destination), -1, `${destination} is the source of another redirect`);
  }
  assert.ok(config.rewrites.some(r => r.source === '/sitemap.xml'), '/sitemap.xml is still served by its rewrite');
});

test('the researcher link and the page canonical name the address the page resolves (same rule as the sitemap)', () => {
  // Live 18.11.2026: contributors has one row, slug "israel-panzer", code "panzer"; the page answered 404 on the code and declared it as canonical.
  assert.equal(contributorHref({ slug: 'israel-panzer', code: 'panzer' }), '/community/researcher/israel-panzer');
  assert.equal(contributorHref({ slug: 'someone', code: '888' }), '/community/researcher/888');
  assert.equal(contributorHref({ slug: 'someone', code: 888 }), '/community/researcher/888');
  assert.equal(contributorHref({ slug: 'only-slug', code: null }), '/community/researcher/only-slug');
  assert.equal(contributorHref({ slug: '', code: 'text-only' }), '/community/researcher/text-only');
  assert.equal(contributorHref(null), null);
  const sitemap = readFileSync(new URL('../api/sitemap.js', import.meta.url), 'utf8');
  assert.match(sitemap, /\/\^\\d\+\$\/\.test\(code\) \? code : \(ownSlug \|\| code\)/, 'the sitemap keeps the same identity rule');
});
