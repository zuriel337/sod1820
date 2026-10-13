import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sitemapHandler from '../api/sitemap-public.js';

const numbersPage = fs.readFileSync(new URL('../src/pages/NumbersPage.jsx', import.meta.url), 'utf8');
const galaxy = fs.readFileSync(new URL('../src/components/ConvergenceGalaxy.jsx', import.meta.url), 'utf8');
const surfaceSync = fs.readFileSync(new URL('../src/components/FeatureSurfaceSync.jsx', import.meta.url), 'utf8');

test('retired /numbers route redirects to canonical number entry and cannot mount the legacy galaxy', () => {
  assert.match(numbersPage, /Navigate/);
  assert.match(numbersPage, /to="\/number"/);
  assert.match(numbersPage, /replace/);
  assert.doesNotMatch(numbersPage, /ConvergenceGalaxy|useFeatureState\(/);
  assert.match(galaxy, /RETIRED BY HUMAN GATE \(2026-09-15\)/);
  assert.match(galaxy, /return null/);
});

test('closed convergence-tree availability is still projected onto legacy /numbers links', () => {
  assert.match(surfaceSync, /useFeatureState\("lock_convergence_tree"\)/);
  assert.match(surfaceSync, /p === "\/numbers" \|\| p\.startsWith\("\/numbers\/"\)/);
  assert.match(surfaceSync, /data-sod-convergence-tree-availability/);
});

test('public sitemap excludes the retired /numbers entry for either enabled convergence mode or unavailable truth', async () => {
  const previousFetch = globalThis.fetch;
  const xml = '<urlset><url><loc>https://sod1820.co.il/numbers</loc></url><url><loc>https://sod1820.co.il/post/public</loc></url></urlset>';
  try {
    for (const state of [{ enabled: true, mode: 'all' }, { enabled: true, mode: 'anon' }, null]) {
      globalThis.fetch = async (url) => String(url).endsWith('/api/sitemap')
        ? { ok: true, text: async () => xml }
        : state ? { ok: true, json: async () => [{ key: 'lock_convergence_tree', ...state }, { key: 'lock_number', enabled: false, mode: 'all' }] } : { ok: false };
      const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
      await sitemapHandler({}, res);
      assert.equal(res.code, 200);
      assert.doesNotMatch(res.body, /<loc>https:\/\/sod1820\.co\.il\/numbers<\/loc>/);
      assert.match(res.body, /\/post\/public/);
    }
  } finally { globalThis.fetch = previousFetch; }
});
