import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createResearchSyncRuntime } from '../src/lib/research/researchSyncRuntime.js';
import { makeResearchOp } from '../src/lib/research/researchSyncState.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-now-admission-${process.pid}.mjs`);
await build({ entryPoints: ['src/components/experience2029/useSystemFeed2029.js'], bundle: true,
  platform: 'node', format: 'esm', outfile, external: ['react'], plugins: [{ name: 'network-boundaries', setup(b) {
    b.onResolve({ filter: /(?:worldDiscoveryStream|systemFeedPublicSources2029|numberTierSignals)\.js$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: {
      'worldDiscoveryStream.js': 'export const watchWorldDiscoveryStream = options => globalThis.__nowAdmission.watch(options);',
      'systemFeedPublicSources2029.js': 'export const fetchSystemFeedPublicSources2029 = options => globalThis.__nowAdmission.details(options);',
      'numberTierSignals.js': 'export const fetchNumberTierSignals = async () => ({loaded:false});',
    }[args.path] }));
  } }] });
const { useSystemFeed2029 } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__nowAdmission; });
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() {
  const f = { watches: 0, stops: 0, calls: [], latest: null,
    watch(options) { f.watches++; f.stream = options; return () => { f.stops++; }; },
    details({ signal }) { const d = deferred(); f.calls.push({ ...d, signal }); return d.promise; },
  };
  globalThis.__nowAdmission = f;
  return f;
}
function Probe(props) { globalThis.__nowAdmission.latest = useSystemFeed2029(props); return null; }
const tree = (nowOpen, enabled = true) => React.createElement(Probe, { nowOpen, enabled });
const packet = id => ({ items: [{ id, label: id, kind: 'source', sourceKind: 'channel_update', channel: 'or-geula' }], sourceStates: [], error: false });

test('closed Now never fetches details; opening, closing and reopening preserve one ticker watcher', async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(tree(false)); });
  assert.equal(f.watches, 1); assert.equal(f.calls.length, 0);
  await act(async () => { f.stream.onResult({ items: [], groupArrivals: null }); });
  assert.equal(f.calls.length, 0);
  await act(async () => { root.update(tree(true)); });
  assert.equal(f.calls.length, 1);
  await act(async () => { f.calls[0].resolve(packet('current')); });
  assert.equal(f.latest.nowSources.items[0].id, 'current');
  await act(async () => { root.update(tree(false)); });
  await act(async () => { f.stream.onResult({ items: [{ id: 'ticker', label: 'ticker', kind: 'source' }] }); });
  assert.equal(f.calls.length, 1); assert.equal(f.latest.items.some(x => x.id === 'ticker'), true);
  await act(async () => { root.update(tree(true)); });
  assert.equal(f.calls.length, 2); assert.equal(f.watches, 1); assert.equal(f.stops, 0);
  await act(async () => { root.unmount(); });
  assert.equal(f.calls[1].signal.aborted, true); assert.equal(f.stops, 1);
});

test('close aborts in-flight details and stale completion cannot overwrite a reopened request', async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(tree(true)); });
  const old = f.calls[0];
  await act(async () => { root.update(tree(false)); });
  assert.equal(old.signal.aborted, true); assert.equal(f.latest.nowSources.loading, false);
  await act(async () => { root.update(tree(true)); });
  await act(async () => { f.calls[1].resolve(packet('new')); old.resolve(packet('stale')); });
  assert.equal(f.latest.nowSources.items[0].id, 'new');
  await act(async () => { f.stream.onResult({ items: [] }); f.stream.onResult({ items: [] }); });
  assert.equal(f.calls.length, 3);
  await act(async () => { f.calls[2].reject(new Error('offline')); });
  assert.equal(f.latest.nowSources.error, true);
  await act(async () => { root.update(tree(false)); root.unmount(); });
});

class Storage { data = new Map(); get length() { return this.data.size; } key(i) { return [...this.data.keys()][i]; } getItem(k) { return this.data.get(k) ?? null; } setItem(k, v) { this.data.set(k, String(v)); } removeItem(k) { this.data.delete(k); } }
test('authenticated reading keeps principal-local context without cloud reads, writes or new upload batches', async () => {
  const storage = new Storage(), session = new Storage(); let calls = 0;
  const runtime = createResearchSyncRuntime({ userId: 'owner-A', cloudEnabled: false, storage, session,
    readCloud: async () => { calls++; throw new Error('unexpected read'); }, writeCloud: async () => { calls++; throw new Error('unexpected write'); } });
  runtime.start();
  assert.equal(runtime.getSnapshot().syncStatus, 'local_only');
  assert.equal(runtime.commit([makeResearchOp('context_set', { context: { subject: { id: '1820', type: 'number' }, returnTo: { href: '/old-post?x=1#part' } } })]), true);
  assert.equal(runtime.getSnapshot().context.returnTo.href, '/old-post?x=1#part');
  assert.equal(runtime.getSnapshot().syncPending, 0);
  await runtime.retry(); await runtime.flush(); await runtime.resolveConflict({ confirm: true, action: 'reapply' });
  assert.equal(calls, 0);
  const other = createResearchSyncRuntime({ userId: 'owner-B', cloudEnabled: false, storage, session }); other.start();
  assert.equal(other.getSnapshot().context, null); other.stop(); runtime.stop();
});

test('existing research journals are retained when cloud admission is closed', async () => {
  const storage = new Storage(), session = new Storage();
  const writeEnabled = createResearchSyncRuntime({ userId: 'owner-A', storage, session, readCloud: () => new Promise(() => {}), writeCloud: () => assert.fail('unexpected write') });
  writeEnabled.start(); writeEnabled.commit([makeResearchOp('history_add', { entity: { id: '1820', type: 'number', title: '1820' } })]);
  const oldJournals = [...storage.data].filter(([key]) => key.includes(':pending:'));
  writeEnabled.stop();
  const readOnly = createResearchSyncRuntime({ userId: 'owner-A', cloudEnabled: false, storage, session }); readOnly.start();
  assert.equal(readOnly.getSnapshot().syncPending, 1);
  assert.equal(readOnly.getSnapshot().history[0].id, '1820');
  for (const [key, value] of oldJournals) assert.equal(storage.getItem(key), value);
  await readOnly.retry(); assert.equal(readOnly.getSnapshot().syncPending, 1); readOnly.stop();
});

test('font failure or a never-settling font cannot prevent requesting the app render', async () => {
  const source = await readFile(new URL('../src/main2029.jsx', import.meta.url), 'utf8');
  const { transform } = await import('esbuild');
  const body = source.replace(/^import .*;\n/gm, '').replace(/if \(import\.meta\.env\.VITE_INTEGRATED_PREVIEW[\s\S]*?\n}\n/, '');
  const js = (await transform(body, { loader: 'jsx', jsx: 'transform' })).code;
  const run = new Function('document', 'window', 'performance', 'createRoot', 'initRuntimeErrorCapture', 'React', 'StrictMode', 'App2029', js);
  for (const kind of ['pending', 'failed', 'missing']) {
    let render = 0, timer = 0; const marks = [];
    const fonts = kind === 'missing' ? undefined : { load: () => kind === 'pending' ? new Promise(() => {}) : Promise.reject(new Error('font unavailable')) };
    run({ fonts, getElementById: () => ({}) }, { setTimeout: () => ++timer, clearTimeout() {} }, { mark: name => marks.push(name) },
      () => ({ render: () => { render++; } }), () => {}, React, React.StrictMode, () => null);
    assert.equal(render, 1, kind); assert.ok(marks.includes('sod2029:render-requested'));
    await Promise.resolve();
  }
});
