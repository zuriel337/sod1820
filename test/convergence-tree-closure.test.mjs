import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const numbersPage = fs.readFileSync(new URL('../src/pages/NumbersPage.jsx', import.meta.url), 'utf8');
const surfaceSync = fs.readFileSync(new URL('../src/components/FeatureSurfaceSync.jsx', import.meta.url), 'utf8');

test('convergence tree route is gated by canonical site flag before galaxy mount', () => {
  assert.match(numbersPage, /useFeatureState\("lock_convergence_tree"\)/);
  assert.match(numbersPage, /if \(tree\.blocked\) return <MaintenanceLock/);
  const gateIndex = numbersPage.indexOf('if (tree.blocked)');
  const galaxyIndex = numbersPage.indexOf('<ConvergenceGalaxy');
  assert.ok(gateIndex >= 0 && galaxyIndex > gateIndex, 'gate must precede ConvergenceGalaxy render');
});

test('closed convergence tree is projected to public /numbers links', () => {
  assert.match(surfaceSync, /useFeatureState\("lock_convergence_tree"\)/);
  assert.match(surfaceSync, /p === "\/numbers" \|\| p\.startsWith\("\/numbers\/"\)/);
  assert.match(surfaceSync, /data-sod-convergence-tree-availability/);
});

test('closed convergence tree projects noindex metadata', () => {
  assert.match(numbersPage, /meta\.name = "robots"/);
  assert.match(numbersPage, /meta\.content = "noindex,nofollow"/);
});
