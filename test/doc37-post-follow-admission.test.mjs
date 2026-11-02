import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outputs = [];
async function compile(reading) {
  const outfile = resolve(`.test-post-follow-admission-${reading}-${process.pid}.mjs`); outputs.push(outfile);
  const stub = {
    'theme.js': 'export const F={};',
    'palette.js': 'export const PALETTES={};export const usePalette=()=>({});',
    'WatchButton.jsx': 'export default function WatchButton(){return null;}',
    'NavigationIcon2029.jsx': 'export default function Icon(){return null;}',
    'researchViewMode.js': 'export const getPublicResearchClient=()=>({rpc:async(name,args)=>{globalThis.__postFollowReads.push([name,args]);return {data:args.p_entity_type+":"+args.p_stable_id};}});',
    'writerPersonal2029.js': 'export const publicWriterFollowLinks=async()=>({});',
  };
  await build({ entryPoints: ['src/components/PostFollowBox.jsx'], bundle: true, platform: 'node', format: 'esm', outfile,
    external: ['react', 'react/jsx-runtime'], define: { __SOD_2029_BUILD__: String(reading),
      'import.meta.env.VITE_PUBLIC_READING_RELEASE': '"public-reading-20261101"',
      'import.meta.env.VITE_INTEGRATED_PREVIEW': '"false"', 'import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW': '"false"' },
    plugins: [{ name: 'external-read-boundaries', setup(b) {
      b.onResolve({ filter: /\/(theme\.js|palette\.js|WatchButton\.jsx|NavigationIcon2029\.jsx|researchViewMode\.js|writerPersonal2029\.js)$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'fixture' }));
      b.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'fixture-css' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stub[args.path], loader: 'js' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture-css' }, () => ({ contents: '', loader: 'js' }));
    } }] });
  return (await import(pathToFileURL(outfile))).default;
}
const Reading = await compile(true), Existing = await compile(false);
after(async () => { await Promise.all(outputs.map(file => rm(file, { force: true }))); delete globalThis.__postFollowReads; });
const post = { id: 55, slug: 'fixture', author: 'בדרך לנצח', categories: ['מימד חמש', 'תיעוד אירועים'], tags: [] };
test('closed post Follow preserves existing classification labels without resolver reads', async () => {
  globalThis.__postFollowReads = []; let root;
  await act(async () => { root = Renderer.create(React.createElement(Reading, { variant: '2029', post })); });
  const output = JSON.stringify(root.toJSON());
  assert.match(output, /מימד חמש/); assert.match(output, /תיעוד אירועים/);
  assert.match(output, /המעקבים ייפתחו בהמשך/); assert.ok(!output.includes('בודק אילו יעדי מעקב'));
  assert.deepEqual(globalThis.__postFollowReads, []);
  await act(async () => { root.unmount(); });
});
test('existing non-reading Follow still validates its targets through the canonical resolver', async () => {
  globalThis.__postFollowReads = []; let root;
  await act(async () => { root = Renderer.create(React.createElement(Existing, { variant: '2029', post })); });
  assert.equal(globalThis.__postFollowReads.length, 2);
  assert.ok(globalThis.__postFollowReads.every(([name]) => name === 'canonical_follow_subject'));
  await act(async () => { root.unmount(); });
});
