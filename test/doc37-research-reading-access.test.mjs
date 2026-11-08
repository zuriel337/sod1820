// Mount the actual Provider with the release constant compiled on. Only IO/auth/router are fixtures.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
import { applyResearchOps, emptyResearchState } from '../src/lib/research/researchSyncState.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-reading-research-${process.pid}.mjs`);
const stub = {
  'react-router-dom': 'export const useLocation=()=>globalThis.__readingResearch.location;',
  'AuthContext.jsx': 'export const useAuth=()=>globalThis.__readingResearch.auth;',
  'auth.js': 'export const getCloudResearch=(...args)=>globalThis.__readingResearch.io("read",...args);export const applyCloudResearchOps=(...args)=>globalThis.__readingResearch.io("write",...args);',
  'tracking.js': 'export const trackResearch=()=>globalThis.__readingResearch.io("track");',
  'supabase.js': 'export const signalAiBehavior=()=>globalThis.__readingResearch.io("AIbehavior");export const supabase={rpc:(...args)=>globalThis.__readingResearch.io("RPC",...args),functions:{invoke:()=>globalThis.__readingResearch.io("model")}};',
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

function fixture(auth = { user: { id: 'A' }, isAdmin: false, loading: false }) {
  const f = { calls: [], listeners: [], renders: [], auth,
    location: { pathname: '/world', search: '?q=1820', hash: '' }, clouds: new Map(), rpcOverride: null };
  f.io = async (kind, ...args) => {
    f.calls.push({ kind, args });
    if (kind === 'read') {
      const uid = args[0];
      if (!f.clouds.has(uid)) f.clouds.set(uid, { ...emptyResearchState(), revision: 0 });
      return structuredClone(f.clouds.get(uid));
    }
    if (kind === 'write') {
      const [uid, ops, { batchId, expectedRevision }] = args;
      const current = f.clouds.get(uid);
      assert.equal(current.revision, expectedRevision);
      const next = { ...applyResearchOps(current, ops), revision: current.revision + 1 };
      f.clouds.set(uid, next);
      return { ok: true, batch_id: batchId, applied_revision: next.revision, snapshot: structuredClone(next) };
    }
    if (kind === 'RPC') {
      if (f.rpcOverride) return f.rpcOverride(...args);
      const [name, body] = args;
      if (name === 'fn_research_path_resume_v1') return { data: { ok: false, error: 'not_found' }, error: null };
      if (name === 'fn_research_path_append_v1') return { data: { ok: true,
        path_id: '11111111-1111-4111-8111-111111111111', revision_id: '22222222-2222-4222-8222-222222222222',
        revision_no: 1, steps: body.p_steps, representation: body.p_representation }, error: null };
    }
    throw new Error(`Unexpected ${kind}`);
  };
  globalThis.__readingResearch = f;
  globalThis.localStorage = new Storage(); globalThis.sessionStorage = new Storage();
  globalThis.window = { location: { origin: 'https://fixture.invalid' }, addEventListener: name => f.listeners.push(name), removeEventListener() {} };
  globalThis.document = { querySelectorAll: () => [] };
  return f;
}
const context = { subject: { id: '1820', type: 'number', label: '1820', href: '/2029/number/1820' }, returnTo: { href: '/old-post?p=1#source' } };
const passive = f => f.calls.filter(x => x.kind !== 'read' && !(x.kind === 'RPC' && x.args[0] === 'fn_research_path_resume_v1'));

test('public/member reading denies private operations and IO while preserving local exact return', async () => {
  for (const auth of [
    { user: { id: 'A', user_metadata: { role: 'admin' } }, isAdmin: false, loading: false },
    { user: null, isAdmin: false, loading: false },
    { user: null, isAdmin: true, loading: false },
    // Signed in but not confirmed by Auth.getUser (verified is supplied by AuthContext, never by metadata): still locked, even as admin.
    { user: { id: 'A' }, isAdmin: true, verified: false, loading: false },
  ]) {
    const f = fixture(auth);
    let root; await act(async () => { root = Renderer.create(tree()); });
    await act(async () => {
      f.latest.setResearchContext(context);
      f.latest.continueResearchPath({ kind: 'number_expression', surface: 'number' });
      assert.equal(f.latest.saveItem({ id: 'not-authorized', type: 'number' }), false);
      assert.equal(f.latest.addToResearch({ id: 'not-authorized', type: 'number' }), false);
      assert.equal(f.latest.retryResearchSync(), false);
    });
    assert.equal(f.latest.context.returnTo.href, '/old-post?p=1#source');
    for (const operation of ['saveCurrentResearchPath', 'resumeResearchPath', 'forkResearchPath']) {
      let result; await act(async () => { result = await f.latest[operation](); }); assert.equal(result.error, 'feature_locked', operation);
    }
    assert.equal(f.latest.syncStatus, 'local_only'); assert.equal(f.latest.syncPending, 0);
    assert.deepEqual(f.listeners, []); assert.deepEqual(f.calls, []);
    await act(async () => { root.unmount(); });
  }
});

test('verified admin reads existing research on login but only explicit actions can write; telemetry/model stay off', async () => {
  const f = fixture({ user: { id: 'A' }, isAdmin: true, verified: true, loading: false });
  let root; await act(async () => { root = Renderer.create(tree()); });
  assert.ok(f.calls.some(x => x.kind === 'read'));
  assert.ok(f.calls.some(x => x.kind === 'RPC' && x.args[0] === 'fn_research_path_resume_v1'));
  assert.deepEqual(passive(f), []);
  assert.ok(f.listeners.includes('message'));
  await act(async () => {
    f.latest.setResearchContext(context);
    f.latest.logHistory({ id: 'visited', type: 'number' });
    await new Promise(resolve => setTimeout(resolve, 400));
  });
  assert.deepEqual(passive(f), [], 'render/navigation/history cannot flush the queue');
  await act(async () => { assert.equal(f.latest.saveItem({ id: 'A-save', type: 'number' }), true); });
  for (let i = 0; i < 10 && f.latest.syncPending; i++) await act(async () => { await f.latest.retryResearchSync(); });
  assert.ok(f.calls.some(x => x.kind === 'write'));
  assert.equal(f.latest.syncPending, 0); assert.equal(f.clouds.get('A').saved[0].id, 'A-save');
  let saved; await act(async () => { saved = await f.latest.saveCurrentResearchPath({ href: '/2029/number/1820', surface: 'number' }); });
  assert.equal(saved.ok, true);
  assert.equal(f.latest.context.returnTo.href, '/old-post?p=1#source');
  assert.equal(f.calls.some(x => ['track', 'AIbehavior', 'model', 'telemetry'].includes(x.kind)), false);
  await act(async () => { f.auth = { user: { id: 'B' }, isAdmin: true, verified: true, loading: false }; root.update(tree()); });
  assert.equal(f.latest.saved.length, 0); assert.equal(f.latest.context, null);
  assert.equal(f.renders.some(x => x.uid === 'B' && x.ids.includes('A-save')), false);
  await act(async () => { root.unmount(); });
});

test('same-account permission revalidation preserves context, denies stale actions and ignores late path results', async () => {
  const f = fixture({ user: { id: 'A' }, isAdmin: true, verified: true, loading: false });
  let root; await act(async () => { root = Renderer.create(tree()); f.latest?.setResearchContext(context); });
  await act(async () => { f.latest.setResearchContext(context); });
  const staleSave = f.latest.saveItem;
  let resolveSave, pending;
  f.rpcOverride = async (name, body) => {
    if (name === 'fn_research_path_append_v1') return new Promise(resolve => { resolveSave = () => resolve({ data: {
      ok: true, path_id: '11111111-1111-4111-8111-111111111111', revision_id: '22222222-2222-4222-8222-222222222222',
      revision_no: 1, steps: body.p_steps, representation: body.p_representation }, error: null }); });
    return { data: { ok: false, error: 'not_found' }, error: null };
  };
  await act(async () => { pending = f.latest.saveCurrentResearchPath(); });
  assert.ok(resolveSave);
  await act(async () => { f.auth = { user: { id: 'A' }, isAdmin: true, verified: false, loading: false }; root.update(tree()); });
  assert.equal(f.latest.context.returnTo.href, '/old-post?p=1#source');
  assert.equal(staleSave({ id: 'stale-save', type: 'number' }), false);
  assert.equal(await f.latest.retryResearchSync(), false);
  let result; await act(async () => { resolveSave(); result = await pending; });
  assert.equal(result.error, 'session_unavailable'); assert.equal(f.latest.pathResume.latest, null);
  assert.equal(f.latest.context.journey, null);
  const writesBefore = passive(f).length;
  await act(async () => { f.auth = { user: { id: 'A' }, isAdmin: true, verified: true, loading: false }; root.update(tree()); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)); });
  assert.equal(passive(f).length, writesBefore, 'regaining access does not replay pending work');
  assert.equal(f.latest.context.returnTo.href, '/old-post?p=1#source');
  await act(async () => { root.unmount(); });
});
