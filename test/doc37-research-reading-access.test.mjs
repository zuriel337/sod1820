// Mount the actual Provider with the release constant compiled on. Only IO/auth/router are fixtures.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-reading-research-${process.pid}.mjs`);
const stub = {
  'react-router-dom': 'export const useLocation=()=>globalThis.__readingResearch.location;',
  'AuthContext.jsx': 'export const useAuth=()=>globalThis.__readingResearch.auth;',
  'auth.js': 'export const getCloudResearch=()=>globalThis.__readingResearch.io("read");export const applyCloudResearchOps=()=>globalThis.__readingResearch.io("write");',
  'tracking.js': 'export const trackResearch=()=>globalThis.__readingResearch.io("track");',
  'supabase.js': 'export const signalAiBehavior=()=>globalThis.__readingResearch.io("AIbehavior");export const supabase={rpc:()=>globalThis.__readingResearch.io("RPC"),functions:{invoke:()=>globalThis.__readingResearch.io("model")}};',
  'events.js': 'export const emit=()=>globalThis.__readingResearch.io("telemetry");',
  'eventBus.js': 'export const EVENTS=new Proxy({}, {get:(_,k)=>k});export const emit=()=>{};',
};
await build({ entryPoints: ['src/lib/research/ResearchProvider.jsx'], bundle: true, platform: 'node', format: 'esm', outfile,
  external: ['react', 'react/jsx-runtime'], define: { __SOD_2029_BUILD__: 'true', 'import.meta.env.VITE_PUBLIC_READING_RELEASE': '"public-reading-20261101"' },
  plugins: [{ name: 'external-IO', setup(b) {
    b.onResolve({ filter: /(react-router-dom|AuthContext\.jsx|\/auth\.js|tracking\.js|\/supabase\.js|eventBus\.js|\/events\.js)$/ }, args => {
      const key = args.path === 'react-router-dom' ? args.path : args.path.split('/').at(-1);
      return stub[key] ? { path: key, namespace: 'fixture' } : null;
    });
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stub[args.path], loader: 'js' }));
  } }] });
const { default: Provider, useResearch } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__readingResearch; });
class Storage { data = new Map(); getItem(k) { return this.data.get(k) ?? null; } setItem(k,v) { this.data.set(k, String(v)); } removeItem(k) { this.data.delete(k); } }
function Probe() { const api = useResearch(); const f = globalThis.__readingResearch; f.latest = api; f.renders.push({ uid: f.auth.user?.id, ids: api.saved.map(x => x.id) }); return null; }
const tree = () => React.createElement(React.StrictMode, null, React.createElement(Provider, null, React.createElement(Probe)));
test('admin reading does not hydrate, resume, sync, observe ELS or emit telemetry; principal context stays exact', async () => {
  const calls = [], listeners = [], f = { calls, renders: [], auth: { user: { id: 'A' }, isAdmin: true, loading: false },
    location: { pathname: '/world', search: '?q=1820', hash: '' }, io: kind => { calls.push(kind); throw new Error(`Unapproved ${kind}`); } };
  globalThis.__readingResearch = f;
  globalThis.localStorage = new Storage(); globalThis.sessionStorage = new Storage();
  globalThis.window = { location: { origin: 'https://fixture.invalid' }, addEventListener: name => listeners.push(name), removeEventListener() {} };
  globalThis.document = { querySelectorAll: () => [] };
  let root; await act(async () => { root = Renderer.create(tree()); });
  await act(async () => {
    f.latest.setResearchContext({ subject: { id: '1820', type: 'number' }, returnTo: { href: '/old-post?p=1#source' } });
    f.latest.continueResearchPath({ kind: 'number_expression', surface: 'number' });
    f.latest.saveItem({ id: 'A-local', ref: 'A-local', type: 'number', title: '1820' });
  });
  assert.equal(f.latest.context.returnTo.href, '/old-post?p=1#source');
  for (const operation of ['saveCurrentResearchPath', 'resumeResearchPath', 'forkResearchPath']) {
    let result; await act(async () => { result = await f.latest[operation](); }); assert.equal(result.error, 'feature_locked', operation);
  }
  assert.equal(f.latest.syncStatus, 'local_only'); assert.equal(f.latest.syncPending, 0);
  assert.deepEqual(listeners, []); assert.deepEqual(calls, []);
  await act(async () => { f.auth = { user: { id: 'B' }, isAdmin: true, loading: false }; root.update(tree()); });
  assert.equal(f.latest.saved.length, 0); assert.equal(f.latest.context, null);
  assert.equal(f.renders.some(x => x.uid === 'B' && x.ids.includes('A-local')), false);
  assert.deepEqual(calls, []); await act(async () => { root.unmount(); });
});
