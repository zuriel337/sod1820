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

// 3) Built route graphs (only with dist/ from `npm run build:2029`). What a primary route needs before
//    its first content = the entry's static closure + the route chunk and its static imports (manifest
//    `imports`; `dynamicImports` are the deferral boundaries and are excluded). Budgets are gzip-9 KB and
//    chunk counts beyond the entry. Calibrated on PR1100 5dd4afaa (entry 177.7 KB/7; Home +189.4 KB/32, World +282.8/39,
//    Post +180.3/29) and on accepted deferrals; tighten only, never raise to admit a regression.
//    `deferred` = code that only an action, scroll or deep link needs; it must stay out of the route graph.
const ROUTE_GRAPHS = {
  // Home: the notable-convergence strip reader (explorerFacets -> entity hub / topic / book projections)
  // loads with its own includeWorld trigger, after the first cards. The World preview projection
  // (home2029Projection -> curation catalog / contributor lens) loads when its area is approached
  // (onWorldPreviewApproach), not with Home's code: the route graph went from +26 chunks / 149.1 KB gz to +22 / 137.1.
  Home: { src: 'src/pages/Home2029Page.jsx', maxExtraGzKb: 140, maxExtraChunks: 23,
    deferred: ['explorerFacets', 'entityHubProjection', 'topicSourceContext', 'bookResearchProjection',
      'home2029Projection', 'curationProjection2029', 'worldContributorLens'],
    onDemand: { entry: 'home2029Projection', includes: ['curationProjection2029', 'worldContributorLens'] } },
  // World: connected discovery (#world-discovery-* deep links) and the shared method Stage behind
  // "כל השיטות ופירוט החישוב" load when that view/panel opens, not with the World opening.
  World: { src: 'src/pages/World2029Page.jsx', maxExtraGzKb: 265, maxExtraChunks: 37,
    deferred: ['WorldSourceStory', 'SpatialMethodStage2029', 'semanticSceneCompiler'] },
  Post: { src: 'src/pages/Post2029Page.jsx', maxExtraGzKb: 185, maxExtraChunks: 30, deferred: [] },
  // Number opens with the result and research context. The closed-by-default method inspector,
  // its spatial compiler and its evidence lens join the graph only after "איך חישבנו?" opens.
  Number: { src: 'src/pages/Number2029Page.jsx', maxExtraGzKb: 205, maxExtraChunks: 31,
    deferred: ['NumberMethodInspector2029', 'SpatialMethodStage2029', 'semanticSceneCompiler', 'MethodLens2029', 'hebrewLetterAnatomy'],
    onDemand: { entry: 'NumberMethodInspector2029', includes: ['SpatialMethodStage2029', 'semanticSceneCompiler', 'MethodLens2029', 'hebrewLetterAnatomy'] } },
};
// Heavy scene/3D, calendar and tool code that no primary route needs before its first content.
const NEVER_IN_PRIMARY_ROUTE_GRAPH = ['MistaterScene3D2029', 'SpatialGlyphScene2029', 'SVGLoader', 'timeFlow', 'dayContext',
  'Els2029Page', 'Calculator2029Page', 'CalculatorPro2029Page', 'NumberDrawer2029', 'GoldenProjectorModeLayer2029'];

function builtRouteGraphs() {
  const manifest = JSON.parse(readFileSync(join(root, 'dist/.vite/manifest.json'), 'utf8'));
  const gzCache = new Map();
  const gzKb = (key) => {
    const file = manifest[key]?.file;
    if (!file?.endsWith('.js')) return 0;
    if (!gzCache.has(file)) gzCache.set(file, gzipSync(readFileSync(join(root, 'dist', file)), { level: 9 }).length / 1024);
    return gzCache.get(file);
  };
  const closure = (start) => {
    const seen = new Set(); const queue = [start];
    while (queue.length) {
      const key = queue.shift();
      if (!key || seen.has(key)) continue;
      assert.ok(manifest[key], `manifest dependency missing: ${key}`);
      seen.add(key);
      for (const dep of manifest[key].imports || []) queue.push(dep);
    }
    return seen;
  };
  const entryKey = Object.keys(manifest).find((key) => key === '2029.html' || manifest[key].src === '2029.html');
  assert.ok(entryKey, '2029 entry missing from Vite manifest');
  const entry = closure(entryKey);
  const identity = (key) => `${key} ${manifest[key].src || ''} ${manifest[key].name || ''} ${manifest[key].file || ''}`;
  const routes = {};
  for (const [name, spec] of Object.entries(ROUTE_GRAPHS)) {
    const routeKey = Object.keys(manifest).find((key) => key === spec.src || manifest[key].src === spec.src);
    assert.ok(routeKey, `${spec.src} missing from Vite manifest`);
    const routeClosure = closure(routeKey);
    const extra = [...routeClosure].filter((key) => !entry.has(key));
    const dynamic = [...new Set([...routeClosure].flatMap((key) => manifest[key].dynamicImports || []))]
      .map((key) => ({ identity: identity(key), all: [...closure(key)].map(identity) }));
    routes[name] = { extra, extraGzKb: extra.reduce((n, key) => n + gzKb(key), 0), all: [...entry, ...extra].map(identity), dynamic };
  }
  return { entryChunks: entry.size, entryGzKb: [...entry].reduce((n, key) => n + gzKb(key), 0), routes };
}

const assets = join(root, 'dist/assets');
const hasManifest = existsSync(join(root, 'dist/.vite/manifest.json')) && existsSync(join(root, 'dist/2029.html'));
test('primary route graphs stay within budget and keep deferred code out (skipped without dist/)', { skip: !hasManifest }, () => {
  const { entryChunks, entryGzKb, routes } = builtRouteGraphs();
  const report = [`entry ${entryChunks} chunks ${entryGzKb.toFixed(1)} KB gz`];
  for (const [name, spec] of Object.entries(ROUTE_GRAPHS)) {
    const route = routes[name];
    report.push(`${name} +${route.extra.length} chunks +${route.extraGzKb.toFixed(1)} KB gz`);
    assert.ok(route.extraGzKb <= spec.maxExtraGzKb, `${name} route graph ${route.extraGzKb.toFixed(1)} KB gzip > ${spec.maxExtraGzKb} KB budget`);
    assert.ok(route.extra.length <= spec.maxExtraChunks, `${name} route graph ${route.extra.length} chunks > ${spec.maxExtraChunks} budget`);
    for (const name2 of [...NEVER_IN_PRIMARY_ROUTE_GRAPH, ...spec.deferred]) {
      const hit = route.all.find((id) => id.includes(name2));
      assert.equal(hit, undefined, `${name2} must load on demand, not in the ${name} route graph (${hit})`);
    }
    if (spec.onDemand) {
      const boundary = route.dynamic.find((item) => item.identity.includes(spec.onDemand.entry));
      assert.ok(boundary, `${spec.onDemand.entry} must remain reachable from the ${name} route as an on-demand boundary`);
      for (const dependency of spec.onDemand.includes) {
        assert.ok(boundary.all.some((id) => id.includes(dependency)), `${dependency} must remain inside the ${spec.onDemand.entry} on-demand closure`);
      }
    }
  }
  console.log(`# built route graphs: ${report.join(' · ')}`);
});

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
