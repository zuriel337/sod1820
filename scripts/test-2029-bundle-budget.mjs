// Load-time regression guard for the 2029 document (no browser, no network).
// 1) Source: the STATIC import closure of src/App2029.jsx must not contain code that only a few
//    surfaces need (Hebrew-calendar libraries, the Number drawer, calculators, the post-only
//    projector layer). Dynamic import() edges are allowed; they are the lazy boundaries.
// 2) Build (only when dist/ from `npm run build:2029` exists): the entry chunk stays under budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, normalize, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const ENTRY = 'src/App2029.jsx';
const IMPORT = /(?:^|\n)\s*(?:import\s+(?:[^'"()]*?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]/g;

function staticClosure(entry) {
  const seen = new Set([entry]); const packages = new Set(); const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    let text; try { text = readFileSync(join(root, file), 'utf8'); } catch { continue; }
    text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1];
      if (!spec.startsWith('.')) { packages.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]); continue; }
      const base = normalize(join(dirname(file), spec));
      const found = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, join(base, 'index.js'), join(base, 'index.jsx')]
        .find((c) => existsSync(join(root, c)) && statSync(join(root, c)).isFile());
      if (found && !seen.has(found) && /\.(jsx?|mjs)$/.test(found)) { seen.add(found); queue.push(found); }
    }
  }
  return { files: seen, packages };
}

const { files, packages } = staticClosure(ENTRY);
const has = (name) => [...files].some((f) => f.endsWith(name));

test('Hebrew-calendar libraries are not in the entry static closure', () => {
  assert.equal(packages.has('@hebcal/core'), false, '@hebcal/core must load on demand');
  assert.equal(has('/dayContext.js'), false);
  assert.equal(has('/timeFlow.js'), false);
});

test('surface-specific code is behind lazy boundaries', () => {
  for (const name of ['/NumberDrawer2029.jsx', '/Calculator2029Page.jsx', '/CalculatorPro2029Page.jsx', '/GoldenProjectorModeLayer2029.jsx', '/entityHubProjection.js']) {
    assert.equal(has(name), false, `${name} must not be statically imported by the entry`);
  }
});

test('static entry graph stays small', () => {
  const kb = [...files].reduce((n, f) => n + statSync(join(root, f)).size, 0) / 1024;
  assert.ok(files.size <= 80, `static modules ${files.size} > 80`);
  assert.ok(kb <= 900, `static source ${Math.round(kb)} KB > 900 KB`);
});

const assets = join(root, 'dist/assets');
test('built entry chunk is under budget (skipped without dist/)', { skip: !existsSync(assets) }, () => {
  const html = readFileSync(join(root, 'dist/2029.html'), 'utf8');
  const entry = (html.match(/<script[^>]+src="\/assets\/(2029-[^"]+\.js)"/) || [])[1];
  assert.ok(entry, '2029.html references the entry chunk');
  const gz = gzipSync(readFileSync(join(assets, entry)), { level: 9 }).length / 1024;
  assert.ok(gz <= 140, `entry chunk ${Math.round(gz)} KB gzip > 140 KB budget`);
  const preloaded = [...html.matchAll(/modulepreload"[^>]*href="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
  const firstLoadGz = [entry, ...preloaded].reduce((n, f) => n + gzipSync(readFileSync(join(assets, f)), { level: 9 }).length, 0) / 1024;
  assert.ok(firstLoadGz <= 260, `entry + preloaded chunks ${Math.round(firstLoadGz)} KB gzip > 260 KB budget`);
  assert.equal(preloaded.some((f) => /^(timeFlow|dayContext)/.test(f)), false, 'calendar chunks are not preloaded');
});
