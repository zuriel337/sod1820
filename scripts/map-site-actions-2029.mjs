// Site action map (ZURIEL 26.11.2026): every route, the guard that protects it, the role it needs, the writes and RPCs its code can
// reach, the buttons it renders, and the existing tests that mention it. Static analysis of src/App2029.jsx and the import graph;
// no runtime, no network, no new infrastructure. Output: docs/site-action-map-2029.json (+ .md). Usage: node scripts/map-site-actions-2029.mjs [--check]
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), 'utf8');
const app = read('src/App2029.jsx');

// ── component name -> file, from static and lazy imports of App2029 ──
const imports = new Map();
for (const m of app.matchAll(/import\s+(\w+)\s+from\s+["'](\.[^"']+)["']/g)) imports.set(m[1], m[2]);
for (const m of app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(["'](\.[^"']+)["']\)/g)) imports.set(m[1], m[2]);
const asFile = (spec, from = 'src') => {
  const base = resolve(join(root, from), spec);
  for (const candidate of [base, `${base}.jsx`, `${base}.js`, `${base}.mjs`, join(base, 'index.jsx'), join(base, 'index.js')]) if (existsSync(candidate) && statSync(candidate).isFile()) return relative(root, candidate);
  return null;
};

// ── import-graph crawl (relative imports only, bounded depth) ──
const cache = new Map();
// A module that wraps many RPCs (supabaseApi2029.js has 125) must not credit all of them to every importer: only the exports an importer
// actually names are attributed to it.
const wrappers = new Map();
const wrapperMap = (file) => {
  if (wrappers.has(file)) return wrappers.get(file);
  const text = read(file), rpcCount = new Set([...text.matchAll(/\.rpc\(\s*["'`]([a-z_0-9]+)/g)].map((x) => x[1])).size, map = new Map();
  if (rpcCount > 8) for (const part of text.split(/\n(?=export )/)) { const name = (/^export\s+(?:async\s+)?(?:function\s+|const\s+|let\s+)(\w+)/.exec(part) || [])[1]; if (name) map.set(name, [...new Set([...part.matchAll(/\.rpc\(\s*["'`]([a-z_0-9]+)/g)].map((x) => x[1]))]); }
  const result = rpcCount > 8 ? map : null; wrappers.set(file, result); return result;
};
const analyse = (file) => {
  if (cache.has(file)) return cache.get(file);
  const text = read(file), info = { file, deps: [], rpcs: new Set(), writes: new Set(), buttons: new Set(), admin: /\bisAdmin\b/.test(text), auth: /\buseAuth\s*\(/.test(text) };
  for (const m of text.matchAll(/(?:import\s[^'"]*?from\s*|import\()\s*["'](\.[^"']+)["']/g)) { const dep = asFile(m[1], dirname(file)); if (dep && /\.(jsx?|mjs)$/.test(dep)) info.deps.push(dep); }
  if (!wrapperMap(file)) for (const m of text.matchAll(/\.rpc\(\s*["'`]([a-z_0-9]+)["'`]/g)) info.rpcs.add(m[1]);
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    const dep = asFile(m[2], dirname(file)), wrap = dep && wrapperMap(dep);
    if (wrap) for (const spec of m[1].split(',')) { const name = spec.trim().split(/\s+as\s+/)[0]; for (const rpc of wrap.get(name) || []) info.rpcs.add(rpc); }
  }
  for (const m of text.matchAll(/\.from\(\s*["'`]([a-z_0-9]+)["'`]\s*\)\s*\.(insert|update|upsert|delete)/g)) info.writes.add(`${m[1]}.${m[2]}`);
  for (const m of text.matchAll(/<button\b[^>]*>\s*([^<{}\n]{1,60}?)\s*<\/button>/g)) info.buttons.add(m[1].trim());
  for (const m of text.matchAll(/<(?:button|a|Link|RoyalTile2029|RoyalRow2029)\b[^>]*?\b(?:aria-label|title)=["']([^"'{}]{2,60})["']/g)) info.buttons.add(m[1].trim());
  cache.set(file, info);
  return info;
};
// The shell/frame is shared by every page: it is mapped once as "frame", not attributed to each route.
const FRAME = /Sod2029Shell|SystemFrame2029|SystemToolDock|SystemBar|NavigationIcon|RazielSession|SiteFooter|Opening2029|Awakening2029/;
const crawl = (start, depth = 3) => {
  const seen = new Set(), queue = [[start, 0]], out = [];
  while (queue.length) {
    const [file, d] = queue.shift();
    if (seen.has(file) || !existsSync(join(root, file)) || (d > 0 && FRAME.test(file))) continue;
    seen.add(file); const info = analyse(file); out.push(info);
    if (d < depth) for (const dep of info.deps) queue.push([dep, d + 1]);
  }
  return out;
};

// ── tests index (names only; nothing is run here) ──
const testFiles = [];
const walk = (dir) => { for (const name of readdirSync(join(root, dir))) { const p = `${dir}/${name}`; const s = statSync(join(root, p)); if (s.isDirectory()) { if (!['node_modules', 'fixtures'].includes(name)) walk(p); } else if (/\.(test|spec)?\.?(mjs|cjs|js|jsx)$/.test(name) && /(test|spec|browser)/.test(name)) testFiles.push(p); } };
for (const dir of ['test', 'tests']) if (existsSync(join(root, dir))) walk(dir);
const testText = new Map(testFiles.map((file) => [file, read(file)]));
const testsMentioning = (needles) => [...testText].filter(([, text]) => needles.some((n) => n && text.includes(n))).map(([file]) => file);

// ── routes ──
const SECTION = [[/^\/2029\/control/, 'admin'], [/^\/2029\/me|^\/community\/researcher\/me/, 'personal'], [/^\/(login|auth)/, 'auth'], [/^\/(post|posts|verified|tag|category|cross|languages)(\/|$)|^\/2029\/posts/, 'posts'],
  [/^\/(community|members|forum)/, 'community'], [/^\/(code|codes|els)(\/|$)/, 'ciphers'], [/^\/(gematria|number|2029\/gematria|2029\/number|2029\/calculator|research)/, 'gematria-numbers'],
  [/^\/(world|topic|researcher|gallery|heichal|היכל|video|or-geula|findings|reality|timeline|broadcasts|archive)/, 'world-library'], [/^\/(books|book|beit-midrash)/, 'books'],
  [/^\/(privacy|unsubscribe|updates|map|contact|stats|start|early-access|melech)/, 'services'], [/^\/?$|^\/2029$/, 'home']];
const sectionOf = (path) => (SECTION.find(([re]) => re.test(path)) || [null, 'other'])[1];
const routes = [];
for (const line of app.split('\n')) {
  const m = /<Route\s+path=(?:"([^"]+)"|\{`([^`]+)`\}|\{(\w+)\})[^>]*?element=\{(.*)\}\s*\/?>?/.exec(line);
  if (!m) continue;
  const path = m[1] || m[2] || `{${m[3]}}`, element = m[4];
  const guards = [...element.matchAll(/<(Locked|FramedGate2029)\b([^>]*)>/g)].map((g) => ({ guard: g[1], flag: (/flag="([^"]+)"/.exec(g[2]) || [])[1] || null, requireFlag: /requireFlag/.test(g[2]), adminView: /allowAdminView/.test(g[2]) }));
  const direct = [...new Set([...element.matchAll(/<([A-Z]\w*)/g)].map((c) => c[1]))];
  // a route element may be a component declared inside App2029.jsx: follow the components its body renders
  const local = direct.filter((c) => !imports.has(c)).flatMap((c) => { const at = app.search(new RegExp(`function ${c}\\b`)); if (at < 0) return []; const body = app.slice(at, app.indexOf('\nfunction ', at + 10) > 0 ? app.indexOf('\nfunction ', at + 10) : at + 3000); return [...body.matchAll(/<([A-Z]\w*)/g)].map((x) => x[1]); });
  const comps = [...new Set([...direct, ...local])].filter((c) => imports.has(c));
  const files = comps.map((c) => asFile(imports.get(c), 'src')).filter(Boolean);
  const reach = files.flatMap((f) => crawl(f));
  const uniq = (key) => [...new Set(reach.flatMap((info) => [...info[key]]))].sort();
  const section = sectionOf(path);
  const role = section === 'admin' ? 'admin' : section === 'personal' ? 'member' : reach.some((i) => i.admin) ? 'guest+member+admin-actions' : reach.some((i) => i.auth) ? 'guest+member-actions' : 'guest';
  routes.push({ path, section, role, guards, components: comps, files, rpcs: uniq('rpcs'), writes: uniq('writes'), buttons: uniq('buttons').slice(0, 80),
    tests: testsMentioning([`'${path}'`, `"${path}"`, `\`${path}`, ...comps]).slice(0, 12) });
}
const rpcIndex = {};
for (const route of routes) for (const rpc of route.rpcs) (rpcIndex[rpc] ??= { routes: [] }).routes.push(route.path);
for (const rpc of Object.keys(rpcIndex)) rpcIndex[rpc].tests = testsMentioning([`'${rpc}'`, `"${rpc}"`, `${rpc}(`, `rpc/${rpc}`]).slice(0, 8);
const bySection = {};
for (const r of routes) { const s = (bySection[r.section] ??= { routes: 0, withTests: 0, rpcs: new Set(), writes: new Set(), buttons: 0 }); s.routes++; if (r.tests.length) s.withTests++; r.rpcs.forEach((x) => s.rpcs.add(x)); r.writes.forEach((x) => s.writes.add(x)); s.buttons += r.buttons.length; }
const summary = Object.fromEntries(Object.entries(bySection).map(([k, v]) => [k, { routes: v.routes, routesWithAnyTest: v.withTests, rpcs: v.rpcs.size, tableWrites: v.writes.size, buttonLabels: v.buttons }]));
const map = { as_of: '2026-11-26', source: 'src/App2029.jsx + import graph (depth 3) + tests index; static analysis, nothing executed', routes, rpcs: rpcIndex, summary,
  caveat: 'Reachable-by-import is an upper bound of what a route can do (shared components appear on many routes). Button labels are the literal JSX texts and aria-labels. A test listed here only mentions the route, component or RPC; it is not proof the action works end to end.' };
const json = JSON.stringify(map, null, 1) + '\n';
if (process.argv.includes('--check')) { const current = existsSync(join(root, 'docs/site-action-map-2029.json')) ? read('docs/site-action-map-2029.json') : ''; if (current !== json) { console.error('docs/site-action-map-2029.json is stale: run node scripts/map-site-actions-2029.mjs'); process.exit(1); } console.log('site action map is current'); process.exit(0); }
writeFileSync(join(root, 'docs/site-action-map-2029.json'), json);
console.log(`routes ${routes.length}, rpcs ${Object.keys(rpcIndex).length}`); console.table(summary);
