// Controlled reader scheduling comparison; no browser, production writes or LCP claim.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const baseline = '3843af126f21ae58cf033fe808eaa2821b7a3362';
const path = 'src/lib/research/post2029ReadingProjection.js';
const output = process.argv[2];
if (!output) throw new Error('Usage: node docs/reviews/post-projection-parallel-20261115/compare.mjs <output.json>');
const texts = { before: execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' }), after: readFileSync(path, 'utf8') };
const modules = {
  'supabase.js': 'export const supabase=globalThis.fixture.db; export const getPostBySlug=async()=>null;',
  'researchW2Executors.js': 'export const createCanonicalNumberW2Executors=()=>({numeric_operators:{}});',
  'numberSystemMethods.js': 'export const fetchLiveNumericRuleVersions=async()=>[];',
  'goldenPostContextPacks.js': 'export const buildGoldenPostContextPack=async input=>({rows:input.traces});',
};
const builds = {};
for (const [version, contents] of Object.entries(texts)) {
  const result = await build({ stdin: { contents, resolveDir: resolve('src/lib/research') }, bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'controlled-io', setup(b) {
      b.onResolve({ filter: /\.js$/ }, args => { const name = args.path.split('/').at(-1); return modules[name] ? { path: name, namespace: 'controlled-io' } : null; });
      b.onLoad({ filter: /.*/, namespace: 'controlled-io' }, args => ({ contents: modules[args.path] }));
    } }],
  });
  builds[version] = result.outputFiles[0].text;
}
const results = [];
for (const scenario of ['Bennett', 'FZ1073']) for (let run = 1; run <= 3; run++) {
  const pair = {};
  for (const version of ['before', 'after']) {
    const calls = [], started = performance.now();
    const query = {};
    for (const method of ['select', 'eq', 'limit', 'maybeSingle']) query[method] = () => query;
    query.then = (yes, no) => {
      calls.push({ name: 'topic', startMs: performance.now() - started });
      return delay(250).then(() => ({ data: null })).then(yes, no);
    };
    const db = { from: () => query, rpc: async (name, args) => {
      calls.push({ name, phrase: args.p_phrase, startMs: performance.now() - started });
      await delay(250);
      return { data: name === 'gematria_method_trace' ? { input: args.p_phrase } : args.p_phrase === 'מלח' ? 78 : 631 };
    } };
    const ctx = { module: { exports: {} }, DOMException, fixture: { db } }; ctx.exports = ctx.module.exports;
    vm.runInNewContext(builds[version], ctx);
    const row = { id: scenario === 'FZ1073' ? 5112 : 90001,
      slug: scenario === 'FZ1073' ? 'flydubai-fz1073-363-14000-remzei-geula' : 'bennett-melach-631-78',
      title: 'Public scheduling fixture', source: 'sod1820', tags: [],
      content: '<p><button data-contextual-number-focus="true" data-expression="מלח" data-result="78">78</button></p>' };
    const begin = performance.now();
    const projection = await ctx.module.exports.fetchPost2029ReadingProjection(row.slug, { readPost: async () => row });
    const durationMs = performance.now() - begin;
    pair[version] = { projection: JSON.parse(JSON.stringify(projection)), callKeys: calls.map(({ name, phrase }) => `${name}:${phrase || ''}`).sort() };
    results.push({ scenario, run, version, durationMs, calls });
  }
  assert.deepEqual(pair.after, pair.before, 'projection, permissions and total query set must match');
}
writeFileSync(output, JSON.stringify({ baseline, method: 'Three alternating pairs; 250ms per independent I/O; actual reader with stubbed I/O and pack compiler; no browser or production measurement', identicalProjectionAndQuerySet: true, results }, null, 2) + '\n');
for (const scenario of ['Bennett', 'FZ1073']) {
  const median = version => results.filter(x => x.scenario === scenario && x.version === version).map(x => x.durationMs).sort((a, b) => a - b)[1];
  console.log(`${scenario}: ${Math.round(median('before'))} -> ${Math.round(median('after'))} ms; identical projection/query set`);
}
