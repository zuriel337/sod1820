// Gate: the System Frame number side window is a light Quick Inspect. The full /number/:value page keeps all depth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const FRAME = 'src/components/experience2029/SystemFrame2029.jsx';
const QUICK = 'src/components/number2029/NumberQuickInspect2029.jsx';
const IMPORT = /(?:^|\n)\s*(?:import\s+(?:[^'"()]*?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]/g;
// Static edges only: dynamic import() edges are lazy boundaries (numberExpressionFocus.resolveExpressionFocus is never called here).

function closure(entry) {
  const seen = new Set([entry]); const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    const text = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const base = normalize(join(dirname(file), spec));
      const found = [base, `${base}.js`, `${base}.jsx`].find((c) => existsSync(join(root, c)) && statSync(join(root, c)).isFile());
      if (found && /\.jsx?$/.test(found) && !seen.has(found)) { seen.add(found); queue.push(found); }
    }
  }
  return seen;
}

test('System Frame mounts Quick Inspect, not the full NumberDrawer', () => {
  const frame = read(FRAME);
  assert.match(frame, /lazy\(\(\) => import\("\.\.\/number2029\/NumberQuickInspect2029\.jsx"\)\)/);
  assert.doesNotMatch(frame, /NumberDrawer2029/);
  assert.equal([...closure(FRAME)].some((f) => f.endsWith('/NumberDrawer2029.jsx')), false);
});

test('Quick Inspect graph has no Number Core / Entity Hub / deep readers', () => {
  const files = [...closure(QUICK)];
  for (const banned of ['NumberCore2029', 'entityHubProjection', 'numberCoreProjection', 'NumberDrawer2029', 'NumberDeepView', 'NumberLivingWorld', 'gematriaTrace.js']) {
    assert.equal(files.some((f) => f.includes(banned)), false, `${banned} must not be in the Quick Inspect graph`);
  }
  const src = read(QUICK);
  for (const banned of ['dossier', 'journey', 'neighbors', 'zero_scale', 'zeroScale', 'getAllValuePhrases', 'langLinksList', 'fetchEntityHub']) {
    assert.doesNotMatch(src, new RegExp(banned, 'i'), `${banned} must not appear in Quick Inspect`);
  }
});

test('one bounded, abortable canonical read; preview is labelled local', () => {
  const src = read(QUICK);
  assert.equal((src.match(/\.rpc\(/g) || []).length, 1);
  assert.match(src, /fn_method_profile/);
  assert.match(src, /abortSignal\(signal\)/);
  assert.match(src, /controller\.abort\(\)/);
  assert.match(src, /תצוגה מקדימה מקומית/);
  assert.match(src, /buildCalculator2029FastPreview/);
});

test('full-page link uses the existing handoff contract; Number2029Page untouched', () => {
  const src = read(QUICK);
  assert.match(src, /buildNumberExpressionHandoff/);
  assert.match(src, /preserve: false/);
  assert.match(src, /לדף המספר המלא/);
});
