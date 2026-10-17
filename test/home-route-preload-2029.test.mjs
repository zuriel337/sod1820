import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { homeRoutePreloadPlan2029, homeRoutePreloadScript2029, startHomeRoutePreload2029 } from '../src/lib/homeRoutePreload2029.js';

const chunk = (file, imports = [], extra = {}) => [file, { type: 'chunk', fileName: file, imports, dynamicImports: [], ...extra }];
const bundle = Object.fromEntries([
  chunk('assets/2029-e.js', ['assets/react.js', 'assets/theme.js']),
  chunk('assets/react.js'),
  chunk('assets/theme.js'),
  chunk('assets/Home.js', ['assets/react.js', 'assets/shared.js', 'assets/card.js'], { isDynamicEntry: true, facadeModuleId: '/repo/src/pages/Home2029Page.jsx', viteMetadata: { importedCss: new Set(['assets/Home.css']) } }),
  chunk('assets/shared.js', ['assets/card.js'], { viteMetadata: { importedCss: new Set(['assets/shared.css', 'assets/Home.css']) } }),
  chunk('assets/card.js'),
  chunk('assets/World.js', ['assets/shared.js'], { isDynamicEntry: true, facadeModuleId: '/repo/src/pages/World2029Page.jsx' }),
  ['assets/x.png', { type: 'asset' }],
]);

test('plan: the Home chunk, its static imports and stylesheets minus what the entry document already loads; nothing from other routes', () => {
  const plan = homeRoutePreloadPlan2029(bundle, 'assets/2029-e.js', '/');
  assert.deepEqual(plan.after, ['/assets/2029-e.js', '/assets/react.js', '/assets/theme.js']);
  assert.deepEqual(plan.js, ['/assets/Home.js', '/assets/shared.js', '/assets/card.js']);
  assert.deepEqual(plan.css, ['/assets/Home.css', '/assets/shared.css']);
  assert.equal(homeRoutePreloadPlan2029({ 'assets/2029-e.js': bundle['assets/2029-e.js'] }, 'assets/2029-e.js'), null, 'no Home chunk: no hint');
});

function fakeHost({ pathname = '/', search = '', observer = true } = {}) {
  const appended = [];
  let callback = null;
  class Observer { constructor(cb) { callback = cb; } observe() {} disconnect() { this.gone = true; } static supportedEntryTypes = ['resource']; }
  const host = {
    location: { pathname, search, href: `http://x${pathname}${search}` },
    document: { head: { appendChild: (l) => appended.push(l) }, createElement: () => ({}) },
    ...(observer ? { PerformanceObserver: Observer } : {}),
  };
  return { host, appended, deliver: (...names) => callback({ getEntries: () => names.map((name) => ({ name: `http://x${name}` })) }) };
}
const plan = { after: ['/assets/2029-e.js', '/assets/react.js'], js: ['/assets/Home.js', '/assets/card.js'], css: ['/assets/Home.css'] };

test('runtime: nothing is hinted before every entry file has arrived; then exactly the plan, once', () => {
  const { host, appended, deliver } = fakeHost();
  startHomeRoutePreload2029({ ...plan, host });
  deliver('/assets/2029-e.js');
  assert.equal(appended.length, 0, 'the entry download is not competed with');
  deliver('/assets/react.js', '/assets/unrelated.js');
  assert.deepEqual(appended.map((l) => [l.rel, l.href, l.as, l.crossOrigin]), [
    ['modulepreload', '/assets/Home.js', undefined, ''], ['modulepreload', '/assets/card.js', undefined, ''], ['preload', '/assets/Home.css', 'style', ''],
  ]);
});

test('runtime: other routes, the community preview and runtimes without resource timing hint nothing', () => {
  for (const options of [{ pathname: '/world' }, { pathname: '/post/a' }, { pathname: '/number/1820' }, { pathname: '/2029' }, { pathname: '/', search: '?preview=community' }, { observer: false }]) {
    const { host, appended, deliver } = fakeHost(options);
    startHomeRoutePreload2029({ ...plan, host });
    try { deliver('/assets/2029-e.js', '/assets/react.js'); } catch { /* no observer was created */ }
    assert.equal(appended.length, 0, JSON.stringify(options));
  }
  const { host, appended, deliver } = fakeHost({ search: '?preview=other&utm=1' });
  startHomeRoutePreload2029({ ...plan, host });
  deliver('/assets/2029-e.js', '/assets/react.js');
  assert.equal(appended.length, 3, 'only preview=community is excluded, as in HomeEntry2029');
});

test('runtime: a thrown host never escapes (a hint must not break boot)', () => {
  assert.doesNotThrow(() => startHomeRoutePreload2029({ ...plan, host: { get location() { throw new Error('x'); } } }));
});

test('serialized script is self-contained and carries the plan', () => {
  const script = homeRoutePreloadScript2029(plan);
  assert.match(script, /^<script id="sod2029-home-route-preload">\(function startHomeRoutePreload2029/);
  assert.ok(script.includes('"/assets/Home.js"') && script.includes('"/assets/2029-e.js"'));
  assert.doesNotMatch(script, /\bimport\b|\bexport\b/);
});

test('real 2029 build: the hint is exactly what Vite would load for the Home route; the legacy build has none', { timeout: 240000 }, () => {
  const root = path.resolve(import.meta.dirname, '..');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sod-home-preload-'));
  const build = (target, dir) => execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', dir, '--emptyOutDir'], { cwd: root, env: { ...process.env, SOD_BUILD_TARGET: target }, stdio: 'pipe' });
  try {
    build('2029', path.join(out, 'd2029'));
    const html = fs.readFileSync(path.join(out, 'd2029', '2029.html'), 'utf8');
    assert.equal(html.split('sod2029-home-route-preload').length - 1, 1);
    const m = html.match(/\}\)\(\{after:(\[.*?\]),js:(\[.*?\]),css:(\[.*?\])\}\)<\/script>/s);
    const after = JSON.parse(m[1]), hinted = [...JSON.parse(m[2]), ...JSON.parse(m[3])].map((s) => s.slice(1));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'd2029', '.vite/manifest.json'), 'utf8'));
    const entryFile = manifest['2029.html'].file;
    const entryJs = fs.readFileSync(path.join(out, 'd2029', entryFile), 'utf8');
    const files = entryJs.match(/\.f=\[(.*?)\]/s)[1].split(',').map((s) => s.replace(/"/g, '').replace(/`/g, ''));
    const homeFile = path.basename(manifest['src/pages/Home2029Page.jsx'].file);
    const deps = entryJs.match(new RegExp(`import\\(\`\\./${homeFile.replace(/[.]/g, '\\.')}\`\\),__vite__mapDeps\\(\\[([\\d,]*)\\]\\)`))[1].split(',').map((i) => files[Number(i)]);
    const preloadedByDocument = new Set([...html.matchAll(/rel="modulepreload" crossorigin href="\/([^"]+)"/g)].map((x) => x[1]).concat(entryFile));
    const expected = deps.filter((f) => !preloadedByDocument.has(f)).sort();
    assert.ok(expected.length > 20, 'the Home graph is not trivial');
    assert.deepEqual([...hinted].sort(), expected);
    assert.ok(after.includes('/' + entryFile) && after.every((f) => preloadedByDocument.has(f.slice(1))), 'waits only for the files the document itself loads');
    build('legacy', path.join(out, 'dlegacy'));
    assert.doesNotMatch(fs.readFileSync(path.join(out, 'dlegacy', 'index.html'), 'utf8'), /sod2029-home-route-preload/);
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});
