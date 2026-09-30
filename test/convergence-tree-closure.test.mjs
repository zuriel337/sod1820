import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const numbersPage = fs.readFileSync(new URL('../src/pages/NumbersPage.jsx', import.meta.url), 'utf8');
const galaxy = fs.readFileSync(new URL('../src/components/ConvergenceGalaxy.jsx', import.meta.url), 'utf8');
const surfaceSync = fs.readFileSync(new URL('../src/components/FeatureSurfaceSync.jsx', import.meta.url), 'utf8');
const sitemap = fs.readFileSync(new URL('../api/sitemap-public.js', import.meta.url), 'utf8');

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

test('public sitemap remains fail-closed for the retired /numbers entry', () => {
  assert.match(sitemap, /key=eq\.lock_convergence_tree/);
  assert.match(sitemap, /function removeNumbersHub/);
  assert.match(sitemap, /<loc>https:\\/\\/sod1820\\\.co\\\.il\\\/numbers<\\\/loc>/);
  assert.match(sitemap, /if \(!publiclyOpen\) xml = removeNumbersHub\(xml\)/);
  assert.match(sitemap, /if \(!r\.ok\) return false/);
});
