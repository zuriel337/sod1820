import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const imports = /(?:^|\n)\s*(?:import\s+(?:[^'"()]*?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]/g;
function staticClosure(entry) {
  const files = new Set(), pending = [entry];
  while (pending.length) {
    const file = pending.pop();
    if (files.has(file)) continue;
    files.add(file);
    if (!/\.(jsx?|mjs)$/.test(file)) continue;
    for (const [, spec] of readFileSync(join(root, file), 'utf8').matchAll(imports)) {
      if (!spec.startsWith('.')) continue;
      const base = normalize(join(dirname(file), spec));
      const resolved = [base, `${base}.js`, `${base}.jsx`, join(base, 'index.js')]
        .find(p => existsSync(join(root, p)) && statSync(join(root, p)).isFile());
      if (resolved) pending.push(resolved);
    }
  }
  return files;
}

test('ordinary Topic code does not statically load the optional source story and method Stage', () => {
  const files = staticClosure('src/pages/Topic2029Page.jsx');
  for (const name of ['WorldSourceStory.jsx', 'SpatialMethodStage2029.jsx', 'semanticSceneCompiler.js']) {
    assert.equal([...files].some(file => file.endsWith(`/${name}`)), false, `${name} blocks the Topic entry`);
  }
  assert.ok(files.has('src/lib/research/topicConvergence.js'), 'Canonical Topic reader remains in the original entry path');
});

test('the existing World deferrals remain intact', () => {
  const files = staticClosure('src/pages/World2029Page.jsx');
  for (const name of ['WorldSourceStory.jsx', 'SpatialMethodStage2029.jsx', 'semanticSceneCompiler.js']) {
    assert.equal([...files].some(file => file.endsWith(`/${name}`)), false, `${name} moved into World entry`);
  }
});
